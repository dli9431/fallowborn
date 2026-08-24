'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'css/style.css',
  'js/papacy.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'data/papacy.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

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

test('gates the Papacy & College deed to church-facing roles', async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    delete me.bishopric;
    function shown() {
      return FB.instantStatus(state, 'papacy').shown;
    }

    player.tier = 0;
    player.provs = [];
    player.profession = 'laborer';
    const serf = shown();

    player.profession = 'priest';
    const priest = shown();

    player.profession = 'monk';
    const monk = shown();

    player.profession = 'laborer';
    player.tier = 3;
    player.provs = ['london'];
    const baron = shown();

    player.tier = 0;
    player.provs = [];
    me.bishopric = { seeProvinceId:'london' };
    const bishop = shown();
    delete me.bishopric;

    return { serf:serf, priest:priest, monk:monk, baron:baron, bishop:bishop };
  });

  expect(result.serf).toBe(false);
  expect(result.priest).toBe(true);
  expect(result.monk).toBe(true);
  expect(result.baron).toBe(true);
  expect(result.bishop).toBe(true);
});
test('Papacy sheet groups the saved ballot and moves supporting detail to tooltips',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const papacy = FB.ensurePapacy(s);
      const obedience = papacy.obediences[papacy.romanObedience];
      const voters = obedience.college.filter(function (id) {
        return s.chars[id] && !s.chars[id].dead && papacy.cardinals[id];
      }).slice(0, 3);
      const first = voters[0];
      const second = voters[1];
      obedience.college = voters.slice();
      const law = FB.papalElectionLaw(s);
      papacy.elections[obedience.id] = {
        id:'papacy_ui_ballot', obedienceId:obedience.id,
        phase:'resolved', law:law, round:2, ballots:[{
          round:2, turn:s.turn - 1, threshold:2,
          votes:[
            { electorId:voters[0], candidateId:first, score:72, opinion:18 },
            { electorId:voters[1], candidateId:first, score:64, opinion:9 },
            { electorId:voters[2], candidateId:second, score:58, opinion:-4 }
          ],
          counts:{}, winnerId:first, assent:null
        }],
        lastVotes:{}, lastCounts:{}, lean:{}, promises:[], backing:{},
        endorsements:{}, withdrawn:{}, roundEffects:{}, compromiseId:null,
        winnerId:first, waitUntil:s.turn
      };
      papacy.elections[obedience.id].ballots[0].counts[first] = 2;
      papacy.elections[obedience.id].ballots[0].counts[second] = 1;
      papacy.elections[obedience.id].lastVotes[voters[0]] = first;
      papacy.elections[obedience.id].lastVotes[voters[1]] = first;
      papacy.elections[obedience.id].lastVotes[voters[2]] = second;
      papacy.elections[obedience.id].lastCounts[first] = 2;
      papacy.elections[obedience.id].lastCounts[second] = 1;
      FB.ui.showPapacy(obedience.id);
      return {
        first:first,
        second:second,
        firstName:FB.papalDisplayName(s, s.chars[first]),
        secondName:FB.papalDisplayName(s, s.chars[second]),
        voter:voters[0]
      };
    });

    const heading = page.getByRole('heading', {
      name:'Papacy and College', exact:true
    });
    await expect(heading).toBeVisible();
    await expect(heading.locator('..')).toHaveClass(/has-modal-title-details/);
    await expect(page.locator('#gm-title-details')).toBeHidden();
    await heading.hover();
    await expect(page.locator('#tooltip')).toContainText('Authority gates');
    await expect(page.locator('#tooltip')).toContainText(
      'Candidate columns group every elector');

    const overview = page.locator('.papacy-overview');
    await expect(overview).toContainText('Claimant');
    await expect(overview).toContainText('Authority');
    await expect(overview).toContainText('College');
    await expect(overview.locator(':scope > .kv')).toHaveCount(4);
    await expect(page.locator('#papacy-overview-details')).toBeHidden();

    await expect(page.locator('.papacy-ballot-mode')).toContainText(
      'Last ballot · 2 votes required');
    const firstGroup = page.locator(
      '[data-papal-ballot-candidate="' + setup.first + '"]');
    const secondGroup = page.locator(
      '[data-papal-ballot-candidate="' + setup.second + '"]');
    await expect(firstGroup).toContainText(setup.firstName);
    await expect(firstGroup).toContainText('2 votes');
    await expect(firstGroup.locator('[data-papal-voter]')).toHaveCount(2);
    await expect(secondGroup).toContainText(setup.secondName);
    await expect(secondGroup).toContainText('1 vote');
    await expect(secondGroup.locator('[data-papal-voter]')).toHaveCount(1);
    await expect(page.locator('.papacy-elector')).toHaveCount(0);

    const voter = page.locator('[data-papal-voter="' + setup.voter + '"]');
    await expect(voter.locator('.settcard-info')).toHaveCount(1);
    await expect(voter.locator('.papacy-ballot-voter-details')).toBeHidden();
    await voter.hover();
    await expect(page.locator('#tooltip')).toContainText('Title church');
    await expect(page.locator('#tooltip')).toContainText('Curial bloc');
    await expect(page.locator('#tooltip')).toContainText('Ballot score');
    await expect(page.locator('#tooltip')).toContainText('Relevant opinion');

    const investiture = page.locator('.papacy-investiture-card');
    await expect(investiture.locator('.settcard-info')).toHaveCount(1);
    await expect(page.locator('#papacy-investiture-details')).toBeHidden();

    await page.setViewportSize({ width:390, height:844 });
    await expect(firstGroup).toBeVisible();
    await expect(secondGroup).toBeVisible();
    const firstBox = await firstGroup.boundingBox();
    const secondBox = await secondGroup.boundingBox();
    expect(Math.abs(firstBox.x - secondBox.x)).toBeLessThan(2);
    expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 2);
    await voter.locator('.settcard-info').click();
    await expect(voter.locator('.papacy-ballot-voter-details')).toBeVisible();
  });
