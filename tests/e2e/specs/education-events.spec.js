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

test('the formative catalog exposes every focus and upbringing choice',
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
            return option.success.effects.student.addTrait;
          }),
          skills:ev.options.map(function (option) {
            return Object.keys(option.success.effects.student.skills)[0];
          })
        };
      });
    });

    expect(stories).toEqual([
      { id:'education_diplomacy_audience', focuses:['dip'],
        chances:[0.65,0.65], traits:['patient','proud'], skills:['dip','dip'] },
      { id:'education_martial_yard', focuses:['mar'],
        chances:[0.65,0.65], traits:['brave','wrathful'], skills:['mar','mar'] },
      { id:'education_stewardship_tally', focuses:['ste'],
        chances:[0.65,0.65], traits:['honest','greedy'], skills:['ste','ste'] },
      { id:'education_intrigue_secret', focuses:['int'],
        chances:[0.65,0.65], traits:['deceitful','cynical'], skills:['int','int'] },
      { id:'education_learning_gloss', focuses:['lea'],
        chances:[0.65,0.65], traits:['zealous','patient'], skills:['lea','lea'] },
      { id:'education_found_purse', focuses:null,
        chances:[0.65,0.65,0.65], traits:['honest','deceitful','generous'],
        skills:['ste','int','dip'] },
      { id:'education_younger_pupil', focuses:null,
        chances:[0.65,0.65], traits:['kind','cruel'], skills:['dip','int'] },
      { id:'education_public_praise', focuses:null,
        chances:[0.65,0.65], traits:['humble','proud'], skills:['dip','dip'] },
      { id:'education_lesson_feast', focuses:null,
        chances:[0.65,0.65], traits:['temperate','gluttonous'],
        skills:['ste','ste'] },
      { id:'education_future_ambitions', focuses:null,
        chances:[0.65,0.65], traits:['ambitious','content'], skills:['dip','ste'] }
    ]);
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

test('New Year selection is term-weighted, capped, ordered, and limited to one story',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.born = s.date.year - 10;
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
      me.edu = { focus:'lea', storyTerms:{lea:4} };
      FB.queueEvent(s, 'birth', {});
      const annual = FB.schoolingYear(s);
      FB.queueEvent(s, 'child_comes_of_age', { childId:child.id });
      const oldRng = FB.rng;
      const rolls = [0, 0.30, 0];
      FB.rng = function () { return rolls.shift() || 0; };
      const queued = FB.schoolingYearEvents(s, annual);
      FB.rng = oldRng;
      const order = s.eventQueue.map(function (item) { return item.id; });
      const selected = s.eventQueue[1];

      const capChildren = [];
      for (let i = 0; i < 6; i++) {
        const c = make('Cap Child ' + i, 10, 'lea');
        c.edu.storyTerms = { lea:4 };
        capChildren.push(c);
      }
      const capAnnual = FB.schoolingYear(s);
      const chances = [];
      const oldChance = FB.chance;
      FB.chance = function (p) { chances.push(p); return false; };
      FB.schoolingYearEvents(s, capAnnual);
      FB.chance = oldChance;

      const academy = make('Academy Child', 11, 'ste');
      academy.edu.storyTerms = { ste:4 };
      academy.edu.schoolTerms = { noble_academy:4 };
      const oldMortality = FBDATA.schooling.noble_academy.annualMortality;
      FBDATA.schooling.noble_academy.annualMortality = 0;
      const academyAnnual = FB.schoolingYear(s);
      FBDATA.schooling.noble_academy.annualMortality = oldMortality;
      s.eventQueue = [];
      const academyRolls = [0, 0, 0];
      FB.rng = function () { return academyRolls.shift() || 0; };
      FB.schoolingYearEvents(s, academyAnnual);
      FB.rng = oldRng;
      return {
        queued:queued,
        order:order,
        studentId:selected.ctx.studentId,
        playerId:me.id,
        grandchildId:grandchild.id,
        focus:selected.ctx.studentFocus,
        cleared:child.edu.storyTerms.dip === undefined &&
          grandchild.edu.storyTerms.mar === undefined,
        cap:chances[chances.length - 1],
        academyIds:s.eventQueue.map(function (item) { return item.id; }),
        academyStudent:s.eventQueue[0] && s.eventQueue[0].ctx.studentId
      };
    });

    expect(result.queued).toBe(true);
    expect(result.order[0]).toBe('birth');
    expect(result.order[1]).toBe('education_martial_yard');
    expect(result.order[2]).toBe('child_comes_of_age');
    expect(result.studentId).toBe(result.grandchildId);
    expect(result.studentId).not.toBe(result.playerId);
    expect(result.focus).toBe('mar');
    expect(result.cleared).toBe(true);
    expect(result.cap).toBe(0.8);
    expect(result.academyIds).toHaveLength(1);
    expect(result.academyIds[0]).toMatch(/^academy_/);
    expect(result.academyStudent).toBeTruthy();
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
      const unseen = s.eventQueue[0].id;

      s.eventQueue = [];
      child.edu.storiesSeen = eligible.slice();
      child.edu.lastStory = 'education_public_praise';
      child.edu.storyTerms = { dip:4 };
      annual = FB.schoolingYear(s);
      const oldChance = FB.chance;
      FB.chance = function () { return true; };
      FB.setRngState(246813579);
      const savedRng = FB.getRngState();
      FB.schoolingYearEvents(s, annual);
      const first = s.eventQueue[0].id;
      const firstSeen = child.edu.storiesSeen.slice();
      const firstRng = FB.getRngState();

      s.eventQueue = [];
      child.edu.storiesSeen = eligible.slice();
      child.edu.lastStory = 'education_public_praise';
      child.edu.storyTerms = { dip:4 };
      annual = FB.schoolingYear(s);
      FB.setRngState(savedRng);
      FB.schoolingYearEvents(s, annual);
      const second = s.eventQueue[0].id;
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

test('legacy saves acquire education story ledgers lazily', async function ({ page }) {
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
    return {
      version:payload.v,
      missing:missing,
      accrued:accrued,
      cleared:cleared,
      seen:restored.edu.storiesSeen.slice(),
      last:restored.edu.lastStory,
      queued:FB.state.eventQueue[0] && FB.state.eventQueue[0].id
    };
  });

  expect(result.version).toBe(3);
  expect(result.missing).toBe(true);
  expect(result.accrued).toEqual({ lea:1 });
  expect(result.cleared).toBe(true);
  expect(result.seen).toEqual([result.last]);
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
