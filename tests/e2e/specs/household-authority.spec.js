'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/model.js',
  'js/ui_modals.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('the local lord stays outside household service after friendship and marriage',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const player = state.player;
      const me = state.chars[player.charId];
      const lord = FB.getRole(state, 'lord', true);
      player.tier = 2;
      player.gold = 100;
      player.friendContacts = player.friendContacts || {};
      player.friendContacts[lord.id] = {
        startedTurn:state.turn,
        lastTurn:state.turn
      };
      lord.career = {
        profession:'noble', rank:'journeyman', experience:4,
        startedYear:state.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      const technology = FB.realmTechRecord(state, FB.techRealmId(state));
      if (technology.completed.indexOf('bureaucratic_offices') < 0) {
        technology.completed.push('bureaucratic_offices');
      }

      const contactCandidates = FB.retainerCandidates(state, 'steward')
        .map(function (c) { return c.id; });
      const contactCanHire = FB.canHireRetainer(state, 'steward', lord.id);
      const contactHire = FB.hireRetainer(state, 'steward', lord.id);
      const beforeCareerChoices = FB.careerChoices(state, lord).length;

      me.sex = 'f';
      lord.sex = 'm';
      player.courtingId = lord.id;
      const married = FB.doMarry(state, { settleDowry:false });
      const lordRoleId = state.roles.lord;
      /* Capital moves replace the active local-role slot. The former lord's
         character identity must still keep their household independent. */
      delete state.roles.lord;
      const interaction = FB.ui.characterInteractionCard(state, lord.id);
      const actionIds = interaction.actions.map(function (action) {
        return action.id;
      });
      const afterCareerChoices = FB.careerChoices(state, lord).length;
      const beganAdministration = FB.beginCareer(
        state, lord, 'administration');

      return {
        lordId:lord.id,
        authority:FB.isExternalHouseholdAuthority(state, lord),
        contactCandidate:contactCandidates.indexOf(lord.id) >= 0,
        contactCanHire:contactCanHire,
        contactHire:contactHire,
        beforeCareerChoices:beforeCareerChoices,
        married:married,
        spouseLinked:me.spouseId === lord.id && lord.spouseId === me.id,
        lordRoleId:lordRoleId,
        characterRole:lord.role,
        household:FB.isHouseholdCharacter(state, lord.id),
        householdMember:FB.householdMembers(state).some(function (c) {
          return c.id === lord.id;
        }),
        householdWorker:FB.householdWorkers(state).some(function (c) {
          return c.id === lord.id;
        }),
        householdEquipment:FB.householdCharacterIds(state)
          .indexOf(lord.id) >= 0,
        afterCareerChoices:afterCareerChoices,
        beganAdministration:beganAdministration,
        actionIds:actionIds,
        retainers:FB.retainerRecords(state).length
      };
    });

    expect(result.authority).toBe(true);
    expect(result.contactCandidate).toBe(false);
    expect(result.contactCanHire).toBe(false);
    expect(result.contactHire).toBe(false);
    expect(result.beforeCareerChoices).toBe(0);
    expect(result.married).toBe(true);
    expect(result.spouseLinked).toBe(true);
    expect(result.lordRoleId).toBe(result.lordId);
    expect(result.characterRole).toBe('lord');
    expect(result.household).toBe(false);
    expect(result.householdMember).toBe(false);
    expect(result.householdWorker).toBe(false);
    expect(result.householdEquipment).toBe(false);
    expect(result.afterCareerChoices).toBe(0);
    expect(result.beganAdministration).toBe(false);
    expect(result.actionIds).not.toContain('management.equipment');
    expect(result.actionIds).not.toContain('management.career');
    expect(result.actionIds).not.toContain('management.retainer.consider');
    expect(result.retainers).toBe(0);
  });

test('retainer normalization repairs an invalid legacy local-lord contract',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const player = state.player;
      const me = state.chars[player.charId];
      const lord = FB.getRole(state, 'lord', true);
      const student = FB.makeCharacter(state, {
        name:'Legacy Student',
        sex:'f',
        culture:me.culture,
        religion:me.religion,
        born:state.date.year - 10,
        traitsN:0
      });
      student.edu = { tutorId:lord.id, school:'master' };
      player.tier = 2;
      player.gold = 100;
      player.enterprises = [{
        id:'legacy-enterprise', workerId:lord.id, workerLocked:true
      }];
      player.retainers = [{
        charId:lord.id, office:'steward', pay:2,
        startedTurn:state.turn, unpaid:0
      }];
      FB.ensureItems(state);
      player.loadouts[lord.id] = { head:'legacy-item-ref' };
      lord.role = 'retainer';
      lord.traits = ['literate'];
      lord.skills = { dip:0, mar:0, ste:8, int:0, lea:8 };
      lord.career = {
        profession:'administration', rank:'apprentice', experience:2,
        startedYear:state.date.year - 2, guildRank:'none', guildStanding:0,
        chosen:true
      };
      const technology = FB.realmTechRecord(state, FB.techRealmId(state));
      if (technology.completed.indexOf('bureaucratic_offices') < 0) {
        technology.completed.push('bureaucratic_offices');
      }

      const active = FB.retainerRecords(state);
      const normalizedRole = lord.role;
      lord.role = null;
      const resolved = FB.getRole(state, 'lord', false);
      const examOptions = FB.careerExamOptions(state, lord);
      const examAttempt = FB.takeCareerExam(state, lord, 'license');

      return {
        activeRetainers:active.length,
        savedRetainers:player.retainers.length,
        normalizedRole:normalizedRole,
        resolvedId:resolved && resolved.id,
        resolvedRole:lord.role,
        enterpriseWorker:player.enterprises[0].workerId,
        enterpriseLocked:player.enterprises[0].workerLocked,
        tutorId:student.edu.tutorId,
        school:student.edu.school,
        loadoutPresent:Object.prototype.hasOwnProperty.call(
          player.loadouts, lord.id),
        household:FB.isHouseholdCharacter(state, lord.id),
        examOptions:examOptions.length,
        examAttempt:examAttempt,
        examRank:lord.career.rank
      };
    });

    expect(result.activeRetainers).toBe(0);
    expect(result.savedRetainers).toBe(0);
    expect(result.normalizedRole).toBe('lord');
    expect(result.resolvedId).toBeTruthy();
    expect(result.resolvedRole).toBe('lord');
    expect(result.enterpriseWorker).toBeNull();
    expect(result.enterpriseLocked).toBeUndefined();
    expect(result.tutorId).toBeNull();
    expect(result.school).toBeNull();
    expect(result.loadoutPresent).toBe(false);
    expect(result.household).toBe(false);
    expect(result.examOptions).toBe(0);
    expect(result.examAttempt).toBe(false);
    expect(result.examRank).toBe('apprentice');
  });
