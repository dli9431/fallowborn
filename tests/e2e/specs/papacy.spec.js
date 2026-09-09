'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'css/style.css',
  'js/model.js',
  'js/economy.js',
  'js/ui_panels.js',
  'data/economy.js',
  'js/papacy.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/keys.js',
  'js/events.js',
  'data/papacy.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('consistory candidate scan reuses one reverse spouse index',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const papacy = FB.ensurePapacy(state);
      const obedience = papacy.obediences[papacy.romanObedience];
      const candidate = FB.makeCharacter(state, {
        sex:'m', culture:'frankish', religion:'catholic',
        born:state.date.year - 45, dyn:'Consistory Test'
      });
      candidate.bishopric = {
        seeProvinceId:'london', appointedTurn:state.turn,
        previousTier:2, appointerKind:'canonical', appointerId:null,
        investiturePolicy:'canonical'
      };
      candidate.skills.lea = 20;
      candidate.clericalPiety = 500;
      candidate.clericalPrestige = 300;
      candidate.curialOpinion = 80;
      candidate.spouseId = null;
      const spouse = FB.makeCharacter(state, {
        sex:'f', culture:'frankish', religion:'catholic',
        born:state.date.year - 40, dyn:'Consistory Test'
      });
      spouse.spouseId = candidate.id;

      for (let i = 0; i < 240; i++) {
        const id = 'consistory_shape_' + i;
        state.chars[id] = {
          id:id, name:'Candidate ' + i, sex:'m', culture:'frankish',
          religion:'catholic', born:state.date.year - 40,
          dead:false, skills:{ lea:1 }, traits:[], childrenIds:[]
        };
      }

      FB.touchFamily();
      const characters = state.chars;
      let tablePasses = 0;
      state.chars = new Proxy(characters, {
        ownKeys:function (target) {
          tablePasses++;
          return Reflect.ownKeys(target);
        }
      });
      const whileMarried = FB.papalAppointmentCandidates(
        state, obedience.id, false).some(function (c) {
          return c.id === candidate.id;
        });
      spouse.dead = true;
      const afterWidowhood = FB.papalAppointmentCandidates(
        state, obedience.id, false).some(function (c) {
          return c.id === candidate.id;
        });
      state.chars = characters;
      FB.touchFamily();
      return {
        whileMarried:whileMarried,
        afterWidowhood:afterWidowhood,
        tablePasses:tablePasses
      };
    });

    expect(result.whileMarried).toBe(false);
    expect(result.afterWidowhood).toBe(true);
    expect(result.tablePasses).toBeLessThanOrEqual(6);
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

test('dismissing a rival Papal sponsorship request records refusal',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const papacy = FB.ensurePapacy(s);
      const obedience = papacy.obediences[papacy.romanObedience];
      const rivalId = obedience.college.filter(function (id) {
        return s.chars[id] && !s.chars[id].dead;
      })[0];
      papacy.pendingSchism = {
        electionObedienceId:obedience.id,
        sponsor:'player',
        leaderId:obedience.claimantId,
        rivalId:rivalId,
        madeTurn:s.turn
      };
      FB.ui.showPapacy(obedience.id);
      return { obedienceId:obedience.id, rivalId:rivalId };
    });

    await expect(page.getByText('A rival claimant seeks your backing'))
      .toBeVisible();
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    expect(await page.evaluate(function () {
      return {
        pending:!!FB.state.papacy.pendingSchism,
        decision:FB.papacyPendingDecision(FB.state),
        active:Object.keys(FB.state.papacy.obediences).filter(function (id) {
          return FB.state.papacy.obediences[id].status === 'active';
        }).length
      };
    })).toEqual({ pending:false, decision:null, active:1 });

    await page.evaluate(function (values) {
      const s = FB.state;
      s.papacy.pendingSchism = {
        electionObedienceId:values.obedienceId,
        sponsor:'player',
        leaderId:s.papacy.obediences[values.obedienceId].claimantId,
        rivalId:values.rivalId,
        madeTurn:s.turn
      };
      FB.ui.showPapacy(values.obedienceId);
    }, setup);
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    expect(await page.evaluate(function () {
      return !!FB.state.papacy.pendingSchism;
    })).toBe(false);
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


async function prepareReligiousCareer(page, bishop) {
  return page.evaluate(function (hasSee) {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    p.tier = 2;
    p.provs = [];
    p.provinceId = 'london';
    p.profession = 'priest';
    p.piety = 1000;
    p.prestige = 1000;
    p.gold = 1000;
    c.sex = 'm';
    c.religion = 'catholic';
    c.born = s.date.year - 45;
    c.spouseId = null;
    c.betrothedId = null;
    for (const id in s.chars) {
      if (s.chars[id].spouseId === c.id) s.chars[id].spouseId = null;
    }
    c.traits = c.traits.filter(function (id) { return id !== 'excommunicated'; });
    c.skills.lea = 25;
    c.career = { profession:'priest', rank:'master', experience:20,
      startedYear:s.date.year - 20, guildRank:'none', guildStanding:0, chosen:true };
    c.religiousRanks = { catholic_clerical:4 };
    delete c.bishopric;
    delete c.bishopricVacatedTurn;
    delete c.bishopPetitionRefusedTurn;
    const papacy = FB.ensurePapacy(s);
    const obedience = papacy.obediences[papacy.romanObedience];
    papacy.relationships[obedience.claimantId + ':' + c.id] = 100;
    if (hasSee) FB.installBishopric(s, c, FB.bishopAppointmentStatus(s, c));
    // Control only the appointment roll; all eligibility, costs and office effects stay real.
    FB.chance = function () { return true; };
    FB.ui.refresh();
    return { id:c.id, popeId:obedience.claimantId, gold:p.gold };
  }, bishop);
}

test('Self links the recognized Pope to the character sheet', async function ({ page }) {
  const person = await prepareReligiousCareer(page, false);
  await page.evaluate(function () { FB.ui.showTab('char'); });
  const link = page.locator('#tab-char [data-pope-character]');
  await expect(link).toHaveAttribute('data-pope-character', person.popeId);
  await expect(page.locator('#tab-char .religious-head-identity canvas')).toHaveAttribute('data-cid', person.popeId);
  await expect(link).not.toContainText('authority');
  await expect(page.locator('#tab-char .religious-head-standing')).toContainText('authority');
  await link.click();
  await expect(page.locator('#genmodal')).toBeVisible();
  await expect(page.locator('#gm-body canvas[data-cid="' + person.popeId + '"]').first()).toBeVisible();
});

test('Bishop appointment retains a success result until acknowledged', async function ({ page }) {
  await prepareReligiousCareer(page, false);
  await page.evaluate(function () { FB.ui.showBishopAppointment(FB.state.player.charId); });
  await page.locator('#bishop-endow').click();
  await expect(page.locator('#gm-title')).toHaveText('Invested as Bishop');
  await expect(page.locator('[data-religious-office-result]')).toContainText('episcopal household');
  expect(await page.evaluate(function () { return !!FB.state.chars[FB.state.player.charId].bishopric; })).toBe(true);
  await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
  await page.locator('#office-result-person').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-religious-office-result]')).toBeVisible();
  await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
  await page.locator('#office-result-continue').click();
  await expect(page.locator('[data-religious-office-result]')).toHaveCount(0);
});

test('Bishopric petitions immediately and acknowledges Cardinal success once', async function ({ page }) {
  const person = await prepareReligiousCareer(page, true);
  const cost = await page.evaluate(function () {
    FB.ui.showBishopric();
    return FB.cardinalPetitionStatus(FB.state, FB.state.player.charId).cost;
  });
  await page.locator('#bishop-cardinal').click();
  await expect(page.locator('#gm-title')).toHaveText('Appointed Cardinal');
  await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
  await expect(page.locator('.religious-office-benefits')).toHaveText('The office grants station 4 and 3.5 piety each season.');
  await expect(page.locator('[data-promotion-receipt]')).toContainText(
    await page.evaluate(function (cost) { return FB.T('Money {change}', { change:'−' + FB.money(cost) }); }, cost));
  const nameBox = await page.locator('#office-result-person').boundingBox();
  const benefitsBox = await page.locator('.religious-office-benefits').boundingBox();
  expect(benefitsBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height);
  expect(Math.abs(benefitsBox.x - nameBox.x)).toBeLessThan(2);
  await expect(page.locator('#papal-petition')).toHaveCount(0);
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(person.gold - cost);
  await page.keyboard.press('Escape');
  await expect(page.locator('#gm-title')).toHaveText('The Bishopric');
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(person.gold - cost);
  await expect(page.locator('#bishop-cardinal')).toHaveCount(0);
});

test('choosing a Papal name shows the successful accession', async function ({ page }) {
  await prepareReligiousCareer(page, true);
  await page.evaluate(function () {
    const s = FB.state, papacy = FB.ensurePapacy(s);
    const oid = papacy.romanObedience;
    FB.appointCardinal(s, s.chars[s.player.charId], oid, papacy.obediences[oid].claimantId);
    FB.startPapalElection(s, oid, 'death');
    const election = papacy.elections[oid];
    election.phase = 'name';
    election.winnerId = s.player.charId;
    FB.ui.showPapacy(oid);
  });
  await page.locator('[data-papal-name]').first().click();
  await expect(page.locator('#gm-title')).toHaveText('Elected Pope');
  await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
  await expect(page.locator('[data-religious-office-result]')).toContainText('family property enters custody');
  expect(await page.evaluate(function () { return !!FB.playerPope(FB.state); })).toBe(true);
  await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
  await page.locator('#office-result-continue').click();
  await expect(page.locator('[data-religious-office-result]')).toHaveCount(0);
});


test('a refused direct red-hat petition refreshes its cooldown without a success screen', async function ({ page }) {
  const person = await prepareReligiousCareer(page, true);
  const cost = await page.evaluate(function () {
    FB.chance = function () { return false; };
    FB.ui.showBishopric();
    return FB.cardinalPetitionStatus(FB.state, FB.state.player.charId).cost;
  });
  await page.locator('#bishop-cardinal').click();
  await expect(page.locator('#gm-title')).toHaveText('The Bishopric');
  await expect(page.locator('[data-religious-office-result]')).toHaveCount(0);
  await expect(page.locator('#bishop-cardinal')).toBeDisabled();
  await expect(page.locator('#bishop-cardinal')).toContainText('cooldown');
  expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(person.gold - cost);
});


for (const rank of [0, 2]) {
  test('monastic advancement from rank ' + rank + ' retains its success screen', async function ({ page }) {
    await prepareReligiousCareer(page, false);
    await page.evaluate(function (index) {
      const s = FB.state, c = s.chars[s.player.charId];
      s.player.profession = 'monk';
      c.career.profession = 'monk';
      c.religiousRanks = { catholic_monastic:index };
      if (index === 2) FB.ui.showAbbotElection(c.id);
      else FB.ui.showCareerPicker(c.id);
    }, rank);
    await page.locator(rank === 2 ? '#abbot-election' : '#career-religious').click();
    await expect(page.locator('#gm-title')).toHaveText('Religious rank gained');
    await expect(page.locator('.religious-office-benefits')).toContainText(
      rank === 2 ? '1.5 piety each season' : '0.5 piety each season');
    await expect(page.locator('[data-religious-office-result]')).toContainText('Congratulations');
    await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
    await page.locator('#office-result-continue').click();
    await expect(page.locator('[data-religious-office-result]')).toHaveCount(0);
  });
}

test('promotion acknowledgement rejects transition input and held shortcuts', async function ({ page }) {
  await prepareReligiousCareer(page, true);
  const result = await page.evaluate(function () {
    const realNow = Date.now;
    let now = realNow();
    Date.now = function () { return now; };
    function key(type, repeat) {
      document.dispatchEvent(new KeyboardEvent(type, { key:'1', code:'Digit1', repeat:!!repeat, bubbles:true }));
    }
    function visible() { return !!document.querySelector('[data-religious-office-result]'); }
    try {
      FB.ui.showBishopric();
      // An activation key and pointer are already down when the result appears.
      const input = document.createElement('input');
      document.getElementById('gm-body').appendChild(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key:'1', code:'Digit1', bubbles:true }));
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles:true }));
      document.getElementById('bishop-cardinal').click();
      const gold = FB.state.player.gold;
      document.getElementById('office-result-continue').click();
      FB.ui.backModal();
      const immediate = visible();
      now += 400;
      key('keydown', true);
      key('keydown', false);
      const held = visible();
      document.getElementById('office-result-continue').dispatchEvent(new MouseEvent('click', { bubbles:true, detail:1 }));
      const inFlight = visible();
      key('keyup');
      key('keydown');
      key('keyup');
      return { immediate:immediate, held:held, inFlight:inFlight, acknowledged:!visible(),
        chargedOnce:FB.state.player.gold === gold };
    } finally { Date.now = realNow; }
  });
  expect(result).toEqual({ immediate:true, held:true, inFlight:true, acknowledged:true, chargedOnce:true });
});
