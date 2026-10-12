'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'data/cultures.js','data/bookmarks.js','data/bookmark_476.js','data/bookmark_476_wider_identities.js',
  'data/bookmark_476_wider.js','data/bookmark_493.js','data/bookmark_493_world.js',
  'data/bookmark_711.js','data/bookmark_711_terrain.js','data/bookmark_800.js',
  'data/bookmark_800_expansion.js','data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js',
  'data/bookmark_1204.js','data/bookmark_1204_terrain.js','data/government_rollout.js',
  'data/starts.js','data/assembly_polities.js','js/model.js','js/world.js','js/population.js',
  'js/actions.js','js/religion.js','js/institutions.js','js/bookmark_setup.js','js/starts.js',
  'js/governments.js','js/government_support.js','js/government_collective.js',
  'js/government_assembly.js','js/save.js','js/save_v4.js','js/main.js','js/ui_modals.js'
]);

test('the Jain institution identity is independent and leaves released faith rules intact',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const catalogue = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    expect((await page.evaluate(releasedCatalogue,catalogue.selection)).hashes).toEqual(catalogue.hashes);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const profile = FB.religionOf('jain',null), metadata = FB.faithAvailability('jain',null);
      metadata.consumers.push('character');
      return {lineage:FB.faithLineage('jain',null),metadata:FB.faithAvailability('jain',null),
        head:FB.faithOfficeId('jain',null),war:profile.holyWarTradition,
        law:FB.faithValue(null,'jain','legalTradition'),
        undeclared:['marriage','clergyMarriage','roles','religiousPaths','attire'].every(function (key) {
          return profile.properties[key] === undefined;
        }),errors:FB.validateReligionData(null),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({lineage:['jain'],metadata:{yearMin:1204,bookmarkIds:['1204'],consumers:['institution']},
      head:null,war:null,law:{value:'customary',sourceId:'jain'},undeclared:true,errors:[],pure:true});
  });

test('Jain scope permits only dated institutional authoring and seeds no local community',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const dates = ['476','493','711','800','867','1066','1204'];
      const scopes = dates.map(function (id) {
        const b = FB.bookmark(id);
        return ['community','character','ruler','institution','start','story','conversion','project']
          .map(function (consumer) { return FB.faithHistoricalAvailable('jain',b,consumer); });
      });
      const b = FB.bookmark('1204');
      const boundaries = [1203,1204,1205].map(function (year) {
        return FB.faithHistoricalAvailable('jain',Object.assign({},b,{date:{year:year,season:0,day:1}}),'institution');
      });
      const empty = dates.every(function (id) {
        const b = FB.bookmark(id);
        function hasJain(value) {
          if (!value || typeof value !== 'object') return false;
          return Object.keys(value).some(function (key) {
            return (key === 'religion' || key === 'startReligion') && value[key] === 'jain' || hasJain(value[key]);
          });
        }
        return !hasJain([b.provinces,b.realms,b.localInstitutions,b.opening]);
      });
      const rejected = ['476','493','711','1204'].map(function (id) {
        const b = FB.bookmark(id), draft = JSON.parse(JSON.stringify(b));
        draft.provinces.find(function (p) { return p.id === 'mansura'; }).communities[0].religion = 'jain';
        return FB.validateBookmark(draft).some(function (error) {
          return error.indexOf('unavailable for this dated consumer') >= 0;
        });
      });
      return {scopes:scopes,boundaries:boundaries,empty:empty,rejected:rejected,
        errors:dates.map(function (id) { return FB.validateBookmark(FB.bookmark(id)); }),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({scopes:Array(6).fill(Array(8).fill(false)).concat([[false,false,false,true,false,false,false,false]]),
      boundaries:[false,true,true],empty:true,rejected:[true,true,true,true],
      errors:Array(7).fill([]),pure:true});
  });

for (const id of ['476','493','711']) test('retained Hindu consumers and mixed residents are complete in ' + id,
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function (id) {
      const faith = id === '711' ? 'hindu_711' : 'brahmanical_476', b = FB.bookmark(id);
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const counties = b.provinces.filter(function (p) { return p.religion === faith; });
      const indus = ['debal','mansura'].map(function (pid) {
        const p = b.provinces.find(function (p) { return p.id === pid; });
        return p.communities.map(function (c) { return c.religion; }).sort();
      });
      return {primary:counties.map(function (p) { return p.id; }).sort(),
        realms:b.realms.filter(function (r) { return r.religion === faith; }).map(function (r) { return r.id; }).sort(),
        indus:indus,partitioned:counties.every(function (p) {
          return p.communities.reduce(function (sum,c) { return sum + c.populationShare0; },0) === 10000;
        }),institutions:Object.keys(b.localInstitutions || {}).filter(function (key) {
          return b.localInstitutions[key].religion === faith;
        }),scenery:id === '493' ? ['gomal_valley','thar_margin'].every(function (pid) {
          return b.provinces.find(function (p) { return p.id === pid; }).wasteland;
        }) : true,
        scope:['476','493','711','800','867','1066','1204'].map(function (date) {
          return FB.faithHistoricalAvailable(faith,FB.bookmark(date),'community');
        }),pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },id)).toEqual({primary:id === '476' ? ['debal','gomal_valley','mansura','thar_margin'] : ['debal','mansura'],
      realms:id === '476' ? ['gomal_valley_local_476','lower_indus_476','thar_margin_local_476'] :
        id === '493' ? ['indus_493'] : ['sindh_711'],
      indus:Array(2).fill(id === '476' ? ['brahmanical_476','buddhist_476'] :
        id === '493' ? ['brahmanical_476'] : ['hindu_711']),
      partitioned:true,institutions:[],scenery:true,
      scope:id === '711' ? [false,false,true,false,false,false,false] : [true,true,false,false,false,false,false],pure:true});
  });

// Expose hidden review dates only in this specification's isolated context.
async function startIndusHousehold(page,testInfo,id) {
  await openGame(page,testInfo);
  await page.evaluate(function (id) { FBDATA.bookmarks[id].hidden = false; FB.startProgression.noteTier(3); },id);
  const beginning = page.locator('#btn-choose-beginning');
  if (await beginning.isVisible()) await beginning.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  const scenario = id === '476' || id === '493' ? 'farmer_' + id : 'farmer';
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('INDUSTRADITIONS-' + id + '-' + scenario + '-mansura-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () { FB.game.setPaused(true); });
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe(id);
}

test('institution eligibility cannot be used to convert a household or fund a Jain community project',
  async function ({page},testInfo) {
    await startIndusHousehold(page,testInfo,'1204');
    expect(await page.evaluate(function () {
      const s = FB.state, before = JSON.stringify(s), data = JSON.stringify(FBDATA);
      const rng = FB.getRngState(), uid = FB.getUidCounter(), pid = s.player.provinceId;
      const project = {kind:'faith',target:'jain',policy:'voluntary'};
      const result = {institution:FB.faithAvailable('jain',s,'institution'),
        conversion:FB.conversionStatus(s,'faith','jain','self').targetValid,
        targets:FB.religionIds(s,true).indexOf('jain') >= 0,
        projectTargets:FB.religionIds(s,true,'project').indexOf('jain') >= 0,
        preview:FB.countyCommunityProjectPreview(s,pid,project),
        applied:FB.startCountyCommunityProject(s,pid,project)};
      result.pure = before === JSON.stringify(s) && data === JSON.stringify(FBDATA) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
      return result;
    })).toEqual({institution:true,conversion:false,targets:false,projectTargets:false,preview:null,applied:null,pure:true});
  });

function indusSnapshot() {
  const s = FB.state, b = FB.campaignBookmark(s), faith = b.id === '711' ? 'hindu_711' : 'brahmanical_476';
  const before = JSON.stringify(s), rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
  const out = {start:s.start,playerFaith:s.chars[s.player.charId].religion,
    realms:{},communities:{},followers:{},delegates:{},heads:s.religiousHeads,
    relations:s.faithRelations,faiths:s.faiths,rng:rng,uid:uid};
  b.realms.filter(function (r) { return r.religion === faith; }).forEach(function (r) {
    const saved = s.realms[r.id];
    const ruler = FB.realmRulerCharacterSnapshot(s,r.id);
    out.realms[r.id] = {religion:saved.religion,ruler:saved.ruler,succession:saved.succession,
      rulerFaith:ruler && ruler.religion};
    const support = FB.governments.support;
    if (support.isDelegated(s,r.id)) {
      const c = support.delegate(s,r.id);
      out.delegates[r.id] = {id:c && c.id,faith:c && c.religion};
    }
  });
  b.provinces.filter(function (p) { return p.religion === faith; }).forEach(function (p) {
    out.communities[p.id] = {rows:FB.countyCommunities(s,p.id),owner:s.owner[p.id],holder:s.holder[p.id]};
  });
  Object.keys(s.chars).forEach(function (id) { if (s.chars[id].religion === faith) out.followers[id] = s.chars[id]; });
  out.noJainFollowers = !Object.keys(s.chars).some(function (id) { return s.chars[id].religion === 'jain'; });
  out.pure = before === JSON.stringify(s) && rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter();
  return JSON.parse(JSON.stringify(out));
}

for (const id of ['476','493','711']) test('Indus household and generated political consumers retain their faiths on restore in ' + id,
  async function ({page},testInfo) {
    await startIndusHousehold(page,testInfo,id);
    const before = await page.evaluate(indusSnapshot);
    expect(before.playerFaith).toBe(id === '711' ? 'hindu_711' : 'brahmanical_476');
    expect(before.noJainFollowers).toBe(true);
    expect(before.pure).toBe(true);
    expect(Object.keys(before.followers).length).toBeGreaterThan(0);
    expect(Object.keys(before.realms)).toHaveLength(id === '476' ? 3 : 1);
    Object.keys(before.realms).forEach(function (rid) {
      expect(before.realms[rid].religion).toBe(before.playerFaith);
      if (rid !== 'thar_margin_local_476') expect(before.realms[rid].rulerFaith).toBe(before.playerFaith);
    });
    if (id === '476') {
      expect(before.delegates.thar_margin_local_476.id).toBeTruthy();
      expect(before.delegates.thar_margin_local_476.faith).toBe('brahmanical_476');
    }
    const source = await page.evaluate(function () { return FB.save.serialize(); });
    await openGame(page,testInfo);
    await restoreBookmark(page,source);
    expect(await page.evaluate(indusSnapshot)).toEqual(before);
  });
