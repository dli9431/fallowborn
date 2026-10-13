'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {mockCrazyGames} = require('../support/crazygames');
const {openCrazyGame} = require('../support/game/crazygames-title');
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
  'js/government_assembly.js','js/save.js','js/save_v4.js','js/main.js','js/ui_modals.js',
  'data/religious_institutions.js','data/religious_activities.js','data/technology.js','data/systems.js',
  'data/economy.js','data/settlements.js','data/geographies.js','data/geography_expansion.js',
  'data/distribution_crazygames.js','js/religious_institutions.js','js/religious_activities.js',
  'js/abbeys.js','js/treasury.js','js/politics.js','js/authority.js','js/settlement.js',
  'js/economy.js','js/market.js','js/justice.js','js/intrigue.js','js/travel.js',
  'js/technology.js','js/systems.js','js/util.js','js/crazygames.js','index.html'
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
async function startIndusHousehold(page,testInfo,id,options) {
  options = options || {};
  if (options.crazygames) {
    await mockCrazyGames(page);
    await page.addInitScript(function () {
      window.FB_DISTRIBUTION = 'crazygames';
      window.FB_CRAZYGAMES_STORAGE = 'localstorage';
    });
    await openCrazyGame(page,testInfo);
  } else await openGame(page,testInfo);
  await page.evaluate(function (input) {
    FBDATA.bookmarks[input.id].hidden = false;
    if (input.revision) FBDATA.bookmarks[input.id].revision = input.revision;
    FB.startProgression.noteTier(3);
  },{id:id,revision:options.revision});
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


const HINDU_REVIEW = 'hindu_service_v2_governments_v2';
async function startHinduService(page,testInfo,crazygames) {
  await startIndusHousehold(page,testInfo,'711',{revision:HINDU_REVIEW,crazygames:!!crazygames});
  await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    me.born = s.date.year - 30; me.health = 8; me.religion = 'hindu_711';
    s.player.gold = 20; s.player.piety = 0; s.player.prestige = 0;
    s.player.travel = null; s.player.flags.on_campaign = false; s.player.flags.with_liege_host = false;
    s.player.manor = null; s.player.landPlots = []; s.player.landPlotMigration = 1;
    FB.setPlayerTier(s,1,{stationFarewell:false});
    me.role = 'farmer'; s.player.profession = 'farmer'; FB.careerOf(s,me).profession = 'farmer';
    window.hinduAdmit = function (key) {
      const iid = key === 'debal' ? 'debal_temple_service_711' : 'brahmanabad_ritual_support_711';
      const role = key === 'debal' ? 'participant' : 'supporter';
      const q = FB.religiousInstitutionQuote(s,iid,{kind:'character',id:me.id},'admit',{roleId:role});
      if (!q || !q.allowed || !FB.religiousInstitutionApply(s,q)) throw new Error('Lay admission failed: ' + (q && q.reason));
    };
    window.hinduFoundation = function (key) {
      const pid = key === 'debal' ? 'debal' : 'mansura';
      s.player.provinceId = pid;
      s.player.landPlots.push({provinceId:pid,settlement:0},{provinceId:pid,settlement:0});
      const q = FB.religiousPatronageQuote(s,key + '_lay_support_711',me.id,'foundation',
        {land:{provinceId:pid,settlement:0,count:2}});
      if (!q || !q.allowed || !FB.religiousPatronageApply(s,q)) throw new Error('Lay foundation failed: ' + (q && q.reason));
      const iid = key === 'debal' ? 'debal_temple_service_711' : 'brahmanabad_ritual_support_711';
      return s.abbeys.houses.find(function (h) { return h.activityInstitutionId === iid; });
    };
  });
}

test('711 Hindu review adds only two vacant lay groups and preserves every source world',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const source = FB.bookmark('711','terrain_v2_governments_v2');
      const review = FB.bookmark('711','hindu_service_v2_governments_v2');
      const ids = ['debal_temple_service_711','brahmanabad_ritual_support_711'];
      const profiles = ids.map(function (id) { return FBDATA.religiousInstitutionProfiles[review.localInstitutions[id].profileId]; });
      return {selected:FBDATA.bookmarks['711'].revision,
        unchanged:['provinces','realms','religiousHeads'].every(function (key) {
          return JSON.stringify(review[key]) === JSON.stringify(source[key]);
        }),prior:Object.keys(source.localInstitutions).every(function (id) {
          return JSON.stringify(review.localInstitutions[id]) === JSON.stringify(source.localInstitutions[id]);
        }),newIds:Object.keys(review.localInstitutions).filter(function (id) { return !source.localInstitutions[id]; }).sort(),
        sites:ids.map(function (id) { return review.localInstitutions[id].site; }),
        vacant:ids.every(function (id) { const d = review.localInstitutions[id];
          return d.vacant && d.freshOnly && !d.officeId && !d.representative && d.kind === 'ritual_community';
        }),layOnly:profiles.every(function (p) {
          return p.selection === null && p.actions.join(',') === 'admit,withdraw' &&
            Object.keys(p.roles).every(function (key) { const r = p.roles[key];
              return !r.unmarried && !r.professions.length && !r.careerIds && !r.pathId;
            });
        }),errors:[FB.validateBookmark(review),FB.religiousInstitutionCatalogFaults(FBDATA),
          FB.religiousActivityCatalogFaults(FBDATA)],
        tech:['hindu_lay_service_711','hindu_local_observance_711','hindu_service_patronage_711']
          .map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({selected:'terrain_v2_governments_v2',unchanged:true,prior:true,
      newIds:['brahmanabad_ritual_support_711','debal_temple_service_711'],sites:['debal_711','mansura_711'],
      vacant:true,layOnly:true,errors:[[],[],[]],tech:['none','none','none'],pure:true});
  });

test('poor Hindu households of either sex can observe locally without admission, vows or a temple estate',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], faith = me.religion;
      s.player.gold = 0;
      const family = JSON.stringify([me.spouseId,me.childrenIds]), heads = JSON.stringify(s.religiousHeads);
      const sexes = ['f','m'].map(function (sex) {
        me.sex = sex;
        return FB.religiousActivityQuote(s,'brahmanabad_local_observance_711',me.id).allowed;
      });
      const unfunded = !FB.religiousActivityQuote(s,'brahmanabad_funded_observance_711',me.id).allowed;
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'brahmanabad_local_observance_711',me.id));
      s.turn++; FB.religiousActivityTick(s);
      s.player.provinceId = 'debal';
      const repeated = FB.religiousActivityQuote(s,'debal_local_observance_711',me.id);
      return {sexes:sexes,started:started,unfunded:unfunded,gold:s.player.gold,piety:s.player.piety,
        repeated:!repeated.allowed,noHouse:!(s.abbeys && s.abbeys.houses.length),
        members:Object.keys(s.localInstitutions.brahmanabad_ritual_support_711.members),
        vow:FB.religiousMembershipUnmarried(s,me),work:FB.careerOf(s,me).profession,
        family:family === JSON.stringify([me.spouseId,me.childrenIds]),
        heads:heads === JSON.stringify(s.religiousHeads),faith:faith === me.religion};
    })).toEqual({sexes:[true,true],started:true,unfunded:true,gold:0,piety:1,repeated:true,noHouse:true,
      members:[],vow:false,work:'farmer',family:true,heads:true,faith:true});
  });

test('local lay membership enforces age, identity and residence without priestly or ascetic powers',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], iid = 'brahmanabad_ritual_support_711';
      s.player.gold = 0; me.born = s.date.year - 15;
      const child = !FB.religiousInstitutionRoleEligibility(s,iid,me.id,'supporter');
      me.born = s.date.year - 30;
      const elsewhere = !FB.religiousInstitutionRoleEligibility(s,'debal_temple_service_711',me.id,'participant');
      hinduAdmit('brahmanabad');
      const state = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const ungranted = ['priest','ascetic','teacher'].every(function (role) {
        return !FB.religiousInstitutionRoleEligibility(s,iid,me.id,role);
      });
      const office = !FB.religiousInstitutionQuote(s,iid,{kind:'character',id:me.id},'appoint',{candidateId:me.id}).allowed;
      const pure = state === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
      me.religion = 'buddhist_711';
      const otherFaith = !FB.religiousInstitutionRoleEligibility(s,iid,me.id,'supporter');
      me.religion = 'hindu_711';
      const left = FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,iid,{kind:'character',id:me.id},'withdraw',{}));
      return {child:child,elsewhere:elsewhere,ungranted:ungranted,office:office,pure:pure,otherFaith:otherFaith,
        left:left,status:s.localInstitutions[iid].members[me.id].status,gold:s.player.gold};
    })).toEqual({child:true,elsewhere:true,ungranted:true,office:true,pure:true,otherFaith:true,
      left:true,status:'withdrawn',gold:0});
  });

for (const key of ['debal','brahmanabad']) test(key + ' support conserves exact property and consumes one prepaid service',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo);
    expect(await page.evaluate(function (key) {
      const s = FB.state, me = s.chars[s.player.charId], cost = key === 'debal' ? 1 : 2;
      const h = hinduFoundation(key); hinduAdmit(key);
      const gold = s.player.gold, rows = JSON.stringify(FB.countyCommunities(s,s.player.provinceId));
      const gift = FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,key + '_lay_support_711',me.id,
        'donation',{fund:'ritual_supplies',amount:cost}));
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,key + '_funded_observance_711',me.id));
      s.turn++; FB.religiousActivityTick(s);
      const early = h.restrictedFunds.ritual_supplies === cost && s.player.piety === 0;
      s.turn++; FB.religiousActivityTick(s); FB.religiousActivityTick(s);
      return {gift:gift,started:started,early:early,spent:gold - s.player.gold,land:s.player.landPlots.length,
        plots:h.plots,piety:s.player.piety,fund:h.restrictedFunds.ritual_supplies,consumed:h.activitySpent,
        privateOwner:h.holderId,principal:[h.capital,h.treasury],
        duplicate:!FB.religiousActivityQuote(s,key + '_local_observance_711',me.id).allowed,
        residents:rows === JSON.stringify(FB.countyCommunities(s,s.player.provinceId))};
    },key)).toEqual({gift:true,started:true,early:true,spent:key === 'debal' ? 1 : 2,land:0,
      plots:[{provinceId:key === 'debal' ? 'debal' : 'mansura',settlement:0,count:2}],piety:1,fund:0,
      consumed:key === 'debal' ? 1 : 2,privateOwner:null,principal:[0,0],duplicate:true,residents:true});
  });

test('support can cross faith without granting ritual membership, surplus gifts or outreach',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], h = hinduFoundation('brahmanabad');
      me.religion = 'buddhist_711';
      const gold = s.player.gold, populations = JSON.stringify(s.population);
      const gift = FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'brahmanabad_lay_support_711',me.id,
        'donation',{fund:'ritual_supplies',amount:2}));
      const before = JSON.stringify(s);
      const membership = !FB.religiousInstitutionRoleEligibility(s,'brahmanabad_ritual_support_711',me.id,'supporter');
      const observance = !FB.religiousActivityQuote(s,'brahmanabad_local_observance_711',me.id).allowed;
      const overflow = !FB.religiousPatronageQuote(s,'brahmanabad_lay_support_711',me.id,
        'donation',{fund:'ritual_supplies',amount:7}).allowed;
      const outreach = !FB.religiousPatronageQuote(s,'brahmanabad_lay_support_711',me.id,'outreach',
        {fund:'ritual_supplies',amount:2,provinceId:'mansura',settlement:null,target:me.religion,policy:'voluntary'}).allowed;
      return {gift:gift,spent:gold - s.player.gold,fund:h.restrictedFunds.ritual_supplies,
        membership:membership,observance:observance,overflow:overflow,outreach:outreach,
        pure:before === JSON.stringify(s),population:populations === JSON.stringify(s.population),faith:me.religion};
    })).toEqual({gift:true,spent:2,fund:2,membership:true,observance:true,overflow:true,outreach:true,
      pure:true,population:true,faith:'buddhist_711'});
  });

test('date, source revision and stale support reviews reject without spending',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      hinduFoundation('brahmanabad');
      const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.religiousActivityQuote(s,'brahmanabad_local_observance_711',me.id);
      FB.religiousInstitutionSnapshot(s,'brahmanabad_ritual_support_711');
      const pure = before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const revision = s.start.revision;
      s.start.revision = 'terrain_v2_governments_v2';
      const source = !FB.religiousActivityQuote(s,'brahmanabad_local_observance_711',me.id).allowed;
      s.start.revision = revision; s.date.year = 712;
      const later = !FB.religiousActivityQuote(s,'brahmanabad_local_observance_711',me.id).allowed;
      s.date.year = 711;
      const quote = FB.religiousPatronageQuote(s,'brahmanabad_lay_support_711',me.id,'donation',{fund:'ritual_supplies',amount:2});
      s.player.gold--;
      const changed = JSON.stringify(s), stale = !FB.religiousPatronageApply(s,quote);
      return {pure:pure,source:source,later:later,stale:stale,unchanged:changed === JSON.stringify(s)};
    })).toEqual({pure:true,source:true,later:true,stale:true,unchanged:true});
  });

for (const cause of ['movement','occupation','withdrawal','worship restriction']) test(cause + ' interrupts supported observance without consuming gifts',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo);
    expect(await page.evaluate(function (cause) {
      const s = FB.state, me = s.chars[s.player.charId], h = hinduFoundation('brahmanabad');
      hinduAdmit('brahmanabad');
      FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'brahmanabad_lay_support_711',me.id,
        'donation',{fund:'ritual_supplies',amount:2}));
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'brahmanabad_funded_observance_711',me.id));
      const property = JSON.stringify(h), heads = JSON.stringify(s.religiousHeads), population = JSON.stringify(s.population);
      if (cause === 'movement') s.player.provinceId = 'debal';
      else if (cause === 'occupation') s.owner.mansura = 'umayyad_711';
      else if (cause === 'worship restriction') {
        const holder = FB.settlementCountyHolder(s,'mansura');
        if (!FB.authoritySetIdentity(s,holder,{eliteCultureId:'sindhi_711',eliteFaithId:'hindu_711',
          legalIdentityId:'customary',tolerance:'persecution',taxation:'equal',justicePolicy:'personal'}))
          throw new Error('Expected an explicit worship restriction');
      }
      else if (!FB.religiousInstitutionApply(s,FB.religiousInstitutionQuote(s,'brahmanabad_ritual_support_711',
        {kind:'character',id:me.id},'withdraw',{}))) throw new Error('Withdrawal failed');
      s.turn += 2; FB.religiousActivityTick(s);
      return {started:started,interrupted:!me.religiousActivity,piety:s.player.piety,
        reward:!!(me.religiousActivityHistory || {}).hindu_local_observance_711,
        property:property === JSON.stringify(h),heads:heads === JSON.stringify(s.religiousHeads),
        population:population === JSON.stringify(s.population),faith:me.religion};
    },cause)).toEqual({started:true,interrupted:true,piety:0,reward:false,property:true,heads:true,
      population:true,faith:'hindu_711'});
  });

test('public ritual support uses an existing ruler treasury and respects the declared reserve',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, h = hinduFoundation('brahmanabad'), me = s.chars[s.player.charId];
      FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
      const rid = FB.settlementCountyHolder(s,'mansura'), c = FB.realmRulerCharacterSnapshot(s,rid);
      if (!c || !FB.treasuryCounterparty(s,rid)) throw new Error('Expected an active Sindh ruler account');
      c.homeProvinceId = 'mansura'; c.health = 8; c.born = 681;
      s.realms[rid].treasury.gold = 9; s.realms[rid].treasury.militaryAccrued = 0;
      const household = s.player.gold, amount = FB.treasuryAvailable(s,rid);
      const gift = FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'brahmanabad_public_support_711',c.id,
        'donation',{fund:'ritual_supplies',amount:2}));
      const reserve = !FB.religiousPatronageQuote(s,'brahmanabad_public_support_711',c.id,
        'donation',{fund:'ritual_supplies',amount:3}).allowed;
      const privatePayer = !FB.religiousPatronageQuote(s,'brahmanabad_public_support_711',me.id,
        'donation',{fund:'ritual_supplies',amount:2}).allowed;
      FBDATA.religiousActivities = {};
      FBDATA.religiousPatronage = {brahmanabad_public_support_711:FBDATA.religiousPatronage.brahmanabad_public_support_711};
      s.player.war = null;
      Object.keys(s.realms).forEach(function (id) {
        s.realms[id].war = null;
        if (id !== rid && s.realms[id].treasury) {
          s.realms[id].treasury.gold = 0; s.realms[id].treasury.militaryAccrued = 0;
        }
      });
      let ai = 0;
      for (let period = 1; period <= 1 + Math.ceil(Object.keys(s.realms).length / 16); period++) {
        s.turn = period * 90; ai += FB.religiousActivityAI(s);
      }
      return {gift:gift,reserve:reserve,privatePayer:privatePayer,ai:ai,repeat:FB.religiousActivityAI(s),
        spent:amount - FB.treasuryAvailable(s,rid),fund:h.restrictedFunds.ritual_supplies,
        household:household === s.player.gold};
    })).toEqual({gift:true,reserve:true,privatePayer:true,ai:1,repeat:0,spent:4,fund:4,household:true});
  });

test('Jain evidence scope creates neither an in-bounds substitute nor an unreviewed Patan service',
  async function ({page},testInfo) {
    await startIndusHousehold(page,testInfo,'1204');
    expect(await page.evaluate(function () {
      const s = FB.state, cid = s.player.charId, before = JSON.stringify(s), data = JSON.stringify(FBDATA);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const contains = function (table) { return Object.keys(table).some(function (id) {
        return /patan|jain/.test(id) || (table[id].faithIds || []).indexOf('jain') >= 0;
      }); };
      return {scope:FB.faithAvailable('jain',s,'institution'),
        local:FB.religiousInstitutionSnapshot(s,'patan_jain_learning_1204'),
        activity:FB.religiousActivityQuote(s,'patan_jain_learning_1204',cid),
        noService:!contains(FBDATA.religiousActivities) && !contains(FBDATA.religiousPatronage),
        noTravel:!(FBDATA.travelSites || []).some(function (d) { return /patan|jain/.test(d.id); }),
        noPeople:!Object.keys(s.chars).some(function (id) { return s.chars[id].religion === 'jain'; }),
        pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({scope:true,local:null,activity:null,noService:true,noTravel:true,noPeople:true,pure:true});
  });

function hinduServiceFacts() {
  const s = FB.state, me = s.chars[s.player.charId];
  return JSON.parse(JSON.stringify({start:s.start,gold:s.player.gold,piety:s.player.piety,
    faith:me.religion,spouse:me.spouseId,activity:me.religiousActivity,history:me.religiousActivityHistory,
    heads:s.religiousHeads,institutions:s.localInstitutions,property:s.abbeys,
    residents:FB.countyCommunities(s,'mansura')}));
}
for (const distribution of ['standard','CrazyGames']) test(distribution + ' retains Hindu service property and one pending observance after another bookmark',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo,distribution === 'CrazyGames');
    expect(await page.evaluate(function () { return FB.platform.isCrazyGames; })).toBe(distribution === 'CrazyGames');
    const saved = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      hinduFoundation('brahmanabad'); hinduAdmit('brahmanabad');
      FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,'brahmanabad_lay_support_711',me.id,
        'donation',{fund:'ritual_supplies',amount:2}));
      if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'brahmanabad_funded_observance_711',me.id)))
        throw new Error('Expected a funded observance');
      return FB.save.serialize();
    });
    const before = await page.evaluate(hinduServiceFacts);
    await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
    const after = await page.evaluate(hinduServiceFacts);
    await page.evaluate(function () {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
      });
    });
    await restoreBookmark(page,saved);
    expect(await page.evaluate(hinduServiceFacts)).toEqual(before);
    await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
    expect(await page.evaluate(hinduServiceFacts)).toEqual(after);
  });


test('a deceased lay donor creates no temple successor or return of dedicated property',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], h = hinduFoundation('brahmanabad');
      hinduAdmit('brahmanabad');
      const property = JSON.stringify(h), heads = JSON.stringify(s.religiousHeads), people = Object.keys(s.chars).length;
      me.dead = true;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const snapshot = FB.religiousInstitutionSnapshot(s,'brahmanabad_ritual_support_711');
      return {property:property === JSON.stringify(h),heads:heads === JSON.stringify(s.religiousHeads),
        people:people === Object.keys(s.chars).length,holder:snapshot.holderId,
        land:s.player.landPlots.length,privateHolder:h.holderId,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({property:true,heads:true,people:true,holder:null,land:0,privateHolder:null,pure:true});
  });


// Each retained world has its own placement decision; a later date is not consent.
test('all seven openings keep Hindu service scoped and Jain delivery unplaced',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const faults = [], serviceIds = ['brahmanabad_ritual_support_711','debal_temple_service_711'];
      const faiths = ['brahmanical_476','hindu_711','jain'];
      ['476','493','711','800','867','1066','1204'].forEach(function (id) {
        const revisions = FB.bookmarkRevisions(id);
        if (!revisions.length) faults.push(id + ': missing revisions');
        revisions.forEach(function (b) {
          const label = id + '/' + b.revision;
          const review = id === '711' && ['hindu_service_v2','hindu_service_v2_governments_v2'].includes(b.revision);
          const local = Object.keys(b.localInstitutions || {}).filter(function (iid) {
            return faiths.includes(b.localInstitutions[iid].religion);
          }).sort();
          if (JSON.stringify(local) !== JSON.stringify(review ? serviceIds : []))
            faults.push(label + ': unexpected local institution');
          if (['800','867','1066','1204'].includes(id)) {
            b.provinces.forEach(function (p) {
              if ([p.religion].concat((p.communities || []).map(function (c) { return c.religion; }))
                .some(function (faith) { return faiths.includes(faith); }))
                faults.push(label + ': unsupported resident assignment ' + p.id);
            });
            if (b.realms.some(function (r) { return faiths.includes(r.religion); }))
              faults.push(label + ': unsupported court assignment');
          }
          if (FB.faithHistoricalAvailable('hindu_711',b,'community') !== (id === '711') ||
              FB.faithHistoricalAvailable('brahmanical_476',b,'community') !== ['476','493'].includes(id) ||
              FB.faithHistoricalAvailable('jain',b,'community') ||
              FB.faithHistoricalAvailable('jain',b,'institution') !== (id === '1204'))
            faults.push(label + ': widened identity scope');
        });
      });
      return {faults:faults,selected:FBDATA.bookmarks['711'].revision,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({faults:[],selected:'terrain_v2_governments_v2',pure:true});
  });

for (const key of ['debal','brahmanabad']) test(key + ' service expiry preserves the community, membership and unused gifts',
  async function ({page},testInfo) {
    await startHinduService(page,testInfo);
    expect(await page.evaluate(function (key) {
      const s = FB.state, me = s.chars[s.player.charId], h = hinduFoundation(key);
      hinduAdmit(key);
      const amount = key === 'debal' ? 1 : 2;
      if (!FB.religiousPatronageApply(s,FB.religiousPatronageQuote(s,key + '_lay_support_711',me.id,
        'donation',{fund:'ritual_supplies',amount:amount}))) throw new Error('Gift setup failed');
      const quote = FB.religiousActivityQuote(s,key + '_funded_observance_711',me.id);
      if (!FB.religiousActivityApply(s,quote)) throw new Error('Service setup failed');
      const property = JSON.stringify(h), residents = JSON.stringify(FB.countyCommunities(s,s.player.provinceId));
      const iid = key === 'debal' ? 'debal_temple_service_711' : 'brahmanabad_ritual_support_711';
      s.date.year = 712; s.turn += 2;
      FB.religiousActivityTick(s);
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const fresh = FB.religiousActivityQuote(s,key + '_local_observance_711',me.id);
      const gift = FB.religiousPatronageQuote(s,key + '_lay_support_711',me.id,
        'donation',{fund:'ritual_supplies',amount:amount});
      return {ended:!me.religiousActivity,reward:!!(me.religiousActivityHistory || {}).hindu_local_observance_711,
        piety:s.player.piety,property:property === JSON.stringify(h),
        residents:residents === JSON.stringify(FB.countyCommunities(s,s.player.provinceId)),
        member:s.localInstitutions[iid].members[me.id].status,faith:me.religion,
        denied:!fresh.allowed && !gift.allowed,
        applied:FB.religiousActivityApply(s,quote) || FB.religiousActivityApply(s,fresh) || FB.religiousPatronageApply(s,gift),
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },key)).toEqual({ended:true,reward:false,piety:0,property:true,residents:true,member:'active',
      faith:'hindu_711',denied:true,applied:false,pure:true});
  });

for (const distribution of ['standard','CrazyGames']) {
  test(distribution + ' retained 711 save never acquires opt-in service institutions',
    async function ({page},testInfo) {
      await startIndusHousehold(page,testInfo,'711',{crazygames:distribution === 'CrazyGames'});
      expect(await page.evaluate(function () { return FB.platform.isCrazyGames; })).toBe(distribution === 'CrazyGames');
      const saved = await page.evaluate(function () { return FB.save.serialize(); });
      const before = await page.evaluate(hinduServiceFacts);
      expect(before.start.revision).toBe('terrain_v2_governments_v2');
      await page.evaluate(function (revision) {
        FBDATA.bookmarks['711'].revision = revision;
        return new Promise(function (resolve,reject) {
          FB.activateBookmark('711',null,function (error) { if (error) reject(error); else resolve(); });
        });
      },HINDU_REVIEW);
      expect(await page.evaluate(function () {
        return !!FB.bookmark('711').localInstitutions.brahmanabad_ritual_support_711;
      })).toBe(true);
      await restoreBookmark(page,saved);
      expect(await page.evaluate(hinduServiceFacts)).toEqual(before);
      expect(await page.evaluate(function () {
        const s = FB.state, me = s.chars[s.player.charId];
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const denied = ['debal','brahmanabad'].every(function (key) {
          const activity = FB.religiousActivityQuote(s,key + '_local_observance_711',me.id);
          const gift = FB.religiousPatronageQuote(s,key + '_lay_support_711',me.id,
            'donation',{fund:'ritual_supplies',amount:1});
          return activity && !activity.allowed && gift && !gift.allowed &&
            !FB.religiousActivityApply(s,activity) && !FB.religiousPatronageApply(s,gift);
        });
        return {denied:denied,local:FB.religiousInstitutionSnapshot(s,'brahmanabad_ritual_support_711'),
          revision:FB.campaignBookmark(s).revision,
          pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      })).toEqual({denied:true,local:null,revision:'terrain_v2_governments_v2',pure:true});
    });

  for (const id of ['476','493']) test(distribution + ' ' + id + ' ancestry, household rules and one project survive a later world',
    async function ({page},testInfo) {
      await startIndusHousehold(page,testInfo,id,{crazygames:distribution === 'CrazyGames'});
      expect(await page.evaluate(function () { return FB.platform.isCrazyGames; })).toBe(distribution === 'CrazyGames');
      await page.evaluate(function () {
        const s = FB.state, me = s.chars[s.player.charId], pid = s.player.provinceId;
        const faith = FB.createFaith(s,{id:'e2e_indus_household',name:'Indus household practice',
          parent:'brahmanical_476',relationToParent:'in_fold',founderId:me.id});
        if (!faith) throw new Error('Expected a generated descendant');
        const child = FB.makeCharacter(s,{name:'Household descendant',sex:'f',born:s.date.year - 8,
          culture:me.culture,religion:faith,fatherId:me.id,traits:[]});
        me.childrenIds.push(child.id);
        if (!FB.startCountyCommunityProject(s,pid,{kind:'faith',target:faith,sponsor:'player',policy:'voluntary'}))
          throw new Error('Expected one voluntary project');
        s.population.counties[pid].communityProjects.faith.progress = 0.25;
      });
      function facts() {
        const s = FB.state, me = s.chars[s.player.charId], faith = 'e2e_indus_household';
        return JSON.parse(JSON.stringify({start:s.start,gold:s.player.gold,faith:me.religion,
          children:me.childrenIds.map(function (cid) {
            const c = s.chars[cid]; return [cid,c.religion,c.fatherId];
          }),spouses:FB.spousesSnapshot(s,me).map(function (c) { return c.id; }),
          lineage:FB.faithLineage(faith,s),doctrine:FB.marriageDoctrine(faith,s),
          rows:FB.countyCommunities(s,s.player.provinceId),
          project:FB.countyCommunityProject(s,s.player.provinceId,'faith'),
          institutions:s.localInstitutions,heads:s.religiousHeads,houses:s.abbeys && s.abbeys.houses || [],
          rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()}));
      }
      const saved = await page.evaluate(function () { return FB.save.serialize(); });
      const before = await page.evaluate(facts);
      expect(before.lineage).toEqual(['e2e_indus_household','brahmanical_476']);
      expect(before.project.progress).toBe(0.25);
      expect(before.houses).toEqual([]);
      await page.evaluate(function () {
        return new Promise(function (resolve,reject) {
          FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
        });
      });
      await restoreBookmark(page,saved);
      expect(await page.evaluate(facts)).toEqual(before);
    });
}
