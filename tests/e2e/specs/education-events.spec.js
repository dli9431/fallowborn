'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'data/economy.js',
  'data/traits.js',
  'data/events_common.js',
  'data/technology.js',
  'js/util.js',
  'js/model.js',
  'js/i18n.js',
  'js/modifiers.js',
  'js/economy.js',
  'js/events.js',
  'js/technology.js',
  'js/save.js',
  'js/mods.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/main.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('the formative catalog exposes three choices with a modest safe gamble',
  async function ({ page }) {
    const stories = await page.evaluate(function () {
      return FBDATA.events.filter(function (ev) {
        return ev.educationStory === true;
      }).map(function (ev) {
        return {
          id:ev.id,
          focuses:ev.educationFocuses || null,
          chances:ev.options.map(function (option) { return option.chance; }),
          traits:ev.options.map(function (option) {
            return option.success.effects.student.addTrait || null;
          }),
          skills:ev.options.map(function (option) {
            return Object.keys(option.success.effects.student.skills)[0];
          }),
          safe:(function () {
            const option = ev.options[2];
            const student = option && option.success &&
              option.success.effects && option.success.effects.student;
            const skill = student && Object.keys(student.skills || {})[0];
            const failure = option && option.failure && option.failure.effects;
            return !!option && option.chance === 0.35 && !!skill &&
              Object.keys(student.skills).length === 1 &&
              student.skills[skill] === 1 && student.addTrait === undefined &&
              !!failure && Object.keys(failure).length === 0;
          }())
        };
      });
    });

    expect(stories).toEqual([
      { id:'education_diplomacy_audience', focuses:['dip'],
        chances:[0.65,0.65,0.35], traits:['patient','proud',null],
        skills:['dip','dip','dip'], safe:true },
      { id:'education_martial_yard', focuses:['mar'],
        chances:[0.65,0.65,0.35], traits:['brave','wrathful',null],
        skills:['mar','mar','mar'], safe:true },
      { id:'education_stewardship_tally', focuses:['ste'],
        chances:[0.65,0.65,0.35], traits:['honest','greedy',null],
        skills:['ste','ste','ste'], safe:true },
      { id:'education_intrigue_secret', focuses:['int'],
        chances:[0.65,0.65,0.35], traits:['deceitful','cynical',null],
        skills:['int','int','int'], safe:true },
      { id:'education_learning_gloss', focuses:['lea'],
        chances:[0.65,0.65,0.35], traits:['zealous','patient',null],
        skills:['lea','lea','lea'], safe:true },
      { id:'education_found_purse', focuses:null,
        chances:[0.65,0.65,0.35], traits:['honest','deceitful',null],
        skills:['ste','int','dip'], safe:true },
      { id:'education_younger_pupil', focuses:null,
        chances:[0.65,0.65,0.35], traits:['kind','cruel',null],
        skills:['dip','int','lea'], safe:true },
      { id:'education_public_praise', focuses:null,
        chances:[0.65,0.65,0.35], traits:['humble','proud',null],
        skills:['dip','dip','dip'], safe:true },
      { id:'education_lesson_feast', focuses:null,
        chances:[0.65,0.65,0.35], traits:['temperate','gluttonous',null],
        skills:['ste','ste','ste'], safe:true },
      { id:'education_future_ambitions', focuses:null,
        chances:[0.65,0.65,0.35], traits:['ambitious','content',null],
        skills:['dip','ste','ste'], safe:true }
    ]);
  });

test('the third formative choice grants a smaller upside without a failure penalty',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      function make(name) {
        const c = FB.makeCharacter(s, {
          name:name, sex:'f', culture:me.culture, religion:me.religion,
          born:s.date.year - 11, station:FB.stationOf(me), traitsN:0,
          fatherId:me.id, dyn:me.dyn
        });
        c.skills = { dip:2, mar:2, ste:2, int:2, lea:2 };
        c.traits = [];
        c.edu = { focus:'dip' };
        me.childrenIds.push(c.id);
        return c;
      }
      const ev = FB.eventById('education_diplomacy_audience');
      const option = ev.options[2];
      const oldChance = FB.chance;
      const successStudent = make('Quiet Success');
      FB.chance = function () { return true; };
      const success = FB.resolveEventOption(s, ev, option,
        FB.eventContext(s, {
          studentId:successStudent.id, studentFocus:'dip'
        }), { automated:false });
      const failureStudent = make('Quiet Failure');
      const failureBefore = JSON.stringify({
        skills:failureStudent.skills, traits:failureStudent.traits
      });
      FB.chance = function () { return false; };
      const failure = FB.resolveEventOption(s, ev, option,
        FB.eventContext(s, {
          studentId:failureStudent.id, studentFocus:'dip'
        }), { automated:false });
      FB.chance = oldChance;
      return {
        chance:option.chance,
        successResult:success.result,
        successSkill:successStudent.skills.dip,
        successTraits:successStudent.traits,
        failureResult:failure.result,
        failureUnchanged:failureBefore === JSON.stringify({
          skills:failureStudent.skills, traits:failureStudent.traits
        })
      };
    });

    expect(result).toEqual({
      chance:0.35,
      successResult:'success',
      successSkill:3,
      successTraits:[],
      failureResult:'failure',
      failureUnchanged:true
    });
  });

test('completed terms accrue by focus while missed and ineligible study does not',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      s.player.educationPolicy = { focus:null, instructionMode:'manual', feeCap:0 };
      function make(parent, name, age, focus) {
        const c = FB.makeCharacter(s, {
          name:name, sex:'f', culture:me.culture, religion:me.religion,
          born:s.date.year - age, station:FB.stationOf(me), traitsN:0,
          fatherId:parent.id, dyn:me.dyn
        });
        c.traits = [];
        c.skills = { dip:2, mar:2, ste:2, int:2, lea:2 };
        c.edu = focus ? { focus:focus } : {};
        parent.childrenIds.push(c.id);
        return c;
      }
      const child = make(me, 'Term Child', 10, 'dip');
      const adultParent = make(me, 'Adult Parent', 28, null);
      const grandchild = make(adultParent, 'Term Grandchild', 9, 'mar');
      const adult = make(me, 'Adult Student', 20, 'lea');
      const unfocused = make(me, 'Unfocused Child', 11, null);
      const invalidTutor = make(me, 'Tutorless Child', 12, 'int');
      invalidTutor.edu.tutorId = 'missing_tutor';
      const married = make(me, 'Married Child', 13, 'ste');
      const spouse = FB.makeCharacter(s, {
        name:'Away Spouse', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year - 17, station:1, traitsN:0
      });
      married.spouseId = spouse.id;
      spouse.spouseId = married.id;
      FBDATA.schooling.e2e_fee_school = {
        name:'Fee School', icon:'book', cost:100, chance:0.5
      };
      const unpaid = make(me, 'Unpaid Child', 8, 'lea');
      unpaid.edu.school = 'e2e_fee_school';
      s.player.gold = 0;

      FB.educationSeason(s);
      return {
        child:child.edu.storyTerms,
        grandchild:grandchild.edu.storyTerms,
        adult:adult.edu.storyTerms || null,
        unfocused:unfocused.edu.storyTerms || null,
        invalidTutor:invalidTutor.edu.storyTerms || null,
        tutorCleared:invalidTutor.edu.tutorId || null,
        married:married.edu.storyTerms || null,
        unpaid:unpaid.edu.storyTerms || null,
        missed:unpaid.edu.schoolUnpaid,
        students:FB.educationStudents(s).map(function (c) { return c.id; })
      };
    });

    expect(result.child).toEqual({ dip:1 });
    expect(result.grandchild).toEqual({ mar:1 });
    expect(result.adult).toBeNull();
    expect(result.unfocused).toBeNull();
    expect(result.invalidTutor).toBeNull();
    expect(result.tutorCleared).toBeNull();
    expect(result.married).toBeNull();
    expect(result.unpaid).toBeNull();
    expect(result.missed).toBe(1);
    expect(result.students).toHaveLength(5);
  });

test('New Year reserves one staggered story for every educated descendant',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.born = s.date.year - 30;
      function make(name, age, focus) {
        const c = FB.makeCharacter(s, {
          name:name, sex:'f', culture:me.culture, religion:me.religion,
          born:s.date.year - age, station:1, traitsN:0,
          fatherId:me.id, dyn:me.dyn
        });
        c.traits = [];
        c.edu = { focus:focus };
        me.childrenIds.push(c.id);
        return c;
      }
      const child = make('Weighted Child', 10, 'dip');
      const parent = make('Grandchild Parent', 30, null);
      const grandchild = FB.makeCharacter(s, {
        name:'Weighted Grandchild', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year - 10, station:1,
        traitsN:0, fatherId:parent.id, dyn:me.dyn
      });
      grandchild.traits = [];
      grandchild.edu = { focus:'mar', storyTerms:{mar:3} };
      parent.childrenIds.push(grandchild.id);
      child.edu.storyTerms = { dip:1 };
      const extraIds = [];
      for (let i = 0; i < 6; i++) {
        const extra = make('Staggered Child ' + i, 7 + i, 'lea');
        extra.edu.storyTerms = { lea:1 };
        extraIds.push(extra.id);
      }
      me.edu = { focus:'lea', storyTerms:{lea:4} };
      FB.queueEvent(s, 'birth', {});
      const annual = FB.schoolingYear(s);
      FB.queueEvent(s, 'child_comes_of_age', { childId:child.id });
      const oldChance = FB.chance;
      const oldRng = FB.rng;
      FB.chance = function () { return false; };
      FB.rng = function () { return 0; };
      const queued = FB.schoolingYearEvents(s, annual);
      FB.chance = oldChance;
      FB.rng = oldRng;
      const order = s.eventQueue.map(function (item) { return item.id; });
      const scheduled = s.player.educationStories.map(function (record) {
        return {
          id:record.id,
          studentId:record.ctx.studentId,
          focus:record.ctx.studentFocus,
          dueTurn:record.dueTurn
        };
      });
      const firstDue = scheduled[0].dueTurn;
      const secondDue = scheduled[1].dueTurn;
      s.turn = firstDue;
      const firstReleased = FB.educationStoryDay(s);
      const firstItem = s.eventQueue[s.eventQueue.length - 1];
      const sameDayReleased = FB.educationStoryDay(s);
      s.eventQueue = [];
      s.turn = secondDue;
      const secondReleased = FB.educationStoryDay(s);
      const secondItem = s.eventQueue[0];

      const academy = make('Academy Child', 11, 'ste');
      academy.edu.storyTerms = { ste:4 };
      academy.edu.schoolTerms = { noble_academy:4 };
      const oldMortality = FBDATA.schooling.noble_academy.annualMortality;
      FBDATA.schooling.noble_academy.annualMortality = 0;
      const academyAnnual = FB.schoolingYear(s);
      s.player.educationStories = [];
      FB.chance = function () { return true; };
      FB.rng = function () { return 0; };
      FB.schoolingYearEvents(s, academyAnnual);
      const academyFormativeIds = s.player.educationStories.map(function (item) {
        return item.id;
      });

      academy.edu.storyTerms = { ste:4 };
      academy.edu.schoolTerms = { noble_academy:4 };
      const academyFallbackAnnual = FB.schoolingYear(s);
      FBDATA.schooling.noble_academy.annualMortality = oldMortality;
      s.player.educationStories = [];
      const academyChances = [false, true];
      FB.chance = function () { return academyChances.shift(); };
      FB.schoolingYearEvents(s, academyFallbackAnnual);
      FB.chance = oldChance;
      FB.rng = oldRng;
      return {
        queued:queued,
        order:order,
        scheduled:scheduled,
        playerId:me.id,
        childId:child.id,
        grandchildId:grandchild.id,
        allStudentIds:[child.id, grandchild.id].concat(extraIds),
        cleared:child.edu.storyTerms.dip === undefined &&
          grandchild.edu.storyTerms.mar === undefined &&
          extraIds.every(function (id) {
            return s.chars[id].edu.storyTerms.lea === undefined;
          }),
        firstReleased:firstReleased,
        sameDayReleased:sameDayReleased,
        secondReleased:secondReleased,
        releasedStudentIds:[firstItem.ctx.studentId, secondItem.ctx.studentId],
        academyFormativeIds:academyFormativeIds,
        academyFallbackIds:s.player.educationStories.map(function (item) {
          return item.id;
        })
      };
    });

    expect(result.queued).toBe(true);
    expect(result.order[0]).toBe('birth');
    expect(result.order[1]).toBe('child_comes_of_age');
    expect(result.scheduled).toHaveLength(8);
    expect(result.scheduled.map(function (record) { return record.studentId; }).sort())
      .toEqual(result.allStudentIds.sort());
    expect(result.scheduled.filter(function (record) {
      return record.focus === 'dip';
    })).toHaveLength(1);
    expect(result.scheduled.filter(function (record) {
      return record.focus === 'mar';
    })).toHaveLength(1);
    expect(result.scheduled.filter(function (record) {
      return record.focus === 'lea';
    })).toHaveLength(6);
    expect(new Set(result.scheduled.map(function (record) {
      return record.dueTurn;
    })).size).toBe(8);
    expect(result.scheduled[1].dueTurn - result.scheduled[0].dueTurn)
      .toBeGreaterThan(1);
    expect(result.scheduled.every(function (record) {
      return record.studentId !== result.playerId;
    })).toBe(true);
    expect(result.cleared).toBe(true);
    expect(result.firstReleased).toBe(true);
    expect(result.sameDayReleased).toBe(false);
    expect(result.secondReleased).toBe(true);
    expect(result.releasedStudentIds)
      .toEqual([result.scheduled[0].studentId, result.scheduled[1].studentId]);
    expect(result.academyFormativeIds).toHaveLength(1);
    expect(result.academyFormativeIds[0]).toMatch(/^education_/);
    expect(result.academyFallbackIds).toHaveLength(1);
    expect(result.academyFallbackIds[0]).toMatch(/^academy_/);
  });

test('a real New Year tick staggers its formative education event',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const child = FB.makeCharacter(s, {
        name:'Rollover Student', sex:'f', culture:me.culture,
        religion:me.religion, born:s.date.year - 10,
        station:FB.stationOf(me), traitsN:0,
        fatherId:me.sex === 'm' ? me.id : null,
        motherId:me.sex === 'f' ? me.id : null,
        dyn:me.dyn
      });
      child.traits = [];
      child.edu = {
        focus:'ste',
        storyTerms:{ ste:3 },
        policy:{
          focus:'manual', instruction:'manual', instructionChoice:'home'
        }
      };
      me.childrenIds.push(child.id);
      FB.touchFamily();
      s.date.season = 3;
      s.date.day = 90;
      s.eventQueue = [];
      s.slotDays = [];

      const oldTermChance = FBDATA.balance.educationStoryTermChance;
      const oldChanceCap = FBDATA.balance.educationStoryChanceCap;
      const oldChance = FB.chance;
      let outcome;
      try {
        FBDATA.balance.educationStoryTermChance = 1;
        FBDATA.balance.educationStoryChanceCap = 1;
        FB.chance = function (chance) { return chance >= 1; };
        outcome = FB.game.passDay({ liveTick:true });
      } finally {
        FBDATA.balance.educationStoryTermChance = oldTermChance;
        FBDATA.balance.educationStoryChanceCap = oldChanceCap;
        FB.chance = oldChance;
      }
      const scheduled = s.player.educationStories[0];
      return {
        outcome:outcome,
        season:s.date.season,
        day:s.date.day,
        storyId:child.edu.lastStory || '',
        remainingTerms:Object.keys(child.edu.storyTerms || {}).length,
        eventOpen:FB.ui.eventsBusy(),
        scheduledStudent:scheduled && scheduled.ctx.studentId,
        delay:scheduled && scheduled.dueTurn - s.turn
      };
    });

    expect(result).toMatchObject({
      outcome:'season', season:0, day:1,
      remainingTerms:0, eventOpen:false
    });
    expect(result.storyId).toMatch(/^education_/);
    expect(result.scheduledStudent).toBeTruthy();
    expect(result.delay).toBeGreaterThan(1);
    expect(result.delay).toBeLessThan(360);
  });

test('student history prefers unseen stories and deterministically avoids immediate repeats',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const child = FB.makeCharacter(s, {
        name:'Story Child', sex:'f', culture:me.culture,
        religion:me.religion, born:s.date.year - 10, station:1,
        traitsN:0, fatherId:me.id, dyn:me.dyn
      });
      child.traits = [];
      child.edu = { focus:'dip' };
      me.childrenIds.push(child.id);
      const eligible = FBDATA.events.filter(function (ev) {
        return ev.educationStory &&
          (!ev.educationFocuses || ev.educationFocuses.indexOf('dip') >= 0);
      }).map(function (ev) { return ev.id; });
      child.edu.storiesSeen = eligible.filter(function (id) {
        return id !== 'education_public_praise';
      });
      child.edu.storyTerms = { dip:4 };
      let annual = FB.schoolingYear(s);
      const oldRng = FB.rng;
      let rolls = [0, 0, 0.99];
      FB.rng = function () { return rolls.shift() || 0; };
      FB.schoolingYearEvents(s, annual);
      FB.rng = oldRng;
      const unseen = s.player.educationStories[0].id;

      s.player.educationStories = [];
      child.edu.storiesSeen = eligible.slice();
      child.edu.lastStory = 'education_public_praise';
      child.edu.storyTerms = { dip:4 };
      annual = FB.schoolingYear(s);
      const oldChance = FB.chance;
      FB.chance = function () { return true; };
      FB.setRngState(246813579);
      const savedRng = FB.getRngState();
      FB.schoolingYearEvents(s, annual);
      const first = s.player.educationStories[0].id;
      const firstSeen = child.edu.storiesSeen.slice();
      const firstRng = FB.getRngState();

      s.player.educationStories = [];
      child.edu.storiesSeen = eligible.slice();
      child.edu.lastStory = 'education_public_praise';
      child.edu.storyTerms = { dip:4 };
      annual = FB.schoolingYear(s);
      FB.setRngState(savedRng);
      FB.schoolingYearEvents(s, annual);
      const second = s.player.educationStories[0].id;
      const secondRng = FB.getRngState();
      FB.chance = oldChance;
      return {
        unseen:unseen,
        repeat:first,
        deterministic:first === second && firstRng === secondRng,
        avoided:first !== 'education_public_praise',
        recycled:firstSeen
      };
    });

    expect(result.unseen).toBe('education_public_praise');
    expect(result.deterministic).toBe(true);
    expect(result.avoided).toBe(true);
    expect(result.recycled).toEqual([result.repeat]);
  });

test('legacy saves acquire story ledgers and preserve staggered records', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const me = s.chars[s.player.charId];
    const child = FB.makeCharacter(s, {
      name:'Legacy Student', sex:'m', culture:me.culture,
      religion:me.religion, born:s.date.year - 9, station:1,
      traitsN:0, fatherId:me.id, dyn:me.dyn
    });
    child.traits = [];
    child.edu = { focus:'lea' };
    me.childrenIds.push(child.id);
    s.player.educationPolicy = {
      focus:null, instructionMode:'manual', feeCap:0
    };
    s.eventQueue = [];
    const payload = JSON.parse(FB.save.serialize());
    delete payload.state.chars[child.id].edu.storyTerms;
    delete payload.state.chars[child.id].edu.storiesSeen;
    delete payload.state.chars[child.id].edu.lastStory;
    FB.save.restore(payload);
    const restored = FB.state.chars[child.id];
    const missing = restored.edu.storyTerms === undefined &&
      restored.edu.storiesSeen === undefined &&
      restored.edu.lastStory === undefined;
    FB.educationSeason(FB.state);
    const accrued = Object.assign({}, restored.edu.storyTerms);
    const annual = FB.schoolingYear(FB.state);
    const cleared = Object.keys(restored.edu.storyTerms).length === 0;
    const oldChance = FB.chance;
    const oldRng = FB.rng;
    FB.chance = function () { return true; };
    FB.rng = function () { return 0; };
    FB.schoolingYearEvents(FB.state, annual);
    FB.chance = oldChance;
    FB.rng = oldRng;
    const scheduled = FB.state.player.educationStories[0];
    const scheduledSnapshot = JSON.stringify(scheduled);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const resumed = FB.state.player.educationStories[0];
    FB.state.turn = resumed.dueTurn;
    const released = FB.educationStoryDay(FB.state);
    return {
      version:payload.v,
      missing:missing,
      accrued:accrued,
      cleared:cleared,
      seen:restored.edu.storiesSeen.slice(),
      last:restored.edu.lastStory,
      scheduled:scheduled && scheduled.id,
      preserved:scheduledSnapshot === JSON.stringify(resumed),
      released:released,
      queued:FB.state.eventQueue[0] && FB.state.eventQueue[0].id
    };
  });

  expect(result.version).toBe(3);
  expect(result.missing).toBe(true);
  expect(result.accrued).toEqual({ lea:1 });
  expect(result.cleared).toBe(true);
  expect(result.seen).toEqual([result.last]);
  expect(result.scheduled).toBe(result.last);
  expect(result.preserved).toBe(true);
  expect(result.released).toBe(true);
  expect(result.queued).toBe(result.last);
});

test('student outcomes preview and receipt the exact child and reject stale context',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      function make(name) {
        const c = FB.makeCharacter(s, {
          name:name, sex:'f', culture:me.culture, religion:me.religion,
          born:s.date.year - 11, station:1, traitsN:0,
          fatherId:me.id, dyn:me.dyn
        });
        c.skills = { dip:2, mar:2, ste:1, int:2, lea:2 };
        c.traits = ['deceitful'];
        c.edu = { focus:'ste' };
        me.childrenIds.push(c.id);
        return c;
      }
      const student = make('Receipt Child');
      const ev = FB.eventById('education_stewardship_tally');
      const option = ev.options[0];
      const ctx = FB.eventContext(s, {
        studentId:student.id, studentFocus:'ste'
      });
      const rngBefore = FB.getRngState();
      const studentBefore = JSON.stringify({
        skills:student.skills, traits:student.traits
      });
      const preview = FB.previewEventOption(s, ev, option, ctx);
      const previewTexts = preview.sections.map(function (section) {
        return section.impacts.map(function (impact) {
          return FB.eventImpactText(s, impact, 'preview');
        });
      });
      const rngAfter = FB.getRngState();
      const previewStudentUnchanged = studentBefore === JSON.stringify({
        skills:student.skills, traits:student.traits
      });
      const meBefore = JSON.stringify({ skills:me.skills, traits:me.traits });
      const oldChance = FB.chance;
      FB.chance = function () { return true; };
      const receipt = FB.resolveEventOption(s, ev, option, ctx,
        { automated:false });
      FB.chance = oldChance;
      const receiptTexts = receipt.impacts.map(function (impact) {
        return FB.eventImpactText(s, impact, 'resolved');
      });

      const failed = make('Failure Child');
      const failCtx = FB.eventContext(s, {
        studentId:failed.id, studentFocus:'ste'
      });
      FB.game.auto.all = true;
      FB.game.auto.style = 'first';
      FB.chance = function () { return false; };
      FB.ui.runEvents([{ id:ev.id, ctx:failCtx }]);
      FB.chance = oldChance;
      FB.game.auto.all = false;
      let failReceipt = null;
      for (let i = s.log.length - 1; i >= 0; i--) {
        if (s.log[i].receipt && s.log[i].receipt.eventId === ev.id) {
          failReceipt = s.log[i].receipt;
          break;
        }
      }

      const clamped = make('Clamped Child');
      clamped.skills.ste = 0;
      const clampCtx = FB.eventContext(s, {
        studentId:clamped.id, studentFocus:'ste'
      });
      FB.chance = function () { return false; };
      FB.resolveEventOption(s, ev, option, clampCtx, { automated:true });
      FB.chance = oldChance;

      const dead = make('Dead Child');
      const deadCtx = FB.eventContext(s, { studentId:dead.id, studentFocus:'ste' });
      dead.dead = true;
      const deadBefore = JSON.stringify(dead);
      const deadReceipt = FB.resolveEventOption(s, ev, option, deadCtx,
        { automated:false });
      const deadLogLength = s.log.length;
      FB.ui.runEvents([{ id:ev.id, ctx:deadCtx }]);
      const deadDropped = s.log.length === deadLogLength;

      const succession = make('Succession Child');
      const successionCtx = FB.eventContext(s, {
        studentId:succession.id, studentFocus:'ste'
      });
      s.player.charId = succession.id;
      const successionBefore = JSON.stringify(succession.skills);
      const successionReceipt = FB.resolveEventOption(s, ev, option,
        successionCtx, { automated:false });
      const successionLogLength = s.log.length;
      FB.ui.runEvents([{ id:ev.id, ctx:successionCtx }]);
      const successionDropped = s.log.length === successionLogLength;
      return {
        previewTexts:previewTexts,
        previewPure:rngBefore === rngAfter && previewStudentUnchanged,
        success:{
          result:receipt.result, skill:student.skills.ste,
          honest:student.traits.indexOf('honest') >= 0,
          deceitful:student.traits.indexOf('deceitful') >= 0,
          texts:receiptTexts,
          targeted:receipt.impacts.every(function (impact) {
            return impact.targetKind === 'student' &&
              impact.targetId === student.id;
          })
        },
        protagonistUnchanged:meBefore === JSON.stringify({
          skills:me.skills, traits:me.traits
        }),
        failure:{
          result:failReceipt.result, automated:failReceipt.automated,
          skill:failed.skills.ste, traits:failed.traits.slice(),
          texts:failReceipt.impacts.map(function (impact) {
            return FB.eventImpactText(s, impact, 'resolved');
          })
        },
        clamped:clamped.skills.ste,
        deadRejected:deadReceipt === false && deadDropped &&
          deadBefore === JSON.stringify(dead),
        successionRejected:successionReceipt === false &&
          successionDropped &&
          successionBefore === JSON.stringify(succession.skills)
      };
    });

    expect(result.previewPure).toBe(true);
    expect(result.previewTexts.join(' ')).toContain(
      'Receipt Child: Stewardship may improve');
    expect(result.previewTexts.join(' ')).toContain(
      'Receipt Child may gain Honest, replacing Deceitful');
    expect(result.previewTexts.join(' ')).toContain(
      'Receipt Child: Stewardship -1');
    expect(result.success.result).toBe('success');
    expect(result.success.skill).toBe(2);
    expect(result.success.honest).toBe(true);
    expect(result.success.deceitful).toBe(false);
    expect(result.success.targeted).toBe(true);
    expect(result.success.texts.join(' ')).toContain(
      'Receipt Child: Stewardship +1');
    expect(result.success.texts.join(' ')).toContain(
      'Receipt Child gains trait: Honest');
    expect(result.success.texts.join(' ')).toContain(
      'Receipt Child loses trait: Deceitful');
    expect(result.protagonistUnchanged).toBe(true);
    expect(result.failure.result).toBe('failure');
    expect(result.failure.automated).toBe(true);
    expect(result.failure.skill).toBe(0);
    expect(result.failure.traits).toEqual(['deceitful']);
    expect(result.failure.texts.join(' ')).toContain(
      'Failure Child: Stewardship -1');
    expect(result.clamped).toBe(0);
    expect(result.deadRejected).toBe(true);
    expect(result.successionRejected).toBe(true);
  });
