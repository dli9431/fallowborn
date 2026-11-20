'use strict';

const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, openTitle, prepareGameContent } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const schools = require('../fixtures/authoring/household-tuition-priority-river.json');

dependsOnRuntime(__filename, [
  'data/economy.js', 'js/day_phases.js', 'js/economy.js', 'js/mods.js',
  'js/save.js', 'js/technology.js', 'js/ui_misc.js', 'js/ui_modals.js'
]);

test('ordinary JSON tuition keeps its exact fees and priority through a cold matching load', async function ({ page }, info) {
  await openGame(page, info);
  const validation = await page.evaluate(function (fixture) {
    const before = JSON.stringify([FBDATA.schooling, FB.state, FB.mods.sig()]);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    return {
      errors:FB.mods.validate(fixture),
      pure:before === JSON.stringify([FBDATA.schooling, FB.state, FB.mods.sig()]) &&
        rng === FB.getRngState() && uid === FB.getUidCounter()
    };
  }, schools);
  expect(validation).toEqual({ errors:[], pure:true });
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(
    path.resolve(__dirname, '../fixtures/authoring/household-tuition-priority-river.json'));
  await Promise.all([
    page.waitForNavigation({ waitUntil:'domcontentloaded', timeout:15000 }),
    page.locator('#mod-apply').click()
  ]);
  await prepareGameContent(page);
  await startDeterministicGame(page);

  const setup = await page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    const research = FB.realmTechRecord(s, FB.techRealmId(s));
    for (const id of ['manuscript_codex', 'arithmetic']) {
      if (!research.completed.includes(id)) research.completed.push(id);
    }
    const plans = [
      { name:'Milda', focus:'lea', school:'riverside_letters' },
      { name:'Sibba', focus:'ste', school:'bridge_reckoning' }
    ];
    for (const plan of plans) {
      const c = FB.makeCharacter(s, {
        name:plan.name, sex:'f', culture:me.culture, religion:me.religion, dyn:me.dyn,
        born:s.date.year - 10, motherId:me.id, station:FB.stationOf(me), traitsN:0
      });
      c.edu = { focus:plan.focus, school:plan.school };
      me.childrenIds.push(c.id);
    }
    FB.touchFamily();
    p.gold = 17;
    s.date.season = 1;
    s.date.day = 90;
    s.slotDays = [];
    const terms = FB.tuitionPriorityOptions(s);
    FB.ui.showHouseholdPlan();
    return {
      ids:terms.map(function (term) { return term.student.id; }),
      fees:terms.map(function (term) { return term.option.fee; }),
      labels:terms.map(function (term) { return FB.money(term.option.fee); }),
      factor:FB.techCostFactor(s, 'training'), gold:p.gold, turn:s.turn
    };
  });
  expect(setup.fees).toEqual([2.5, 4.75].map(function (fee) { return fee * setup.factor; }));
  await page.getByRole('button', { name:'Review tuition order' }).click();
  const cards = page.locator('.education-policy-preview-card');
  await expect(cards.nth(0)).toContainText('Riverside letters school');
  await expect(cards.nth(0)).toContainText(setup.labels[0]);
  await expect(cards.nth(1)).toContainText('Bridge reckoning school');
  await expect(cards.nth(1)).toContainText(setup.labels[1]);
  await page.getByLabel('First consideration for the next term').selectOption(setup.ids[1]);
  await page.getByRole('button', { name:'Save tuition order', exact:true }).click();
  await expect(page.locator('.tuition-priority-summary')).toContainText('First consideration set');
  const text = await page.evaluate(function () { return FB.save.serialize(); });
  const saved = JSON.parse(text);
  expect(saved.mods).toMatch(/^effective-1-[a-f0-9]{64}$/);
  expect(saved.state.player.tuitionPriority).toMatchObject({
    studentId:setup.ids[1], schoolId:'bridge_reckoning', turn:setup.turn + 1
  });

  await openTitle(page, info);
  expect(await page.evaluate(function () { return FB.world; })).toBeNull();
  await page.evaluate(function (saved) {
    FB.game.loadData(JSON.parse(saved), function () {
      FB.game.setPaused(true);
      FB.game.auto.all = true;
      FB.game.auto.style = 'first';
      window.tuitionRestored = true;
    });
  }, text);
  await expect.poll(function () {
    return page.evaluate(function () {
      if (window.tuitionRestored) return 'ready';
      if (FB.game.lastLoadError) {
        return FB.game.lastLoadStage + ' — ' + FB.game.lastLoadError.message;
      }
      return 'loading';
    });
  }, { timeout:15000, message:'Restore the matching modded save on a cold page' }).toBe('ready');
  const settled = await page.evaluate(function (input) {
    const source = JSON.parse(input.text);
    const s = FB.state;
    const term = FB.tuitionPriority(s);
    const restored = {
      gold:s.player.gold, turn:s.turn, student:term && term.student.id,
      fee:term && term.option.fee,
      matching:FB.mods.saveCompatibility(source).compatible,
      mismatch:FB.mods.saveCompatibility(Object.assign({}, source, {
        mods:'effective-1-' + '0'.repeat(64)
      })).compatible
    };
    let receipt;
    FB.dayPhases.register({
      id:'test.modTuitionCash', order:719, cadence:'seasonBoundary', mode:'play', condition:null,
      run:function (state) { state.player.gold = input.fees[1]; }
    });
    FB.dayPhases.register({
      id:'test.modTuitionReceipt', order:721, cadence:'seasonBoundary', mode:'play', condition:null,
      run:function (state) {
        receipt = {
          gold:state.player.gold, priority:FB.tuitionPriority(state),
          terms:input.ids.map(function (id) {
            const e = state.chars[id].edu;
            return [e.schoolTerms || {}, e.storyTerms || {}, !!e.schoolUnpaid];
          })
        };
      }
    });
    FB.game.passDay({ deferUi:true });
    const selected = receipt;
    // Omission is the old-save representation. It should restore customary allocation.
    delete source.state.player.tuitionPriority;
    const old = FB.save.restore(source);
    const oldPriority = FB.tuitionPriority(old);
    FB.game.passDay({ deferUi:true });
    return { restored, selected, ordinary:receipt, oldPriority };
  }, { text, ids:setup.ids, fees:setup.fees });
  expect(settled.restored).toEqual({
    gold:setup.gold, turn:setup.turn, student:setup.ids[1],
    fee:setup.fees[1], matching:true, mismatch:false
  });
  expect(settled.selected).toEqual({
    gold:0, priority:null,
    terms:[[{}, {}, true], [{ bridge_reckoning:1 }, { ste:1 }, false]]
  });
  expect(settled.oldPriority).toBeNull();
  expect(settled.ordinary).toEqual({
    gold:setup.fees[1] - setup.fees[0], priority:null,
    terms:[[{ riverside_letters:1 }, { lea:1 }, false], [{}, {}, true]]
  });
});
