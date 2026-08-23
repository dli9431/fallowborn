'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/economy.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'css/style.css',
  'data/economy.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('archives and restores complete career progress without another fee',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      let me = state.chars[state.player.charId];
      me.career = {
        profession:'craftsman',
        rank:'master',
        experience:14,
        startedYear:state.date.year - 14,
        guildRank:'officer',
        guildStanding:63,
        chosen:true
      };
      state.player.profession = 'craftsman';
      state.player.flags.guild_member = 1;
      state.player.gold = 80;

      FB.setCareer(state, me, 'farmer', 'journeyman');
      const archivedBeforeSave =
        JSON.parse(JSON.stringify(me.careerHistory.craftsman));
      const save = JSON.parse(FB.save.serialize());
      FB.save.restore(save);
      state = FB.state;
      me = state.chars[state.player.charId];
      const choice = FB.careerChoices(state, me).filter(function (item) {
        return item.id === 'craftsman';
      })[0];
      const goldBefore = state.player.gold;
      const resumed = FB.beginCareer(state, me, 'craftsman');
      return {
        archivedBeforeSave:archivedBeforeSave,
        choice:{
          resuming:choice.resuming,
          cost:choice.cost,
          rank:choice.restoredRank,
          guildRank:choice.restoredGuildRank,
          standing:choice.restoredStanding
        },
        resumed:resumed,
        goldBefore:goldBefore,
        goldAfter:state.player.gold,
        active:JSON.parse(JSON.stringify(me.career)),
        farmerArchived:me.careerHistory.farmer
      };
    });

    expect(result.archivedBeforeSave).toMatchObject({
      profession:'craftsman',
      rank:'master',
      experience:14,
      guildRank:'officer',
      guildStanding:63,
      chosen:true
    });
    expect(result.choice).toEqual({
      resuming:true,
      cost:0,
      rank:'master',
      guildRank:'officer',
      standing:63
    });
    expect(result.resumed).toBe(true);
    expect(result.goldAfter).toBe(result.goldBefore);
    expect(result.active).toMatchObject({
      profession:'craftsman',
      rank:'master',
      experience:14,
      guildRank:'officer',
      guildStanding:63,
      chosen:true
    });
    expect(result.farmerArchived).toMatchObject({
      profession:'farmer',
      rank:'journeyman'
    });
  });

test('renews Guild Standing only for active vocational work and caps it',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.tier = 1;
      me.career = {
        profession:'craftsman',
        rank:'journeyman',
        experience:2,
        startedYear:state.date.year - 2,
        guildRank:'member',
        guildStanding:10,
        chosen:true
      };
      state.player.profession = 'craftsman';
      state.player.flags.guild_member = 1;
      const logBefore = state.log.length;
      FB.livelihoodYearly(state);
      const active = me.career.guildStanding;
      const logAfterActive = state.log.length;

      me.career.guildStanding = 99;
      FB.livelihoodYearly(state);
      const capped = me.career.guildStanding;

      FB.setCareer(state, me, 'farmer', 'journeyman');
      const archivedBefore = me.careerHistory.craftsman.guildStanding;
      FB.livelihoodYearly(state);
      const archivedAfter = me.careerHistory.craftsman.guildStanding;

      FB.setCareer(state, me, 'craftsman', 'journeyman');
      me.career.guildStanding = 30;
      state.player.tier = 3;
      FB.livelihoodYearly(state);
      const landed = me.career.guildStanding;
      return {
        active:active,
        capped:capped,
        archivedBefore:archivedBefore,
        archivedAfter:archivedAfter,
        landed:landed,
        logDelta:logAfterActive - logBefore
      };
    });

    expect(result).toEqual({
      active:15,
      capped:100,
      archivedBefore:100,
      archivedAfter:100,
      landed:30,
      logDelta:0
    });
  });

test('clears remote enterprise staffing and previews relocation impact',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const oldHome = state.player.provinceId;
      const destination = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== oldHome;
      })[0].id;
      me.career = {
        profession:'farmer',
        rank:'journeyman',
        experience:4,
        startedYear:state.date.year - 4,
        guildRank:'none',
        guildStanding:0,
        chosen:true
      };
      state.player.profession = 'farmer';
      state.player.enterpriseMigration = 1;
      const enterprise = {
        uid:'remote_enterprise_fixture',
        type:'orchard_business',
        provinceId:oldHome,
        settlement:0,
        workerId:me.id,
        workerLocked:true
      };
      state.player.enterprises = [enterprise];
      const beforeYield = FB.enterpriseYield(state, enterprise);
      const impact = FB.enterpriseRelocationImpact(state, destination);

      state.player.travel = {
        phase:'arrived',
        destinationId:destination,
        currentId:destination
      };
      const originalEligibility = FB.travelSettlementEligible;
      FB.travelSettlementEligible = function () { return true; };
      FB.ui.showTravelSettlement();
      FB.travelSettlementEligible = originalEligibility;
      return {
        oldHome:oldHome,
        destination:destination,
        beforeYield:beforeYield,
        impactCount:impact.count,
        impactWorker:impact.rows[0] && impact.rows[0].worker.name,
        warning:document.getElementById('gm-body').textContent
      };
    });

    expect(setup.beforeYield).toBeGreaterThan(0);
    expect(setup.impactCount).toBe(1);
    expect(setup.warning).toContain(setup.impactWorker);
    expect(setup.warning).toContain('will be unassigned');
    await page.getByRole('button', {
      name:'Keep staying for now',
      exact:true
    }).click();

    const moved = await page.evaluate(function (destination) {
      const state = FB.state;
      const enterprise = state.player.enterprises[0];
      state.player.travel = null;
      state.player.provinceId = destination;
      FB.enterpriseList(state);
      return {
        owned:state.player.enterprises.indexOf(enterprise) >= 0,
        workerId:enterprise.workerId,
        hasLock:Object.prototype.hasOwnProperty.call(
          enterprise, 'workerLocked'),
        yield:FB.enterpriseYield(state, enterprise),
        eligible:FB.enterpriseWorkersFor(state, enterprise).length
      };
    }, setup.destination);

    expect(moved).toEqual({
      owned:true,
      workerId:null,
      hasLock:false,
      yield:0,
      eligible:0
    });
  });

test('owned enterprise sheets explain profession, guild, remote, and reassignment states',
  async function ({ page }) {
    const fixture = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const enterprise = {
        uid:'blocked_enterprise_ui', type:'workshop_business',
        provinceId:s.player.provinceId, settlement:0, workerId:null
      };
      me.career = {
        profession:'farmer', rank:'journeyman', experience:3,
        startedYear:s.date.year - 3, guildRank:'none',
        guildStanding:0, chosen:true
      };
      for (const worker of FB.householdWorkers(s)) {
        worker.career = {
          profession:'farmer', rank:'journeyman', experience:3,
          startedYear:s.date.year - 3, guildRank:'none',
          guildStanding:0, chosen:true
        };
      }
      s.player.profession = 'farmer';
      s.player.enterprises = [enterprise];
      FB.ui.showLivelihoods();
      return {
        uid:enterprise.uid, home:s.player.provinceId, workerId:me.id
      };
    });

    const row = page.locator('[data-enterprise="' + fixture.uid + '"]');
    await expect(row).toContainText('Blocked');
    await expect(row).toContainText(
      'No adult resident household member is eligible for Craft work');
    await row.click();
    await expect(page.locator('.enterprise-management-status.blocked'))
      .toContainText('Blocked from staffing');
    await expect(page.locator('.enterprise-worker-empty'))
      .toContainText('Assign or train an eligible household member');

    await page.evaluate(function (uid) {
      const s = FB.state;
      const enterprise = s.player.enterprises.filter(function (entry) {
        return entry.uid === uid;
      })[0];
      enterprise.provinceId = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== s.player.provinceId &&
          FB.settlementsOf(s, province.id).length;
      })[0].id;
      FB.ui.showEnterpriseManage(uid, undefined, true);
    }, fixture.uid);
    await expect(page.locator('.enterprise-management-status.blocked'))
      .toContainText('No eligible household worker lives in');
    await expect(page.locator('.enterprise-worker-empty'))
      .toContainText('Move the household back');

    await page.evaluate(function (value) {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const enterprise = s.player.enterprises.filter(function (entry) {
        return entry.uid === value.uid;
      })[0];
      enterprise.provinceId = value.home;
      me.career = {
        profession:'craftsman', rank:'journeyman', experience:3,
        startedYear:s.date.year - 3, guildRank:'none',
        guildStanding:0, chosen:true
      };
      FB.ui.showEnterpriseManage(value.uid, undefined, true);
    }, fixture);
    await expect(page.locator('.enterprise-management-status.blocked'))
      .toContainText('Guild member rank');

    await page.evaluate(function (value) {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.career.guildRank = 'member';
      s.player.enterprises.push({
        uid:'busy_enterprise_ui', type:'workshop_business',
        provinceId:value.home, settlement:1, workerId:me.id
      });
      FB.ui.showEnterpriseManage(value.uid, undefined, true);
    }, fixture);
    await expect(page.locator('.enterprise-management-status.idle'))
      .toContainText('each currently works another enterprise');
    const candidate = page.locator(
      '[data-enterprise-worker="' + fixture.workerId + '"]');
    await expect(candidate).toContainText('Eligible');
    await expect(candidate.locator('.person-assignment-eligibility'))
      .toHaveCount(0);
    await candidate.locator('..').hover();
    await expect(page.locator('#tooltip')).toContainText('Current assignment');
    await expect(page.locator('#tooltip')).toContainText('Expected yield');
  });

test('enterprise statuses explain purchase and staffing blockers without mutation',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const home = state.player.provinceId;
      const originalEnterprises = FBDATA.enterprises;
      try {
        const target = FB.world.provs.filter(function (province) {
          return !province.wasteland && !province.coastal &&
            FB.settlementsOf(state, province.id).length;
        })[0];
        const terrains = [
          'farmland', 'forest', 'hills', 'mountains',
          'desert', 'steppe', 'marsh', 'tundra'
        ];
        const requiredTerrain = terrains.filter(function (terrain) {
          return terrain !== target.terrain;
        })[0];
        FBDATA.enterprises = {
          status_fixture:{
            name:'Status Works', icon:'house', cost:100,
            profession:'craftsman', guildRank:'member', yield:4,
            devMin:8, coastal:true, terrains:[requiredTerrain],
            requiresTech:'horizontal_loom',
            desc:'A fixture with every purchase requirement.'
          }
        };
        FB.enterpriseList(state);
        state.player.enterprises = [];
        state.player.gold = 1;
        state.dev[target.id] = 1;
        for (const worker of FB.householdWorkers(state)) {
          worker.career = {
            profession:'farmer', rank:'journeyman', experience:3,
            startedYear:state.date.year - 3, guildRank:'none',
            guildStanding:0, chosen:true
          };
        }
        const technology = FB.realmTechRecord(state, FB.techRealmId(state));
        technology.completed = technology.completed.filter(function (id) {
          return id !== 'horizontal_loom';
        });
        const before = {
          gold:state.player.gold,
          turn:state.turn,
          enterprises:JSON.stringify(state.player.enterprises)
        };
        const purchase = FB.enterprisePurchaseStatus(
          state, 'status_fixture', target.id, 0);
        const rejected = FB.acquireEnterprise(
          state, 'status_fixture', target.id, 0);
        const after = {
          gold:state.player.gold,
          turn:state.turn,
          enterprises:JSON.stringify(state.player.enterprises)
        };
        state.player.enterprises = [{
          uid:'occupied_status', type:'status_fixture',
          provinceId:target.id, settlement:0, workerId:null
        }];
        const occupied = FB.enterprisePurchaseStatus(
          state, 'status_fixture', target.id, 0);
        state.player.enterprises = [];

        const remote = FB.enterpriseStaffingStatus(state, {
          uid:'remote_status', type:'status_fixture',
          provinceId:target.id, settlement:0, workerId:null
        });
        const localEnterprise = {
          uid:'local_status', type:'status_fixture',
          provinceId:home, settlement:0, workerId:null
        };
        const profession = FB.enterpriseStaffingStatus(state, localEnterprise);
        me.career = {
          profession:'craftsman', rank:'journeyman', experience:3,
          startedYear:state.date.year - 3, guildRank:'none',
          guildStanding:0, chosen:true
        };
        const guild = FB.enterpriseStaffingStatus(state, localEnterprise);
        me.career.guildRank = 'member';
        state.player.enterprises = [{
          uid:'busy_status', type:'status_fixture',
          provinceId:home, settlement:1, workerId:me.id
        }];
        const reassign = FB.enterpriseStaffingStatus(state, localEnterprise);
        localEnterprise.workerId = me.id;
        const staffed = FB.enterpriseStaffingStatus(state, localEnterprise);
        return {
          purchase:{
            ready:purchase.ready,
            blockers:purchase.blockers.map(function (blocker) {
              return blocker.code;
            }),
            warning:purchase.warnings[0] && purchase.warnings[0].code,
            primary:purchase.primary && purchase.primary.code
          },
          rejected:rejected,
          unchanged:JSON.stringify(before) === JSON.stringify(after),
          occupiedPrimary:occupied.primary && occupied.primary.code,
          staffing:{
            remote:remote.code,
            profession:profession.code,
            guild:guild.code,
            reassign:reassign.code,
            staffed:staffed.code
          }
        };
      } finally {
        FBDATA.enterprises = originalEnterprises;
      }
    });

    expect(result.purchase.ready).toBe(false);
    expect(result.purchase.blockers).toEqual([
      'development', 'coastal', 'terrain', 'technology', 'funds'
    ]);
    expect(result.purchase.warning).toBe('no_worker');
    expect(result.purchase.primary).toBe('development');
    expect(result.rejected).toBe(false);
    expect(result.unchanged).toBe(true);
    expect(result.occupiedPrimary).toBe('occupied');
    expect(result.staffing).toEqual({
      remote:'remote',
      profession:'profession',
      guild:'guild_rank',
      reassign:'worker_reassignment',
      staffed:'staffed'
    });
  });

test('press house pays a chain bonus only while a household orchard produces',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const home = state.player.provinceId;
      me.career = {
        profession:'farmer',
        rank:'journeyman',
        experience:4,
        startedYear:state.date.year - 4,
        guildRank:'none',
        guildStanding:0,
        chosen:true
      };
      state.player.profession = 'farmer';

      const record = FB.realmTechRecord(state, FB.techRealmId(state));
      record.completed = record.completed.filter(function (id) {
        return id !== 'seed_selection' && id !== 'olive_press';
      });
      record.active = record.active.filter(function (id) {
        return id !== 'seed_selection' && id !== 'olive_press';
      });
      state.dev[home] = 5;
      state.player.enterprises = [];
      const available = FB.enterpriseAvailable(state, 0, true);
      const orchardRow = available.filter(function (item) {
        return item.id === 'orchard_business';
      })[0];
      const pressRow = available.filter(function (item) {
        return item.id === 'press_business';
      })[0];

      const orchard = {
        uid:'chain_orchard_fixture',
        type:'orchard_business',
        provinceId:home,
        settlement:0,
        workerId:me.id,
        workerLocked:true
      };
      const press = {
        uid:'chain_press_fixture',
        type:'press_business',
        provinceId:home,
        settlement:0,
        workerId:null
      };
      state.player.enterprises = [orchard, press];
      const pressPreview = {
        type:'press_business', provinceId:home, settlement:0, workerId:me.id
      };
      const orchardYield = FB.enterpriseYield(state, orchard);
      const fed = FB.enterpriseYield(state, pressPreview);
      orchard.workerId = null;
      const unfed = FB.enterpriseYield(state, pressPreview);
      orchard.workerId = me.id;
      return {
        orchardListed:!!orchardRow,
        orchardTechLocked:orchardRow ? orchardRow.techLocked : null,
        pressTechLocked:pressRow ? pressRow.techLocked : null,
        orchardYield:orchardYield,
        fed:fed,
        unfed:unfed,
        bonus:FBDATA.balance.enterpriseChainBonus
      };
    });

    expect(result.orchardListed).toBe(true);
    expect(result.orchardTechLocked).toBe(false);
    expect(result.pressTechLocked).toBe(true);
    expect(result.orchardYield).toBeGreaterThan(0);
    expect(result.unfed).toBeGreaterThan(0);
    expect(result.fed).toBeCloseTo(result.unfed * (1 + result.bonus), 5);
  });
