'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
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
  'js/ui_misc.js','js/ui_modals.js','css/style.css']);

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
