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

async function setupEnterpriseUpgradePlan(page) {
  return page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.player.gold = 100000;
    s.player.enterpriseMigration = 1;
    s.dev[pid] = 8;
    FB.rememberSettlementSites(s, pid);
    const tech = FB.realmTechRecord(s, FB.techRealmId(s));
    ['heavy_plough', 'three_field', 'improved_husbandry'].forEach(function (id) {
      if (tech.completed.indexOf(id) < 0) tech.completed.push(id);
    });
    s.player.enterprises = [
      { uid:'batch_field_a', type:'field_strip', provinceId:pid, settlement:0, workerId:null },
      { uid:'batch_orchard', type:'orchard_business', provinceId:pid, settlement:0, workerId:null },
      { uid:'batch_field_b', type:'field_strip', provinceId:pid, settlement:1, workerId:null }
    ];
    const cost = s.player.enterprises.slice(0, 2).reduce(function (sum, e) {
      return sum + FB.enterpriseUpgradeCost(s, e);
    }, 0);
    FB.ui.showEnterpriseStaffingPreview();
    return { pid:pid, cost:cost, gold:s.player.gold, turn:s.turn };
  });
}

for (const width of [390, 1280]) {
  test('Enterprise Plan upgrades one level by settlement and type at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    const setup = await setupEnterpriseUpgradePlan(page);
    await expect(page.locator('#enterprise-upgrade-settlement-summary')).toContainText('2 upgrades');
    await page.locator('#enterprise-upgrade-settlement').click();
    expect(await page.evaluate(function () {
      return { levels:FB.state.player.enterprises.map(FB.enterpriseUpgradeLevel),
        gold:FB.state.player.gold, turn:FB.state.turn };
    })).toEqual({ levels:[1, 1, 0], gold:setup.gold - setup.cost, turn:setup.turn });
    await page.locator('#enterprise-upgrade-type-select').selectOption('field_strip');
    const before = await page.evaluate(function () {
      return { gold:FB.state.player.gold, cost:FB.state.player.enterprises.filter(function (e) {
        return e.type === 'field_strip';
      }).reduce(function (sum, e) { return sum + FB.enterpriseUpgradeCost(FB.state, e); }, 0) };
    });
    await page.locator('#enterprise-upgrade-type').click();
    expect(await page.evaluate(function () {
      return { levels:FB.state.player.enterprises.map(FB.enterpriseUpgradeLevel), gold:FB.state.player.gold };
    })).toEqual({ levels:[2, 1, 1], gold:before.gold - before.cost });
    await expect(page.locator('#enterprise-upgrade-type-select')).toHaveValue('field_strip');
    await expect(page.locator('#enterprise-upgrade-type-summary')).toContainText('1 upgrades');
  });
}

test('enterprise batch upgrades reject changed prices and require the full cost', async function ({ page }) {
  const setup = await setupEnterpriseUpgradePlan(page);
  await page.evaluate(function () { FBDATA.enterprises.field_strip.upgrades[0].cost += 10; });
  await page.locator('#enterprise-upgrade-settlement').click();
  await expect(page.locator('.enterprise-staffing-notice')).toContainText('Upgrade terms changed');
  expect(await page.evaluate(function () {
    return { levels:FB.state.player.enterprises.map(FB.enterpriseUpgradeLevel), gold:FB.state.player.gold };
  })).toEqual({ levels:[0, 0, 0], gold:setup.gold });
  await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = FB.enterpriseUpgradeCost(s, s.player.enterprises[0]);
    FB.ui.showEnterpriseStaffingPreview();
  });
  await expect(page.locator('#enterprise-upgrade-settlement')).toBeDisabled();
  await expect(page.locator('#enterprise-upgrade-settlement-summary')).toContainText('Not enough money');
});

for (const width of [320, 390, 528]) {
  test('Enterprise Plan upgrade Details fit beside mobile actions at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    await setupEnterpriseUpgradePlan(page);
    for (const scope of ['settlement', 'type']) {
      const id = 'enterprise-upgrade-' + scope;
      const help = page.locator('[aria-controls="' + id + '-details"]');
      await help.scrollIntoViewIfNeeded();
      await expect(help).toBeVisible();
      for (const expanded of [false, true]) {
        if (expanded) await help.click();
        const bounds = await help.evaluate(function (button) {
          const row = button.closest('.settcard-head');
          const card = row.closest('.settcard').getBoundingClientRect();
          const action = row.querySelector('.actionbtn').getBoundingClientRect();
          const r = button.getBoundingClientRect();
          return { left:r.left, right:r.right, width:r.width, height:r.height,
            cardRight:card.right, actionLeft:action.left, actionRight:action.right,
            cardLeft:card.left, viewport:window.innerWidth };
        });
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.actionLeft).toBeGreaterThanOrEqual(bounds.cardLeft);
        expect(bounds.actionRight).toBeLessThanOrEqual(bounds.left);
        expect(bounds.right).toBeLessThanOrEqual(bounds.cardRight);
        expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
      }
      await expect(page.locator('#' + id + '-details')).toBeVisible();
      await expect(help).toHaveAttribute('aria-expanded', 'true');
      await help.click();
      await expect(page.locator('#' + id + '-details')).toBeHidden();
    }
  });
}

test('Enterprise Plan remains accessible when all enterprises are staffed', async function ({ page }) {
  await setupEnterpriseUpgradePlan(page);
  await page.evaluate(function () {
    const s = FB.state;
    for (const e of FB.enterpriseList(s)) FB.hireEnterpriseWorker(s, e.uid);
    FB.ui.showLivelihoods();
  });
  await expect(page.locator('#enterprise-staffing-preview')).toHaveText(/Enterprise Plan/);
  await page.locator('#enterprise-staffing-preview').click();
  await expect(page.locator('[data-enterprise-upgrade-plan]')).toBeVisible();
  await page.evaluate(function () { FB.ui.showHouseholdPlan(); });
  await expect(page.locator('#household-plan-staff-enterprises')).toHaveText(/Enterprise Plan/);
});

test('enterprise batch upgrades skip missing technology and completed enterprises', async function ({ page }) {
  await setupEnterpriseUpgradePlan(page);
  const cost = await page.evaluate(function () {
    const s = FB.state, tech = FB.realmTechRecord(s, FB.techRealmId(s));
    tech.completed = tech.completed.filter(function (id) { return id !== 'improved_husbandry'; });
    s.player.enterprises[2].level = 2;
    FB.ui.showEnterpriseStaffingPreview();
    return FB.enterpriseUpgradeCost(s, s.player.enterprises[0]);
  });
  await expect(page.locator('#enterprise-upgrade-settlement-summary')).toContainText('1 upgrades');
  await expect(page.locator('#enterprise-upgrade-settlement-details')).toContainText(/husbandry/i);
  await page.locator('#enterprise-upgrade-settlement').click();
  expect(await page.evaluate(function () {
    return { levels:FB.state.player.enterprises.map(FB.enterpriseUpgradeLevel), gold:FB.state.player.gold };
  })).toEqual({ levels:[1, 0, 2], gold:100000 - cost });
});

test('staffing preview summarizes enterprises in a full-screen mobile sheet', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  const expected = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 1000;
    s.player.enterpriseMigration = 1;
    s.player.enterprises = ['summary_a', 'summary_b', 'summary_c'].map(function (uid) {
      return { uid:uid, type:'orchard_business', provinceId:s.player.provinceId,
        settlement:0, workerId:null };
    });
    FB.hireEnterpriseWorker(s, 'summary_a');
    const plan = FB.enterpriseStaffingPlan(s);
    FB.ui.showEnterpriseStaffingPreview();
    return { changed:plan.changedCount, open:plan.unresolvedCount };
  });
  const summary = page.locator('.enterprise-staffing-summary');
  await expect(summary).toHaveCount(1);
  await expect(summary.locator('.enterprise-staffing-option')).toHaveCount(3);
  await expect(page.locator('#gm-title')).toContainText('Enterprise Plan');
  await expect(summary.locator('[data-staffing-option="plan"]')).toContainText(expected.changed + ' enterprises reassigned.');
  await expect(summary).toContainText('Pay now');
  await expect(summary).toContainText('Idle enterprises');
  await expect(summary).toContainText('Income estimate includes new wages');
  await expect(page.locator('[data-enterprise-staffing-uid]')).toHaveCount(0);
  await expect(page.locator('#enterprise-staffing-apply')).toHaveText('Apply plan');
  await expect(page.locator('#enterprise-staffing-local')).toHaveText('Staff local');
  for (const size of [{ width:390, height:844 }, { width:844, height:390 }]) {
    await page.setViewportSize(size);
    const bounds = await page.locator('#genmodal .modalcard').boundingBox();
    expect(bounds.x).toBeCloseTo(0, 0);
    expect(bounds.y).toBeCloseTo(0, 0);
    expect(bounds.width).toBeCloseTo(size.width, 0);
    expect(bounds.height).toBeCloseTo(size.height, 0);
  }
  await page.locator('.modal-title-info').click();
  await expect(page.locator('#gm-title-details')).toContainText('paid retainers');
  await expect(page.locator('#gm-title-details')).toContainText('Locked pairings');
});

['hire', 'assign'].forEach(function (action) {
  test('enterprise ' + action + ' returns to the refreshed work list with its position',
    async function ({ page }) {
      await page.setViewportSize({ width:1000, height:600 });
      const fixture = await page.evaluate(function () {
        const s = FB.state, me = s.chars[s.player.charId];
        FB.setCareer(s, me, 'farmer', 'journeyman');
        s.player.gold = 1000;
        s.player.enterprises = [];
        for (let i = 0; i < 16; i++) {
          s.player.enterprises.push({
            uid:'staff_return_' + i, type:'orchard_business',
            provinceId:s.player.provinceId, settlement:0, workerId:null
          });
        }
        FB.ui.showLivelihoods();
        return { workerId:me.id, turn:s.turn };
      });
      const row = page.locator('[data-enterprise]').last();
      const origin = await row.evaluate(function (node) {
        node.scrollIntoView({ block:'center' });
        return {
          uid:node.dataset.enterprise,
          scroll:document.getElementById('gm-body').scrollTop
        };
      });
      expect(origin.scroll).toBeGreaterThan(0);
      await row.click();
      if (action === 'hire') await page.locator('#enterprise-hire').click();
      else await page.locator(
        '[data-enterprise-worker="' + fixture.workerId + '"]').click();
      await expect(page.locator('#gm-title')).toContainText('Work & Enterprises');
      const returned = page.locator('[data-enterprise="' + origin.uid + '"]');
      await expect(returned).toBeFocused();
      await expect(returned).not.toContainText('Idle');
      await expect.poll(function () {
        return page.locator('#gm-body').evaluate(function (body) {
          return body.scrollTop;
        });
      }).toBeGreaterThanOrEqual(origin.scroll - 5);
      const state = await page.evaluate(function (uid) {
        const s = FB.state;
        const enterprise = FB.enterpriseList(s).filter(function (e) {
          return e.uid === uid;
        })[0];
        return { workers:FB.enterpriseWorkerIds(enterprise), turn:s.turn };
      }, origin.uid);
      expect(state.workers).toHaveLength(1);
      if (action === 'assign') expect(state.workers).toEqual([fixture.workerId]);
      expect(state.turn).toBe(fixture.turn);
    });
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
    // The shared footer normalizes this top-level cancellation to Close.
    await page.locator('#genmodal').getByRole('button', {
      name:'Close',
      exact:true
    }).click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    const dismissed = await page.evaluate(function () {
      const state = FB.state;
      return { home:state.player.provinceId,
        worker:state.player.enterprises[0].workerId,
        player:state.player.charId };
    });
    expect(dismissed.home).toBe(setup.oldHome);
    expect(dismissed.worker).toBe(dismissed.player);

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
    const expectedWork = await page.evaluate(function (home) {
      const pr = FB.world.byId[home], settlement = FB.settlementsOf(FB.state, home)[1];
      return 'Working at ' + FBDATA.enterprises.workshop_business.name + ' in ' +
        (settlement ? settlement.name + ', ' : '') + pr.name;
    }, fixture.home);
    await expect(candidate.locator('.person-assignment-state')).toHaveText(expectedWork);
    await expect(candidate.locator('.person-assignment-state')).toHaveClass(/working/);
    const workColor = await candidate.locator('.person-assignment-state').evaluate(function (node) {
      const probe = document.createElement('span');
      probe.style.color = 'var(--ui-danger-color)'; node.appendChild(probe);
      const result = { actual:getComputedStyle(node).color, expected:getComputedStyle(probe).color };
      probe.remove(); return result;
    });
    expect(workColor.actual).toBe(workColor.expected);
    await expect(candidate.locator('.person-assignment-eligibility'))
      .toHaveCount(0);
    await candidate.locator('..').hover();
    await expect(page.locator('#tooltip')).toContainText('Current assignment');
    await expect(page.locator('#tooltip')).toContainText('Expected yield');
    await page.evaluate(function (uid) {
      FB.state.player.enterprises.forEach(function (entry) {
        entry.workerId = null; entry.workerIds = [];
      });
      FB.ui.showEnterpriseManage(uid, undefined, true);
    }, fixture.uid);
    await expect(candidate.locator('.person-assignment-state')).toHaveText('Available');
    await expect(candidate.locator('.person-assignment-state')).not.toHaveClass(/working/);

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
    await expect(page.locator('#gm-title')).toContainText('Work & Enterprises');
    await page.locator('[data-enterprise="' + uid + '"]').click();
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

test('Apply plan uses the reviewed assignments without hiring or spending', async function ({ page }) {
  const before = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    s.player.tier = 0;
    FB.setCareer(s, me, 'farmer', 'journeyman');
    s.player.enterpriseMigration = 1;
    s.player.enterprises = [{ uid:'apply_summary', type:'field_strip',
      provinceId:s.player.provinceId, settlement:0, workerId:null }];
    const plan = FB.enterpriseStaffingPlan(s);
    FB.ui.showHouseholdPlan();
    return { gold:s.player.gold, turn:s.turn,
      workers:plan.rows[0].proposedWorkerIds,
      hires:FB.enterpriseLaborRecords(s).length };
  });
  expect(before.workers.length).toBeGreaterThan(0);
  await page.locator('#household-plan-staff-enterprises').click();
  await page.locator('#enterprise-staffing-apply').click();
  await expect(page.locator('#gm-title')).toContainText('Enterprise Plan');
  await expect(page.locator('#gm-body')).toContainText('Household staffing plan applied.');
  expect(await page.evaluate(function () {
    const s = FB.state;
    return { gold:s.player.gold, turn:s.turn,
      workers:FB.enterpriseWorkerIds(s.player.enterprises[0]),
      hires:FB.enterpriseLaborRecords(s).length };
  })).toEqual(before);
  await page.locator('#enterprise-staffing-back').click();
  await expect(page.locator('#gm-title')).toContainText('Household Plan');
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


test('staff all local fills whole vacancies and charges the displayed wages without passing a day', async function ({ page }) {
  const before = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 1000;
    s.player.enterpriseMigration = 1;
    s.player.enterprises = [
      { uid:'bulk_full', level:0 }, { uid:'bulk_partial', level:1 },
      { uid:'bulk_empty', level:0 }
    ].map(function (item) {
      return Object.assign(item, { type:'orchard_business',
        provinceId:s.player.provinceId, settlement:0, workerId:null });
    });
    FB.hireEnterpriseWorker(s, 'bulk_full');
    FB.hireEnterpriseWorker(s, 'bulk_partial');
    const workers = FB.enterpriseLaborRecords(s).map(function (r) { return r.charId; });
    const missing = FB.enterpriseList(s).reduce(function (n, e) {
      return n + Math.floor(FB.enterpriseStaffRequired(e) - FB.enterpriseStaffAssigned(s, e));
    }, 0);
    const cost = missing * FB.enterpriseLaborPay(s, { type:'orchard_business' });
    FB.ui.showEnterpriseStaffingPreview();
    return { gold:s.player.gold, turn:s.turn, workers:workers, missing:missing, cost:cost };
  });
  await expect(page.locator('#enterprise-staffing-local-terms')).toContainText(String(before.missing));
  await page.getByRole('button', { name:'Staff local', exact:true }).click();
  const after = await page.evaluate(function () {
    const s = FB.state;
    return { gold:s.player.gold, turn:s.turn,
      workers:FB.enterpriseLaborRecords(s).map(function (r) { return r.charId; }),
      full:FB.enterpriseList(s).every(function (e) {
        return FB.enterpriseStaffAssigned(s, e) === FB.enterpriseStaffRequired(e);
      }) };
  });
  expect(after.gold).toBe(before.gold - before.cost);
  expect(after.turn).toBe(before.turn);
  expect(after.workers.slice(0, before.workers.length)).toEqual(before.workers);
  expect(after.workers.length).toBe(before.workers.length + before.missing);
  expect(after.full).toBe(true);
  await expect(page.locator('#enterprise-staffing-local')).toBeDisabled();
});

test('staff all local requires the full wage and revalidates changed vacancies', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state;
    s.player.enterpriseMigration = 1;
    s.player.enterprises = ['bulk_a', 'bulk_b'].map(function (uid) {
      return { uid:uid, type:'orchard_business', provinceId:s.player.provinceId,
        settlement:0, workerId:null };
    });
    s.player.gold = FB.enterpriseLaborPay(s, s.player.enterprises[0]);
    FB.ui.showEnterpriseStaffingPreview();
  });
  await expect(page.locator('#enterprise-staffing-local')).toBeDisabled();
  const gold = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 1000;
    FB.ui.showEnterpriseStaffingPreview();
    FB.hireEnterpriseWorker(s, 'bulk_a');
    return s.player.gold;
  });
  await page.locator('#enterprise-staffing-local').click();
  await expect(page.locator('.enterprise-staffing-notice')).toContainText('Local staffing changed');
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(gold);
  await page.locator('#enterprise-staffing-local').click();
  await expect(page.locator('#enterprise-staffing-local')).toBeDisabled();
});

test('Apply plan requires another review when staffing changes', async function ({ page }) {
  const before = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    s.player.tier = 0;
    FB.setCareer(s, me, 'farmer', 'journeyman');
    s.player.enterpriseMigration = 1;
    s.player.enterprises = [{ uid:'stale_summary', type:'field_strip',
      provinceId:s.player.provinceId, settlement:0, workerId:null }];
    FB.ui.showEnterpriseStaffingPreview();
    // Change a reviewed input without redrawing the modal.
    s.player.enterprises[0].level = 1;
    return { gold:s.player.gold, turn:s.turn };
  });
  await page.locator('#enterprise-staffing-apply').click();
  await expect(page.locator('.enterprise-staffing-notice')).toContainText('A fresh plan is shown');
  expect(await page.evaluate(function () {
    return { gold:FB.state.player.gold, turn:FB.state.turn };
  })).toEqual(before);
  await expect(page.locator('.enterprise-staffing-summary')).toHaveCount(1);
});

['household', 'local', 'unprofitable', 'unaffordable'].forEach(function (scenario) {
  test('staffing comparison explains the useful option: ' + scenario, async function ({ page }) {
    await page.evaluate(function (kind) {
      const s = FB.state;
      s.player.tier = 0;
      s.player.enterpriseMigration = 1;
      s.player.gold = kind === 'unaffordable' ? 0 : 1000;
      // Estate service accepts both sexes; Soldier would leave women farming.
      for (const worker of FB.householdWorkers(s)) {
        if (!FB.setCareer(s, worker, 'noble', 'journeyman')) throw new Error('Staffing fixture career rejected');
      }
      if (kind === 'household') FB.setCareer(s, s.chars[s.player.charId], 'farmer', 'journeyman');
      FBDATA.enterprises.field_strip.yield = 10;
      FBDATA.enterprises.field_strip.laborPay = kind === 'unprofitable' ? 100 : 1;
      s.player.enterprises = [{ uid:'compare', type:'field_strip',
        provinceId:s.player.provinceId, settlement:0, workerId:null }];
      FB.ui.showEnterpriseStaffingPreview();
    }, scenario);
    const plan = page.locator('[data-staffing-option="plan"]');
    const local = page.locator('[data-staffing-option="local"]');
    await expect(plan.locator('#enterprise-staffing-apply')).toHaveCount(1);
    await expect(local.locator('#enterprise-staffing-local')).toHaveCount(1);
    await expect(local).toContainText('Income estimate includes new wages');
    if (scenario === 'household') {
      await expect(plan).toHaveAttribute('data-recommended', 'true');
      await expect(local).toContainText('Apply the free plan first');
    } else {
      await expect(plan).toContainText('No household staffing improvement available');
      await expect(plan.locator('button')).toBeDisabled();
      if (scenario === 'local') {
        await expect(local).toHaveAttribute('data-recommended', 'true');
        await expect(local).toContainText('Best estimated income gain');
      } else {
        await expect(local).toHaveAttribute('data-recommended', 'false');
        await expect(local).toContainText(scenario === 'unprofitable'
          ? 'Wages outweigh' : 'Not enough gold');
      }
    }
  });
});

test('local income estimate is deterministic and leaves state untouched', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.player.enterpriseMigration = 1;
    s.player.enterprises = [{ uid:'estimate', type:'field_strip',
      provinceId:s.player.provinceId, settlement:0, workerId:null }];
    const enterprise = FB.enterpriseList(s)[0];
    FB.enterpriseLocalStaffYieldEstimate(s, enterprise);
    const before = JSON.stringify(s);
    const first = FB.enterpriseLocalStaffYieldEstimate(s, enterprise);
    const second = FB.enterpriseLocalStaffYieldEstimate(s, enterprise);
    return { first:first, second:second, unchanged:before === JSON.stringify(s) };
  });
  expect(result.first).toBeGreaterThan(0);
  expect(result.second).toBe(result.first);
  expect(result.unchanged).toBe(true);
});

test('empty staffing summary disables both batch actions', async function ({ page }) {
  await page.evaluate(function () {
    FB.state.player.enterpriseMigration = 1;
    FB.state.player.enterprises = [];
    FB.ui.showEnterpriseStaffingPreview();
  });
  await expect(page.locator('.enterprise-staffing-summary')).toContainText('No whole vacancies to fill');
  await expect(page.locator('#enterprise-staffing-apply')).toBeDisabled();
  await expect(page.locator('#enterprise-staffing-local')).toBeDisabled();
});
