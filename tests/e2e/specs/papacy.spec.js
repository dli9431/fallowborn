'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('reserves Rome from personal bishopric appointments', async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    player.tier = 2;
    player.provs = [];
    player.profession = 'priest';
    player.piety = 160;
    player.prestige = 80;
    player.flags = player.flags || {};
    delete player.flags.bishop;
    delete player.flags.pope;
    me.sex = 'm';
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    me.spouseId = null;
    me.betrothedId = null;
    for (const id in state.chars) {
      if (state.chars[id].spouseId === me.id) state.chars[id].spouseId = null;
    }
    me.traits = (me.traits || []).filter(function (id) {
      return id !== 'excommunicated';
    });
    me.skills.lea = 20;
    me.career = {
      profession:'priest', rank:'master', experience:14,
      startedYear:state.date.year - 14, guildRank:'none', guildStanding:0,
      chosen:true
    };
    me.religiousRanks = { catholic_clerical:4 };
    delete me.bishopric;
    delete me.bishopricVacatedTurn;
    delete me.bishopPetitionRefusedTurn;

    player.provinceId = 'roma';
    const rome = FB.bishopAppointmentStatus(state, me);
    const petition = FB.seekBishopAppointment(state, me, false);
    const forced = FB.installBishopric(state, me, {
      seeProvinceId:'roma', appointerKind:'canonical', policyId:'canonical'
    });

    player.provinceId = 'london';
    const elsewhere = FB.bishopAppointmentStatus(state, me);
    return {
      romeReady:rome.ready,
      romeMissing:rome.missing,
      petition:petition,
      forced:forced,
      installed:!!me.bishopric,
      elsewhereReady:elsewhere.ready
    };
  });

  expect(result.romeReady).toBe(false);
  expect(result.romeMissing).toContain(
    'a bishopric outside the Pope’s diocese of Roma');
  expect(result.petition).toBe(false);
  expect(result.forced).toBe(false);
  expect(result.installed).toBe(false);
  expect(result.elsewhereReady).toBe(true);
});
