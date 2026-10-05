'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmarks.js', 'data/bookmark_476.js', 'data/political_institutions.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/eras.js', 'data/technology.js', 'data/units.js', 'data/map_data.js', 'data/counties.js',
  'data/settlements.js', 'data/cultures.js', 'js/federates.js', 'js/authority.js',
  'js/governments.js', 'js/politics.js', 'js/settlement.js', 'js/world.js', 'js/model.js',
  'js/main.js', 'js/armies.js', 'js/wars.js', 'js/fortifications.js', 'js/logistics.js',
  'js/treasury.js', 'js/lordships.js', 'js/population.js', 'js/save.js', 'js/save_v4.js',
  'js/stories.js', 'js/story_campaign.js', 'js/story_476_rails.js', 'data/story_campaigns.js', 'js/story_western_court_476.js', 'js/story_federate_track_476.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo, bookmark) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(bookmark === '476'
    ? 'MIGRATE-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
    : 'MIGRATE-' + bookmark + '-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
}

for (const bookmark of ['867', '1066']) {
  test(bookmark + ' negotiates AI service, pays once, renews and records breach without moving land',
    async function ({ page }, testInfo) {
      await start(page, testInfo, bookmark);
      const result = await page.evaluate(function () {
        const s = FB.state, q = FB.political;
        const ids = Object.keys(s.realms).filter(function (rid) {
          return s.realms[rid].alive && !s.realms[rid].liege && rid !== 'player';
        });
        const patron = ids[0], federate = ids[1], at = s.realms[patron].capital;
        s.alliances = [];
        s.treasuryAccounting = { mode:'active' };
        [patron, federate].forEach(function (rid) {
          s.realms[rid].treasury = { version:1, gold:100, militaryAccrued:0, retired:false };
        });
        const army = { id:'general-service', realm:federate, at:at, from:at,
          men:80, size:80, units:{ levy:80 }, path:[], goal:null, moveLeft:0, supply:100 };
        const other = Object.assign({}, army, { id:'uncontracted-service' });
        s.armies.push(army, other);
        const beforeLand = JSON.stringify([s.owner, s.holder]);
        const before = JSON.stringify(s), rng = FB.getRngState();
        const terms = q.contractTerms(s, 'paid_service', {
          patronRealmId:patron, federateRealmId:federate, hostId:army.id });
        const pure = JSON.stringify(s) === before && FB.getRngState() === rng;
        const offered = FB.authorityOfferContractTemplate(s, 'paid_service', terms);
        const activated = FB.federateNegotiateContract(s, offered.id);
        const exactSupply = FB.armyFriendlyProvince(s, army, at) &&
          !FB.armyFriendlyProvince(s, other, at);
        s.turn = 90;
        FB.authoritySeason(s); FB.authoritySeason(s);
        const once = s.realms[patron].treasury.gold === 90 && s.realms[federate].treasury.gold === 110;
        const changes = { payPerSeason:12, endTurn:720 };
        const quote = q.contractRenegotiationQuote(s, offered.id, changes);
        s.realms[patron].ruler.generation = (s.realms[patron].ruler.generation || 1) + 1;
        const stale = !FB.authorityRenegotiateContract(s, offered.id, patron, changes, quote);
        const suspended = q.contract(s, offered.id).ineffectiveReason === 'ruler_succession';
        FB.authoritySeason(s);
        const reaffirmed = q.contract(s, offered.id).effective;
        s.turn = 360;
        FB.authoritySeason(s);
        const renewed = q.contract(s, offered.id).endTurn === 720 && q.contract(s, offered.id).effective;
        s.realms[patron].treasury.gold = 0;
        s.turn = 450;
        FB.authoritySeason(s);
        const breached = q.contract(s, offered.id).status === 'breached' &&
          !q.permission(s, { kind:'realm', id:patron }, 'command_host', { hostId:army.id }).allowed &&
          !FB.armyFriendlyProvince(s, army, at);
        const saved = JSON.parse(FB.save.serialize());
        const valid = FB.save.v4.validateAuthority(saved.state.authority, saved.state);
        return { pure:pure, activated:activated, exactSupply:exactSupply, once:once,
          stale:stale, suspended:suspended, reaffirmed:reaffirmed, renewed:renewed,
          breached:breached, land:beforeLand === JSON.stringify([s.owner, s.holder]),
          valid:valid, data:FB.validateAuthorityData(), technology:FB.validateTechnologyData(),
          modes:['authority_federate_service','federate_moving_court','federate_claims_settlement'].map(function (id) {
            return FBDATA.techImpactReviews.features[id].mode;
          }) };
      });
      expect(result).toEqual({ pure:true, activated:true, exactSupply:true, once:true,
        stale:true, suspended:true, reaffirmed:true, renewed:true, breached:true,
        land:true, valid:true, data:[], technology:[], modes:['none','none','none'] });
    });
}

test('reviewed changes to AI pay require fresh two-party consent and a single initial payment',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      const s = FB.state, q = FB.political;
      s.realms.italy.treasury.gold = 200;
      s.realms.croatia.treasury.gold = 0;
      const army = { id:'renegotiated-host', realm:'croatia', at:'split', men:80,
        units:{ levy:80 }, supply:100, path:[] };
      s.armies.push(army);
      const commission = FB.authorityRecognize(s, { source:'imperial_commission',
        issuer:{ kind:'realm', id:'italy' }, subject:{ kind:'realm', id:'croatia' },
        scope:{ kind:'realm', id:'croatia' } });
      const offered = FB.authorityOfferContractTemplate(s, 'commissioned_migration', {
        patronRealmId:'italy', federateRealmId:'croatia', hostId:army.id,
        recognitionId:commission.id });
      FB.federateNegotiateContract(s, offered.id);
      const changes = { endTurn:2300, payPerSeason:12 };
      const quote = q.contractRenegotiationQuote(s, offered.id, changes);
      const changed = FB.authorityRenegotiateContract(s, offered.id, 'croatia', changes, quote);
      const waiting = !q.contract(s, offered.id).effective &&
        Object.keys(q.contract(s, offered.id).approvals).length === 0;
      const renewed = FB.federateNegotiateContract(s, offered.id);
      const equipmentOnce = s.realms.italy.treasury.gold === 160 && s.realms.croatia.treasury.gold === 40;
      s.turn = 90; FB.authoritySeason(s); FB.authoritySeason(s);
      return { changed:changed, waiting:waiting, renewed:renewed, equipmentOnce:equipmentOnce,
        pay:q.contract(s, offered.id).payPerSeason,
        patron:s.realms.italy.treasury.gold, federate:s.realms.croatia.treasury.gold };
    });
    expect(result).toEqual({ changed:true, waiting:true, renewed:true, equipmentOnce:true,
      pay:12, patron:148, federate:52 });
  });

test('a moving court marches on an ordinary route and receives a county through a claims session',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      let s = FB.state;
      const q = FB.political;
      s.realms.italy.treasury.gold = 1000;
      s.realms.federates_476.treasury.gold = 100;
      const communities = JSON.stringify(FB.countyCommunities(s, 'ravenna'));
      const property = JSON.stringify(s.player.holdings);
      const created = FB.federateBeginMigration(s, { realmId:'federates_476', patronRealmId:'italy',
        origin:'pavia', target:'ravenna', hostId:'host_476_federates', endTurn:360,
        settlementForm:'regnum' });
      const duplicate = FB.federateBeginMigration(s, { realmId:'federates_476', patronRealmId:'italy',
        origin:'pavia', target:'ravenna', hostId:'host_476_federates', endTurn:360,
        settlementForm:'regnum' }) === null;
      const requested = FB.federateRequest(s, created.id, 'land');
      const unawarded = s.owner.ravenna === 'italy';
      const detached = q.movingPolity(s, created.id);
      detached.courtIds.length = 0;
      const pure = q.movingPolity(s, created.id).courtIds.length > 0;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      s = FB.state;
      const retainedHost = s.armies.some(function (a) {
        return a.id === created.hostId && a.migrationId === created.id;
      });
      let followed = true, steps = 0;
      while (q.movingPolity(s, created.id).status !== 'settled' && steps++ < 200) {
        s.turn++;
        FB.federatePrepareDay(s); FB.armyTick(s); FB.federateDay(s);
        const moving = q.movingPolity(s, created.id);
        followed = followed && moving.courtIds.every(function (cid) {
          return s.chars[cid].dead || s.chars[cid].homeProvinceId === moving.at;
        });
      }
      const moving = q.movingPolity(s, created.id);
      const serial = JSON.parse(FB.save.serialize());
      FB.save.restore(serial);
      const restored = FB.political.movingPolity(FB.state, created.id);
      return { duplicate:duplicate, requested:requested, unawarded:unawarded, pure:pure,
        retainedHost:retainedHost,
        followed:followed, marched:steps > 1 && steps < 200, status:moving.status,
        owner:s.owner.ravenna, holder:s.holder.ravenna,
        form:q.government(s, { kind:'realm', id:'federates_476' }).formId,
        mobile:s.realms.federates_476.nonTerritorial,
        session:moving.session && moving.session.status,
        award:moving.session && moving.session.awards[0].claimant,
        communities:communities === JSON.stringify(FB.countyCommunities(s, 'ravenna')),
        property:property === JSON.stringify(s.player.holdings),
        roundTrip:JSON.stringify(restored) === JSON.stringify(moving),
        replay:FB.federateResolveSettlement(FB.state, created.id, {}) };
    });
    expect(result).toEqual({ duplicate:true, requested:true, unawarded:true, pure:true,
      retainedHost:true, followed:true, marched:true, status:'settled', owner:'federates_476', holder:'federates_476',
      form:'regnum', mobile:false, session:'resolved', award:'federates_476',
      communities:true, property:true, roundTrip:true, replay:false });
  });

test('a stale land award rejects before settlement, property transfer or RNG',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.realms.italy.treasury.gold = 100;
      const moving = FB.federateBeginMigration(s, { realmId:'federates_476', patronRealmId:'italy',
        origin:'pavia', target:'ravenna', hostId:'host_476_federates', endTurn:360, settlementForm:'regnum' });
      FB.federateRequest(s, moving.id, 'land');
      const army = s.armies.find(function (a) { return a.id === moving.hostId; });
      army.at = 'ravenna'; army.moveLeft = 0; army.path = [];
      const quote = FB.political.federateSettlementQuote(s, moving.id);
      s.holder.ravenna = 'croatia'; FB.invalidateRealmCache();
      const beforeHolder = JSON.stringify(s);
      const delegated = !FB.federateResolveSettlement(s, moving.id, quote) &&
        beforeHolder === JSON.stringify(s);
      s.holder.ravenna = 'italy'; FB.invalidateRealmCache();
      FB.transferProvince(s, 'ravenna', 'croatia');
      const before = JSON.stringify(s), rng = FB.getRngState();
      const rejected = !FB.federateResolveSettlement(s, moving.id, quote);
      return { quoted:!!quote, delegated:delegated, rejected:rejected,
        unchanged:before === JSON.stringify(s), rng:rng === FB.getRngState(),
        session:FB.political.movingPolity(s, moving.id).session };
    });
    expect(result).toEqual({ quoted:true, delegated:true, rejected:true, unchanged:true, rng:true, session:null });
  });

test('Theoderic uses data-defined recognition, a paid commission, a real host and settlement',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const s = FB.state, w = s.stories.western_court_476;
      const existingHost = s.armies.find(function (a) { return a.id === 'host_476_amal'; });
      existingHost.units.levy -= 20; existingHost.men -= 20;
      const existingUnits = JSON.stringify(existingHost.units);
      const opening = { form:FB.political.government(s, { kind:'realm', id:'pannonia' }).formId,
        territory:FB.realmTerritory(s, 'pannonia'), at:s.realms.pannonia.capital };
      s.realms.byzantium.treasury.gold = 1000;
      s.realms.pannonia.treasury.gold = 0;
      s.turn = 180; s.date.year = 488;
      FB.stories.day(s);
      const moving = FB.political.movingPolity(s, s.stories.theoderic_italy_476.migrationId);
      const retainedBanner = moving.hostId === existingHost.id &&
        s.armies.filter(function (a) { return a.realm === 'pannonia'; }).length === 1 &&
        s.armies.find(function (a) { return a.id === moving.hostId; }) === existingHost &&
        existingHost.men === 140 && JSON.stringify(existingHost.units) === existingUnits;
      const deal = FB.political.contract(s, moving.contractId);
      const beforeGift = s.realms.pannonia.treasury.gold;
      FB.stories.day(s); FB.federateNegotiateContract(s, deal.id);
      const onceGift = s.realms.pannonia.treasury.gold === beforeGift && beforeGift === 40;
      const war = FB.ordinaryWarById(s, moving.warId);
      const noAward = s.owner.ravenna !== 'pannonia';
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const restored = FB.state, army = restored.armies.find(function (a) { return a.id === moving.hostId; });
      // Stage the ordinary campaign's won county, without asserting a forced historical victory.
      FB.transferProvince(restored, 'ravenna', 'pannonia');
      FB.settleOrdinaryWar(restored, moving.warId, 'victory');
      army.at = 'ravenna'; army.moveLeft = 0; army.path = [];
      FB.federateDay(restored); FB.stories.day(restored);
      const settled = FB.political.movingPolity(restored, moving.id);
      return { opening:opening, retainedBanner:retainedBanner, effective:deal.effective,
        recognition:!!deal.recognitionId, onceGift:onceGift, noAward:noAward,
        target:war.objectives[0].target, status:settled.status,
        session:settled.session && settled.session.status,
        historical:restored.stories.theoderic_italy_476.result,
        territorial:!restored.realms.pannonia.nonTerritorial,
        valid:FB.save.v4.validateAuthority(JSON.parse(FB.save.serialize()).state.authority, restored) };
    });
    expect(result).toEqual({ opening:{ form:'federate_polity', territory:[], at:'thessaloniki' },
      retainedBanner:true, effective:true, recognition:true, onceGift:true, noAward:true, target:'ravenna',
      status:'settled', session:'resolved', historical:'won', territorial:true, valid:true });
  });

test('standing 476 hosts survive peaceful save restore until their authored deadlines',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      function snapshot() {
        return JSON.stringify(FB.state.armies.map(function (a) {
          return { id:a.id, realm:a.realm, at:a.at, men:a.men, units:a.units,
            scenarioStanding:a.scenarioStanding, scenarioEndTurn:a.scenarioEndTurn };
        }));
      }
      const original = snapshot();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const retained = snapshot() === original;
      const ids = FB.state.armies.map(function (a) { return a.id; }).sort();
      FB.state.turn = 6 * 360;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const unexpired = FB.state.armies.map(function (a) { return a.id; });
      FB.state.turn = 18 * 360;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { retained:retained, ids:ids, unexpired:unexpired,
        ended:FB.state.armies.length === 0, migrations:!FB.state.authority.migrations };
    });
    expect(result).toEqual({ retained:true,
      ids:['host_476_amal','host_476_federates','host_476_italy','host_476_thracian'],
      unexpired:['host_476_amal'], ended:true, migrations:true });
  });

test('Theoderic cannot recreate a lost opening host at the migration opportunity',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      const s = FB.state, w = s.stories.western_court_476;
      s.armies = s.armies.filter(function (a) { return a.id !== 'host_476_amal'; });
      s.turn = 180; s.date.year = 488;
      for (let i = 0; i < 3; i++) { FB.stories.day(s); s.turn++; }
      const noMigration = !s.stories.theoderic_italy_476.migrationId &&
        !(s.authority.migrations || []).some(function (row) { return row.realmId === 'pannonia'; });
      const noCommission = !s.stories.theoderic_italy_476.commissionId;
      const noHost = !s.armies.some(function (a) { return a.realm === 'pannonia'; });
      s.date.year = 494; FB.stories.day(s);
      return { noMigration:noMigration, noCommission:noCommission, noHost:noHost,
        closed:s.stories.theoderic_italy_476.phase === 'resolved' };
    });
    expect(result).toEqual({ noMigration:true, noCommission:true, noHost:true, closed:true });
  });

test('an already-declared Gothic campaign keeps its outcome without synthesizing a migration',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      let s = FB.state;
      FB.transferProvince(s, 'szekesfehervar', 'pannonia');
      FB.authoritySetGovernment(s, 'pannonia', 'regnum');
      s.realms.pannonia.nonTerritorial = false;
      s.realms.pannonia.capital = 'szekesfehervar';
      const war = FB.registerOrdinaryWar(s, 'pannonia', { enemy:'italy', target:'ravenna',
        legacy:false, casus:{ type:'border', target:'ravenna' },
        objectives:[{ target:'ravenna', type:'border' }] });
      const saved = JSON.parse(FB.save.serialize());
      const old = saved.state.stories.western_court_476;
      delete old.railsSchema;
      old.historical = { theoderic:'started', theodericWarId:war.id };
      for (const id of FBDATA.bookmarks['476'].stories)
        if (id !== 'western_court_476') delete saved.state.stories[id];
      FB.save.restore(saved); s = FB.state;
      s.date.year = 489; s.turn = 180;
      FB.stories.day(s);
      const stillRunning = s.stories.theoderic_italy_476.phase === 'started';
      FB.transferProvince(s, 'ravenna', 'pannonia');
      FB.settleOrdinaryWar(s, war.id, 'victory');
      FB.stories.day(s);
      return { stillRunning:stillRunning, result:s.stories.theoderic_italy_476.result,
        noMigration:!s.authority.migrations && !s.stories.theoderic_italy_476.migrationId,
        noNewHost:s.armies.filter(function (a) { return a.realm === 'pannonia'; }).length === 1 &&
          s.armies.some(function (a) { return a.id === 'host_476_amal'; }) };
    });
    expect(result).toEqual({ stillRunning:true, result:'won', noMigration:true, noNewHost:true });
  });

test('service can be declined for force and expired or destroyed moving hosts never respawn',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476');
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.realms.italy.treasury.gold = 1000;
      const moving = FB.federateBeginMigration(s, { realmId:'federates_476', patronRealmId:'italy',
        origin:'pavia', target:'ravenna', hostId:'host_476_federates', endTurn:360, settlementForm:'regnum' });
      const service = FB.federateRequest(s, moving.id, 'service');
      const declined = FB.federateDeclineContract(s, moving.id);
      const force = FB.federateRequest(s, moving.id, 'force');
      const unawarded = s.owner.ravenna === 'italy';
      const timed = FB.federateBeginMigration(s, { realmId:'pannonia', patronRealmId:'byzantium',
        origin:'thessaloniki', target:'ravenna', hostId:'expiry-host', endTurn:90,
        settlementForm:'regnum', men:80, units:{ levy:80 } });
      s.armies = s.armies.filter(function (a) { return a.id !== moving.hostId; });
      s.turn = 90;
      FB.federatePrepareDay(s); FB.federateDay(s);
      for (let i = 0; i < 20; i++) {
        s.turn += 90; FB.authoritySeason(s); FB.armyTick(s); FB.federateDay(s);
      }
      const failed = FB.political.movingPolity(s, moving.id);
      const valid = FB.save.v4.validateAuthority(JSON.parse(FB.save.serialize()).state.authority, s);
      const forged = JSON.parse(FB.save.serialize()).state;
      forged.authority.migrations[0].settlementForm = 'missing_form';
      let rejected = false;
      try { FB.save.v4.validateAuthority(forged.authority, forged); } catch (error) { rejected = true; }
      return { service:service, declined:declined, force:force, unawarded:unawarded,
        failed:failed.status, extinct:!s.realms.federates_476.alive,
        noOrphans:!s.armies.some(function (a) { return a.realm === 'federates_476'; }),
        expired:FB.political.movingPolity(s, timed.id).failureReason === 'term_ended' &&
          !s.armies.some(function (a) { return a.id === timed.hostId; }),
        valid:valid, rejected:rejected };
    });
    expect(result).toEqual({ service:true, declined:true, force:true, unawarded:true,
      failed:'failed', extinct:true, noOrphans:true, expired:true, valid:true, rejected:true });
  });
