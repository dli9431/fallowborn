'use strict';

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/economy.js', 'data/technology.js', 'js/actions.js', 'js/economy.js',
  'js/save.js', 'js/technology.js', 'js/ui_misc.js', 'js/ui_modals.js', 'css/style.css'
]);
test.describe.configure({ mode:'parallel' });
test.beforeEach(async function ({ page }, info) {
  await openGame(page, info);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state;
    const research = FB.realmTechRecord(s, FB.techRealmId(s));
    ['warehouses', 'improved_husbandry', 'warp_weighted_loom', 'horizontal_loom',
      'annual_fairs', 'wheel_thrown_pottery', 'cooperage', 'iron_sickles'].forEach(function (id) {
      if (research.completed.indexOf(id) < 0) research.completed.push(id);
    });
  });
});

test('the deed sets a costless first lapse that survives saving and fully funded upkeep', async function ({ page }) {
  const before = await page.evaluate(function () {
    const s = FB.state;
    s.player.householdStandards = { board:2, luxuries:1, wares:1 };
    s.player.gold = 1.75;
    window.oldHouseholdSave = FB.save.serialize();
    FB.runInstant(s, 'better_household');
    return {
      gold:s.player.gold, prestige:s.player.prestige, turn:s.turn,
      entries:s.chronicle.entries.length, saving:FB.money(1), remaining:FB.money(0.5)
    };
  });

  const choice = page.getByLabel('Choose first expense to lapse');
  const status = page.locator('#household-shortfall-status');
  const preview = page.locator('#household-shortfall-preview');
  await expect(status).toContainText('Customary order');
  await choice.selectOption('board');
  await expect(preview).toContainText(before.saving);
  await expect(preview).toContainText(before.remaining);
  await expect(preview).toContainText('Varied Board');
  await expect(preview).toContainText('Full Larder');
  await expect(preview).toContainText('Reduces yearly household mortality by 0.1 percentage points.');
  await page.getByRole('button', { name:'Set first expense', exact:true }).press('Enter');
  await expect(status).toContainText('Board');
  await expect(page.getByRole('button', { name:'Set first expense', exact:true })).toBeFocused();

  const result = await page.evaluate(function () {
    const s = FB.state;
    const beforeSettlement = {
      gold:s.player.gold, prestige:s.player.prestige, turn:s.turn,
      entries:s.chronicle.entries.length, standards:{ ...s.player.householdStandards }
    };
    s.player.gold = FB.householdStandardsUpkeep(s);
    const funded = FB.householdStandardsSeason(s);
    const fundedState = {
      gold:s.player.gold, first:FB.householdShortfallFirst(s),
      standards:{ ...s.player.householdStandards }
    };
    const saved = JSON.parse(FB.save.serialize());
    const restored = FB.save.restore(saved);
    const retained = FB.householdShortfallFirst(restored);
    restored.player.gold = 1.25;
    const actual = FB.householdStandardsSeason(restored);
    const afterActual = {
      gold:restored.player.gold, first:FB.householdShortfallFirst(restored),
      standards:{ ...restored.player.householdStandards }
    };
    const oldSave = JSON.parse(window.oldHouseholdSave);
    const old = FB.save.restore(oldSave);
    const ordinary = FB.householdStandardsSeason(old);
    return {
      beforeSettlement, funded, fundedState, actual, afterActual, retained,
      savedId:saved.state.player.householdShortfallFirst,
      oldIdPresent:Object.prototype.hasOwnProperty.call(oldSave.state.player, 'householdShortfallFirst'),
      ordinary, oldStandards:old.player.householdStandards,
      tech:FBDATA.techImpactReviews.features.household_shortfall_priority.mode,
      techErrors:FB.validateTechnologyData(true).filter(function (fault) {
        return fault.includes('household_shortfall_priority');
      })
    };
  });
  const originalStandards = { board:2, luxuries:1, wares:1 };
  expect(result.beforeSettlement).toEqual({
    gold:before.gold, prestige:before.prestige, turn:before.turn,
    entries:before.entries, standards:originalStandards
  });
  expect(result.funded).toEqual({ paid:2.25, reduced:[] });
  expect(result.fundedState).toEqual({ gold:0, first:'board', standards:originalStandards });
  expect(result.savedId).toBe('board');
  expect(result.retained).toBe('board');
  expect(result.actual).toEqual({ paid:1.25, reduced:['board'] });
  expect(result.afterActual).toEqual({ gold:0, first:null, standards:{ board:1, luxuries:1, wares:1 } });
  expect(result.oldIdPresent).toBe(false);
  expect(result.ordinary).toEqual({ paid:1.75, reduced:['luxuries'] });
  expect(result.oldStandards).toEqual({ board:2, wares:1 });
  expect(result.tech).toBe('none');
  expect(result.techErrors).toEqual([]);
});

test('stale rank and work choices fall back while compulsory expenses and negative cash settle', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 3;
    p.householdStandards = { board:2, luxuries:3, wares:2 };
    const selected = FB.setHouseholdShortfallFirst(s, 'board');
    p.tier = 4;
    const floorQuote = FB.householdShortfallQuote(s, 'board');
    const rejected = [
      FB.setHouseholdShortfallFirst(s, 'board'),
      FB.setHouseholdShortfallFirst(s, 'constructor')
    ];
    const firstAfterReject = FB.householdShortfallFirst(s);
    p.gold = -2;
    const landed = FB.householdStandardsSeason(s);
    const landedState = { gold:p.gold, first:FB.householdShortfallFirst(s), standards:p.householdStandards };

    p.tier = 1;
    const worker = s.chars[p.charId];
    worker.career = { profession:'farmer', rank:'journeyman', chosen:true };
    p.householdStandards = { luxuries:1, wares:1, outfit_farmer:1 };
    const workSelected = FB.setHouseholdShortfallFirst(s, 'outfit_farmer');
    FB.householdMembers(s).forEach(function (member) {
      member.career = { profession:'farmer', rank:'apprentice', chosen:true };
    });
    const workQuote = FB.householdShortfallQuote(s, 'outfit_farmer');
    p.gold = -3;
    const commoner = FB.householdStandardsSeason(s);
    return {
      selected, floorQuote, rejected, firstAfterReject, landed, landedState, workSelected, workQuote,
      commoner, commonerState:{ gold:p.gold, first:FB.householdShortfallFirst(s), standards:p.householdStandards }
    };
  });
  expect(result).toEqual({
    selected:true, floorQuote:null, rejected:[false, false], firstAfterReject:'board',
    landed:{ paid:4.5, reduced:['luxuries'] },
    landedState:{ gold:-6.5, first:null, standards:{ board:2, luxuries:2, wares:2 } },
    workSelected:true, workQuote:null,
    commoner:{ paid:0, reduced:['luxuries', 'wares'] },
    commonerState:{ gold:-3, first:null, standards:{ outfit_farmer:1 } }
  });
});

test('a child household head can restore the customary order after the chosen standard is gone', async function ({ page }) {
  const zeroUpkeep = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.householdStandards = { board:1 };
    FB.setHouseholdShortfallFirst(s, 'board');
    FB.reduceHouseholdStandard(s, 'board');
    p.gold = -1;
    s.chars[p.charId].born = s.date.year - 12;
    const settled = FB.householdStandardsSeason(s);
    FB.runInstant(s, 'better_household');
    return { settled, gold:p.gold, first:FB.householdShortfallFirst(s) };
  });
  expect(zeroUpkeep).toEqual({ settled:{ paid:0, reduced:[] }, gold:-1, first:'board' });
  await expect(page.locator('#household-shortfall-status')).toContainText('Unavailable');
  await page.getByLabel('Choose first expense to lapse').selectOption('');
  await page.getByRole('button', { name:'Restore customary order', exact:true }).click();
  await expect(page.locator('#household-shortfall-status')).toContainText('Customary order');
  expect(await page.evaluate(function () {
    const s = FB.state;
    return {
      first:FB.householdShortfallFirst(s), gold:s.player.gold,
      standards:s.player.householdStandards, canOpen:FB.instantStatus(s, 'better_household').can
    };
  })).toEqual({ first:null, gold:-1, standards:{}, canOpen:false });
});
