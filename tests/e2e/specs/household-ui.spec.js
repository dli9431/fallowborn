'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'data/economy.js',
  'data/map_data.js',
  'data/technology.js',
  'js/main.js',
  'js/actions.js',
  'js/armies.js',
  'js/economy.js',
  'js/model.js',
  'js/technology.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'js/world.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('adjusts living standards and work outfits inline with tooltip terms',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const record = FB.realmTechRecord(s, FB.techRealmId(s));
      for (const id in FBDATA.tech) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      }
      s.player.tier = 0;
      s.player.gold = 250;
      s.player.householdStandards = { board:1, outfit_farmer:1 };
      s.player.holdings = ['hearth_garden'];
      FB.ui.refresh();
      FB.ui.showHousehold();
      return {
        generalStandards:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind === 'general';
        }).length,
        rulerStandards:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind === 'ruler';
        }).length,
        visibleOutfits:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind === 'work' &&
            (FB.householdStandardLevel(s, id) ||
              FB.householdStandardWorkerEligible(s, id));
        }).length,
        availableHoldings:FB.holdingAvailable(s).length,
        nextBoardCost:FB.money(FB.householdStandardUpgradeCost(s, 'board')),
        waresCost:FB.householdStandardUpgradeCost(s, 'wares'),
        gold:s.player.gold
      };
    });

    await expect(page.locator('#genmodal')).toHaveClass(/household-modal/);
    await expect(page.locator('.household-section-hint')).toHaveCount(0);
    const livingHeading = page.locator(
      '#household-living .household-section-heading');
    await expect(livingHeading).toHaveAttribute('tabindex', '0');
    await livingHeading.hover();
    const sectionTooltip = page.locator('#tooltip');
    await expect(sectionTooltip).toBeVisible();
    await expect(sectionTooltip).toContainText(
      'Living standards benefit the whole resident household.');
    const livingRows = page.locator('#household-living .household-standard-stepper');
    const living = page.locator('#household-living [data-household-standard]');
    await expect(livingRows).toHaveCount(setup.generalStandards);
    await expect(living).toHaveCount(setup.generalStandards);
    await expect(livingRows.locator('[data-household-standard-adjust]'))
      .toHaveCount(setup.generalStandards * 2);
    await expect(page.locator('#household-outfits .household-standard-stepper'))
      .toHaveCount(setup.visibleOutfits);
    await expect(page.locator('#household-ruler .household-standard-stepper'))
      .toHaveCount(setup.rulerStandards);
    await expect(page.locator(
      '#household-property [data-holding]'))
      .toHaveCount(setup.availableHoldings);
    await expect(page.locator(
      '#household-property .household-entry-owned')).toHaveCount(1);
    await expect(page.locator('#gm-body > .gm-footer > #gm-cancel'))
      .toHaveText('Close');

    const board = page.locator('[data-household-standard="board"]');
    await expect(board).toContainText('Level 1: Full Larder');
    await expect(board).toContainText(
      'Reduces yearly household mortality by 0.1 percentage points.');
    await expect(board.locator('.household-entry-cost'))
      .toContainText(setup.nextBoardCost);
    await expect(livingRows.last()).toBeInViewport();

    const rowHeights = await livingRows.evaluateAll(function (rows) {
      return rows.map(function (row) { return row.getBoundingClientRect().height; });
    });
    expect(Math.max.apply(Math, rowHeights)).toBeLessThan(90);

    const wares = page.locator('[data-household-standard="wares"]');
    const waresDecrease = page.locator(
      '[data-household-standard-id="wares"][data-household-standard-adjust="-1"]');
    const waresIncrease = page.locator(
      '[data-household-standard-id="wares"][data-household-standard-adjust="1"]');
    expect(await wares.evaluate(function (node) { return node.tagName; })).toBe('DIV');
    await expect(wares).toContainText('Baseline');
    await expect(waresDecrease).toBeDisabled();
    await expect(waresIncrease).toHaveAttribute('aria-label',
      'Increase Household wares to level 1: Good Bedding and Vessels');

    await waresIncrease.hover();
    const tooltip = page.locator('#tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Owner');
    await expect(tooltip).toContainText('Household dynasty');
    await expect(tooltip).toContainText(
      'Adds 1 percentage point to yearly education chances.');
    await expect(tooltip).toContainText('Setup cost');
    await expect(tooltip).toContainText('Recurring cost');
    await expect(tooltip).toContainText('Projected seasonal net');
    await expect(tooltip).toContainText('Projected purse after next season');
    await expect(tooltip).toContainText(
      'Passes to the next household head; cannot be sold or pledged');

    await waresIncrease.click();
    await expect(page.locator('#genmodal')).toHaveClass(/household-modal/);
    await expect(page.locator('#gm-title')).toContainText(
      'Household standards & property');
    await expect(page.locator('[data-household-standard="wares"]'))
      .toContainText('Level 1: Good Bedding and Vessels');
    await expect(page.locator('.household-standard-modal')).toHaveCount(0);
    await expect(page.locator(
      '#household-standard-confirm, #household-standard-reduce-confirm'))
      .toHaveCount(0);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(
      'Adds 2.5 percentage points to yearly education chances.');
    await expect(tooltip).toContainText('Requires Freeholder rank.');

    const purchased = await page.evaluate(function () {
      return {
        level:FB.householdStandardLevel(FB.state, 'wares'),
        gold:FB.state.player.gold
      };
    });
    expect(purchased.level).toBe(1);
    expect(purchased.gold).toBe(setup.gold - setup.waresCost);

    await waresDecrease.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(
      'Its setup cost is not refunded, and restoring it later requires paying that full cost again.');
    await expect(tooltip).toContainText('New level');
    await expect(tooltip).toContainText('Baseline');
    await expect(tooltip).toContainText('Projected seasonal net');

    await waresDecrease.click();
    await expect(page.locator('#genmodal')).toHaveClass(/household-modal/);
    await expect(page.locator('[data-household-standard="wares"]'))
      .toContainText('Baseline');
    const reduced = await page.evaluate(function () {
      return {
        level:FB.householdStandardLevel(FB.state, 'wares'),
        gold:FB.state.player.gold
      };
    });
    expect(reduced.level).toBe(0);
    expect(reduced.gold).toBe(purchased.gold);

    const outfitDecrease = page.locator(
      '[data-household-standard-id="outfit_farmer"]' +
      '[data-household-standard-adjust="-1"]');
    await expect(outfitDecrease).toBeEnabled();
    await outfitDecrease.press('Enter');
    expect(await page.evaluate(function () {
      return FB.householdStandardLevel(FB.state, 'outfit_farmer');
    })).toBe(0);
  });

test('uses the shared question-mark disclosure for household adjustments on compact layouts',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:740 });
    const before = await page.evaluate(function () {
      const s = FB.state;
      const record = FB.realmTechRecord(s, FB.techRealmId(s));
      for (const id in FBDATA.tech) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      }
      s.player.tier = 0;
      s.player.gold = 250;
      s.player.householdStandards = { board:1 };
      FB.ui.refresh();
      FB.ui.showHousehold();
      return {
        level:FB.householdStandardLevel(s, 'board'),
        gold:s.player.gold
      };
    });

    const row = page.locator('[data-household-standard-row="board"]');
    const info = row.locator('.household-standard-info-actions .settcard-info');
    const details = row.locator('.household-standard-adjustment-details');
    const increase = row.locator('[data-household-standard-adjust="1"]');
    const sectionInfo = page.locator(
      '#household-living .household-section-heading .settcard-info');
    const sectionDetails = page.locator('#household-living-title-details');

    await expect(page.locator('.household-section-hint')).toHaveCount(0);
    await expect(sectionInfo).toBeVisible();
    await expect(sectionDetails).toBeHidden();
    await sectionInfo.click();
    await expect(sectionDetails).toBeVisible();
    await expect(sectionDetails).toHaveText(
      'Living standards benefit the whole resident household.');
    await sectionInfo.click();
    await expect(sectionDetails).toBeHidden();

    await expect(info).toBeVisible();
    await expect(info).toHaveAttribute('aria-expanded', 'false');
    await expect(details).toBeHidden();

    await increase.hover();
    await expect(page.locator('#tooltip')).toBeHidden();

    await info.click();
    await expect(info).toHaveAttribute('aria-expanded', 'true');
    await expect(details).toBeVisible();
    await expect(details).toContainText('Decrease one level');
    await expect(details).toContainText('Increase one level');
    await expect(details).toContainText(
      'Its setup cost is not refunded, and restoring it later requires paying that full cost again.');
    await expect(details).toContainText('Projected seasonal net');
    await expect(details).toContainText('Projected purse after next season');

    expect(await page.evaluate(function () {
      return {
        level:FB.householdStandardLevel(FB.state, 'board'),
        gold:FB.state.player.gold
      };
    })).toEqual(before);

    await info.click();
    await expect(info).toHaveAttribute('aria-expanded', 'false');
    await expect(details).toBeHidden();
  });

test('keeps work and enterprise management available at every adult rank',
  async function ({ page }) {
    const shown = await page.evaluate(function () {
      const s = FB.state;
      const protagonist = s.chars[s.player.charId];
      protagonist.born = s.date.year - 30;
      for (const id in s.chars) {
        if (id !== s.player.charId) s.chars[id].dead = true;
      }
      s.player.enterprises = [];
      s.player.enterpriseLabor = [];
      s.player.retainers = [];
      let deed = null;
      for (let i = 0; i < FB.instants.length; i++) {
        if (FB.instants[i].id === 'livelihoods') deed = FB.instants[i];
      }
      const result = [];
      for (let tier = 0; tier <= 7; tier++) {
        s.player.tier = tier;
        result.push(deed.show(s));
      }
      return result;
    });

    expect(shown).toEqual([true, true, true, true, true, true, true, true]);
  });

test('landed rulers keep household standards active with title-scaled reduction floors',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const record = FB.realmTechRecord(s, FB.techRealmId(s));
      for (const id in FBDATA.tech) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      }
      const protagonist = s.chars[s.player.charId];
      protagonist.career = {
        profession:'farmer', rank:'journeyman', chosen:true,
        experience:1, guildRank:'none', guildStanding:0
      };
      s.player.tier = 3;
      s.player.gold = 1000;
      s.player.householdStandards = { board:1, outfit_farmer:1 };
      const effects = FB.householdStandardEffects(s);
      const landedActivity = {
        board:FB.householdStandardActive(s, 'board'),
        outfit:FB.householdStandardActive(s, 'outfit_farmer'),
        mortality:effects.mortality,
        farmerWork:effects.work.farmer,
        upkeep:FB.householdStandardsUpkeep(s),
        upkeepIds:FB.householdStandardsUpkeepParts(s).lines.map(function (line) {
          return line.id;
        }),
        boardUpgrade:FB.householdStandardUpgradeAvailable(s, 'board'),
        outfitUpgrade:FB.householdStandardUpgradeAvailable(s, 'outfit_farmer')
      };

      s.player.householdStandards = { board:3, outfit_farmer:3 };
      const floors = [2, 3, 4, 5, 7].map(function (tier) {
        s.player.tier = tier;
        return FB.householdStandardMinimumLevel(s, 'board');
      });

      s.player.tier = 4;
      s.player.householdStandards.board = 2;
      const countBlocked = FB.reduceHouseholdStandard(s, 'board');

      s.player.tier = 3;
      s.player.householdStandards.board = 3;
      const first = FB.reduceHouseholdStandard(s, 'board');
      const second = FB.reduceHouseholdStandard(s, 'board');
      const third = FB.reduceHouseholdStandard(s, 'board');
      const boardLevel = FB.householdStandardLevel(s, 'board');
      const workFloor = FB.householdStandardMinimumLevel(s, 'outfit_farmer');
      const workReductions = [
        FB.reduceHouseholdStandard(s, 'outfit_farmer'),
        FB.reduceHouseholdStandard(s, 'outfit_farmer'),
        FB.reduceHouseholdStandard(s, 'outfit_farmer')
      ];
      const workLevel = FB.householdStandardLevel(s, 'outfit_farmer');

      s.player.householdStandards = { board:2, outfit_farmer:1 };
      s.player.gold = 0;
      const floorSettlement = FB.householdStandardsSeason(s);
      const landedShortfall = {
        paid:floorSettlement.paid,
        reduced:floorSettlement.reduced,
        gold:s.player.gold,
        boardLevel:FB.householdStandardLevel(s, 'board'),
        outfitLevel:FB.householdStandardLevel(s, 'outfit_farmer')
      };

      s.player.gold = 1000;
      s.player.householdStandards = { board:1, outfit_farmer:1 };
      const deed = FB.instantStatus(s, 'better_household');
      FB.ui.showTab('actions', { history:false });
      return {
        landedActivity:landedActivity,
        floors:floors,
        countBlocked:countBlocked,
        reductions:[first, second, third],
        boardLevel:boardLevel,
        workFloor:workFloor,
        workReductions:workReductions,
        workLevel:workLevel,
        landedShortfall:landedShortfall,
        rank:FB.titleWordFor(s, s.player.tier),
        deed:{ shown:deed.shown, can:deed.can }
      };
    });

    expect(result.landedActivity).toMatchObject({
      board:true,
      outfit:true,
      mortality:0.001,
      farmerWork:0.05,
      upkeepIds:['board', 'outfit_farmer'],
      boardUpgrade:true,
      outfitUpgrade:true
    });
    expect(result.landedActivity.upkeep).toBeGreaterThan(0);
    expect(result.floors).toEqual([0, 1, 2, 3, 5]);
    expect(result.countBlocked).toBe(false);
    expect(result.reductions).toEqual([true, true, false]);
    expect(result.boardLevel).toBe(1);
    expect(result.workFloor).toBe(0);
    expect(result.workReductions).toEqual([true, true, true]);
    expect(result.workLevel).toBe(0);
    expect(result.landedShortfall.reduced).toEqual(['board', 'outfit_farmer']);
    expect(result.landedShortfall.boardLevel).toBe(1);
    expect(result.landedShortfall.outfitLevel).toBe(0);
    expect(result.landedShortfall.paid).toBeGreaterThan(0);
    expect(result.landedShortfall.gold)
      .toBeCloseTo(-result.landedShortfall.paid, 8);
    expect(result.deed).toEqual({ shown:true, can:true });

    const workGroup = page.locator('#tab-actions [data-action-group="work"]');
    if (await workGroup.getAttribute('aria-expanded') !== 'true') {
      await workGroup.click();
    }
    const household = page.locator('[data-action-id="better_household"]');
    await expect(household).toBeVisible();
    await expect(household).toBeEnabled();
    await household.click();
    const boardRow = page.locator('[data-household-standard-row="board"]');
    await expect(boardRow).not.toContainText('Dormant');
    await expect(boardRow).toContainText(
      'Reduces yearly household mortality by 0.1 percentage points.');
    await expect(boardRow).toContainText('/season');
    await expect(boardRow.locator('[data-household-standard-adjust="-1"]'))
      .toBeDisabled();
    await expect(boardRow.locator('.household-standard-adjustment-details'))
      .toContainText(result.rank +
        ' households may not reduce this standard below level 1');
    const outfitRow = page.locator(
      '[data-household-standard-row="outfit_farmer"]');
    await expect(outfitRow).not.toContainText('Dormant');
    await expect(outfitRow).toContainText('Raises farming output by 5%.');
  });

test('ruler establishments sink gold into research, administration, and military power',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const record = FB.realmTechRecord(s, FB.techRealmId(s));
      for (const id in FBDATA.tech) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      }
      s.player.tier = 3;
      s.player.gold = 100000;
      s.player.householdStandards = {};
      const realmId = FB.techRealmId(s);
      const probe = {
        id:'household_guard_probe', realm:'player', men:1000, size:1000,
        units:{ levy:1000, arch:0, cav:0, ret:0, mercs:0 },
        at:FB.homeProv(s), supply:100
      };
      const before = {
        research:FB.techResearchRate(s, realmId),
        domain:FB.domainCap(s),
        battle:FB.armyBattlePower(s, probe, FB.homeProv(s), 'attack')
      };
      s.player.householdStandards = {
        household_guard:1,
        scholarly_household:1,
        chancery_household:1
      };
      const effects = FB.householdStandardEffects(s);
      const after = {
        research:FB.techResearchRate(s, realmId),
        domain:FB.domainCap(s),
        composition:FB.playerCompositionBreakdown(s),
        battle:FB.armyBattlePower(s, probe, FB.homeProv(s), 'attack'),
        upkeep:FB.householdStandardsUpkeep(s),
        guardFloor:FB.householdStandardMinimumLevel(s, 'household_guard')
      };
      const mailIndex = record.completed.indexOf('mail_hauberks');
      if (mailIndex >= 0) record.completed.splice(mailIndex, 1);
      const guardGrandfathered = FB.householdStandardActive(s, 'household_guard');
      if (mailIndex >= 0) record.completed.push('mail_hauberks');
      const guardRequirement = FB.householdStandardUpgradeAvailable(
        s, 'household_guard');
      FB.ui.showHousehold();
      return {
        before:before,
        after:after,
        effects:effects,
        guardActive:FB.householdStandardActive(s, 'household_guard'),
        guardGrandfathered:guardGrandfathered,
        guardRequirement:guardRequirement,
        rulerCount:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind === 'ruler';
        }).length,
        generalDepths:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind === 'general';
        }).map(function (id) {
          return FBDATA.householdStandards[id].levels.length;
        }),
        rulerDepths:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind === 'ruler';
        }).map(function (id) {
          return FBDATA.householdStandards[id].levels.length;
        }),
        rulerGoldEffects:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind === 'ruler';
        }).some(function (id) {
          return FBDATA.householdStandards[id].levels.some(function (level) {
            return !!(level.fx && level.fx.gold);
          });
        })
      };
    });

    expect(result.guardActive).toBe(true);
    expect(result.guardGrandfathered).toBe(true);
    expect(result.generalDepths).toEqual([5, 5, 5, 5, 5]);
    expect(result.rulerDepths).toEqual([3, 3, 3]);
    expect(result.rulerGoldEffects).toBe(false);
    expect(result.effects).toMatchObject({
      research:0.75,
      domain:1,
      levy:40,
      retinue:25,
      battle:0.02
    });
    expect(result.after.research - result.before.research).toBeCloseTo(0.75, 8);
    expect(result.after.domain - result.before.domain).toBe(1);
    const householdForces = result.after.composition.entries.filter(function (entry) {
      return entry.kind === 'household_standard';
    }).reduce(function (units, entry) {
      units[entry.unit] = (units[entry.unit] || 0) + entry.amount;
      return units;
    }, {});
    expect(householdForces).toMatchObject({ levy:40, ret:25 });
    expect(result.after.battle).toBeGreaterThan(result.before.battle);
    expect(result.after.upkeep).toBeGreaterThan(0);
    expect(result.after.guardFloor).toBe(0);

    await expect(page.locator('#household-ruler .household-standard-stepper'))
      .toHaveCount(result.rulerCount);
    await expect(page.locator('#household-ruler')).toContainText(
      'Ruler establishments');
    const guard = page.locator('[data-household-standard="household_guard"]');
    await expect(guard).toContainText('Level 1: Sworn Hall Guard');
    await expect(guard).toContainText(
      'Adds 40 levy, 25 men-at-arms, and 2% field-battle power.');
    const guardIncrease = page.locator(
      '[data-household-standard-id="household_guard"]' +
      '[data-household-standard-adjust="1"]');
    await guardIncrease.hover();
    await expect(page.locator('#tooltip')).toContainText('Ruler household and realm');
    await expect(page.locator('#tooltip')).toContainText(result.guardRequirement);

    const dormant = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 2;
      return {
        level:FB.householdStandardLevel(s, 'household_guard'),
        active:FB.householdStandardActive(s, 'household_guard'),
        levy:FB.householdStandardEffect(s, 'levy'),
        upkeep:FB.householdStandardsUpkeep(s),
        available:FB.householdStandardUpgradeAvailable(s, 'household_guard')
      };
    });
    expect(dormant).toEqual({
      level:1,
      active:false,
      levy:0,
      upkeep:0,
      available:result.guardRequirement
    });
  });

test('minor succession keeps adult deeds visible, limits focuses to Study and Play, and permits only inherited-standard reductions',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const former = s.chars[s.player.charId];
      s.player.tier = 1;
      s.player.gold = 250;
      s.player.householdStandards = { board:2 };
      s.player.holdings = [];
      const child = FB.makeCharacter(s, {
        name:'Alden', sex:'m', born:s.date.year - 10,
        fatherId:former.sex === 'm' ? former.id : null,
        motherId:former.sex === 'f' ? former.id : null,
        culture:former.culture, religion:former.religion,
        dyn:former.dyn, traitsN:0
      });
      former.childrenIds = former.childrenIds || [];
      former.childrenIds.push(child.id);
      FB.game.succeedTo(child.id, { livingAbdication:true });
      FB.ui.showTab('actions');
      const town = FB.instantStatus(s, 'go_to_town');
      const household = FB.instantStatus(s, 'better_household');
      return {
        age:FB.ageOf(child, s.date.year),
        focuses:FB.listFocusChoices(s).map(function (item) {
          return item.action.id;
        }),
        town:{ shown:town.shown, can:town.can, reason:town.reason },
        household:{ shown:household.shown, can:household.can,
          reason:household.reason },
        level:FB.householdStandardLevel(s, 'board'),
        gold:s.player.gold
      };
    });

    expect(setup.age).toBe(10);
    expect(setup.level).toBe(2);
    expect(setup.focuses).toEqual(['study', 'play']);
    expect(setup.town).toMatchObject({ shown:true, can:false });
    expect(setup.town.reason).toBe('You can do this when you come of age at 16.');
    expect(setup.household).toMatchObject({ shown:true, can:true });
    await expect(page.locator('[data-focus-id]')).toHaveCount(2);
    await expect(page.locator('[data-focus-id="study"]')).toBeVisible();
    await expect(page.locator('[data-focus-id="play"]')).toBeVisible();

    const town = page.locator('[data-action-id="go_to_town"]');
    await expect(town).toBeVisible();
    await expect(town).toBeDisabled();
    await expect(page.locator('#deed-details-go_to_town')).toContainText(
      'You can do this when you come of age at 16.');

    const household = page.locator('[data-action-id="better_household"]');
    await expect(household).toBeEnabled();
    await household.click();
    await expect(page.locator('#genmodal')).toHaveClass(/household-modal/);
    await expect(page.locator('#gm-body')).toContainText(
      'During childhood you may reduce inherited standards');

    const boardRow = page.locator('[data-household-standard-row="board"]');
    const decrease = boardRow.locator('[data-household-standard-adjust="-1"]');
    const increase = boardRow.locator('[data-household-standard-adjust="1"]');
    await expect(decrease).toBeEnabled();
    await expect(increase).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#household-standard-upgrade-details-board')).toContainText(
      'new purchases unlock at age 16');
    await expect(page.locator('#household-property [data-holding]').first()).toBeDisabled();
    await expect(page.locator('#household-property')).toContainText('Available at age 16');

    await decrease.click();
    expect(await page.evaluate(function () {
      const s = FB.state;
      const beforeGold = s.player.gold;
      const beforeLevel = FB.householdStandardLevel(s, 'board');
      const upgrade = FB.buyHouseholdStandard(s, 'board');
      const holding = FB.buyHolding(s, 'hearth_garden');
      return {
        beforeLevel:beforeLevel,
        level:FB.householdStandardLevel(s, 'board'),
        gold:s.player.gold,
        beforeGold:beforeGold,
        upgrade:upgrade,
        holding:holding,
        ownsGarden:FB.holdingList(s).indexOf('hearth_garden') >= 0
      };
    })).toEqual({
      beforeLevel:1,
      level:1,
      gold:setup.gold,
      beforeGold:setup.gold,
      upgrade:false,
      holding:false,
      ownsGarden:false
    });
  });
