'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js',
  'js/main.js',
  'js/ui_modals.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('student reservations persist and household policy requires an explicit opt-in',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const parent = s.chars[s.player.charId];
      const child = FB.makeCharacter(s, {
        name:'Edith',
        sex:'f',
        culture:parent.culture,
        religion:parent.religion,
        born:s.date.year - 10,
        dyn:parent.dyn,
        role:'child',
        traits:[],
        fatherId:parent.sex === 'm' ? parent.id : null,
        motherId:parent.sex === 'f' ? parent.id : null
      });
      child.health = 8;
      parent.childrenIds = parent.childrenIds || [];
      parent.childrenIds.push(child.id);
      child.edu = {};

      FB.setProtected(s, 'educationCharacter', child.id, true);
      const preview = FB.educationPolicyPreview(s, {
        focus:'lea',
        instructionMode:'best',
        feeCap:100
      });
      FB.setEducationPolicy(s, {
        focus:'lea',
        instructionMode:'best',
        feeCap:100
      });
      const serialized = JSON.parse(FB.save.serialize()).state.player.protections;
      FB.ui.showEduFocus(child.id, 'household-plan');
      return {
        childId:child.id,
        previewOmitted:preview.every(function (entry) {
          return entry.c.id !== child.id;
        }),
        focusAfterPolicy:child.edu.focus || null,
        serialized:serialized
      };
    });

    expect(setup.previewOmitted).toBe(true);
    expect(setup.focusAfterPolicy).toBeNull();
    expect(setup.serialized.educationCharacter).toContain(setup.childId);

    const protection = page.getByRole('checkbox', {
      name:/Manage this education manually/
    });
    await expect(protection).toBeChecked();
    await page.locator('#edu-follow-policy').click();
    const followed = await page.evaluate(function (childId) {
      const child = FB.state.chars[childId];
      return {
        focus:child.edu.focus,
        protected:FB.isProtected(
          FB.state, 'educationCharacter', childId)
      };
    }, setup.childId);
    expect(followed).toEqual({ focus:'lea', protected:false });
    await expect(page.locator('#gm-title')).toContainText('Household Plan');
  });

test('technology and county reservations constrain automation but not manual actions',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const home = p.provinceId;
      p.tier = 4;
      p.liege = null;
      p.provs = [home];
      s.owner[home] = 'player';
      s.holder[home] = 'player';
      FB.foundPlayerRealm(s);
      s.realms.player.alive = true;
      s.realms.player.rank = 1;
      s.realms.player.liege = null;
      s.realms.player.capital = home;
      FB.invalidateRealmCache();

      const record = FB.realmTechRecord(s, 'player');
      record.active = [];
      const available = FB.techCandidates(s, 'player', true).filter(
        function (item) { return item.available; });
      if (available.length < 2) throw new Error('Expected two available technologies');
      available.sort(function (a, b) {
        return a.cost - b.cost ||
          a.def.history.attested[0] - b.def.history.attested[0] ||
          (a.id < b.id ? -1 : 1);
      });
      const protectedTech = available[0].id;
      FB.setProtected(s, 'researchTech', protectedTech, true);
      const automated = FB.autoResearch(s, 'cheapest');
      const automaticIds = record.active.slice();
      record.active = [];
      FB.ui.showTechDetail(protectedTech);
      return {
        home:home,
        protectedTech:protectedTech,
        automated:automated,
        automaticIds:automaticIds
      };
    });

    expect(setup.automated).toBe(true);
    expect(setup.automaticIds).not.toContain(setup.protectedTech);
    const techProtection = page.getByRole('checkbox', {
      name:/Reserve from automatic research/
    });
    await expect(techProtection).toBeChecked();
    await page.getByRole('button', {
      name:'Begin research', exact:true
    }).click();
    const manualTech = await page.evaluate(function (id) {
      const record = FB.realmTechRecord(FB.state, 'player');
      return {
        active:record.active.indexOf(id) >= 0,
        protected:FB.isProtected(FB.state, 'researchTech', id)
      };
    }, setup.protectedTech);
    expect(manualTech).toEqual({ active:true, protected:false });

    const building = await page.evaluate(function (home) {
      const s = FB.state;
      const p = s.player;
      const record = FB.realmTechRecord(s, 'player');
      record.active = [];
      for (const id in FBDATA.tech) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      }
      p.tier = 3;
      p.gold = 10000;
      s.dev[home] = 10;
      s.buildings[home] = [];
      FB.setProtected(s, 'autoBuildCounty', home, true);
      const before = JSON.stringify(s.buildings[home]);
      const automatic = FB.autoBuild(s);
      const automaticUnchanged = before === JSON.stringify(s.buildings[home]);
      let choice = null;
      const settlements = FB.settlementsOf(s, home);
      for (let i = 0; i < settlements.length && !choice; i++) {
        const available = FB.buildable(s, home, i);
        if (available.length) choice = { index:i, id:available[0].id };
      }
      const manual = choice
        ? FB.build(s, home, choice.index, choice.id) : false;
      FB.ui.showBuildings(home);
      return {
        automatic:automatic,
        unchanged:automaticUnchanged,
        manual:manual,
        protected:FB.isProtected(s, 'autoBuildCounty', home)
      };
    }, setup.home);

    expect(building.automatic).toBe(false);
    expect(building.unchanged).toBe(true);
    expect(building.manual).toBe(true);
    expect(building.protected).toBe(true);
    await expect(page.locator('#building-auto-protection')).toBeChecked();
  });

test('worker reservations follow people while manual staffing remains available',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const parent = s.chars[p.charId];
      const home = p.provinceId;
      p.tier = 1;
      p.enterpriseMigration = 1;
      parent.childrenIds = parent.childrenIds || [];

      function worker(name, age) {
        const c = FB.makeCharacter(s, {
          name:name,
          sex:'m',
          culture:parent.culture,
          religion:parent.religion,
          born:s.date.year - age,
          dyn:parent.dyn,
          role:'child',
          traits:[],
          fatherId:parent.sex === 'm' ? parent.id : null,
          motherId:parent.sex === 'f' ? parent.id : null
        });
        c.health = 8;
        c.career = {
          profession:'farmer',
          rank:'journeyman',
          experience:5,
          startedYear:s.date.year - 5,
          guildRank:'none',
          chosen:true
        };
        parent.childrenIds.push(c.id);
        return c;
      }

      const assigned = worker('Oswin', 23);
      const idle = worker('Wulfric', 21);
      p.enterprises = [
        {
          uid:'reserved_assigned',
          type:'field_strip',
          provinceId:home,
          settlement:0,
          workerId:assigned.id
        },
        {
          uid:'reserved_idle',
          type:'orchard_business',
          provinceId:home,
          settlement:0,
          workerId:null
        }
      ];
      FB.setProtected(s, 'staffingWorker', assigned.id, true);
      FB.setProtected(s, 'staffingWorker', idle.id, true);
      const plan = FB.enterpriseStaffingPlan(s);
      const assignedRow = plan.rows.filter(function (row) {
        return row.uid === 'reserved_assigned';
      })[0];
      const idleRow = plan.rows.filter(function (row) {
        return row.uid === 'reserved_idle';
      })[0];
      const manuallyAssigned = FB.assignEnterprise(
        s, 'reserved_idle', idle.id);
      const afterManual = FB.enterpriseStaffingPlan(s).rows.filter(
        function (row) { return row.uid === 'reserved_idle'; })[0];
      FB.ui.showEnterpriseManage('reserved_idle');
      return {
        assignedId:assigned.id,
        idleId:idle.id,
        assignedRow:assignedRow,
        idleRow:idleRow,
        manuallyAssigned:manuallyAssigned,
        afterManual:afterManual
      };
    });

    expect(setup.assignedRow).toMatchObject({
      currentWorkerId:setup.assignedId,
      proposedWorkerId:setup.assignedId,
      workerProtected:true,
      status:'reserved'
    });
    expect(setup.idleRow.proposedWorkerId).not.toBe(setup.idleId);
    expect(setup.manuallyAssigned).toBe(true);
    expect(setup.afterManual).toMatchObject({
      currentWorkerId:setup.idleId,
      proposedWorkerId:setup.idleId,
      workerProtected:true,
      status:'reserved'
    });
    await expect(page.locator(
      '[data-staffing-worker-protection="' + setup.idleId + '"]'))
      .toContainText('Allow staffing assistant');
  });

test('day-spending household managers rebuild their originating view',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const parent = s.chars[p.charId];
      p.tier = 1;
      p.gold = 1000;
      p.retainers = [];
      p.flags.tutorial = false;
      p.flags.tut_ev_welcome = 1;
      parent.childrenIds = parent.childrenIds || [];
      const child = FB.makeCharacter(s, {
        name:'Leofric',
        sex:'m',
        culture:parent.culture,
        religion:parent.religion,
        born:s.date.year - 20,
        dyn:parent.dyn,
        role:'child',
        traits:[],
        fatherId:parent.sex === 'm' ? parent.id : null,
        motherId:parent.sex === 'f' ? parent.id : null
      });
      child.health = 8;
      child.career = {
        profession:'farmer',
        rank:'unassigned',
        experience:0,
        startedYear:s.date.year,
        guildRank:'none',
        chosen:false
      };
      parent.childrenIds.push(child.id);
      FB.ui.showCareerPicker(child.id, 'household-plan');
      return {
        childId:child.id,
        parentId:parent.id,
        parentName:FB.fullName(parent),
        startTurn:s.turn
      };
    });

    await page.locator('[data-career-choice]:not([disabled])').first().click();
    await expect(page.locator('#gm-title')).toContainText('Household Plan');
    expect(await page.evaluate(function () { return FB.state.turn; }))
      .toBe(setup.startTurn + 1);

    await page.evaluate(function (ids) {
      FB.ui.showRetainerCandidates('factor', {
        view:'character',
        characterId:ids.parentId,
        returnContext:null
      });
    }, setup);
    await page.locator('[data-retainer-candidate=""]').click();
    await expect(page.locator('#gm-body')).toContainText(setup.parentName);
    expect(await page.evaluate(function () { return FB.state.turn; }))
      .toBe(setup.startTurn + 2);

    await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const home = p.provinceId;
      const record = FB.realmTechRecord(s, FB.techRealmId(s));
      for (const id in FBDATA.tech) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      }
      s.dev[home] = 10;
      p.enterpriseMigration = 1;
      p.enterprises = [];
      FB.ui.showEnterpriseMarket(0, 'household-plan');
    });
    await page.locator('[data-enterprise-buy]:not([disabled])').first().click();
    await expect(page.locator('#gm-title')).toContainText('Household Plan');
    expect(await page.evaluate(function () { return FB.state.turn; }))
      .toBe(setup.startTurn + 3);
  });
