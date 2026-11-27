'use strict';

const { test, expect } = require('../support/fixture');
const { openTitle } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/economy.js', 'data/technology.js', 'js/day_phases.js', 'js/economy.js',
  'js/items.js', 'js/technology.js', 'js/ui_misc.js', 'js/ui_modals.js', 'css/style.css'
]);

test.describe.configure({ mode:'parallel' });

test.beforeEach(async function ({ page }, info) {
  await openTitle(page, info);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.auto.all = true;
    FB.game.auto.style = 'first';
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    const research = FB.realmTechRecord(s, FB.techRealmId(s));
    ['manuscript_codex', 'arithmetic', 'scholarly_networks', 'blast_furnace'].forEach(function (id) {
      if (research.completed.indexOf(id) < 0) research.completed.push(id);
    });
    s.dev[p.provinceId] = 2;
    function child(name, focus, school) {
      const c = FB.makeCharacter(s, {
        name:name, sex:'f', culture:me.culture, religion:me.religion, dyn:me.dyn,
        born:s.date.year - 11, motherId:me.id, station:FB.stationOf(me), traitsN:0
      });
      c.edu = { focus:focus, school:school };
      me.childrenIds.push(c.id);
      return c;
    }
    const first = child('Alda', 'lea', 'charity');
    const second = child('Bera', 'dip', 'charity');
    const third = child('Cwen', 'ste', 'master');
    const home = child('Dena', 'int', null);
    const tutor = FB.makeCharacter(s, {
      name:'Ordric', culture:me.culture, religion:me.religion,
      born:s.date.year - 45, role:'tutor', traitsN:0
    });
    tutor.skills.ste = 12;
    third.edu.tutorId = tutor.id;
    second.career = { profession:'farmer', rank:'apprentice', chosen:true, experience:1 };
    FB.touchFamily();
    p.gold = 100;
    s.date.season = 1;
    s.date.day = 90;
    s.slotDays = [];
    window.students = [first, second, third, home].map(function (c) { return c.id; });
    window.tuitionSnapshot = function () {
      const current = FB.state;
      return {
        gold:current.player.gold, turn:current.turn,
        first:current.player.tuitionPriority || null,
        children:window.students.map(function (id) {
          const c = current.chars[id], e = c.edu;
          return {
            term:Object.assign({}, e.schoolTerms), story:Object.assign({}, e.storyTerms),
            boost:e.lessonBoost || 0,
            unpaid:!!e.schoolUnpaid, school:e.school || null, tutor:e.tutorId || null,
            career:c.career ? [c.career.profession, c.career.rank, c.career.experience] : null
          };
        })
      };
    };
    // Fund the actual education phase after ordinary income, necessities and upkeep.
    FB.dayPhases.register({
      id:'test.tuitionCash', order:719, cadence:'seasonBoundary', mode:'play', condition:null,
      run:function (state) { state.player.gold = window.tuitionCash; }
    });
    FB.dayPhases.register({
      id:'test.tuitionReceipt', order:721, cadence:'seasonBoundary', mode:'play', condition:null,
      run:function () { window.tuitionReceipt = window.tuitionSnapshot(); }
    });
  });
});

test('Household Plan reviews and sets one costless priority, then settles scarce and funded terms', async function ({ page }) {
  await page.setViewportSize({ width:800, height:650 });
  const opening = await page.evaluate(function () {
    const s = FB.state, terms = FB.tuitionPriorityOptions(s);
    const factor = FB.techCostFactor(s, 'training');
    FB.ui.showHouseholdPlan();
    return {
      before:window.tuitionSnapshot(), factor, ids:window.students,
      fees:terms.map(function (t) { return t.option.fee; }),
      labels:terms.map(function (t) { return FB.money(t.option.fee); }),
      impact:FBDATA.techImpactReviews.features.household_tuition_priority.mode,
      impactErrors:FB.validateTechnologyData(true).filter(function (s) {
        return s.includes('household_tuition_priority');
      })
    };
  });
  expect(opening.factor).toBeLessThan(1);
  expect(opening.fees).toEqual([0.25, 0.25, 3].map(function (n) { return n * opening.factor; }));
  expect(opening.impact).toBe('none');
  expect(opening.impactErrors).toEqual([]);

  const manager = page.getByRole('button', { name:'Review tuition order' });
  const select = page.getByLabel('First consideration for the next term');
  const save = page.getByRole('button', { name:'Save tuition order', exact:true });
  const summary = page.locator('.tuition-priority-summary');
  await expect(summary).toContainText('Customary order');
  const scroll = await manager.evaluate(function (button) {
    const ledger = button.closest('.household-plan-content');
    button.focus({ preventScroll:true });
    ledger.scrollTop = 160;
    return ledger.scrollTop;
  });
  await page.keyboard.press('Enter');
  await expect(select).toBeVisible();
  const pupils = page.locator('.education-policy-preview-card');
  await expect(pupils).toHaveCount(3);
  await expect(pupils.nth(0)).toContainText('Alda');
  await expect(pupils.nth(0)).toContainText('charity school');
  await expect(pupils.nth(0)).toContainText(opening.labels[0]);
  await expect(pupils.nth(2)).toContainText('Cwen');
  await expect(pupils.nth(2)).toContainText('Ordric (personal master)');
  await expect(pupils.nth(2)).toContainText(opening.labels[2]);
  await select.selectOption(opening.ids[2]);
  await page.keyboard.press('Escape');
  await expect(manager).toBeFocused();
  await expect.poll(function () {
    return manager.evaluate(function (button) {
      return button.closest('.household-plan-content').scrollTop;
    });
  }).toBe(scroll);
  expect(await page.evaluate(function () { return window.tuitionSnapshot(); })).toEqual(opening.before);

  await manager.click();
  await select.selectOption(opening.ids[2]);
  await save.press('Enter');
  await expect(manager).toBeFocused();
  await expect(summary).toContainText('First consideration set');
  const chosen = await page.evaluate(function () { return window.tuitionSnapshot(); });
  expect(chosen).toEqual({
    ...opening.before, first:expect.objectContaining({
      studentId:opening.ids[2], schoolId:'master', turn:opening.before.turn + 1
    })
  });

  await manager.click();
  await expect(select).toHaveValue(opening.ids[2]);
  await select.selectOption('');
  await page.getByRole('button', { name:'Back', exact:true }).click();
  await expect(manager).toBeFocused();
  expect(await page.evaluate(function () { return window.tuitionSnapshot(); })).toEqual(chosen);
  await manager.click();
  await select.selectOption('');
  await save.click();
  await expect(summary).toContainText('Customary order');
  expect(await page.evaluate(function () { return window.tuitionSnapshot(); })).toEqual(opening.before);

  await manager.click();
  await select.selectOption(opening.ids[2]);
  await save.click();
  await expect(summary).toContainText('First consideration set');
  await page.locator('#household-plan-close').click();

  const settled = await page.evaluate(function (fees) {
    window.tuitionCash = fees[0] + fees[2];
    FB.game.passDay({ deferUi:true });
    const scarce = window.tuitionReceipt;
    const s = FB.state;
    s.date.day = 90;
    s.slotDays = [];
    const first = FB.tuitionPriorityOptions(s)[2];
    const renewed = FB.setTuitionPriority(s, first);
    window.tuitionCash = fees.reduce(function (sum, fee) { return sum + fee; }, 0);
    FB.game.passDay({ deferUi:true });
    return { scarce, funded:window.tuitionReceipt, renewed, date:s.date };
  }, opening.fees);

  expect(settled.renewed).toBe(true);
  expect(settled.date).toMatchObject({ season:3, day:1 });
  expect(settled.scarce.gold).toBeCloseTo(0, 9);
  expect(settled.scarce.first).toBeNull();
  expect(settled.scarce.children).toMatchObject([
    { term:{ charity:1 }, story:{ lea:1 }, unpaid:false },
    { term:{}, story:{}, unpaid:true, career:['farmer', 'apprentice', 1] },
    { term:{ master:1 }, story:{ ste:1 }, unpaid:false, tutor:opening.before.children[2].tutor },
    { term:{}, story:{ int:1 }, unpaid:false }
  ]);
  expect(settled.scarce.children[2].boost).toBeGreaterThan(0);
  expect(settled.scarce.children[1].term).toEqual({});
  expect(settled.scarce.children[1].story).toEqual({});
  expect(settled.funded.gold).toBeCloseTo(0, 9);
  expect(settled.funded.first).toBeNull();
  expect(settled.funded.children).toMatchObject([
    { term:{ charity:2 }, story:{ lea:2 }, unpaid:false },
    { term:{ charity:1 }, story:{ dip:1 }, unpaid:false, career:['farmer', 'apprentice', 1] },
    { term:{ master:2 }, story:{ ste:2 }, unpaid:false },
    { term:{}, story:{ int:2 }, unpaid:false }
  ]);
});

test('an unaffordable first choice yields to cheaper tuition and stale choices cannot transfer', async function ({ page }) {
  const check = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    const last = s.chars[window.students[2]], first = s.chars[window.students[0]];
    function quote(c) {
      return FB.tuitionPriorityOptions(s).find(function (t) { return t.student.id === c.id; });
    }
    const setMaster = FB.setTuitionPriority(s, quote(last));
    last.edu.lessonBoost = 0.12;
    last.edu.schoolTerms = { master:1 };
    window.tuitionCash = quote(first).option.fee;
    FB.game.passDay({ deferUi:true });
    const missed = window.tuitionReceipt;

    const reviewed = quote(last), tutorId = last.edu.tutorId;
    const setAgain = FB.setTuitionPriority(s, reviewed);
    last.edu.school = 'charity';
    last.edu.tutorId = null;
    FB.markEducationManual(s, last, 'instruction', 'school:charity');
    const clearedOnChange = !p.tuitionPriority;
    const staleRejected = !FB.setTuitionPriority(s, reviewed);
    last.edu.school = 'master';
    last.edu.tutorId = tutorId;
    FB.markEducationManual(s, last, 'instruction', 'tutor:' + tutorId);
    const returnedArrangement = FB.tuitionPriority(s);

    const setBeforeDeath = FB.setTuitionPriority(s, quote(last));
    s.chars[tutorId].dead = true;
    const deadTutor = FB.tuitionPriority(s);
    s.chars[tutorId].dead = false;
    const setBeforeStudentDeath = FB.setTuitionPriority(s, quote(last));
    last.dead = true;
    const deadStudent = FB.tuitionPriority(s);
    last.dead = false;

    const setBeforeAge = FB.setTuitionPriority(s, quote(last));
    last.born = s.date.year - 16;
    const ofAge = FB.tuitionPriority(s);
    last.born = s.date.year - 11;
    const setBeforeDeparture = FB.setTuitionPriority(s, quote(last));
    const spouse = FB.makeCharacter(s, {
      name:'Outside household', sex:'m', culture:last.culture, religion:last.religion,
      born:s.date.year - 17, traitsN:0
    });
    spouse.spouseId = last.id;
    last.spouseId = spouse.id;
    FB.touchFamily();
    const departed = FB.tuitionPriority(s);
    FB.game.passDay({ deferUi:true });
    const prunedAfterDeparture = !p.tuitionPriority;
    spouse.spouseId = last.spouseId = null;
    FB.touchFamily();
    return {
      missed, setMaster, setAgain, clearedOnChange, staleRejected, returnedArrangement,
      setBeforeDeath, deadTutor, setBeforeStudentDeath, deadStudent, setBeforeAge, ofAge,
      setBeforeDeparture, departed, prunedAfterDeparture,
      returnedStudent:FB.tuitionPriority(s), liveFee:quote(last).option.fee
    };
  });
  expect(check).toMatchObject({
    setMaster:true, setAgain:true, clearedOnChange:true, staleRejected:true,
    returnedArrangement:null, setBeforeDeath:true, deadTutor:null,
    setBeforeStudentDeath:true, deadStudent:null, setBeforeAge:true, ofAge:null,
    setBeforeDeparture:true, departed:null, prunedAfterDeparture:true, returnedStudent:null
  });
  expect(check.liveFee).toBeGreaterThan(0);
  expect(check.missed.gold).toBeCloseTo(0, 9);
  expect(check.missed.first).toBeNull();
  expect(check.missed.children[0]).toMatchObject({ term:{ charity:1 }, unpaid:false });
  expect(check.missed.children[1]).toMatchObject({ term:{}, unpaid:true });
  expect(check.missed.children[2]).toMatchObject({
    term:{ master:1 }, story:{}, boost:0.12, unpaid:true, school:'master'
  });
  expect(check.missed.children[2].story).toEqual({});
});
