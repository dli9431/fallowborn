'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/economy.js',
  'js/population.js',
  'js/technology.js',
  'js/world.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'css/style.css',
  'data/economy.js',
  'data/technology.js'
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

test('levy service and professional Soldiering offer distinct arms work',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      const shown = function () {
        return {
          militia:FB.focusStatus(state, 'militia').shown,
          drill:FB.focusStatus(state, 'drill').shown,
          guard:FB.focusStatus(state, 'stand_guard').shown,
          train:FB.focusStatus(state, 'train_arms').shown
        };
      };
      me.sex = 'm';
      me.born = state.date.year - 25;
      state.player.tier = 1;
      me.career = {
        profession:'farmer', rank:'journeyman', experience:4,
        startedYear:state.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      state.player.professionBack = 'farmer';
      state.player.profession = 'soldier';
      state.player.flags.on_campaign = 1;
      const temporaryLevy = shown();
      temporaryLevy.defaultFocus = FB.defaultFocus(state);

      delete state.player.professionBack;
      delete state.player.flags.on_campaign;
      me.career = {
        profession:'soldier', rank:'journeyman', experience:4,
        startedYear:state.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      state.player.profession = 'soldier';
      const professional = shown();
      professional.defaultFocus = FB.defaultFocus(state);

      state.player.tier = 2;
      const professionalGentry = shown();
      state.player.tier = 3;
      const landedFormerSoldier = shown();
      return {
        temporaryLevy:temporaryLevy,
        professional:professional,
        professionalGentry:professionalGentry,
        landedFormerSoldier:landedFormerSoldier
      };
    });

    expect(result.temporaryLevy).toEqual({
      militia:true, drill:false, guard:false, train:false,
      defaultFocus:'militia'
    });
    expect(result.professional).toEqual({
      militia:false, drill:true, guard:true, train:false,
      defaultFocus:'drill'
    });
    expect(result.professionalGentry).toEqual({
      militia:false, drill:true, guard:true, train:false
    });
    expect(result.landedFormerSoldier).toEqual({
      militia:false, drill:false, guard:false, train:true
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
      s.player.gold = 100;
      s.player.enterprises = [enterprise];
      FB.ui.showLivelihoods();
      return {
        uid:enterprise.uid, home:s.player.provinceId, workerId:me.id
      };
    });

    const row = page.locator('[data-enterprise="' + fixture.uid + '"]');
    await expect(row).toContainText('Idle');
    await expect(row).not.toContainText(
      'No trained resident household member is eligible for Craft work');
    await row.hover();
    await expect(page.locator('#tooltip')).toContainText(
      'No trained resident household member is eligible for Craft work');
    await row.click();
    const overview = page.locator('.enterprise-management-status.idle');
    await expect(overview.locator('.settcard-head > b'))
      .toHaveText('Enterprise details');
    await expect(overview.locator('.settcard-head'))
      .not.toContainText('Inactive until fully staffed');
    await expect(page.locator(
      '.enterprise-management-modal .enterprise-management-details:visible'))
      .toHaveCount(0);
    await overview.hover();
    await expect(page.locator('#tooltip'))
      .toContainText('Inactive until fully staffed');
    await expect(page.locator('#tooltip')).toContainText(
      'Passes to heirs as family property');
    await expect(page.locator('#tooltip')).not.toContainText('Owner');
    const empty = page.locator('.enterprise-worker-empty');
    await expect(empty.locator('.settcard-head'))
      .not.toContainText('Assign or train an eligible household member');
    await empty.hover();
    await expect(page.locator('#tooltip'))
      .toContainText('Assign or train an eligible household member');
    await expect(page.getByRole('button', { name:/Hire a local worker/ }))
      .toBeEnabled();
    await expect(page.locator('#enterprise-hire .adesc')).toHaveCount(0);

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
    await page.locator('.enterprise-management-status.idle').hover();
    await expect(page.locator('#tooltip'))
      .toContainText('No eligible household worker lives in');
    await page.locator('.enterprise-worker-empty').hover();
    await expect(page.locator('#tooltip')).toContainText('Move the household back');

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
    await page.locator('.enterprise-management-status.idle').hover();
    await expect(page.locator('#tooltip')).toContainText('Guild member rank');

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
    await page.locator('.enterprise-management-status.idle').hover();
    await expect(page.locator('#tooltip'))
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

test('enterprise upgrades spend gold, require larger staffs, and add only ancillary power',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = s.player.provinceId;
      const technology = FB.realmTechRecord(s, FB.techRealmId(s));
      ['heavy_plough', 'three_field'].forEach(function (id) {
        if (technology.completed.indexOf(id) < 0) technology.completed.push(id);
      });
      me.career = {
        profession:'farmer', rank:'journeyman', experience:5,
        startedYear:s.date.year - 5, guildRank:'none', guildStanding:0,
        chosen:true
      };
      s.player.profession = 'farmer';
      s.player.enterpriseMigration = 1;
      s.player.gold = 10000;
      s.dev[home] = 3;
      const enterprise = {
        uid:'upgrade_field_fixture', type:'field_strip',
        provinceId:home, settlement:0, workerId:me.id
      };
      s.player.enterprises = [enterprise];
      const baseYield = FB.enterpriseYield(s, enterprise);
      const firstCost = FB.enterpriseUpgradeCost(s, enterprise);
      const firstUpgrade = FB.upgradeEnterprise(s, enterprise.uid);
      const yieldWithOneOfTwo = FB.enterpriseYield(s, enterprise);
      const dormantEffects = FB.enterpriseUpgradeEffects(s, home);
      const firstHire = FB.hireEnterpriseWorker(s, enterprise.uid);
      const firstExpandedYield = FB.enterpriseYield(s, enterprise);
      const firstEffects = FB.enterpriseUpgradeEffects(s, home);
      const secondCost = FB.enterpriseUpgradeCost(s, enterprise);
      const secondUpgrade = FB.upgradeEnterprise(s, enterprise.uid);
      const yieldWithTwoOfThree = FB.enterpriseYield(s, enterprise);
      const secondHire = FB.hireEnterpriseWorker(s, enterprise.uid);
      const fullYield = FB.enterpriseYield(s, enterprise);
      const fullEffects = FB.enterpriseUpgradeEffects(s, home);
      const developmentBefore = s.dev[home];
      FB.enterpriseUpgradeSeason(s);
      const developmentAfterFirstSeason = s.dev[home];
      FB.enterpriseUpgradeSeason(s);
      const developmentAfterSecondSeason = s.dev[home];
      const wages = FB.enterpriseLaborSeasonCost(s);
      const goldBeforeWages = s.player.gold;
      FB.enterpriseLaborSeason(s);
      return {
        firstUpgrade:firstUpgrade,
        secondUpgrade:secondUpgrade,
        firstCost:firstCost,
        secondCost:secondCost,
        level:FB.enterpriseUpgradeLevel(enterprise),
        required:FB.enterpriseStaffRequired(enterprise),
        workers:FB.enterpriseWorkerIds(enterprise).length,
        laborers:FB.enterpriseLaborRecords(s).length,
        firstHire:!!firstHire,
        secondHire:!!secondHire,
        baseYield:baseYield,
        yieldWithOneOfTwo:yieldWithOneOfTwo,
        firstExpandedYield:firstExpandedYield,
        yieldWithTwoOfThree:yieldWithTwoOfThree,
        fullYield:fullYield,
        dormantPopulation:dormantEffects.populationCapacity,
        firstPopulation:firstEffects.populationCapacity,
        fullPopulation:fullEffects.populationCapacity,
        fullLevy:fullEffects.levy,
        developmentGain:developmentAfterFirstSeason - developmentBefore,
        repeatedDevelopmentGain:
          developmentAfterSecondSeason - developmentAfterFirstSeason,
        wages:wages,
        seasonalWageSpend:goldBeforeWages - s.player.gold,
        fullHireStatus:FB.canHireEnterpriseWorker(s, enterprise.uid)
      };
    });

    expect(result.firstUpgrade).toBe(true);
    expect(result.secondUpgrade).toBe(true);
    expect(result.firstCost).toBeGreaterThan(0);
    expect(result.secondCost).toBeGreaterThan(result.firstCost);
    expect(result.level).toBe(2);
    expect(result.required).toBe(3);
    expect(result.workers).toBe(3);
    expect(result.laborers).toBe(2);
    expect(result.firstHire).toBe(true);
    expect(result.secondHire).toBe(true);
    expect(result.yieldWithOneOfTwo).toBe(0);
    expect(result.yieldWithTwoOfThree).toBe(0);
    expect(result.firstExpandedYield).toBeCloseTo(result.baseYield, 5);
    expect(result.fullYield).toBeCloseTo(result.baseYield, 5);
    expect(result.dormantPopulation).toBe(0);
    expect(result.firstPopulation).toBeCloseTo(0.02, 5);
    expect(result.fullPopulation).toBeCloseTo(0.06, 5);
    expect(result.fullLevy).toBe(25);
    expect(result.developmentGain).toBe(1);
    expect(result.repeatedDevelopmentGain).toBe(0);
    expect(result.wages).toBeGreaterThan(0);
    expect(result.seasonalWageSpend).toBeCloseTo(result.wages, 5);
    expect(result.fullHireStatus).toContain('already filled');
  });

test('child apprentices provide half enterprise staffing and the assistant pairs them',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = s.player.provinceId;
      s.player.tier = 0;
      s.player.enterpriseMigration = 1;
      s.player.loadouts = {};
      me.skills = { mar:0, ste:6, dip:0, int:0, lea:0 };
      me.traits = [];
      me.career = {
        profession:'farmer', rank:'journeyman', experience:0,
        startedYear:s.date.year, guildRank:'none', guildStanding:0,
        chosen:true
      };
      function child(name, age) {
        const c = FB.makeCharacter(s, {
          name:name, sex:'m', born:s.date.year - age,
          fatherId:me.sex === 'm' ? me.id : null,
          motherId:me.sex === 'f' ? me.id : null,
          culture:me.culture, religion:me.religion, dyn:me.dyn,
          traits:[]
        });
        c.skills = { mar:0, ste:6, dip:0, int:0, lea:0 };
        c.career = {
          profession:'farmer', rank:'apprentice', experience:0,
          startedYear:s.date.year, guildRank:'none', guildStanding:0,
          chosen:true
        };
        me.childrenIds = me.childrenIds || [];
        me.childrenIds.push(c.id);
        return c;
      }
      const first = child('First Apprentice', 12);
      const second = child('Second Apprentice', 12);
      const tooYoung = child('Young Helper', 9);
      const enterprise = {
        uid:'child_staffing_fixture', type:'field_strip',
        provinceId:home, settlement:0, workerId:null
      };
      s.player.enterprises = [enterprise];
      const eligible = FB.enterpriseWorkersFor(s, enterprise).map(function (c) {
        return c.id;
      });

      const firstAssigned = FB.setEnterpriseWorker(s, enterprise.uid,
        first.id, true);
      const halfStaff = FB.enterpriseStaffAssigned(s, enterprise);
      const oneChildYield = FB.enterpriseYield(s, enterprise);
      const halfHireBlock = FB.canHireEnterpriseWorker(s, enterprise.uid);
      const secondAssigned = FB.setEnterpriseWorker(s, enterprise.uid,
        second.id, true);
      const childYield = FB.enterpriseYield(s, enterprise);
      const childStaff = FB.enterpriseStaffAssigned(s, enterprise);

      FB.setEnterpriseWorker(s, enterprise.uid, first.id, false);
      FB.setEnterpriseWorker(s, enterprise.uid, second.id, false);
      FB.setEnterpriseWorker(s, enterprise.uid, me.id, true);
      const adultYield = FB.enterpriseYield(s, enterprise);
      FB.setEnterpriseWorker(s, enterprise.uid, me.id, false);
      me.career = {
        profession:'soldier', rank:'journeyman', experience:0,
        startedYear:s.date.year, guildRank:'none', guildStanding:0,
        chosen:true
      };
      const plan = FB.enterpriseStaffingPlan(s);
      const applied = FB.applyEnterpriseStaffingPlan(s, plan);
      const row = plan.rows[0];
      FB.ui.showEnterpriseManage(enterprise.uid);
      return {
        firstId:first.id,
        secondId:second.id,
        tooYoungId:tooYoung.id,
        eligible:eligible,
        firstAssigned:firstAssigned,
        secondAssigned:secondAssigned,
        halfStaff:halfStaff,
        childStaff:childStaff,
        oneChildYield:oneChildYield,
        childYield:childYield,
        adultYield:adultYield,
        halfHireBlock:halfHireBlock,
        proposedIds:row.proposedWorkerIds,
        proposedStaff:row.proposedStaff,
        proposedYield:row.proposedYield,
        applied:applied.ok,
        finalIds:FB.enterpriseWorkerIds(enterprise)
      };
    });

    expect(result.eligible).toContain(result.firstId);
    expect(result.eligible).toContain(result.secondId);
    expect(result.eligible).not.toContain(result.tooYoungId);
    expect(result.firstAssigned).toBe(true);
    expect(result.secondAssigned).toBe(true);
    expect(result.halfStaff).toBe(0.5);
    expect(result.oneChildYield).toBe(0);
    expect(result.halfHireBlock).toContain('remaining half position');
    expect(result.childStaff).toBe(1);
    expect(result.childYield).toBeCloseTo(result.adultYield, 5);
    expect(result.proposedIds.sort()).toEqual(
      [result.firstId, result.secondId].sort());
    expect(result.proposedStaff).toBe(1);
    expect(result.proposedYield).toBeGreaterThan(0);
    expect(result.applied).toBe(true);
    expect(result.finalIds.sort()).toEqual(
      [result.firstId, result.secondId].sort());
    await expect(page.locator(
      '[data-enterprise-worker="' + result.firstId + '"]')).toBeVisible();
    await expect(page.locator(
      '[data-enterprise-worker="' + result.secondId + '"]')).toBeVisible();
    await expect(page.locator('.enterprise-management-modal'))
      .toContainText('Half of one staffing position');
  });

test('enterprise loading repairs malformed legacy collections before staffing',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const home = s.player.provinceId;
      s.player.enterpriseMigration = 1;
      s.player.enterpriseLabor = { interrupted:'write' };
      s.player.enterprises = [
        null,
        'broken',
        { uid:'missing_definition', type:'removed_enterprise',
          provinceId:home, settlement:0 },
        { uid:'duplicate_enterprise', type:'field_strip',
          provinceId:'missing_county', settlement:'bad', workerIds:{} },
        { uid:'duplicate_enterprise', type:'field_strip',
          provinceId:home, settlement:999 }
      ];
      const repaired = FB.enterpriseList(s).map(function (enterprise) {
        return {
          uid:enterprise.uid,
          type:enterprise.type,
          provinceId:enterprise.provinceId,
          settlement:enterprise.settlement,
          workerIds:enterprise.workerIds
        };
      });
      const laborArray = Array.isArray(s.player.enterpriseLabor);
      s.player.enterprises = { interrupted:'write' };
      const nonArrayCount = FB.enterpriseList(s).length;
      return {
        repaired:repaired,
        laborArray:laborArray,
        nonArrayCount:nonArrayCount,
        home:home
      };
    });

    expect(result.repaired).toHaveLength(2);
    expect(result.repaired[0]).toMatchObject({
      uid:'duplicate_enterprise',
      type:'field_strip',
      provinceId:result.home,
      settlement:0
    });
    expect(result.repaired[0].workerIds).toBeUndefined();
    expect(result.repaired[1].uid).not.toBe('duplicate_enterprise');
    expect(result.repaired[1]).toMatchObject({
      type:'field_strip',
      provinceId:result.home,
      settlement:0
    });
    expect(result.laborArray).toBe(true);
    expect(result.nonArrayCount).toBe(0);
  });

test('enterprise manager exposes upgrades, staffing thresholds, and paid labor controls',
  async function ({ page }) {
    const uid = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const technology = FB.realmTechRecord(s, FB.techRealmId(s));
      if (technology.completed.indexOf('heavy_plough') < 0) {
        technology.completed.push('heavy_plough');
      }
      me.career = {
        profession:'farmer', rank:'journeyman', experience:4,
        startedYear:s.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      s.player.profession = 'farmer';
      s.player.enterpriseMigration = 1;
      s.player.gold = 1000;
      const enterprise = {
        uid:'upgrade_manager_fixture', type:'field_strip',
        provinceId:s.player.provinceId, settlement:0, workerId:me.id
      };
      s.player.enterprises = [enterprise];
      FB.ui.showEnterpriseManage(enterprise.uid);
      return enterprise.uid;
    });

    await expect(page.locator('#gm-body')).toContainText('Enterprise upgrades');
    await expect(page.locator('#gm-body')).toContainText('Upgrade to Joined Fields');
    await expect(page.locator('.enterprise-upgrade-panel .adesc')).toHaveCount(0);
    await page.locator('.enterprise-upgrade-panel').hover();
    await expect(page.locator('#tooltip')).toContainText('Current tier: Base enterprise');
    await expect(page.locator('#tooltip')).toContainText('Costs');
    await page.getByRole('button', { name:/Upgrade to Joined Fields/ }).click();
    await expect(page.locator('.enterprise-upgrade-panel > .settcard-head'))
      .not.toContainText('1 of 2 staffing positions filled');
    await page.locator('.enterprise-upgrade-panel').hover();
    await expect(page.locator('#tooltip'))
      .toContainText('1 of 2 staffing positions filled');
    await expect(page.getByRole('button', { name:/Hire a local worker/ }))
      .toBeEnabled();
    await page.getByRole('button', { name:/Hire a local worker/ }).click();
    await page.locator('.enterprise-management-status.staffed').hover();
    await expect(page.locator('#tooltip')).toContainText('Fully staffed');
    await expect(page.getByRole('button', { name:'Dismiss paid worker' }))
      .toBeVisible();
    const state = await page.evaluate(function (enterpriseUid) {
      const enterprise = FB.state.player.enterprises.filter(function (entry) {
        return entry.uid === enterpriseUid;
      })[0];
      return {
        level:enterprise.level,
        workers:FB.enterpriseWorkerIds(enterprise).length,
        contracts:FB.enterpriseLaborRecords(FB.state).length
      };
    }, uid);
    expect(state).toEqual({ level:1, workers:2, contracts:1 });

    await page.setViewportSize({ width:390, height:844 });
    await page.evaluate(function (enterpriseUid) {
      FB.ui.showEnterpriseManage(enterpriseUid, undefined, true);
    }, uid);
    const compactOverview = page.locator('.enterprise-management-status.staffed');
    const compactInfo = compactOverview.locator('.settcard-info');
    await expect(compactInfo).toBeVisible();
    await compactInfo.click();
    await expect(compactOverview.locator('.enterprise-management-details'))
      .toBeVisible();
    await expect(compactOverview.locator('.enterprise-management-details'))
      .toContainText('Fully staffed');
    await expect(compactOverview.locator('.enterprise-management-details'))
      .toContainText('Passes to heirs as family property');
    await expect(compactOverview.locator('.enterprise-management-details'))
      .not.toContainText('Owner');
  });

test('staffing preview discloses details and staffs each idle enterprise directly',
  async function ({ page }) {
    await page.setViewportSize({ width:900, height:844 });
    const fixture = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.career = {
        profession:'farmer', rank:'journeyman', experience:4,
        startedYear:s.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      s.player.profession = 'farmer';
      s.player.enterpriseMigration = 1;
      s.player.gold = 100;
      const enterprise = {
        uid:'staffing_preview_actions_fixture', type:'field_strip',
        provinceId:s.player.provinceId, settlement:0, workerId:null
      };
      s.player.enterprises = [enterprise];
      FB.ui.showEnterpriseStaffingPreview();
      return { uid:enterprise.uid, workerId:me.id };
    });

    const titleInfo = page.locator('.modal-title-info');
    await expect(titleInfo).toBeVisible();
    await titleInfo.click();
    await expect(page.locator('#gm-title-details')).toContainText(
      'Locked pairings and reserved workers stay fixed');

    let row = page.locator(
      '[data-enterprise-staffing-uid="' + fixture.uid + '"]');
    const rowInfo = row.locator('.settcard-info');
    await expect(rowInfo).toBeVisible();
    await expect(row.locator('.enterprise-staffing-place')).toBeHidden();
    await expect(row.locator('.enterprise-staffing-comparison small').first())
      .toBeHidden();
    await rowInfo.click();
    await expect(row.locator('.enterprise-staffing-details')).toContainText(
      'Hire a local worker');
    await expect(row.locator('.enterprise-staffing-details')).toContainText(
      'of 1 staffing positions filled');
    await expect(row.locator('.enterprise-staffing-details')).toContainText(
      'Pay');
    await expect(row.locator('[data-enterprise-staffing-manage]'))
      .toBeVisible();
    await expect(row.locator('[data-enterprise-staffing-hire]'))
      .toBeEnabled();

    await row.locator('[data-enterprise-staffing-manage]').click();
    await expect(page.locator('.enterprise-management-modal')).toBeVisible();
    await expect(page.locator(
      '[data-enterprise-worker="' + fixture.workerId + '"]')).toBeVisible();
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#gm-title')).toContainText(
      'Enterprise staffing preview');

    row = page.locator(
      '[data-enterprise-staffing-uid="' + fixture.uid + '"]');
    await row.locator('[data-enterprise-staffing-hire]').click();
    await expect(page.locator('#gm-title')).toContainText(
      'Enterprise staffing preview');
    await expect(page.locator('.enterprise-staffing-notice')).toContainText(
      'A local worker was hired');
    await expect(page.locator(
      '[data-enterprise-staffing-uid="' + fixture.uid + '"] ' +
      '[data-enterprise-staffing-hire]')).toHaveCount(0);
    const staffed = await page.evaluate(function (uid) {
      const enterprise = FB.state.player.enterprises.filter(function (entry) {
        return entry.uid === uid;
      })[0];
      return {
        workers:FB.enterpriseWorkerIds(enterprise).length,
        contracts:FB.enterpriseLaborRecords(FB.state).length
      };
    }, fixture.uid);
    expect(staffed).toEqual({ workers:1, contracts:1 });
  });

test('staffing assistant completes an upgraded crew instead of scattering partial staffs',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      s.player.tier = 0;
      me.born = s.date.year - 28;
      let helper = FB.householdWorkers(s).filter(function (worker) {
        return worker.id !== me.id &&
          !(FB.familyOfficeRecord && FB.familyOfficeRecord(s, worker.id));
      })[0];
      if (!helper) {
        const province = FB.world.byId[s.player.provinceId];
        helper = FB.makeCharacter(s, {
          culture:province.culture, religion:province.religion,
          born:s.date.year - 28, station:s.player.tier, quality:1
        });
        me.spouseId = helper.id;
        helper.spouseId = me.id;
        FB.touchFamily();
      }
      helper.born = s.date.year - 28;
      for (const worker of FB.householdWorkers(s)) {
        worker.career = {
          profession:worker.id === me.id || worker.id === helper.id
            ? 'farmer' : 'soldier',
          rank:'journeyman', experience:3, startedYear:s.date.year - 3,
          guildRank:'none', guildStanding:0, chosen:true
        };
      }
      s.player.enterpriseMigration = 1;
      s.player.enterprises = [
        { uid:'expanded_staff_a', type:'field_strip',
          provinceId:s.player.provinceId, settlement:0, level:1, workerId:null },
        { uid:'expanded_staff_b', type:'field_strip',
          provinceId:s.player.provinceId, settlement:1, level:1, workerId:null }
      ];
      const plan = FB.enterpriseStaffingPlan(s);
      return {
        proposed:plan.rows.map(function (row) {
          return row.proposedWorkerIds.length;
        }).sort(),
        proposedTotal:plan.proposedTotal,
        unresolved:plan.unresolvedCount
      };
    });

    expect(result.proposed).toEqual([0, 2]);
    expect(result.proposedTotal).toBeGreaterThan(0);
    expect(result.unresolved).toBe(1);
  });
