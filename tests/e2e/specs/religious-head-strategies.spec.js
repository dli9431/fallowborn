'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/cultures.js', 'data/technology.js', 'data/papacy.js', 'data/settlements.js', 'data/map_data.js',
  'js/model.js', 'js/world.js', 'js/papacy.js', 'js/actions.js', 'js/events.js',
  'js/mods.js', 'js/save.js', 'js/save_v4.js', 'js/holywar.js', 'js/music.js',
  'js/tournaments.js', 'js/justice.js', 'js/intrigue.js', 'js/ui_modals.js',
  'js/politics.js', 'js/institutions.js', 'js/fortifications.js', 'js/util.js',
  'js/systems.js', 'data/systems.js', 'data/eras.js'
]);

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('seeded offices retain assignment keys, claim prices and Papal election law', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const papal = FB.religionOf('catholic', s).head;
    const caliphal = FB.religionOf('sunni', s).head;
    const papacy = FB.ensurePapacy(s);
    const college = papacy.obediences[papacy.romanObedience].college.slice();
    const election = FB.succeedReligiousHead(s, 'catholic', { reason:'death' });
    return {
      ids:[papal.officeId, caliphal.officeId],
      strategies:[papal.succession, caliphal.succession],
      realmIds:[s.religiousHeads.catholic, s.religiousHeads.sunni],
      prices:['prestige','piety','minRealm'].map(function (key) {
        return FB.religiousHeadRuleBalance(s, 'sunni', 'head.claim.' + key, '', -1);
      }),
      election:election && election.phase,
      lawMatches:JSON.stringify(election.law) === JSON.stringify(FB.papalElectionLaw(s)),
      wait:election.waitUntil - s.turn,
      expectedWait:FB.papalElectionLaw(s).vacancyDays || 0,
      unchangedCollege:JSON.stringify(college) === JSON.stringify(papacy.obediences[papacy.romanObedience].college)
    };
  });
  expect(result).toEqual({ ids:['catholic','sunni'], strategies:['papal_election','caliphal_claim'],
    realmIds:['papacy','abbasid'], prices:[500,300,6], election:'vacancy',
    lawMatches:true, wait:result.expectedWait, expectedWait:result.expectedWait, unchangedCollege:true });
});

test('a data-only Papal office uses its own seat, college, election and saved state', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, original = JSON.stringify(s.papacy.elections);
    const faithId = FB.createFaith(s, { id:'test_conclave', name:'Concord of Paris', group:'catholic',
      properties:{ head:{ officeId:'paris_office', realm:'west_francia', seat:{ site:'paris' },
        title:'First Pastor', succession:'papal_election', greatHolyWar:null } } });
    if (!faithId) throw new Error('Custom office failed validation');
    FB.withPapalOffice(s, faithId, function () { FB.ensurePapacy(s); });
    const created = s.religiousOfficeStates.paris_office.papacy;
    const college = created.obediences[created.romanObedience].college;
    const exclusive = college.every(function (id) {
      return s.chars[id].religion === faithId && !s.papacy.cardinals[id];
    });
    const election = FB.succeedReligiousHead(s, faithId, { reason:'death' });
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const restored = FB.state;
    const officeState = FB.papacyState(restored, faithId);
    return { faithId:faithId, seat:FB.religiousHeadSeat(restored, faithId), exclusive:exclusive,
      phase:election.phase, count:college.length, originalUnchanged:original === JSON.stringify(restored.papacy.elections),
      sameCollege:JSON.stringify(officeState.obediences[officeState.romanObedience].college) === JSON.stringify(college),
      independent:officeState !== restored.papacy, persistedPhase:officeState.elections[officeState.romanObedience].phase };
  });
  expect(result).toEqual({ faithId:'test_conclave', seat:'paris', exclusive:true, phase:'vacancy',
    count:12, originalUnchanged:true, sameCollege:true, independent:true, persistedPhase:'vacancy' });
});

test('disabled custom papal offices remain uninitialized while the original office stays enabled', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const faith = FB.createFaith(s, { id:'test_disabled_conclave', name:'Dormant Conclave', group:'catholic',
      properties:{ systems:{ papacy:false }, head:{ officeId:'dormant_conclave', realm:'west_francia',
        seat:{ site:'paris' }, title:'First Pastor', succession:'papal_election', greatHolyWar:null } } });
    if (!faith) throw new Error('Disabled office failed validation');
    const before = Object.keys(s.chars).length;
    FB.ensurePapacyState(s);
    const direct = FB.withPapalOffice(s, faith, function () { throw new Error('Disabled callback ran'); });
    return { global:FB.systemAvailable(s, 'papacy'), disabled:FB.systemEnabled(s, 'papacy', { faith:faith }),
      direct:direct, initialized:!!(s.religiousOfficeStates && s.religiousOfficeStates.dormant_conclave),
      generated:Object.keys(s.chars).filter(function (id) { return s.chars[id].religion === faith; }).length,
      unchangedCharacters:Object.keys(s.chars).length === before, original:!!s.papacy };
  });
  expect(result).toEqual({ global:true, disabled:false, direct:false, initialized:false,
    generated:0, unchangedCharacters:true, original:true });
});

test('starter-college generation stops when an authored appointment limit rejects a candidate', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, def = FBDATA.papacy;
    const original = { target:def.targetCollege, cap:def.hardCap };
    const faith = FB.createFaith(s, { id:'test_capped_conclave', name:'Small Conclave', group:'catholic',
      properties:{ head:{ officeId:'capped_conclave', realm:'west_francia', seat:{ site:'paris' },
        title:'First Pastor', succession:'papal_election', greatHolyWar:null } } });
    def.targetCollege = 2; def.hardCap = 1;
    try {
      FB.withPapalOffice(s, faith, function () { FB.ensurePapacy(s); });
      const model = s.religiousOfficeStates.capped_conclave.papacy;
      return model.obediences[model.romanObedience].college.length;
    } finally { def.targetCollege = original.target; def.hardCap = original.cap; }
  });
  expect(result).toBe(1);
});

test('a disabled saved papal office skips repair, elections and yearly work in a mixed world', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const faith = FB.createFaith(s, { id:'test_sleeping_conclave', name:'Sleeping Conclave', group:'catholic',
      properties:{ head:{ officeId:'sleeping_conclave', realm:'west_francia', seat:{ site:'paris' },
        title:'First Pastor', succession:'papal_election', greatHolyWar:null } } });
    FB.withPapalOffice(s, faith, function () { FB.ensurePapacy(s); });
    FB.succeedReligiousHead(s, faith, { reason:'death' });
    const savedOffice = JSON.stringify(s.religiousOfficeStates.sleeping_conclave);
    s.faiths[faith].properties.systems = { papacy:false };
    FB.configureReligions(s);
    s.turn += 400;
    s.date.year++;
    FB.ensurePapacyState(s);
    FB.papacyDay(s);
    FB.papacySeason(s);
    FB.papacyYearly(s);
    const idle = savedOffice === JSON.stringify(s.religiousOfficeStates.sleeping_conclave);
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const restored = FB.state;
    return { idle:idle, restored:savedOffice === JSON.stringify(restored.religiousOfficeStates.sleeping_conclave),
      global:FB.systemAvailable(restored, 'papacy'), hidden:FB.papacyState(restored, faith) === null,
      original:!!FB.papacyState(restored, 'catholic') };
  });
  expect(result).toEqual({ idle:true, restored:true, global:true, hidden:true, original:true });
});

test('a foreign papal office cannot clear or add the player sanction trait', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    me.religion = 'catholic';
    const faith = FB.createFaith(s, { id:'test_foreign_conclave', name:'Foreign Conclave', group:'catholic',
      properties:{ head:{ officeId:'foreign_conclave', realm:'west_francia', seat:{ site:'paris' },
        title:'First Pastor', succession:'papal_election', greatHolyWar:null } } });
    FB.withPapalOffice(s, faith, function () { FB.ensurePapacy(s); });
    const papacy = FB.papacyState(s, 'catholic'), oid = papacy.romanObedience;
    const sentence = { targetId:me.id, targetRealmId:'player', obedienceId:oid,
      cause:'penance', issuedTurn:s.turn, clearedTurn:null };
    papacy.excommunications[oid + ':' + me.id] = sentence;
    FB.addTrait(me, 'excommunicated');
    const foreign = s.religiousOfficeStates.foreign_conclave.papacy;
    // Preserve the sanction while both offices dispatch their annual work.
    FB.papacyYearly(s);
    const retained = me.traits.indexOf('excommunicated') >= 0;
    const stillActive = papacy.excommunications[oid + ':' + me.id].clearedTurn === null;
    // The applicable office may clear it even if an unrelated office has a saved sentence.
    papacy.excommunications[oid + ':' + me.id].clearedTurn = s.turn;
    foreign.excommunications[foreign.romanObedience + ':' + me.id] = Object.assign({}, sentence,
      { obedienceId:foreign.romanObedience, clearedTurn:null });
    FB.papacyYearly(s);
    const cleared = me.traits.indexOf('excommunicated') < 0;
    // With no Papal allegiance, neither office owns a nonpapal head's trait.
    me.religion = 'orthodox';
    FB.addTrait(me, 'excommunicated');
    FB.papacyYearly(s);
    return { retained:retained, stillActive:stillActive, cleared:cleared,
      nonpapalRetained:me.traits.indexOf('excommunicated') >= 0 };
  });
  expect(result).toEqual({ retained:true, stillActive:true, cleared:true, nonpapalRetained:true });
});

test('character appointment and hereditary offices succeed deterministically and survive saves', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const faith = FB.createFaith(s, { id:'test_chapter', name:'The Chapter', group:'christian',
      properties:{ head:{ officeId:'chapter', title:'Elder', holderKind:'character', succession:'appointment', holderSex:'f' } } });
    const elder = FB.makeCharacter(s, { sex:'f', religion:faith, culture:'frankish', born:s.date.year - 60 });
    const younger = FB.makeCharacter(s, { sex:'f', religion:faith, culture:'frankish', born:s.date.year - 25 });
    const lineage = FB.createFaith(s, { id:'test_lineage', name:'The Lineage', group:'christian',
      properties:{ head:{ officeId:'lineage', title:'Keeper', holderKind:'character', succession:'hereditary' } } });
    const branch = FB.createFaith(s, { id:'test_lineage_branch', name:'The Branch', group:lineage,
      properties:{ head:{} } });
    const parent = FB.makeCharacter(s, { religion:lineage, culture:'frankish', born:s.date.year - 60 });
    const heir = FB.makeCharacter(s, { religion:branch, culture:'frankish', born:s.date.year - 25 });
    parent.childrenIds = [heir.id];
    const rng = FB.getRngState();
    const appointed = FB.succeedReligiousHead(s, faith);
    const first = FB.religiousHeadOf(s, faith).id;
    elder.dead = true;
    FB.religiousHeadCharacterDied(s, elder.id);
    const second = FB.religiousHeadOf(s, faith).id;
    FB.assignReligiousHead(s, lineage, parent.id);
    parent.dead = true;
    FB.religiousHeadCharacterDied(s, parent.id);
    const inherited = FB.religiousHeadOf(s, branch).id;
    const unchangedRng = rng === FB.getRngState();
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    return { appointed:appointed, first:first, expectedFirst:elder.id,
      second:second, expectedSecond:younger.id, inherited:inherited,
      heir:FB.religiousHeadOf(FB.state, lineage).id, expectedHeir:heir.id,
      singleOffice:Object.keys(FB.religiousOffices(FB.state)).filter(function (id) { return id === 'lineage'; }).length,
      listed:FB.political.offices(FB.state, { kind:'character', id:heir.id }).filter(function (row) { return row.ref.institutionId === 'religion:lineage'; }).length,
      unchangedRng:unchangedRng };
  });
  expect(result.appointed).toBe(true);
  expect(result.first).toBe(result.expectedFirst);
  expect(result.second).toBe(result.expectedSecond);
  expect(result.inherited).toBe(result.expectedHeir);
  expect(result.heir).toBe(result.expectedHeir);
  expect(result.singleOffice).toBe(1);
  expect(result.listed).toBe(1);
  expect(result.unchangedRng).toBe(true);
});

test('data-only caliphal claims charge authored balance keys without transferring land', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const faith = FB.createFaith(s, { id:'test_claim', name:'Claiming Faith', group:'sunni',
      properties:{ head:{ officeId:'claim_office', realm:'abbasid', claimCounties:[['london']],
        claim:{ prestige:'religiousHeadRestorePrestige', piety:'religiousHeadAbsolutionPiety',
          minRealm:'religiousHeadClaimMinRealm' }, greatHolyWar:null } } });
    me.religion = faith; me.sex = 'm';
    s.player.tier = 6; s.player.piety = 1000; s.player.prestige = 1000;
    s.realms.player = { id:'player', alive:true, religion:faith, capital:'london', liege:null, rank:3, ruler:{ sex:'m' } };
    s.player.provs = ['london','kent','essex','sussex','surrey','oxford'];
    s.player.provs.forEach(function (id) { s.owner[id] = 'player'; s.holder[id] = 'player'; });
    FB.ensureReligiousHeads(s);
    s.religiousHeads.claim_office = null;
    s.religiousHeadVacancies.claim_office = { turn:s.turn, formerHolder:'abbasid' };
    const owners = JSON.stringify(s.owner), gold = s.player.gold;
    const claimed = FB.succeedReligiousHead(s, faith, { holderId:'player' });
    return { claimed:claimed, holder:s.religiousHeads.claim_office, oldHolder:s.religiousHeads.sunni,
      piety:s.player.piety, prestige:s.player.prestige, goldUnchanged:gold === s.player.gold,
      landUnchanged:owners === JSON.stringify(s.owner) };
  });
  expect(result).toEqual({ claimed:true, holder:'player', oldHolder:'abbasid', piety:900,
    prestige:1000, goldUnchanged:true, landUnchanged:true });
});

test('succession war keeps its contested office and ends after conversion to another office', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const faith = FB.createFaith(s, { id:'test_war', name:'Contested Faith', group:'sunni',
      properties:{ head:{ officeId:'contested_office', realm:'abbasid', greatHolyWar:null } } });
    me.religion = faith; me.sex = 'm'; s.player.tier = 6;
    s.realms.player = { id:'player', alive:true, religion:faith, capital:'london', liege:null, rank:3, ruler:{ sex:'m' } };
    const cause = FB.caliphateWarCause(s);
    s.player.war = { enemy:cause.enemy, target:cause.target, casus:{ type:'caliphate', officeId:cause.officeId } };
    const officeFaith = FB.religiousHeadWarFaith(s);
    const owners = JSON.stringify(s.owner);
    // A fort must already be breached for warCapture, using the real fort's cap.
    const fort = FB.fortAt(s, cause.target);
    s.player.war.siege = 100000;
    s.player.war.siegeFortLevel = fort ? fort.level : 0;
    const captured = FB.warCapture(s);
    const wonOffice = s.religiousHeads.contested_office;
    s.religiousHeads.contested_office = 'abbasid';
    s.player.war = { enemy:cause.enemy, target:cause.target, seasons:0,
      casus:{ type:'caliphate', officeId:cause.officeId } };
    me.religion = 'sunni'; s.realms.player.religion = 'sunni';
    FB.playerWarTick(s);
    return { causeOffice:cause.officeId, faith:officeFaith, captured:captured, wonOffice:wonOffice,
      originalOffice:s.religiousHeads.sunni, landUnchanged:owners === JSON.stringify(s.owner),
      ended:s.player.war === null };
  });
  expect(result).toEqual({ causeOffice:'contested_office', faith:'test_war', captured:true,
    wonOffice:'player', originalOffice:'abbasid', landUnchanged:true, ended:true });
});

test('Papal absolution retains rank-scaled offerings and scoped sentence remedies', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId];
    const papacy = FB.ensurePapacy(s), oid = papacy.romanObedience;
    s.player.gold = 1000; s.player.piety = 1000;
    papacy.excommunications[oid + ':' + c.id] = { targetId:c.id, targetRealmId:'player',
      obedienceId:oid, cause:'penance', issuedTurn:s.turn, clearedTurn:null };
    FB.addTrait(c, 'excommunicated');
    const quote = FB.papalAbsolutionStatus(s, c.id);
    const absolved = FB.seekAbsolution(s);
    return { ready:quote.ready, offering:quote.offering, pietyCost:quote.piety,
      absolved:absolved, gold:s.player.gold, piety:s.player.piety,
      active:!!FB.excommunicationOf(s, c.id, oid) };
  });
  expect(result).toEqual({ ready:true, offering:50, pietyCost:100, absolved:true,
    gold:950, piety:900, active:false });
});

test('faith properties inherit and explicit overrides control traditions without named faith checks', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const faith = FB.createFaith(s, { id:'test_properties', name:'Property Faith', group:'christian',
      properties:{ head:null, legalTradition:'muslim', tournamentTradition:'furusiyya',
        holyWarTradition:'sacred', raidingTradition:true, music:{ lineage:['muslim'], fallback:'muslim' } } });
    const child = FB.createFaith(s, { id:'test_property_child', name:'Property Child', group:faith,
      properties:{ raidingTradition:false, attire:{ covers:{ m:'turban' } } } });
    me.religion = faith;
    s.realms.player = { id:'player', alive:true, religion:faith, capital:'london', liege:null, rank:3, ruler:{ sex:me.sex } };
    const target = FB.makeCharacter(s, { religion:faith, culture:'frankish', born:s.date.year - 30 });
    const legal = FB.justicePunishmentProjection(s, me.id, target.id, 'imprisonment').form;
    const hearing = FB.intrigueSentenceProjection(s, {
      authority:'player', targetId:target.id, accusedId:me.id, severity:4, evidence:'certain'
    });
    return { legal:FB.faithValue(s, child, 'legalTradition').value,
      justice:legal, intrigue:hearing.form,
      programme:FB.tournaments.defaultProgramme(s, me.id),
      war:FB.holyWarCampaignType(s, child), raid:FB.hasFaithRaidingTradition(faith, s),
      noRaid:FB.hasFaithRaidingTradition(child, s), cover:FB.faithValue(s, child, 'attire.covers.m').value,
      music:FB.music.resolveBank(s).faith,
      review:FBDATA.techImpactReviews.features.religious_head_appointment.mode };
  });
  expect(result).toEqual({ legal:'muslim', justice:'muslim', intrigue:'muslim', programme:'mounted', war:'sacred', raid:true,
    noRaid:false, cover:'turban', music:'muslim', review:'none' });
});

test('office schema rejects unknown strategies, holder kinds, seats and balance references', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    return [ { succession:'missing_strategy' }, { holderKind:'court' }, { seat:42 }, { title:42 },
      { claim:{ piety:'missing_balance_key' } },
      { holderKind:'character', succession:'caliphal_claim' } ].map(function (head, i) {
      return FB.createFaith(s, { id:'invalid_office_' + i, name:'Invalid Office', group:'sunni',
        properties:{ head:head } });
    });
  });
  expect(result).toEqual([null,null,null,null,null,null]);
});

test('a vacant appointment office waits for recovery without changing the RNG', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const faith = FB.createFaith(s, { id:'test_recovery', name:'Recovered Chapter', group:'christian',
      properties:{ head:{ officeId:'recovered_chapter', title:'Elder', holderKind:'character', succession:'appointment' } } });
    const candidate = FB.makeCharacter(s, { religion:faith, culture:'frankish', born:s.date.year - 40 });
    FB.ensureReligiousHeads(s);
    const vacancyTurn = s.religiousHeadVacancies.recovered_chapter.turn;
    const wait = FBDATA.balance.religiousHeadVacancyDays;
    const rng = FB.getRngState();
    s.turn = vacancyTurn + wait - 1;
    FB.religiousHeadRecoveryTick(s);
    const early = s.religiousHeads.recovered_chapter;
    s.turn++;
    FB.religiousHeadRecoveryTick(s);
    return { early:early, recovered:s.religiousHeads.recovered_chapter,
      expected:candidate.id, noVacancy:!s.religiousHeadVacancies.recovered_chapter,
      unchangedRng:rng === FB.getRngState() };
  });
  expect(result.early).toBe(null);
  expect(result.recovered).toBe(result.expected);
  expect(result.noVacancy).toBe(true);
  expect(result.unchangedRng).toBe(true);
});

test('custom claim review shows the authored title and price and preserves state on cancel', async function ({ page }) {
  const before = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const faith = FB.createFaith(s, { id:'test_review', name:'Reviewed Faith', group:'sunni',
      properties:{ head:{ officeId:'reviewed_office', title:'First Keeper', realm:'abbasid',
        claimCounties:[['london']], claim:{ piety:'religiousHeadAbsolutionPiety' }, greatHolyWar:null } } });
    me.religion = faith; me.sex = 'm';
    s.player.tier = 6; s.player.piety = 1000; s.player.prestige = 1000;
    s.realms.player = { id:'player', alive:true, religion:faith, capital:'london', liege:null, rank:3, ruler:{ sex:'m' } };
    s.player.provs = ['london','kent','essex','sussex','surrey','oxford'];
    s.player.provs.forEach(function (id) { s.owner[id] = 'player'; s.holder[id] = 'player'; });
    FB.ensureReligiousHeads(s);
    s.religiousHeads.reviewed_office = null;
    s.religiousHeadVacancies.reviewed_office = { turn:s.turn, formerHolder:'abbasid' };
    const snapshot = JSON.stringify({ gold:s.player.gold, piety:s.player.piety, prestige:s.player.prestige, heads:s.religiousHeads, owner:s.owner });
    FB.ui.showReligiousHeadClaim(faith);
    return snapshot;
  });
  await expect(page.getByRole('heading', { name:'Claim the office of First Keeper?', exact:true })).toBeVisible();
  await expect(page.locator('[data-head-claim]')).toContainText('100 piety');
  await page.locator('#head-claim-cancel').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () {
    const s = FB.state;
    return JSON.stringify({ gold:s.player.gold, piety:s.player.piety, prestige:s.player.prestige, heads:s.religiousHeads, owner:s.owner });
  })).toBe(before);
  await page.evaluate(function () { FB.ui.showReligiousHeadClaim('test_review'); });
  await page.locator('#head-claim-confirm').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () {
    return { holder:FB.state.religiousHeads.reviewed_office, piety:FB.state.player.piety };
  })).toEqual({ holder:'player', piety:900 });
});

test('normal character death leaves a hereditary office vacant when it has no eligible heir', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const faith = FB.createFaith(s, { id:'test_last_keeper', name:'Last Keepers', group:'christian',
      properties:{ head:{ officeId:'last_keeper', title:'Keeper', holderKind:'character', succession:'hereditary' } } });
    const keeper = FB.makeCharacter(s, { religion:faith, culture:'frankish', born:s.date.year - 40 });
    FB.assignReligiousHead(s, faith, keeper.id);
    FB.killChar(s, keeper);
    const vacancy = FB.religiousHeadVacancy(s, faith);
    const turn = vacancy.turn;
    FB.religiousHeadCharacterDied(s, keeper.id);
    return { dead:keeper.dead, holder:FB.religiousHeadOf(s, faith),
      former:vacancy.formerHolder, expected:keeper.id,
      retainedTurn:turn === s.religiousHeadVacancies.last_keeper.turn };
  });
  expect(result.dead).toBe(true);
  expect(result.holder).toBe(null);
  expect(result.former).toBe(result.expected);
  expect(result.retainedTurn).toBe(true);
});

test('an explicit absolution removal disables inherited Papal remedies', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const faith = FB.createFaith(s, { id:'test_no_absolution', name:'Unpardoned Faith', group:'catholic',
      properties:{ head:{ absolution:null } } });
    me.religion = faith;
    const papacy = FB.ensurePapacy(s), oid = papacy.romanObedience;
    papacy.excommunications[oid + ':' + me.id] = { targetId:me.id, targetRealmId:'player',
      obedienceId:oid, cause:'penance', issuedTurn:s.turn, clearedTurn:null };
    FB.addTrait(me, 'excommunicated');
    s.player.gold = 1000; s.player.piety = 1000;
    return { available:FB.canSeekAbsolution(s), ready:FB.papalAbsolutionStatus(s, me.id).ready,
      paid:FB.seekAbsolution(s), gold:s.player.gold, piety:s.player.piety };
  });
  expect(result).toEqual({ available:false, ready:false, paid:false, gold:1000, piety:1000 });
});
