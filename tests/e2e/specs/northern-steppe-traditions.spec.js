'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {startHistoricalGame} = require('../support/game/historical-start');
const {injectHolyWarHarness} = require('../support/game/holywar-harness');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/cultures.js','data/technology.js','data/economy.js',
  'data/map_data.js','data/bookmarks.js','data/bookmark_476.js','data/bookmark_476_outer.js',
  'data/bookmark_476_gaul_iberia.js','data/bookmark_476_wider_identities.js',
  'data/bookmark_476_wider.js','data/bookmark_493_world.js','data/bookmark_711.js',
  'data/bookmark_711_terrain.js','js/model.js','js/world.js','js/events.js',
  'js/economy.js','js/mods.js','js/save.js','js/save_v4.js','js/main.js',
  'data/religious_activities.js','data/religious_institutions.js','data/political_institutions.js',
  'js/religious_activities.js','js/religious_institutions.js','js/authority.js',
  'js/institutions.js','js/population.js','js/modifiers.js','js/treasury.js',
  'js/settlement.js','js/justice.js','js/intrigue.js','js/ui_religious_activities.js',
  'js/ui_misc.js','js/ui_modals.js','css/style.css',
  'data/counties.js','data/geographies.js','data/bookmark_800.js','data/bookmark_800_expansion.js',
  'data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js','data/bookmark_1204.js',
  'data/bookmark_1204_terrain.js','data/mobile_confederations.js','data/units.js','data/travel.js',
  'js/mobile_confederations.js','js/governments.js','js/government_continuity.js','js/government_selection.js',
  'js/armies.js','js/federates.js','js/logistics.js','js/market.js','js/holywar.js',
  'js/wars.js','js/travel.js','js/crazygames.js','js/util.js']);

test('released faiths and their inherited defaults keep their catalogue fingerprints',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
    expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
  });

test('Germanic household queries override pagan doctrine without creating a religious office or ladder',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const faith = 'germanic_pagan';
      const rules = ['head','holyWarTradition','raidingTradition','clergyMarriage',
        'religiousPaths','marriage.spouseLimit.m','roles.monasticF','words.cleric'];
      const local = rules.every(function (key) { return FB.faithValue(null,faith,key).sourceId === faith; });
      return {local:local,limits:FB.marriageDoctrine(faith,null).spouseLimit,
        marriage:FB.religionOf(faith,null).clergyMarriage,
        office:FB.faithOfficeId(faith,null),paths:FB.religionOf(faith,null).religiousPaths,
        holyWar:FB.religionOf(faith,null).holyWarTradition,
        words:[FB.faithDataText(null,null,faith,'roles.monasticF',{}),
          FB.faithDataText(null,null,faith,'roles.priestM',{}),
          FB.faithDataText(null,null,faith,'words.partnership',{})],
        errors:FB.validateReligionData(null),technology:FB.validateTechnologyData(true),
        impact:FBDATA.techImpactReviews.features.germanic_household_rules.mode,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({local:true,limits:{m:1,f:1},marriage:true,office:null,paths:null,
      holyWar:null,words:['Religious student','Ritual participant','Trade partnership'],
      errors:[],technology:[],impact:'none',pure:true});
  });

test('faith-derived raiding is removed without disabling independent cultural eligibility',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      return {germanic:FB.hasFaithRaidingTradition('germanic_pagan',null),
        frankish:FB.hasRaidingTradition('frankish','germanic_pagan',null),
        norseCulture:FB.hasRaidingTradition('norse','germanic_pagan',null),
        released:FB.hasFaithRaidingTradition('norse_pagan',null),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({germanic:false,frankish:false,norseCulture:true,released:true,pure:true});
  });

test('held regional profiles retain separate early availability and no universal head',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const ids = ['insular_traditional_476','finnic_traditional_476','woodland_traditional_476',
        'steppe_traditional_476','caucasian_traditional_476'];
      const dates = ['476','493','711','800','867','1066','1204'];
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      return {availability:ids.map(function (id) {
        return dates.map(function (date) { return FB.faithHistoricalAvailable(id,FB.bookmark(date),'community'); });
      }),heads:ids.map(function (id) { return FB.faithOfficeId(id,null); }),
      roots:ids.every(function (id) { return FB.faithLineage(id,null).length === 1; }),
      worlds:dates.map(function (id) { return FB.validateBookmark(FB.bookmark(id)); }),
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({availability:Array(5).fill([true,true,false,false,false,false,false]),
      heads:[null,null,null,null,null],roots:true,worlds:[[],[],[],[],[],[],[]],pure:true});
  });

test('early consumers preserve their independent Caucasian, Volga and mixed Irish assignments',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const rows = ['476','493'].map(function (id) {
        const b = FB.bookmark(id);
        function county(pid) { return b.provinces.find(function (p) { return p.id === pid; }); }
        return {revision:b.revision,faiths:['sukhumi','magas','bolghar','bilyar'].map(function (pid) {
          return county(pid).religion;
        }),irish:county('tara').communities.map(function (c) { return [c.religion,c.populationShare0]; }),
        court:b.realms.find(function (r) { return r.id === (id === '476' ? 'abazgia_476' : 'alan_493'); }).religion};
      });
      return {rows:rows,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({rows:[
      {revision:'wider_v2',faiths:['caucasian_traditional_476','steppe_traditional_476',
        'finnic_traditional_476','finnic_traditional_476'],
        irish:[['insular_traditional_476',6500],['nicene',3500]],court:'caucasian_traditional_476'},
      {revision:'world_v2',faiths:['caucasian_christian_476','caucasian_traditional_476',
        'steppe_traditional_476','steppe_traditional_476'],
        irish:[['insular_traditional_476',7500],['nicene',2500]],court:'caucasian_traditional_476'}
    ],pure:true});
  });

test('a religious student can marry under Germanic household rules while released Norse vows and capacity persist',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      FB.spousesSnapshot(s,me).forEach(function (c) { c.spouseId = null; c.spouseIds = []; });
      me.spouseId = null; me.spouseIds = []; me.betrothedId = null;
      me.sex = 'm'; me.born = s.date.year - 30; me.religion = 'germanic_pagan';
      me.career = {profession:'monk',rank:'journeyman',chosen:true,startedYear:s.date.year,
        experience:0,guildRank:'none',guildStanding:0};
      s.player.profession = 'monk'; s.player.courtingId = null;
      const partner = FB.makeCharacter(s,{name:'Ordinary Partner',sex:'f',born:s.date.year - 25,
        culture:me.culture,religion:me.religion,traits:[],opinion:100});
      partner.homeProvinceId = s.player.provinceId;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const ordinary = FB.courtshipStatus(s,partner,false);
      const standings = FB.religiousStandings(s,me);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      me.religion = 'norse_pagan'; partner.religion = me.religion;
      const retained = FB.courtshipStatus(s,partner,false);
      me.spouseId = partner.id; me.spouseIds = [partner.id]; partner.spouseId = me.id;
      const norseCapacity = FB.canWedSnapshot(s);
      me.religion = 'germanic_pagan';
      const germanicCapacity = FB.canWedSnapshot(s);
      return {ordinary:ordinary.ready,standings:standings,retained:retained.code,
        capacity:[germanicCapacity,norseCapacity],pure:pure};
    })).toEqual({ordinary:true,standings:[],retained:'vocation_vow',capacity:[false,true],pure:true});
  });

test('held mixed communities, generated Germanic descendants and household state survive restore',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'493');
    const source = await page.evaluate(function () {
      const s = FB.state;
      const id = FB.createFaith(s,{id:'e2e_germanic_branch',name:'Local Household',parent:'germanic_pagan',
        relationToParent:'in_fold',founderId:s.player.charId});
      if (!id) throw new Error('Generated faith setup failed.');
      const child = FB.makeCharacter(s,{name:'Household Descendant',sex:'f',born:s.date.year - 8,
        culture:s.chars[s.player.charId].culture,religion:id,fatherId:s.player.charId,traits:[]});
      s.chars[s.player.charId].childrenIds.push(child.id);
      const facts = {community:FB.countyCommunities(s,'tara'),lineage:FB.faithLineage(id,s),
        doctrine:FB.marriageDoctrine(id,s),role:FB.faithValue(s,id,'roles.monasticF'),
        heads:JSON.parse(JSON.stringify(s.religiousHeads)),child:child.religion,
        start:JSON.parse(JSON.stringify(s.start))};
      return {saved:FB.save.serialize(),facts:facts,childId:child.id};
    });
    await openGame(page,testInfo);
    await restoreBookmark(page,source.saved);
    expect(await page.evaluate(function (input) {
      const s = FB.state, id = 'e2e_germanic_branch';
      return {community:FB.countyCommunities(s,'tara'),lineage:FB.faithLineage(id,s),
        doctrine:FB.marriageDoctrine(id,s),role:FB.faithValue(s,id,'roles.monasticF'),
        heads:JSON.parse(JSON.stringify(s.religiousHeads)),child:s.chars[input.childId].religion,
        start:JSON.parse(JSON.stringify(s.start))};
    },source)).toEqual(source.facts);
  });

function stageNorthernObservance(input) {
  const s = FB.state, c = s.chars[s.player.charId];
  FB.game.setPaused(true);
  s.player.provinceId = input.province;
  c.religion = s.player.religion = input.faith;
  c.sex = input.sex || 'f'; c.born = s.date.year - 30; c.health = 8;
  s.player.gold = input.gold; s.player.travel = null;
  s.player.flags.on_campaign = false; s.player.flags.in_prison = false;
}

test('early district activities validate without new shrines, offices, seasonal calendars or primary faiths',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const ids = ['uppakra_local_observance','samogitian_mortuary_observance','samogitian_mortuary_support'];
      return {faults:FB.religiousActivityCatalogFaults(FBDATA),
        technology:FB.validateTechnologyData(true),
        impact:FBDATA.techImpactReviews.features.northern_local_observance.mode,
        rows:ids.map(function (id) {
          const d = FBDATA.religiousActivities[id];
          return {scope:d.provinceIds,openings:d.openings,institution:d.institutionId,
            roles:d.roleIds,calendar:d.calendar,cost:d.cost,milestone:d.milestone,
            land:FB.bookmark('493').provinces.some(function (p) { return p.id === d.provinceIds[0] && !p.wasteland; })};
        }),pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({faults:[],technology:[],impact:'none',rows:[
      {scope:['lund'],openings:[{id:'476',revision:'wider_v2'},{id:'493',revision:'world_v2'}],
        institution:null,roles:[],calendar:'any_day',cost:1,milestone:'uppakra_local_observance',land:true},
      {scope:['samogitia'],openings:[{id:'476',revision:'wider_v2'},{id:'493',revision:'world_v2'}],
        institution:null,roles:[],calendar:'any_day',cost:0,milestone:'samogitian_mortuary_observance',land:true},
      {scope:['samogitia'],openings:[{id:'476',revision:'wider_v2'},{id:'493',revision:'world_v2'}],
        institution:null,roles:[],calendar:'any_day',cost:1,milestone:'samogitian_mortuary_observance',land:true}
    ],pure:true});
  });

for (const opening of ['476','493']) {
  test(opening + ' permits two independent household consumers and a free remembrance fallback',
    async function ({page},testInfo) {
      await beginBookmark(page,testInfo,opening);
      await page.evaluate(stageNorthernObservance,{province:'lund',faith:'germanic_pagan',gold:1,sex:opening === '476' ? 'f' : 'm'});
      const uppakra = await page.evaluate(function () {
        const s = FB.state, c = s.chars[s.player.charId];
        const property = JSON.stringify([s.abbeys,s.localInstitutions,s.religiousHeads,s.population]);
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const piety = s.player.piety, prestige = s.player.prestige;
        const q = FB.religiousActivityQuote(s,'uppakra_local_observance',c.id);
        FB.religiousActivityQuote(s,'uppakra_local_observance',c.id);
        const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        const started = FB.religiousActivityApply(s,q), early = FB.religiousActivityFinish(s,c.id,false);
        s.turn++; FB.religiousActivityTick(s);
        return {pure:pure,started:started,early:early,gold:s.player.gold,
          piety:s.player.piety - piety,prestige:s.player.prestige - prestige,
          performed:c.religiousActivityHistory.uppakra_local_observance.performed,
          duplicate:FB.religiousActivityQuote(s,'uppakra_local_observance',c.id).reason,
          property:property === JSON.stringify([s.abbeys,s.localInstitutions,s.religiousHeads,s.population])};
      });
      expect(uppakra).toEqual({pure:true,started:true,early:false,gold:0,piety:1,prestige:1,
        performed:true,duplicate:'commitment',property:true});
      await page.evaluate(stageNorthernObservance,{province:'samogitia',faith:'baltic_pagan',gold:0,sex:opening === '476' ? 'f' : 'm'});
      expect(await page.evaluate(function () {
        const s = FB.state, c = s.chars[s.player.charId], piety = s.player.piety;
        const paid = FB.religiousActivityQuote(s,'samogitian_mortuary_support',c.id);
        const free = FB.religiousActivityQuote(s,'samogitian_mortuary_observance',c.id);
        const started = FB.religiousActivityApply(s,free);
        s.turn += 2; FB.religiousActivityTick(s);
        s.player.gold = 1;
        return {unaffordable:paid.reason,started:started,piety:s.player.piety - piety,gold:s.player.gold,
          paidDuplicate:FB.religiousActivityQuote(s,'samogitian_mortuary_support',c.id).reason,
          office:!!c.religiousOfficeId,membership:!!c.religiousAffiliations};
      })).toEqual({unaffordable:'funds',started:true,piety:1,gold:1,paidDuplicate:'commitment',
        office:false,membership:false});
    });
}

test('district, exact opening revision, live year and faith independently gate local observance',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'493');
    await page.evaluate(stageNorthernObservance,{province:'lund',faith:'germanic_pagan',gold:1});
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], original = JSON.stringify(s);
      function allowed() { return FB.religiousActivityQuote(s,'uppakra_local_observance',c.id).allowed; }
      const accepted = allowed(); s.player.provinceId = 'samogitia'; const place = allowed();
      s.player.provinceId = 'lund'; c.religion = 'norse_pagan'; const faith = allowed(); c.religion = 'germanic_pagan';
      const revision = s.start.revision; s.start.revision = 'baseline'; const baseline = allowed(); s.start.revision = revision;
      const year = s.date.year; s.date.year = 600; const expired = allowed(); s.date.year = year;
      const id = s.start.id; s.start.id = '711'; const later = allowed(); s.start.id = id;
      return {accepted:accepted,place:place,faith:faith,baseline:baseline,expired:expired,later:later,pure:original === JSON.stringify(s)};
    })).toEqual({accepted:true,place:false,faith:false,baseline:false,expired:false,later:false,pure:true});
  });

test('a different ruling faith permits protected observance while persecution interrupts without conversion',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'493');
    await page.evaluate(stageNorthernObservance,{province:'lund',faith:'germanic_pagan',gold:1});
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], rid = s.holder.lund || s.owner.lund;
      const communities = JSON.stringify(s.population), faith = c.religion, offices = JSON.stringify(s.religiousHeads);
      const identity = {eliteCultureId:'norse',eliteFaithId:'nicene',legalIdentityId:'customary',
        tolerance:'tolerant',taxation:'equal',justicePolicy:'personal'};
      if (!FB.authoritySetIdentity(s,rid,identity)) throw new Error('Requires a local government identity');
      const q = FB.religiousActivityQuote(s,'uppakra_local_observance',c.id);
      const started = FB.religiousActivityApply(s,q), piety = s.player.piety;
      FB.authoritySetIdentity(s,rid,Object.assign({},identity,{tolerance:'persecution'}));
      s.turn++; FB.religiousActivityTick(s);
      const blocked = FB.religiousActivityQuote(s,'uppakra_local_observance',c.id).reason;
      return {started:started,blocked:blocked,interrupted:!c.religiousActivity,receipt:!!c.religiousActivityHistory,
        gold:s.player.gold,piety:s.player.piety === piety,faith:c.religion === faith,
        communities:communities === JSON.stringify(s.population),offices:offices === JSON.stringify(s.religiousHeads)};
    })).toEqual({started:true,blocked:'eligibility',interrupted:true,receipt:false,gold:0,piety:true,
      faith:true,communities:true,offices:true});
  });

test('material support rejects stale payment and movement cancels before a reward',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'493');
    await page.evaluate(stageNorthernObservance,{province:'samogitia',faith:'baltic_pagan',gold:2});
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], id = 'samogitian_mortuary_support';
      const q = FB.religiousActivityQuote(s,id,c.id); s.player.gold = 1;
      const before = JSON.stringify(s), stale = !FB.religiousActivityApply(s,q) && before === JSON.stringify(s);
      const fresh = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,id,c.id)), piety = s.player.piety;
      s.player.provinceId = 'lund'; s.turn += 2; FB.religiousActivityTick(s);
      return {stale:stale,fresh:fresh,gold:s.player.gold,interrupted:!c.religiousActivity,
        noReward:s.player.piety === piety && !c.religiousActivityHistory};
    })).toEqual({stale:true,fresh:true,gold:0,interrupted:true,noReward:true});
  });

test('public local participation obeys the same district and its own public budget',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'493');
    expect(await page.evaluate(function () {
      const s = FB.state, d = JSON.parse(JSON.stringify(FBDATA.religiousActivities.uppakra_local_observance));
      Object.assign(d,{payer:'public',ai:true,reward:{piety:0,prestige:0,skills:{}}});
      FBDATA.religiousActivities.test_northern_public = d;
      FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
      const rid = s.holder.lund || s.owner.lund, c = FB.realmRulerCharacterSnapshot(s,rid);
      if (!c || !FB.treasuryCounterparty(s,rid)) throw new Error('Requires an existing public ruler and account');
      c.health = 8; c.born = s.date.year - 30; c.religion = 'germanic_pagan';
      s.realms[rid].treasury.gold = 10; s.realms[rid].treasury.militaryAccrued = 0;
      const purse = s.player.gold, funds = FB.treasuryAvailable(s,rid);
      const q = FB.religiousActivityQuote(s,'test_northern_public',c.id);
      const started = FB.religiousActivityApply(s,q); s.turn++; FB.religiousActivityTick(s);
      delete c.religiousActivityHistory;
      s.realms[rid].treasury.gold = 0;
      const broke = FB.religiousActivityQuote(s,'test_northern_public',c.id).reason;
      s.realms[rid].treasury.gold = funds - 1;
      FBDATA.religiousActivities.test_northern_public.provinceIds = ['samogitia'];
      const away = FB.religiousActivityQuote(s,'test_northern_public',c.id).reason;
      return {started:started,spend:funds - FB.treasuryAvailable(s,rid),own:q.payer.id === rid,
        household:s.player.gold === purse,broke:broke,away:away};
    })).toEqual({started:true,spend:1,own:true,household:true,broke:'funds',away:'eligibility'});
  });

test('local scope validation is atomic and retained commitments reject a forged district',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'493');
    await page.evaluate(stageNorthernObservance,{province:'lund',faith:'germanic_pagan',gold:1});
    expect(await page.evaluate(function () {
      const s = FB.state, cid = s.player.charId;
      const bad = [[],['lund','lund'],['bad-place'],null];
      const failures = bad.map(function (scope) {
        const data = Object.assign({},FBDATA,{religiousActivities:{},religiousPatronage:{}});
        data.religiousActivities.test_scope = Object.assign({},FBDATA.religiousActivities.uppakra_local_observance,{provinceIds:scope});
        return FB.religiousActivityCatalogFaults(data).length > 0;
      });
      const journey = Object.assign({},FBDATA.religiousActivities.uppakra_local_observance,{mode:'journey'});
      const invalid = Object.assign({},FBDATA,{religiousActivities:{test_scope:journey},religiousPatronage:{}});
      failures.push(FB.religiousActivityCatalogFaults(invalid).length > 0);
      const dataBefore = JSON.stringify(FBDATA);
      const modRejected = FB.mods.validate({name:'Invalid district activity',religiousActivities:{
        test_scope:Object.assign({},FBDATA.religiousActivities.uppakra_local_observance,{protectedWorship:'yes'})
      }}).length > 0;
      if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'uppakra_local_observance',cid))) throw new Error('Activity setup failed');
      const before = JSON.stringify(s), v = JSON.parse(before);
      v.chars[cid].religiousActivity.location = 'samogitia';
      let forged = false; try { FB.validateReligiousActivityState(v); } catch (e) { forged = true; }
      FB.validateReligiousActivityState(s);
      return {failures:failures,modRejected:modRejected,forged:forged,
        pure:before === JSON.stringify(s) && dataBefore === JSON.stringify(FBDATA)};
    })).toEqual({failures:[true,true,true,true,true],modRejected:true,forged:true,pure:true});
  });

test('restore retains a local commitment without creating property and completes its frozen district terms once',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'493');
    await page.evaluate(stageNorthernObservance,{province:'samogitia',faith:'baltic_pagan',gold:1});
    const original = await page.evaluate(function () {
      const s = FB.state;
      if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'samogitian_mortuary_support',s.player.charId))) throw new Error('Activity setup failed');
      return FB.save.serialize();
    });
    function retained() {
      const s = FB.state, c = s.chars[s.player.charId];
      return JSON.parse(JSON.stringify({start:s.start,activity:c.religiousActivity,history:c.religiousActivityHistory,
        faith:c.religion,gold:s.player.gold,piety:s.player.piety,property:[s.abbeys,s.localInstitutions,s.religiousHeads],
        communities:s.population,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()}));
    }
    const before = await page.evaluate(retained);
    await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
    const after = await page.evaluate(retained);
    await openGame(page,testInfo); await startDeterministicGame(page);
    await restoreBookmark(page,original);
    expect(await page.evaluate(retained)).toEqual(before);
    await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
    expect(await page.evaluate(retained)).toEqual(after);
  });

test('narrow local activity review discloses district, worship access, price and time and retains Back focus',
  async function ({page},testInfo) {
    await page.setViewportSize({width:390,height:844});
    await beginBookmark(page,testInfo,'493');
    await page.evaluate(stageNorthernObservance,{province:'lund',faith:'germanic_pagan',gold:1});
    await page.evaluate(function () { FB.ui.showReligiousActivities(); });
    const button = page.locator('#activity-review-uppakra_local_observance');
    await button.click();
    await expect(page.locator('#gm-body')).toContainText('Permitted locations');
    await expect(page.locator('#gm-body')).toContainText('Participation requires protected local worship.');
    await expect(page.locator('#gm-body')).toContainText('Uppakra district');
    await expect(page.locator('#gm-body')).toContainText('Cost on acceptance');
    await expect(page.locator('#gm-body')).toContainText('1 days at this location');
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
    expect(await page.evaluate(function () {
      const box = document.getElementById('gm-body'); return box.scrollWidth <= box.clientWidth + 1;
    })).toBe(true);
  });

test('seven opening decisions gate district participation by independent dates and retained revisions',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'1066');
    const result = await page.evaluate(function () {
      const source = JSON.stringify(FB.state), data = JSON.stringify(FBDATA);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const dates = ['476','493','711','800','867','1066','1204'];
      const profiles = ['uppakra_local_observance','samogitian_mortuary_observance',
        'samogitian_mortuary_support','uppsala_local_gathering'];
      const accepted = [[],[],[],[]]; let pure = true, bounds = true;
      dates.forEach(function (date) {
        FB.bookmarkRevisions(date).forEach(function (b) {
          profiles.forEach(function (id,index) {
            const s = JSON.parse(source), d = FBDATA.religiousActivities[id], cid = s.player.charId;
            s.start.id = date; s.start.revision = b.revision || 'baseline'; s.date.year = Number(date);
            s.player.provinceId = d.provinceIds[0]; s.player.travel = null; s.player.gold = 10;
            s.chars[cid].religion = s.player.religion = d.faithIds[0];
            s.chars[cid].born = s.date.year - 30; s.chars[cid].health = 8;
            const before = JSON.stringify(s), q = FB.religiousActivityQuote(s,id,cid);
            pure = pure && before === JSON.stringify(s);
            if (!q || !q.allowed) return;
            accepted[index].push(date + ':' + s.start.revision);
            const p = FBDATA.provinces.find(function (p) { return p.id === d.provinceIds[0]; });
            bounds = bounds && !!p && p.x >= -11 && p.x <= 70 && p.y >= 13 && p.y <= 66 &&
              b.provinces.some(function (v) { return v.id === p.id && !v.wasteland; });
          });
        });
      });
      return {accepted:accepted,bounds:bounds,pure:pure && source === JSON.stringify(FB.state) &&
        data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    expect(result).toEqual({accepted:[
      ['476:wider_v2','493:world_v2'],['476:wider_v2','493:world_v2'],
      ['476:wider_v2','493:world_v2'],['1066:baseline','1066:inhabited_v2']
    ],bounds:true,pure:true});
  });

for (const revision of ['baseline','inhabited_v2']) {
  test(revision + ' 1066 gathering consumes household supplies once without granting ranks or property',
    async function ({page},testInfo) {
      await page.addInitScript(function (revision) {
        document.addEventListener('DOMContentLoaded',function () {
          FBDATA.bookmarks['1066'].revision = revision;
        },{once:true});
      },revision);
      await beginBookmark(page,testInfo,'1066');
      await page.evaluate(stageNorthernObservance,{province:'uppsala',faith:'norse_pagan',gold:1,
        sex:revision === 'baseline' ? 'f' : 'm'});
      expect(await page.evaluate(function () {
        const s = FB.state, c = s.chars[s.player.charId], id = 'uppsala_local_gathering';
        const retained = JSON.stringify([s.population,s.localInstitutions,s.abbeys,s.religiousHeads,
          c.religiousRanks,c.religiousAffiliations,c.traits,c.career,s.player.landPlots]);
        const piety = s.player.piety, prestige = s.player.prestige, q = FB.religiousActivityQuote(s,id,c.id);
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        FB.religiousActivityQuote(s,id,c.id);
        const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        const started = FB.religiousActivityApply(s,q), repeat = FB.religiousActivityApply(s,q);
        s.turn++; FB.religiousActivityTick(s); const waiting = !!c.religiousActivity;
        s.turn++; FB.religiousActivityTick(s); FB.religiousActivityTick(s);
        return {revision:s.start.revision,pure:pure,started:started,repeat:repeat,waiting:waiting,
          gold:s.player.gold,piety:s.player.piety - piety,prestige:s.player.prestige - prestige,
          performed:c.religiousActivityHistory[id].performed,
          duplicate:FB.religiousActivityQuote(s,id,c.id).reason,
          retained:retained === JSON.stringify([s.population,s.localInstitutions,s.abbeys,s.religiousHeads,
            c.religiousRanks,c.religiousAffiliations,c.traits,c.career,s.player.landPlots])};
      })).toEqual({revision:revision,pure:true,started:true,repeat:false,waiting:true,gold:0,
        piety:1,prestige:1,performed:true,duplicate:'commitment',retained:true});
    });
}

test('ordinary 1066 participation implies no festival season and a changed year invalidates a pending review',
  async function ({page},testInfo) {
    await page.addInitScript(function () {
      document.addEventListener('DOMContentLoaded',function () {
        FBDATA.bookmarks['1066'].revision = 'inhabited_v2';
      },{once:true});
    });
    await beginBookmark(page,testInfo,'1066');
    await page.evaluate(stageNorthernObservance,{province:'uppsala',faith:'norse_pagan',gold:1});
    expect(await page.evaluate(function () {
      const s = FB.state, id = 'uppsala_local_gathering', cid = s.player.charId;
      const seasons = [0,1,2,3].map(function (season) {
        const v = JSON.parse(JSON.stringify(s)); v.date.season = season;
        return FB.religiousActivityQuote(v,id,cid).allowed;
      });
      const d = FBDATA.religiousActivities[id], v = JSON.parse(JSON.stringify(FBDATA));
      v.religiousActivities[id].calendar = 'nine_year_equinox';
      const calendarRejected = FB.religiousActivityCatalogFaults(v).length > 0;
      const q = FB.religiousActivityQuote(s,id,cid); s.date.year = 1067;
      const before = JSON.stringify(s), rejected = !FB.religiousActivityApply(s,q) && before === JSON.stringify(s);
      return {seasons:seasons,calendar:d.calendar,calendarRejected:calendarRejected,rejected:rejected,
        later:FB.religiousActivityQuote(s,id,cid).reason,faith:s.chars[cid].religion,gold:s.player.gold};
    })).toEqual({seasons:[true,true,true,true],calendar:'any_day',calendarRejected:true,rejected:true,
      later:'eligibility',faith:'norse_pagan',gold:1});
  });

test('a Christian local authority preserves northern households and one existing voluntary mission project',
  async function ({page},testInfo) {
    await page.addInitScript(function () {
      document.addEventListener('DOMContentLoaded',function () {
        FBDATA.bookmarks['1066'].revision = 'inhabited_v2';
      },{once:true});
    });
    await beginBookmark(page,testInfo,'1066');
    await page.evaluate(stageNorthernObservance,{province:'uppsala',faith:'norse_pagan',gold:1});
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], rid = s.holder.uppsala || s.owner.uppsala;
      // Stage both households explicitly; the fresh revision may be wholly Christian.
      FB.convertCountyCommunity(s,'uppsala',{kind:'faith',target:'norse_pagan',amount:1000});
      const converted = FB.convertCountyCommunity(s,'uppsala',{kind:'faith',target:'catholic',amount:100});
      if (!converted || converted.count !== 100) throw new Error('Mixed community setup failed');
      if (!FB.startCountyCommunityProject(s,'uppsala',{kind:'faith',target:'catholic',sponsor:rid,policy:'voluntary'}))
        throw new Error('Existing mission project setup failed');
      const rec = s.population.counties.uppsala, project = rec.communityProjects.faith;
      project.progress = 0.375;
      const communities = JSON.stringify(rec.communities), projectBefore = JSON.stringify(project);
      const identity = {eliteCultureId:'norse',eliteFaithId:'catholic',legalIdentityId:'latin',
        tolerance:'tolerant',taxation:'equal',justicePolicy:'personal'};
      if (!FB.authoritySetIdentity(s,rid,identity)) throw new Error('Local authority setup failed');
      const started = FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'uppsala_local_gathering',c.id));
      s.turn += 2; FB.religiousActivityTick(s);
      FB.authoritySetIdentity(s,rid,Object.assign({},identity,{tolerance:'persecution'}));
      return {started:started,faith:c.religion,communities:communities === JSON.stringify(rec.communities),
        sameProject:project === rec.communityProjects.faith && projectBefore === JSON.stringify(project),
        progress:project.progress,projects:Object.keys(rec.communityProjects),
        blocked:FB.religiousActivityQuote(s,'uppsala_local_gathering',c.id).reason};
    })).toEqual({started:true,faith:'norse_pagan',communities:true,sameProject:true,progress:0.375,
      projects:['faith'],blocked:'eligibility'});
  });

test('unaccepted Sami and later steppe candidates create no institutions or new pilgrimage destinations',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const held = ['tisso_feast_later','sambian_grove_access_later','birka_local_recognition_later',
        'qipchaq_following_1204','unna_saiva','vindelgransele','sieiddakeadgi'];
      const destinations = ['pilgrim_uppsala','pilgrim_sambia','pilgrim_vilnius','pilgrim_kiev',
        'pilgrim_novgorod','pilgrim_bolghar','pilgrim_etelkoz','pilgrim_sarkel'];
      return {held:held.every(function (id) {
        return !FBDATA.religiousActivities[id] && ['476','493','711','800','867','1066','1204'].every(function (date) {
          return FB.bookmarkRevisions(date).every(function (b) { return !b.localInstitutions || !b.localInstitutions[id]; });
        }) &&
          !FBDATA.travelSites.some(function (v) { return v.id === id; });
      }),legacy:destinations.every(function (id) { return FBDATA.travelSites.some(function (v) { return v.id === id; }); }),
      local:FBDATA.religiousActivities.uppsala_local_gathering.siteId === null,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({held:true,legacy:true,local:true,pure:true});
  });

test('autonomous local participation conserves the public reserve and never charges the household',
  async function ({page},testInfo) {
    await page.addInitScript(function () {
      document.addEventListener('DOMContentLoaded',function () {
        FBDATA.bookmarks['1066'].revision = 'inhabited_v2';
      },{once:true});
    });
    await beginBookmark(page,testInfo,'1066');
    expect(await page.evaluate(function () {
      const s = FB.state, rid = s.owner.uppsala, c = FB.realmRulerCharacterSnapshot(s,rid);
      const faith = 'e2e_northern_ai_faith';
      // An isolated declared-profile fixture gives only this ruler admission.
      FBDATA.religions[faith] = {name:'Public participation fixture',group:'norse_pagan',
        relationToParent:'in_fold',availability:{}};
      c.religion = faith; c.born = s.date.year - 30; c.health = 8;
      const d = JSON.parse(JSON.stringify(FBDATA.religiousActivities.uppsala_local_gathering));
      Object.assign(d,{payer:'public',ai:true,faithIds:[faith],cost:2,reserve:5,
        milestone:'e2e_northern_ai_done',reward:{piety:0,prestige:0,skills:{}}});
      FBDATA.religiousActivities.e2e_northern_ai = d;
      FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
      s.realms[rid].treasury.gold = 6; s.realms[rid].treasury.militaryAccrued = 0;
      const realms = Object.keys(s.realms).sort(); let period = 1;
      while (period <= realms.length && !Array.from({length:Math.min(16,realms.length)},function (_,i) {
        return realms[(period * 16 + i) % realms.length];
      }).includes(rid)) period++;
      if (period > realms.length) throw new Error('Public actor was outside the bounded rotation');
      s.turn = period * 90; delete s.religiousActivityAI;
      const purse = s.player.gold, piety = s.player.piety, prestige = s.player.prestige;
      const blocked = FB.religiousActivityAI(s), untouched = !c.religiousActivity && FB.treasuryAvailable(s,rid) === 6;
      s.realms[rid].treasury.gold = 7; delete s.religiousActivityAI;
      const started = FB.religiousActivityAI(s), repeat = FB.religiousActivityAI(s);
      s.turn += 2; FB.religiousActivityTick(s);
      return {blocked:blocked,untouched:untouched,started:started,repeat:repeat,
        reserve:FB.treasuryAvailable(s,rid),performed:c.religiousActivityHistory.e2e_northern_ai_done.performed,
        private:s.player.gold === purse && s.player.piety === piety && s.player.prestige === prestige};
    })).toEqual({blocked:0,untouched:true,started:1,repeat:0,reserve:5,performed:true,private:true});
  });

test('a mobile court keeps mixed religious members and conserved people when its location changes',
  async function ({page},testInfo) {
    await startHistoricalGame(page,testInfo,{bookmark:'476',
      code:'NORTHERNMOBILE-476-mobile_household_476-cherson-m-Review-established'},false);
    expect(await page.evaluate(function () {
      const s = FB.state, M = FB.mobile, rid = 'pontic_following_476', r = M.row(s,rid);
      const army = M.host(s,rid), origin = M.migration(s,rid).at;
      const member = r.members[1], principal = s.chars[member.principal.id];
      // A mixed following is an acceptance fixture, not an opening assignment.
      principal.religion = 'chalcedonian'; member.civilians[0].religion = principal.religion;
      function identities() {
        const cohorts = []; r.members.forEach(function (m) { cohorts.push.apply(cohorts,m.civilians.concat(m.reserve)); });
        cohorts.push.apply(cohorts,M.host(s,rid).mobileRoster);
        const totals = {}; cohorts.forEach(function (c) { totals[c.religion] = (totals[c.religion] || 0) + c.count; });
        return JSON.stringify({principals:r.members.map(function (m) { return [m.id,s.chars[m.principal.id].religion]; }),
          totals:totals,ids:r.members.map(function (m) { return m.id; })});
      }
      const destination = Object.keys(FB.world.adj[origin]).sort().find(function (pid) {
        return s.owner[pid] && !FB.waterCrossing(origin,pid);
      });
      if (!destination) throw new Error('Expected an inhabited land neighbor');
      FB.transferProvince(s,destination,rid);
      const route = FB.armyOrderPlan(s,army,destination);
      if (!route.ok || !route.path.length || route.path.some(function (pid) {return pid !== origin && pid !== destination;})) throw new Error('Expected a direct permitted land route');
      const population = JSON.stringify([s.population.counties[origin],s.population.counties[destination]]);
      const identitiesBefore = identities(), total = M.total(s,rid);
      const review = M.review(s,{realmId:rid,action:'move',terms:{countyId:destination},actor:{kind:'realm',id:rid}});
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      M.review(s,review.request);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const moved = M.commit(s,review);
      for (let day = 0; day < 90 && M.migration(s,rid).at !== destination; day++) {
        s.turn++; FB.armyTick(s); FB.federateDay(s);
      }
      return {pure:pure,moved:moved,arrived:M.migration(s,rid).at === destination,
        people:M.total(s,rid) === total,identities:identitiesBefore === identities(),
        countyPopulation:population === JSON.stringify([s.population.counties[origin],s.population.counties[destination]]),
        members:r.members.every(function (m) { return s.chars[m.principal.id].homeProvinceId === destination; }),
        valid:M.validate(s)};
    })).toEqual({pure:true,moved:true,arrived:true,people:true,identities:true,countyPopulation:true,members:true,valid:true});
  });

for (const crazygames of [false,true]) {
  test((crazygames ? 'CrazyGames' : 'standard') + ' restore keeps frozen 1066 district terms after a different opening',
    async function ({page},testInfo) {
      await page.addInitScript(function () {
        document.addEventListener('DOMContentLoaded',function () {
          FBDATA.bookmarks['1066'].revision = 'inhabited_v2';
        },{once:true});
      });
      await startHistoricalGame(page,testInfo,{bookmark:'1066',
        code:'NORTHERNSAVE-1066-farmer-uppsala-f-Review-established'},crazygames);
      await page.evaluate(stageNorthernObservance,{province:'uppsala',faith:'norse_pagan',gold:1});
      const original = await page.evaluate(function () {
        const s = FB.state;
        if (!FB.religiousActivityApply(s,FB.religiousActivityQuote(s,'uppsala_local_gathering',s.player.charId)))
          throw new Error('Gathering setup failed');
        return FB.save.serialize();
      });
      function facts() {
        const s = FB.state, c = s.chars[s.player.charId];
        return JSON.parse(JSON.stringify({start:s.start,activity:c.religiousActivity,history:c.religiousActivityHistory,
          household:[c.religion,c.religiousRanks,c.religiousAffiliations,s.player.gold,s.player.piety,s.player.prestige],
          property:[s.abbeys,s.localInstitutions,s.religiousHeads],population:s.population,
          rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()}));
      }
      const before = await page.evaluate(facts);
      await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
      const completed = await page.evaluate(facts);
      await page.evaluate(function () {
        FBDATA.religiousActivities.uppsala_local_gathering.cost = 99;
        FBDATA.religiousActivities.uppsala_local_gathering.provinceIds = ['lund'];
        return new Promise(function (resolve,reject) {
          FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
        });
      });
      await restoreBookmark(page,original);
      expect(await page.evaluate(facts)).toEqual(before);
      await page.evaluate(function () { FB.state.turn += 2; FB.religiousActivityTick(FB.state); });
      expect(await page.evaluate(facts)).toEqual(completed);
      expect(completed.history.uppsala_local_gathering).toMatchObject({performed:true,rewarded:true});
    });
}

test('legacy pagan and Tengri doctrine, generated households and unrelated holy-war state survive restore',
  async function ({page},testInfo) {
    await beginBookmark(page,testInfo,'867');
    await injectHolyWarHarness(page);
    const original = await page.evaluate(function () {
      const s = FB.state; s.turn = 180;
      const id = FB.createFaith(s,{id:'e2e_northern_tengri',name:'Saved steppe household',parent:'tengri',
        relationToParent:'in_fold',founderId:s.player.charId});
      if (!id) throw new Error('Generated faith setup failed');
      s.chars[s.player.charId].religion = s.player.religion = id;
      const transfer = FB.convertCountyCommunity(s,s.player.provinceId,{kind:'faith',target:id,amount:100});
      if (!transfer || transfer.count !== 100) throw new Error('Generated minority setup failed');
      FBTEST.makeGreatHolyWar({phase:'preparation',capturedCounties:[],includePlayer:false});
      FB.repairGreatHolyWar(s);
      FB.ensureModifiers(s);
      return FB.save.serialize();
    });
    function retained() {
      const s = FB.state, faith = 'e2e_northern_tengri';
      return JSON.parse(JSON.stringify({start:s.start,person:s.chars[s.player.charId].religion,
        generated:FB.religionOf(faith,s),lineage:FB.faithLineage(faith,s),
        doctrine:['norse_pagan','slavic_pagan','baltic_pagan','tengri',faith].map(function (id) {
          return [FB.marriageDoctrine(id,s),FB.faithValue(s,id,'clergyMarriage'),FB.faithValue(s,id,'head')];
        }),communities:FB.countyCommunities(s,s.player.provinceId),institutions:s.localInstitutions,
        holyWar:s.greatHolyWar,history:s.greatHolyWarHistory,heads:s.religiousHeads,
        rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()}));
    }
    const before = await page.evaluate(retained);
    await openGame(page,testInfo);
    await restoreBookmark(page,original);
    expect(await page.evaluate(retained)).toEqual(before);
  });
