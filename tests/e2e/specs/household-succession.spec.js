'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/economy.js', 'data/events_common.js', 'data/map_data.js',
  'data/traits.js', 'data/technology.js', 'css/style.css',
  'js/model.js', 'js/world.js', 'js/economy.js',
  'js/items.js', 'js/events.js', 'js/save.js', 'js/agency.js', 'js/abbeys.js',
  'js/justice.js',
  'js/ui_misc.js', 'js/ui_modals.js', 'js/ui_panels.js', 'js/main.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

/* Recreates the relevant facts of Sick King and the two alternative heirs:
   several mothers, a mother who is also an aunt, noble-born minor half-siblings,
   and a court identity that has not given a child independent ruling authority.
   The private player saves are not copied into the public test suite. */
async function installHousehold(page, age) {
  return page.evaluate(function (age) {
    const s = FB.state, p = s.player, former = s.chars[p.charId];
    former.sex = 'm';
    former.born = s.date.year - 50;
    former.childrenIds = [];
    former.spouseId = null;
    p.tier = 6; p.gold = 1000; p.flags = {};
    p.educationPolicy = { focus:'ste', instructionMode:'best', feeCap:1 };
    p.inheritedHouseholdIds = [];
    s.eventQueue = [];
    function person(name, age, sex, mother, father) {
      const c = FB.makeCharacter(s, {
        name:name, sex:sex, culture:former.culture, religion:former.religion,
        born:s.date.year - age, dyn:former.dyn, station:4, traitsN:0,
        fatherId:father ? father.id : null, motherId:mother ? mother.id : null
      });
      c.health = 8;
      if (father) father.childrenIds.push(c.id);
      if (mother) mother.childrenIds.push(c.id);
      return c;
    }
    const mother = person('Mother', 38, 'f');
    const stepmother = person('Stepmother', 40, 'f');
    const motherAunt = person('Mother Aunt', 37, 'f');
    motherAunt.fatherId = former.fatherId;
    motherAunt.motherId = former.motherId;
    for (const wife of [mother, stepmother, motherAunt]) {
      wife.spouseId = former.id;
      wife.career = { profession:'scholar', rank:'journeyman', chosen:true,
        experience:3, startedYear:s.date.year - 3, guildRank:'none', guildStanding:0 };
      wife.skills = { dip:4, mar:1, ste:10, int:3, lea:10 };
    }
    former.spouseId = stepmother.id;
    const heir = person('Successor', age, 'm', mother, former);
    const adult = person('Adult Half Sister', 19, 'f', stepmother, former);
    adult.career = { profession:'merchant', rank:'journeyman', chosen:true,
      experience:2, startedYear:s.date.year - 2, guildRank:'member', guildStanding:10 };
    const children = [];
    for (let i = 0; i < 10; i++) {
      const child = person('Minor Half Sibling ' + i, i === 0 ? 10 : 6 + i % 8,
        i % 2 ? 'f' : 'm', i % 2 ? stepmother : motherAunt, former);
      child.edu = { focus:'lea', tutorId:'self', school:null,
        policy:{ focus:'manual', instruction:'policy', instructionChoice:'tutor:self' } };
      children.push(child.id);
    }
    const royal = s.chars[children[0]];
    royal.royalLine = { realmId:'player' };
    motherAunt.royalLine = { realmId:'player' };
    const named = s.chars[children[1]];
    named.edu.tutorId = mother.id;
    named.edu.policy.instruction = 'manual';
    named.edu.policy.instructionChoice = 'tutor:' + mother.id;
    const baby = person('Young Half Brother', 3, 'm', motherAunt, former);
    const adopted = person('Adopted Sibling', 8, 'f');
    adopted.edu = { focus:'ste', school:null };
    former.childrenIds.push(adopted.id);
    const grandchild = person('Resident Niece', 7, 'f', adult);
    grandchild.edu = { focus:'dip', school:null };
    const excluded = [];
    const away = person('Away Child', 18, 'f', mother, former);
    away.homeProvinceId = Object.keys(FB.world.byId).filter(function (id) {
      return id !== p.provinceId;
    })[0];
    excluded.push(away.id);
    const married = person('Married Child', 18, 'm', mother, former);
    const outsideSpouse = person('Reverse Linked Spouse', 18, 'f');
    outsideSpouse.spouseId = married.id;
    excluded.push(married.id);
    const ruling = person('Separate Lord', 18, 'm', mother, former);
    ruling.role = 'lord';
    excluded.push(ruling.id);
    const vowed = person('Vowed Child', 18, 'm', mother, former);
    vowed.career = { profession:'monk', rank:'journeyman', chosen:true };
    excluded.push(vowed.id);
    const dead = person('Deceased Child', 10, 'f', mother, former);
    dead.dead = true; dead.died = s.date.year;
    excluded.push(dead.id);
    heir.edu = { focus:'ste', tutorId:'self', school:null,
      policy:{ focus:'manual', instruction:'policy', instructionChoice:'tutor:self' } };
    p.enterpriseMigration = 1;
    p.enterprises = [{ uid:'inherited_market_stall', type:'market_stall_business',
      provinceId:p.provinceId, settlement:0, workerId:adult.id, workerLocked:true }];
    FB.touchFamily();
    const item = FB.grantItem(s, 'gold_ring');
    if (!item || !FB.equipItem(s, adult.id, 'ring', item).ok) {
      throw new Error('Expected the adult dependent to wear the family ring');
    }
    /* Keep automatic successor outfitting from deliberately borrowing it. */
    FB.setProtected(s, 'equipmentItem', item, true);
    return { former:former.id, heir:heir.id, mother:mother.id,
      stepmother:stepmother.id, motherAunt:motherAunt.id, adult:adult.id,
      children:children, royal:royal.id, named:named.id, baby:baby.id,
      adopted:adopted.id, grandchild:grandchild.id, excluded:excluded,
      item:item, home:p.provinceId };
  }, age);
}

async function inherit(page, ids) {
  return page.evaluate(function (ids) {
    const s = FB.state, former = s.chars[ids.former];
    former.dead = true; former.died = s.date.year;
    s.player.dead = true;
    s.legends.push({ id:former.id, name:former.name, born:former.born, died:former.died });
    return FB.game.succeedTo(ids.heir);
  }, ids);
}

for (const age of [13, 17]) {
  test('a ' + age + '-year-old ruler inherits dependent family and schooling',
    async function ({ page }) {
      const ids = await installHousehold(page, age);
      expect(await inherit(page, ids)).toBe(true);
      const result = await page.evaluate(function (ids) {
        const s = FB.state, p = s.player;
        const household = FB.householdMembers(s).map(function (c) { return c.id; });
        const adult = s.chars[ids.adult], child = s.chars[ids.royal];
        const before = { rng:FB.getRngState(), uid:FB.getUidCounter() };
        const actions = FB.ui.characterInteractionCard(s, child.id).actions;
        const tutors = FB.educationOptions(s, child, 'lea').filter(function (o) {
          return o.kind === 'tutor' && o.available;
        });
        const inheritedTutor = child.edu.tutorId;
        FB.educationSeason(s);
        return {
          household:household,
          workers:FB.householdWorkers(s).map(function (c) { return c.id; }),
          students:FB.educationStudents(s).map(function (c) { return c.id; }),
          educationActions:actions.map(function (a) { return a.id; }),
          adultChoices:FB.careerChoices(s, adult).length,
          adultLoadout:FB.loadoutOf(s, adult.id).ring,
          enterpriseWorker:FB.enterpriseList(s)[0].workerId,
          relativeFather:child.fatherId,
          adoptedParents:[s.chars[ids.adopted].fatherId, s.chars[ids.adopted].motherId],
          kingChildren:FB.childrenOf(s, s.chars[p.charId]).map(function (c) { return c.id; }),
          inheritedTutor:inheritedTutor,
          namedTutor:s.chars[ids.named].edu.tutorId,
          siblingBlocker:FB.manageableKinBlocker(s, child.id),
          tutorIds:tutors.map(function (o) { return o.tutor.id; }),
          minorTutors:tutors.filter(function (o) { return FB.ageOf(o.tutor, s.date.year) < 16; }).length,
          terms:child.edu.storyTerms,
          home:FB.characterResidence(s, child),
          residents:FB.householdUpkeepParts(s).residents,
          rngUnchanged:FB.getRngState() === before.rng,
          uidUnchanged:FB.getUidCounter() === before.uid
        };
      }, ids);
      for (const id of [ids.mother, ids.stepmother, ids.motherAunt, ids.adult,
        ids.baby, ids.adopted, ids.grandchild].concat(ids.children)) {
        expect(result.household).toContain(id);
        expect(result.workers).toContain(id);
      }
      for (const id of ids.excluded) expect(result.household).not.toContain(id);
      for (const id of ids.children.concat([ids.adopted, ids.grandchild])) {
        expect(result.students).toContain(id);
      }
      expect(result.students.includes(ids.heir)).toBe(age < 16);
      expect(result.students).not.toContain(ids.baby);
      expect(result.educationActions).toEqual(expect.arrayContaining([
        'management.education.focus', 'management.education.tutor', 'management.career'
      ]));
      expect(result.adultChoices).toBeGreaterThan(0);
      expect(result.adultLoadout).toBe(ids.item);
      expect(result.enterpriseWorker).toBe(ids.adult);
      expect(result.relativeFather).toBe(ids.former);
      expect(result.adoptedParents).toEqual([null, null]);
      expect(result.kingChildren).toEqual([]);
      expect(result.inheritedTutor).toBeNull();
      expect(result.namedTutor).toBe(ids.mother);
      expect(result.siblingBlocker).toBeNull();
      expect(result.tutorIds).toContain(ids.motherAunt);
      expect(result.minorTutors).toBe(0);
      expect(result.terms).toEqual({ lea:1 });
      expect(result.home).toBe(ids.home);
      expect(result.residents).toBe(result.household.length - 1);
      expect(result.rngUnchanged).toBe(true);
      expect(result.uidUnchanged).toBe(true);
    });

  test('legacy ' + age + '-year-old king saves recover dependents once',
    async function ({ page }) {
      const ids = await installHousehold(page, age);
      await inherit(page, ids);
      const result = await page.evaluate(function (ids) {
        const s = FB.state;
        /* Recreate the old handover: no saved household roster and siblings'
           self tutoring still points through the current protagonist. */
        delete s.player.inheritedHouseholdIds;
        s.chars[ids.royal].edu.tutorId = 'self';
        s.chars[ids.royal].edu.policy.instructionChoice = 'tutor:self';
        const data = JSON.parse(FB.save.serialize());
        const restored = FB.save.restore(data);
        const after = FB.state;
        const repaired = after.player.inheritedHouseholdIds.slice();
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        const snapshot = FB.save.serialize();
        FB.ensureInheritedHousehold(after);
        const stable = FB.save.serialize() === snapshot;
        after.player.inheritedHouseholdIds = [];
        const empty = JSON.parse(FB.save.serialize());
        FB.save.restore(empty);
        return {
          restored:restored === after, repaired:repaired, stable:stable,
          tutor:after.chars[ids.royal].edu.tutorId,
          station:after.chars[ids.royal].station,
          father:after.chars[ids.royal].fatherId,
          rngUnchanged:rng === data.rng && FB.getRngState() === empty.rng,
          uidUnchanged:uid === data.uid && FB.getUidCounter() === empty.uid,
          emptyRoster:FB.state.player.inheritedHouseholdIds
        };
      }, ids);
      expect(result.restored).toBe(true);
      for (const id of [ids.mother, ids.stepmother, ids.motherAunt, ids.adult,
        ids.baby, ids.adopted, ids.grandchild].concat(ids.children)) {
        expect(result.repaired).toContain(id);
      }
      for (const id of ids.excluded) expect(result.repaired).not.toContain(id);
      expect(result).toMatchObject({
        stable:true, tutor:null, station:4, father:ids.former,
        rngUnchanged:true, uidUnchanged:true, emptyRoster:[]
      });
    });
}

test('family dependency survives later handovers and follows the household home',
  async function ({ page }) {
    const ids = await installHousehold(page, 17);
    await inherit(page, ids);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      const heir = s.chars[ids.heir];
      const student = s.chars[ids.royal];
      student.edu.tutorId = 'self';
      student.edu.policy = { focus:'manual', instruction:'manual', instructionChoice:'tutor:self' };
      const anotherHeir = s.chars[ids.children[2]];
      anotherHeir.born = s.date.year - 16;
      /* A living handover keeps the actual teacher, rather than changing
         self to the new head or erasing a still-living teacher. */
      FB.game.succeedTo(anotherHeir.id, { livingAbdication:true });
      const home = Object.keys(FB.world.byId).filter(function (id) {
        return id !== s.player.provinceId;
      })[0];
      s.player.provinceId = home;
      return {
        inherited:FB.householdMembers(s).map(function (c) { return c.id; }),
        tutor:FB.educationTutor(s, student, false).id,
        tutorChoice:student.edu.policy.instructionChoice,
        home:FB.characterResidence(s, student),
        expectedHome:home, father:student.fatherId
      };
    }, ids);
    expect(result.inherited).toEqual(expect.arrayContaining([
      ids.mother, ids.stepmother, ids.motherAunt, ids.adult, ids.royal, ids.adopted
    ]));
    expect(result).toMatchObject({ tutor:ids.heir, tutorChoice:'tutor:' + ids.heir,
      home:result.expectedHome, father:ids.former });
  });

test('a dependent who establishes another household leaves the labor and equipment pools',
  async function ({ page }) {
    const ids = await installHousehold(page, 17);
    await inherit(page, ids);
    const result = await page.evaluate(function (ids) {
      const s = FB.state, adult = s.chars[ids.adult];
      const spouse = FB.makeCharacter(s, {
        name:'Independent Spouse', sex:'m', culture:adult.culture,
        religion:adult.religion, born:s.date.year - 22, station:4, traitsN:0
      });
      adult.betrothedId = spouse.id;
      spouse.betrothedId = adult.id;
      const married = FB.doKinWedding(s, adult, spouse);
      const absent = s.chars[ids.children[2]];
      absent.homeProvinceId = Object.keys(FB.world.byId).filter(function (id) {
        return id !== s.player.provinceId;
      })[0];
      const lord = s.chars[ids.children[3]];
      lord.role = 'lord';
      const vowed = s.chars[ids.children[4]];
      vowed.abbeyVows = true;
      const independent = [adult.id, absent.id, lord.id, vowed.id];
      const workers = FB.householdWorkers(s).map(function (c) { return c.id; });
      const weddingRemoved = s.player.inheritedHouseholdIds.indexOf(adult.id) < 0;
      const ringCleared = !FB.loadoutOf(s, adult.id).ring;
      const enterpriseCleared = FB.enterpriseList(s)[0].workerId !== adult.id;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { married:married, weddingRemoved:weddingRemoved, ringCleared:ringCleared,
        enterpriseCleared:enterpriseCleared,
        independent:independent, workers:workers, roster:FB.state.player.inheritedHouseholdIds };
    }, ids);
    expect(result).toMatchObject({ married:true, weddingRemoved:true, ringCleared:true,
      enterpriseCleared:true });
    for (const id of result.independent) {
      expect(result.workers).not.toContain(id);
      expect(result.roster).not.toContain(id);
    }
  });

test('temporary exile suspends management without losing inherited dependency on reload',
  async function ({ page }) {
    const ids = await installHousehold(page, 17);
    await inherit(page, ids);
    const result = await page.evaluate(function (ids) {
      let s = FB.state;
      s.justice = s.justice || {};
      s.justice.exiles = s.justice.exiles || {};
      const destination = Object.keys(FB.world.byId).filter(function (id) {
        return id !== s.player.provinceId;
      })[0];
      s.justice.exiles[ids.royal] = {
        counties:[s.player.provinceId], endTurn:s.turn + 90, destination:destination
      };
      FB.save.restore(JSON.parse(FB.save.serialize()));
      s = FB.state;
      const suspended = !FB.isHouseholdCharacter(s, ids.royal);
      const retained = s.player.inheritedHouseholdIds.indexOf(ids.royal) >= 0;
      s.justice.exiles[ids.royal].endTurn = s.turn;
      return { suspended:suspended, retained:retained,
        returned:FB.isHouseholdCharacter(s, ids.royal),
        student:FB.educationStudentEligible(s, s.chars[ids.royal]) };
    }, ids);
    expect(result).toEqual({ suspended:true, retained:true, returned:true, student:true });
  });

test('inherited students receive annual formative stories and coming-of-age rewards',
  async function ({ page }) {
    const ids = await installHousehold(page, 17);
    await inherit(page, ids);
    const result = await page.evaluate(function (ids) {
      const s = FB.state, c = s.chars[ids.royal];
      c.edu.tutorId = null;
      c.edu.policy = { focus:'manual', instruction:'manual', instructionChoice:'home' };
      c.edu.storyTerms = { lea:4 };
      const savedChance = FB.chance;
      const savedQueue = FB.queueEvent;
      const savedTermChance = FBDATA.balance.educationStoryTermChance;
      const savedChanceCap = FBDATA.balance.educationStoryChanceCap;
      let scheduled, comingOfAge = false, learned;
      try {
        FB.queueEvent = function (state, id, ctx) {
          if (id === 'child_educated' && ctx.childId === c.id) comingOfAge = true;
          return savedQueue.apply(this, arguments);
        };
        FB.chance = function (chance) { return chance >= 1; };
        FBDATA.balance.educationStoryTermChance = 1;
        FBDATA.balance.educationStoryChanceCap = 1;
        const annual = FB.schoolingYear(s);
        FB.schoolingYearEvents(s, annual);
        scheduled = (s.player.educationStories || []).some(function (r) {
          return r.ctx.studentId === c.id && r.ctx.protagonistId === ids.heir;
        });
        c.born = s.date.year - 15;
        s.date.season = 3; s.date.day = 90;
        s.eventQueue = []; s.slotDays = [];
        FB.game.passDay({ skipFocus:true, deferUi:true });
        learned = c.traits.indexOf('literate') >= 0;
      } finally {
        FB.chance = savedChance;
        FB.queueEvent = savedQueue;
        FBDATA.balance.educationStoryTermChance = savedTermChance;
        FBDATA.balance.educationStoryChanceCap = savedChanceCap;
      }
      return { scheduled:scheduled, comingOfAge:comingOfAge, learned:learned,
        father:c.fatherId, age:FB.ageOf(c, s.date.year) };
    }, ids);
    expect(result).toEqual({ scheduled:true, comingOfAge:true, learned:true,
      father:ids.former, age:16 });
  });


test('a posthumous child remains in the inherited household with their recorded parents',
  async function ({ page }) {
    const ids = await installHousehold(page, 17);
    await inherit(page, ids);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      const former = s.chars[ids.former], mother = s.chars[ids.mother];
      const before = FB.childrenOf(s, former).map(function (c) { return c.id; });
      s.pregnant = { due:s.turn + 1, motherId:mother.id,
        fatherId:former.id, lineParentId:former.id };
      s.date.day = 2;
      s.eventQueue = []; s.slotDays = [];
      FB.game.passDay({ skipFocus:true, deferUi:true });
      const baby = FB.childrenOf(s, former).filter(function (c) {
        return before.indexOf(c.id) < 0;
      })[0];
      if (!baby) throw new Error('Expected the recorded pregnancy to deliver');
      return { father:baby.fatherId, mother:baby.motherId,
        household:FB.isHouseholdCharacter(s, baby.id),
        dependent:FB.isHouseholdDependent(s, baby.id),
        headChildren:FB.childrenOf(s, s.chars[s.player.charId]).length };
    }, ids);
    expect(result).toEqual({ father:ids.former, mother:ids.mother,
      household:true, dependent:true, headChildren:0 });
  });

for (const width of [390, 1280]) {
  test('inherited siblings keep education and work controls with Back navigation at ' + width,
    async function ({ page }) {
      await page.setViewportSize({ width:width, height:600 });
      const ids = await installHousehold(page, 17);
      await inherit(page, ids);
      await page.evaluate(function () { FB.ui.showHouseholdPlan(); });
      const cid = ids.children[7];
      const action = function (kind) {
        return page.locator('[data-household-plan-action="' + kind + '"]' +
          '[data-household-plan-cid="' + cid + '"]');
      };
      await expect(action('education')).toBeVisible();
      await expect(action('instruction')).toBeVisible();
      await expect(action('work')).toBeVisible();
      await action('education').scrollIntoViewIfNeeded();
      const before = await action('education').evaluate(function (button) {
        button.focus({ preventScroll:true });
        const ledger = document.querySelector('.household-plan-content');
        return { scroll:ledger.scrollTop,
          offset:button.getBoundingClientRect().top - ledger.getBoundingClientRect().top };
      });
      expect(before.scroll).toBeGreaterThan(0);
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-edufocus="lea"]')).toBeVisible();
      await page.locator('#edu-back').click();
      await expect(action('education')).toBeFocused();
      await expect.poll(async function () {
        return action('education').evaluate(function (button) {
          const ledger = document.querySelector('.household-plan-content');
          return button.getBoundingClientRect().top - ledger.getBoundingClientRect().top;
        });
      }).toBeCloseTo(before.offset, 0);
      await action('instruction').click();
      await expect(page.locator('#gm-title')).toContainText('Instruction');
      await page.locator('#tut-back').click();
      await page.locator('#household-plan-close').click();
      await page.evaluate(function (cid) { FB.ui.showCharModal(cid); }, cid);
      await expect(page.locator('[data-interaction-action="management.education.focus"]')).toBeVisible();
      await expect(page.locator('[data-interaction-action="management.career"]')).toBeVisible();
    });
}
