'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js', 'data/economy.js', 'data/events_peasant.js', 'data/technology.js', 'data/traits.js',
  'js/actions.js', 'js/economy.js', 'js/events.js', 'js/main.js', 'js/model.js',
  'js/lordships.js', 'js/world.js', 'js/treasury.js', 'js/save.js', 'js/technology.js',
  'js/messages.js', 'js/i18n.js', 'js/ui_misc.js', 'js/ui_modals.js', 'js/ui_panels.js',
  'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function accept(page, roleId) {
  return page.evaluate(function (id) {
    const s = FB.state, status = FB.householdServiceStatus(s, id);
    return FB.acceptHouseholdService(s, id, {charId:s.player.charId,
      employerId:status.patron && status.patron.id, serial:status.record ? status.record.serial : 0});
  }, roleId);
}

// Hold effective stats constant to distinguish role fit from traits' usual
// stat modifiers (and any starting equipment).
async function setServiceTraits(page, traits, skills) {
  await page.evaluate(function (args) {
    const s = FB.state, c = s.chars[s.player.charId];
    c.traits = args.traits;
    for (const key of Object.keys(args.skills)) {
      c.skills[key] = 100;
      c.skills[key] = args.skills[key] - (FB.skillSnapshot(s, c, key) - 100);
    }
  }, {traits:traits, skills:skills});
}

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state;
    FB.game.setPaused(true);
    FB.setPlayerTier(s, 0, {tenureFormationReason:'rank_change'});
    FB.getRole(s, 'lord', true);
    const c = s.chars[s.player.charId], patron = FB.householdServiceStatus(s).patron;
    c.born = s.date.year - 25;
    FB.adjustStanding(s, {kind:'character',id:patron.id}, -FB.standingOf(s, {kind:'character',id:patron.id}), 'fixture');
    s.eventQueue = []; s.slotDays = [];
  });
});

test('offers are read-only and accepting changes work without changing station, career or freedom', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    const initial = {rng:FB.getRngState(),uid:FB.getUidCounter(),gold:p.gold,turn:s.turn,
      people:Object.keys(s.chars).length,career:JSON.stringify(c.career),tenure:JSON.stringify(p.tenure)};
    FB.ui.showHouseholdService();
    const offer = FB.householdServiceStatus(s, 'helper');
    const readOnly = initial.rng === FB.getRngState() && initial.uid === FB.getUidCounter() &&
      initial.people === Object.keys(s.chars).length && !p.householdService && p.gold === initial.gold && s.turn === initial.turn;
    FB.ui.closeModal();
    const quote = {charId:p.charId,employerId:offer.patron.id,serial:0};
    const accepted = FB.acceptHouseholdService(s, 'helper', quote);
    const duplicate = FB.acceptHouseholdService(s, 'helper', quote);
    return {readOnly:readOnly,accepted:accepted,duplicate:duplicate,tier:p.tier,focus:p.focus,
      label:FB.focusLabel(s, FB.focusStatus(s, 'toil').action),
      careerSame:initial.career === JSON.stringify(c.career),tenureSame:initial.tenure === JSON.stringify(p.tenure),
      deed:FB.instantStatus(s, 'household_service').action.uiLabel(s),
      history:FB.lifeHistory(s, c.id).entries.some(function (e) { return e.msg.key === 'news.biography.appointment'; }),
      modes:['estate','commercial','military','learned'].map(function (id) { return FBDATA.techImpactReviews.features['household_' + id + '_service'].mode; }),
      validation:FB.validateTechnologyData(),actions:FB.validateActionData()};
  });
  expect(result).toMatchObject({readOnly:true,accepted:true,duplicate:false,tier:0,focus:'toil',
    careerSame:true,tenureSame:true,history:true,deed:'Review household service…',
    label:'Help on the lord’s estate',modes:['none','none','none','none'],validation:[],actions:[]});
});

test('only working days pay and advance service, with no duplicate daily payment or harvest bonus', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, r = p.householdService;
    const patron = {kind:'character',id:r.employerId};
    const standing = FB.standingOf(s, patron), gold = p.gold;
    const rid = FB.treasuryCharacterRealm(s, r.employerId);
    const treasury = rid && s.realms[rid].treasury;
    // Productive wages remain payable even when army arrears reserve the purse.
    if (treasury) treasury.militaryAccrued = treasury.gold + 100;
    const treasuryGold = treasury && treasury.gold;
    for (let day = 0; day < 90; day++) { s.turn++; FB.tickFocus(s); FB.tickFocus(s); }
    const afterWork = p.gold, worked = r.workedDays;
    p.focus = 'rest';
    for (let day = 0; day < 10; day++) { s.turn++; FB.tickFocus(s); }
    const paused = r.workedDays === worked && p.gold === afterWork;
    p.travel = {currentId:p.provinceId};
    p.focus = 'toil'; s.turn++; FB.tickFocus(s);
    const travelPaused = r.workedDays === worked;
    delete p.travel;
    p.flags.in_prison = true;
    const prisonPaused = !FB.tickHouseholdService(s);
    delete p.flags.in_prison;
    return {earned:afterWork - gold,worked:worked,paused:paused,travelPaused:travelPaused,prisonPaused:prisonPaused,
      experience:r.experience.helper,standing:FB.standingOf(s, patron) - standing,
      value:r.valueDelivered,treasuryGain:treasury ? treasury.gold - treasuryGold : null,
      relief:r.reliefUntil >= s.turn};
  });
  expect(result).toMatchObject({worked:90,experience:90,standing:2,paused:true,travelPaused:true,prisonPaused:true,relief:true});
  expect(result.earned).toBeCloseTo(2.5, 8);
  expect(result.value).toBeCloseTo(0.5, 8);
  if (result.treasuryGain !== null) expect(result.treasuryGain).toBeCloseTo(0.5, 8);
});

test('promotion requires actual predecessor experience, ability, literacy and Standing', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId], r = p.householdService;
    const def = FBDATA.householdServiceRoles.storekeeper;
    c.skills.ste = 12; c.skills.lea = 12; c.skills.dip = 12;
    FB.adjustStanding(s, {kind:'character',id:r.employerId}, 60, 'fixture');
    r.experience.helper = def.days - 1;
    const early = FB.householdServiceStatus(s, 'storekeeper').ready;
    s.turn++; FB.tickFocus(s);
    const offer = FB.householdServiceStatus(s, 'storekeeper');
    const promoted = FB.acceptHouseholdService(s, 'storekeeper', {charId:p.charId,employerId:r.employerId,serial:r.serial});
    const gold = p.gold;
    FB.tickFocus(s);
    const duplicate = p.gold === gold;
    r.experience.reeve = 720;
    c.traits = c.traits.filter(function (id) { return id !== 'literate'; });
    const unlettered = FB.householdServiceStatus(s, 'steward');
    FB.addTrait(c, 'literate');
    const lettered = FB.householdServiceStatus(s, 'steward').ready;
    const guardForWoman = FB.householdServiceStatus(s, 'watch').ready;
    c.sex = 'm'; c.skills.mar = 12;
    const guardForMan = FB.householdServiceStatus(s, 'watch').ready;
    const captainTooEarly = FB.householdServiceStatus(s, 'captain').ready;
    return {early:early,offer:offer.ready,promoted:promoted,duplicate:duplicate,unlettered:unlettered.ready,
      literacyReason:unlettered.missing.join(' '),lettered:lettered,guardForWoman:guardForWoman,guardForMan:guardForMan,
      captainTooEarly:captainTooEarly,tier:p.tier,label:FB.focusLabel(s, FB.focusStatus(s, 'toil').action)};
  });
  expect(result).toMatchObject({early:false,offer:true,promoted:true,duplicate:true,unlettered:false,lettered:true,
    guardForWoman:false,guardForMan:true,captainTooEarly:false,tier:0,label:'Tend the household stores'});
  expect(result.literacyReason).toContain('Lettered');
});

test('traits distinguish equally skilled applicants across all four service paths', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  await page.evaluate(function () {
    const s = FB.state, r = s.player.householdService;
    s.chars[s.player.charId].sex = 'm';
    r.experience.helper = 90;
    r.experience.carrier = 180;
    FB.adjustStanding(s, {kind:'character',id:r.employerId}, 80, 'fixture');
  });
  const cases = [
    {role:'storekeeper', good:'honest', bad:'deceitful', skill:'ste'},
    {role:'tally', good:'patient', bad:'wrathful', skill:'lea'},
    {role:'buyer', good:'roadwise', bad:'greedy', skill:'ste'},
    {role:'watch', good:'brave', bad:'craven', skill:'mar'}
  ];
  for (const row of cases) {
    const skills = {ste:20,lea:20,dip:20,mar:20};
    skills[row.skill] = 3;
    await setServiceTraits(page, [], skills);
    expect(await page.evaluate(function (id) {
      return FB.householdServiceStatus(FB.state, id).ready;
    }, row.role)).toBe(false);
    await setServiceTraits(page, [row.good], skills);
    const helpful = await page.evaluate(function (args) {
      const s = FB.state, status = FB.householdServiceStatus(s, args.role);
      return {ready:status.ready, bonus:status.qualification.traitBonus,
        check:status.qualification.skills.filter(function (check) { return check.id === args.skill; })[0]};
    }, row);
    expect(helpful).toEqual({ready:true,bonus:1,
      check:{id:row.skill,value:3,total:4,required:4,met:true}});
    // Poor suitability can block an applicant who meets the ordinary stat minimum.
    skills[row.skill] = 4;
    await setServiceTraits(page, [row.bad], skills);
    const harmful = await page.evaluate(function (id) {
      const status = FB.householdServiceStatus(FB.state, id);
      return {ready:status.ready,bonus:status.qualification.traitBonus,missing:status.missing};
    }, row.role);
    expect(harmful.ready).toBe(false);
    expect(harmful.bonus).toBe(-1);
    expect(harmful.missing.join(' ')).toContain('after trait fit; current 3');
    expect(await accept(page, row.role)).toBe(false);
    skills[row.skill] = 3;
    await setServiceTraits(page, [row.good], skills);
    expect(await accept(page, row.role)).toBe(true);
  }
});

test('trait fit is bounded, role-specific, read-only and leaves basic entry work open', async function ({ page }) {
  const skills = {ste:20,lea:20,dip:20,mar:20};
  await setServiceTraits(page, ['brave','veteran','muster_bred'], skills);
  const positive = await page.evaluate(function () {
    return FB.householdServiceStatus(FB.state, 'captain').qualification;
  });
  expect(positive.traitBonus).toBe(2);
  expect(positive.traits).toHaveLength(3);
  expect(positive.skills[0]).toMatchObject({id:'mar',value:20,total:22});
  await setServiceTraits(page, ['greedy','deceitful','drunkard'], {ste:1,lea:1,dip:1,mar:1});
  const negative = await page.evaluate(function () {
    const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const fit = FB.householdServiceStatus(s, 'storekeeper').qualification;
    const repeated = FB.householdServiceStatus(s, 'storekeeper').qualification;
    const helper = FB.householdServiceStatus(s, 'helper');
    const carrier = FB.householdServiceStatus(s, 'carrier');
    return {fit:fit,repeated:repeated,helper:helper.ready,carrier:carrier.ready,
      helperSkills:helper.qualification.skills,carrierSkills:carrier.qualification.skills,
      unchanged:JSON.stringify(s) === before && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(negative.fit.traitBonus).toBe(-2);
  expect(negative.fit.skills[0]).toMatchObject({value:1,total:0,met:false});
  expect(negative.repeated).toEqual(negative.fit);
  expect(negative).toMatchObject({helper:true,carrier:true,helperSkills:[],carrierSkills:[],unchanged:true});
  await setServiceTraits(page, ['kind','patient','hearth_steady','literate'], skills);
  const tutoring = await page.evaluate(function () {
    const s = FB.state;
    return {tutor:FB.householdServiceStatus(s, 'tutor').qualification.traitBonus,
      watch:FB.householdServiceStatus(s, 'watch').qualification.traitBonus};
  });
  expect(tutoring).toEqual({tutor:2,watch:0});
  await setServiceTraits(page, ['cruel'], skills);
  expect(await page.evaluate(function () {
    return FB.householdServiceStatus(FB.state, 'tutor').qualification.traitBonus;
  })).toBe(-2);
  await setServiceTraits(page, ['honest','honest'], skills);
  expect(await page.evaluate(function () {
    return FB.householdServiceStatus(FB.state, 'storekeeper').qualification.traitBonus;
  })).toBe(1);
});

test('favorable traits preserve experience, Standing, literacy and military gates', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  await setServiceTraits(page, ['honest','patient','rent_shrewd'], {ste:20,lea:20,dip:20,mar:20});
  const gates = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], r = s.player.householdService;
    const first = FB.householdServiceStatus(s, 'steward');
    r.experience.reeve = 720;
    FB.adjustStanding(s, {kind:'character',id:r.employerId}, 60, 'fixture');
    const unlettered = FB.householdServiceStatus(s, 'steward');
    FB.addTrait(c, 'literate');
    const lettered = FB.householdServiceStatus(s, 'steward').ready;
    c.traits = ['brave','veteran','muster_bred'];
    c.sex = 'f';
    const military = FB.householdServiceStatus(s, 'watch');
    return {bonus:first.qualification.traitBonus,first:first.missing,
      unlettered:unlettered.ready,lettered:lettered,military:military.ready,
      militaryReason:military.missing.join(' ')};
  });
  expect(gates).toMatchObject({bonus:2,unlettered:false,lettered:true,military:false});
  expect(gates.first.join(' ')).toContain('Requires 720 working days');
  expect(gates.first.join(' ')).toContain('Requires 40 Standing');
  expect(gates.first.join(' ')).toContain('Requires Lettered');
  expect(gates.militaryReason).toContain('available to men');
});

test('acceptance rechecks trait fit while an existing appointment keeps paying after traits change', async function ({ page }) {
  await setServiceTraits(page, ['patient'], {lea:3});
  const quote = await page.evaluate(function () {
    const s = FB.state, offer = FB.householdServiceStatus(s, 'tally');
    return {charId:s.player.charId,employerId:offer.patron.id,serial:0};
  });
  await setServiceTraits(page, [], {lea:3});
  const stale = await page.evaluate(function (expected) {
    const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState();
    const accepted = FB.acceptHouseholdService(s, 'tally', expected);
    return {accepted:accepted,unchanged:before === JSON.stringify(s) && rng === FB.getRngState()};
  }, quote);
  expect(stale).toEqual({accepted:false,unchanged:true});
  await setServiceTraits(page, ['patient'], {lea:3});
  expect(await accept(page, 'tally')).toBe(true);
  await setServiceTraits(page, ['wrathful'], {lea:4});
  const employed = await page.evaluate(function () {
    const s = FB.state, r = s.player.householdService, gold = s.player.gold;
    FB.householdServiceDay(s);
    const ready = FB.householdServiceStatus(s).workReady;
    s.turn++;
    const worked = FB.tickHouseholdService(s);
    return {ready:ready,worked:worked,status:r.status,days:r.workedDays,pay:s.player.gold - gold,
      fit:FB.householdServiceStatus(s, 'tally').qualification.traitBonus,
      savedFit:Object.prototype.hasOwnProperty.call(r, 'qualification')};
  });
  expect(employed).toMatchObject({ready:true,worked:true,status:'active',days:1,fit:-1,savedFit:false});
  expect(employed.pay).toBeCloseTo(2.5 / 90, 8);
});

test('tally work teaches literacy after completed service without changing profession or granting a license', async function ({ page }) {
  await page.evaluate(function () { FB.state.chars[FB.state.player.charId].skills.lea = 10; });
  expect(await accept(page, 'tally')).toBe(true);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId], r = p.householdService;
    c.traits = c.traits.filter(function (id) { return id !== 'literate'; });
    r.learnedDays = 719;
    p.focus = 'rest'; s.turn++; FB.tickFocus(s);
    const paused = c.traits.indexOf('literate') < 0;
    p.focus = 'toil'; s.turn++; FB.tickFocus(s);
    return {paused:paused,lettered:c.traits.indexOf('literate') >= 0,days:r.learnedDays,profession:p.profession,tier:p.tier};
  });
  expect(result).toEqual({paused:true,lettered:true,days:720,profession:'farmer',tier:0});
});

test('completed service covers one ordinary labor duty but never tax or commutation', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  const result = await page.evaluate(function () {
    const s = FB.state, r = s.player.householdService, tenure = FB.activeSerfTenure(s);
    const labor = tenure.duties.find(function (d) { return d.id === 'week_work'; });
    tenure.duties.forEach(function (d) { d.nextDueTurn = s.turn + 1000; });
    tenure.conditional = []; tenure.nextWarCheckTurn = s.turn + 1000;
    tenure.lastPresentedSeasonKey = null;
    labor.nextDueTurn = s.turn;
    FB.refreshSerfTenureDueCache(s, tenure);
    const beforeTerm = FB.householdServiceCoversDuty(s, labor);
    r.workedDays = 89; s.turn++; FB.tickFocus(s);
    const gold = s.player.gold;
    FB.tenureDay(s);
    const discharged = labor.nextDueTurn > s.turn && r.reliefUntil === -1 && !s.eventQueue.length;
    const second = FB.householdServiceCoversDuty(s, labor);
    r.reliefUntil = s.turn + 180;
    const tax = tenure.duties.find(function (d) { return d.id === 'tithe_sheaf'; });
    tax.nextDueTurn = s.turn; FB.refreshSerfTenureDueCache(s, tenure); FB.tenureDay(s);
    const taxQueued = s.eventQueue.some(function (e) { return e.ctx && e.ctx.dutyId === tax.id; });
    const taxNotCovered = !FB.householdServiceCoversDuty(s, tax);
    labor.commutationGold = 2;
    const commutationNotCovered = !FB.householdServiceCoversDuty(s, labor);
    return {beforeTerm:beforeTerm,discharged:discharged,second:second,taxQueued:taxQueued,
      taxNotCovered:taxNotCovered,commutationNotCovered:commutationNotCovered,noCashCharge:s.player.gold === gold};
  });
  expect(result).toEqual({beforeTerm:false,discharged:true,second:false,taxQueued:true,taxNotCovered:true,
    commutationNotCovered:true,noCashCharge:true});
});

test('all service paths advance through earned offices without granting their retainer bonuses', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    c.sex = 'm';
    ['lea','dip','ste','mar'].forEach(function (key) { c.skills[key] = 20; });
    FB.addTrait(c, 'literate');
    const patron = FB.householdServiceStatus(s).patron;
    FB.adjustStanding(s, {kind:'character',id:patron.id}, 80, 'fixture');
    const jobs = ['helper','storekeeper','reeve','steward','carrier','buyer','factor','watch','guard','sergeant','captain','tally','clerk','tutor'];
    const rows = [];
    function bonuses() { return ['gold','enterprise','retinue','tax'].map(function (key) { return FB.positionBonus(s, key); }); }
    const beforeBonuses = JSON.stringify(bonuses());
    jobs.forEach(function (id) {
      const def = FBDATA.householdServiceRoles[id];
      let r = FB.householdServiceRecord(s);
      if (def.previous) r.experience[def.previous] = def.days;
      const status = FB.householdServiceStatus(s, id);
      rows.push(FB.acceptHouseholdService(s, id, {charId:c.id,employerId:patron.id,serial:r ? r.serial : 0}));
    });
    return {accepted:rows,role:p.householdService.roleId,tier:p.tier,profession:p.profession,
      noBonuses:beforeBonuses === JSON.stringify(bonuses())};
  });
  expect(result.accepted).toEqual(Array(14).fill(true));
  expect(result).toMatchObject({role:'tutor',tier:0,profession:'farmer',noBonuses:true});
});

test('tutoring develops a patron child without changing adult children or creating a new household roster', async function ({ page }) {
  await page.evaluate(function () { FB.state.chars[FB.state.player.charId].skills.lea = 10; });
  expect(await accept(page, 'tally')).toBe(true);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId], r = p.householdService;
    ['lea','dip','ste'].forEach(function (key) { c.skills[key] = 20; });
    FB.addTrait(c, 'literate');
    r.experience.clerk = 720;
    FB.adjustStanding(s, {kind:'character',id:r.employerId}, 60, 'fixture');
    FB.acceptHouseholdService(s, 'tutor', {charId:c.id,employerId:r.employerId,serial:r.serial});
    const patron = s.chars[r.employerId];
    const young = FB.makeCharacter(s, {name:'Young pupil',sex:'m',born:s.date.year - 8,culture:patron.culture,religion:patron.religion,traitsN:0});
    const adult = FB.makeCharacter(s, {name:'Adult child',sex:'f',born:s.date.year - 20,culture:patron.culture,religion:patron.religion,traitsN:0});
    young.skills.lea = 0; adult.skills.lea = 0;
    patron.childrenIds = [adult.id,young.id];
    const count = Object.keys(s.chars).length;
    for (let day = 0; day < 1800; day++) { s.turn++; FB.tickHouseholdService(s); }
    return {learning:young.skills.lea,adult:adult.skills.lea,people:Object.keys(s.chars).length,count:count};
  });
  expect(result.learning).toBeGreaterThan(0);
  expect(result.learning).toBeLessThanOrEqual(20);
  expect(result.adult).toBe(0);
  expect(result.people).toBe(result.count);
});

test('an open household case permits review but blocks spending a service deed day', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  await page.evaluate(function () {
    const s = FB.state;
    s.player.householdService.workedDays = 180;
    FB.householdServiceDay(s);
    const queued = s.eventQueue.splice(0);
    FB.ui.runEvents(queued);
    FB.ui.showHouseholdService();
  });
  await page.locator('#service-leave').click();
  await expect(page.locator('#service-confirm')).toBeDisabled();
  await expect(page.locator('#gm-body')).toContainText('Resolve the current event');
  expect(await page.evaluate(function () { return FB.state.player.householdService.status; })).toBe('active');
});

test('household cases bind to one appointment and resume after temporary absence', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  const result = await page.evaluate(function () {
    const s = FB.state, r = s.player.householdService;
    r.workedDays = 180;
    FB.householdServiceDay(s); FB.householdServiceDay(s);
    const queue = s.eventQueue.filter(function (e) { return e.id === 'household_service_duty'; });
    const ctx = queue[0].ctx, ev = FB.eventById(queue[0].id);
    const valid = FB.eventContextStillValid(s, ev, ctx);
    const before = FB.countyPopularSupport(s, s.player.provinceId);
    const preview = FB.previewEventOption(s, ev, ev.options[1], ctx);
    s.player.travel = {currentId:s.player.provinceId};
    const awayInvalid = !FB.eventContextStillValid(s, ev, ctx);
    s.eventQueue = []; FB.householdServiceDay(s);
    const noAwayCase = !s.eventQueue.length;
    delete s.player.travel;
    FB.householdServiceDay(s);
    const restored = s.eventQueue[0].ctx.serviceCase === ctx.serviceCase;
    const outcome = FB.fns.household_service_kind(s, ctx);
    const duplicate = FB.fns.household_service_kind(s, ctx);
    const after = FB.countyPopularSupport(s, s.player.provinceId);
    return {count:queue.length,valid:valid,awayInvalid:awayInvalid,noAwayCase:noAwayCase,restored:restored,
      outcome:outcome,duplicate:duplicate,gain:after - before,preview:JSON.stringify(preview),pending:r.pending};
  });
  expect(result).toMatchObject({count:1,valid:true,awayInvalid:true,noAwayCase:true,restored:true,
    outcome:true,duplicate:false,gain:3,pending:null});
  expect(result.preview).toContain('commonVoice');
});

test('a new ruler requires explicit renewal and a stale offer cannot appoint under the replacement', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  const result = await page.evaluate(function () {
    const s = FB.state, r = s.player.householdService;
    const old = {charId:s.player.charId,employerId:r.employerId,serial:r.serial};
    r.workedDays = 180; FB.householdServiceDay(s);
    const ctx = s.eventQueue.find(function (e) { return e.id === 'household_service_duty'; }).ctx;
    const rid = FB.homeCountyAuthority(s).realmId;
    FB.advanceRealmSuccession(s, rid);
    const patron = FB.householdServiceStatus(s, 'helper').patron;
    FB.adjustStanding(s, {kind:'character',id:patron.id}, -FB.standingOf(s, {kind:'character',id:patron.id}), 'fixture');
    FB.householdServiceDay(s);
    const suspended = r.status === 'review', gold = s.player.gold;
    const paid = FB.tickHouseholdService(s);
    const stale = FB.acceptHouseholdService(s, 'helper', old);
    const oldCase = FB.fns.household_service_careful(s, ctx);
    const offer = FB.householdServiceStatus(s, 'helper');
    const renewed = FB.acceptHouseholdService(s, 'helper', {charId:s.player.charId,employerId:patron.id,serial:r.serial});
    return {suspended:suspended,paid:paid,stale:stale,oldCase:oldCase,renewal:offer.renewal,renewed:renewed,
      noWindfall:s.player.gold === gold,newPatron:r.employerId !== old.employerId,worked:r.workedDays};
  });
  expect(result).toEqual({suspended:true,paid:false,stale:false,oldCase:false,renewal:true,renewed:true,
    noWindfall:true,newPatron:true,worked:180});
});

test('dismissal and landed rank stop earnings, and legacy saves acquire no employment record', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  const result = await page.evaluate(function () {
    const s = FB.state, r = s.player.householdService;
    const patron = {kind:'character',id:r.employerId};
    FB.adjustStanding(s, patron, -40 - FB.standingOf(s, patron), 'fixture');
    FB.householdServiceDay(s);
    const dismissed = r.status === 'ended' && r.reason === 'dismissed';
    const noDismissedPay = !FB.tickHouseholdService(s);
    FB.adjustStanding(s, patron, 40, 'fixture');
    FB.acceptHouseholdService(s, 'helper', {charId:s.player.charId,employerId:r.employerId,serial:r.serial});
    FB.setPlayerTier(s, 3);
    FB.householdServiceDay(s);
    const landed = r.status === 'ended' && !FB.tickHouseholdService(s);
    delete s.player.householdService;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const legacy = !FB.state.player.householdService;
    return {dismissed:dismissed,noDismissedPay:noDismissedPay,landed:landed,legacy:legacy};
  });
  expect(result).toEqual({dismissed:true,noDismissedPay:true,landed:true,legacy:true});
});

test('save repair keeps bounded experience, while retirement and relocation end personal service', async function ({ page }) {
  expect(await accept(page, 'helper')).toBe(true);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const oldId = s.player.charId;
    s.player.householdService.experience.helper = 42;
    s.player.householdService.experience.unknown_role = 9000;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    s = FB.state;
    const restored = s.player.householdService.experience;
    const noProse = JSON.stringify(s.player.householdService).indexOf('Household') < 0;
    s.player.homeSettlement = (s.player.homeSettlement || 0) + 1;
    FB.householdServiceDay(s);
    const moved = s.player.householdService.status === 'ended';
    s.player.homeSettlement--;
    const status = FB.householdServiceStatus(s, 'helper');
    FB.acceptHouseholdService(s, 'helper', {charId:oldId,employerId:status.patron.id,serial:status.record.serial});
    const me = s.chars[oldId]; me.born = s.date.year - 55;
    const child = FB.makeCharacter(s, {name:'Service heir',sex:'m',born:s.date.year - 20,
      dyn:me.dyn,culture:me.culture,religion:me.religion,traitsN:0});
    child.motherId = me.id; me.childrenIds.push(child.id); FB.touchFamily();
    const retired = FB.game.retireTo(child.id);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {restored:restored,noProse:noProse,moved:moved,retired:retired,
      heir:FB.state.player.charId === child.id,noJob:!FB.state.player.householdService,
      oldHistory:FB.lifeHistory(FB.state, oldId).entries.some(function (e) { return e.msg.key === 'news.biography.appointment'; })};
  });
  expect(result).toEqual({restored:{helper:42},noProse:true,moved:true,retired:true,heir:true,noJob:true,oldHistory:true});
});

for (const width of [1280, 390]) {
  test('service trait breakdown and stale review retain navigation at width ' + width, async function ({ page }) {
    await page.setViewportSize({width:width,height:720});
    expect(await accept(page, 'helper')).toBe(true);
    await setServiceTraits(page, ['honest'], {ste:3});
    const turn = await page.evaluate(function () {
      const s = FB.state, r = s.player.householdService;
      r.experience.helper = 90;
      FB.adjustStanding(s, {kind:'character',id:r.employerId}, 20, 'fixture');
      FB.ui.showHouseholdService();
      return s.turn;
    });
    const review = page.locator('#service-review-storekeeper');
    const info = page.locator('[aria-controls="service-details-storekeeper"]');
    if (width < 1100) await info.click();
    const details = page.locator('#service-details-storekeeper');
    await expect(details).toContainText('Honest +1');
    await expect(details).toContainText('4 / 4 required (skill 3, trait fit +1)');
    await expect(review.locator('.large-list-face-state')).toHaveText('Available');
    await review.scrollIntoViewIfNeeded();
    const scroll = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    await review.focus();
    await page.keyboard.press('Enter');
    const fit = page.locator('[data-service-review-sheet] [data-service-qualification]');
    await expect(fit).toBeVisible();
    await expect(fit).toContainText('Honest +1');
    await expect(fit).toContainText('4 / 4 required (skill 3, trait fit +1)');
    await expect(page.locator('#service-confirm')).toBeEnabled();
    await expect(page.locator('#gm-title-details')).toContainText('at most 2 points either way');
    // A changed trait must invalidate the rendered offer before a day is spent.
    await setServiceTraits(page, ['deceitful'], {ste:3});
    await page.locator('#service-confirm').click();
    await expect(page.locator('#service-confirm')).toBeDisabled();
    await expect(fit).toContainText('Deceitful -1');
    await expect(fit).toContainText('2 / 4 required (skill 3, trait fit -1)');
    await expect(page.locator('.service-requirements')).toContainText(
      'Requires Stewardship 4 after trait fit; current 2.');
    expect(await page.evaluate(function () {
      return {turn:FB.state.turn,role:FB.state.player.householdService.roleId};
    })).toEqual({turn:turn,role:'helper'});
    expect(await page.locator('#gm-body').evaluate(function (el) {
      return el.scrollWidth > el.clientWidth + 1;
    })).toBe(false);
    await page.locator('#service-cancel').click();
    await expect(review).toBeFocused();
    await expect(review).toContainText('Requires Stewardship 4 after trait fit; current 2.');
    if (width < 1100) await expect(info).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(function () {
      return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    }).toBe(scroll);
    await review.click();
    await page.keyboard.press('Escape');
    await expect(review).toBeFocused();
  });

  test('service review retains list details, scroll and focus at width ' + width, async function ({ page }) {
    await page.setViewportSize({width:width,height:720});
    await page.evaluate(function () { FB.ui.showHouseholdService(); });
    // Desktop pointers read card Details through the hover tooltip; compact layouts use the ? control.
    const compact = width < 1100;
    const info = page.locator('[aria-controls="service-details-captain"]');
    if (compact) await info.click();
    const review = page.locator('#service-review-captain');
    await review.scrollIntoViewIfNeeded();
    const scroll = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    await review.click();
    await expect(page.locator('#service-confirm')).toBeDisabled();
    await expect(page.locator('#gm-body')).toContainText('Requires 1080 working days');
    await page.locator('#service-cancel').click();
    await expect(review).toBeFocused();
    if (compact) await expect(info).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(function () { return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; }); }).toBe(scroll);
    await review.click();
    await page.keyboard.press('Escape');
    await expect(review).toBeFocused();
    if (compact) await expect(info).toHaveAttribute('aria-expanded', 'true');
    const overflow = await page.locator('#gm-body').evaluate(function (el) { return el.scrollWidth > el.clientWidth + 1; });
    expect(overflow).toBe(false);
  });
}

test('accept and leave reviews charge one day and update the focus and character controls', async function ({ page }) {
  const turn = await page.evaluate(function () {
    const s = FB.state;
    const tenure = FB.activeSerfTenure(s);
    tenure.duties.forEach(function (d) { d.nextDueTurn = s.turn + 1000; });
    FB.refreshSerfTenureDueCache(s, tenure);
    FB.runInstant(s, 'household_service');
    return s.turn;
  });
  await page.locator('#service-review-helper').click();
  await page.locator('#service-confirm').click();
  expect(await page.evaluate(function () {
    const s = FB.state;
    return {turn:s.turn,role:s.player.householdService.roleId,worked:s.player.householdService.workedDays,focus:s.player.focus};
  })).toEqual({turn:turn + 1,role:'helper',worked:0,focus:'toil'});
  await page.evaluate(function () { FB.ui.showTab('char'); });
  await expect(page.locator('#self-service')).toContainText('Estate Assistant');
  await page.locator('#self-service').click();
  await page.locator('#service-patron').click();
  await expect(page.locator('#cm-household-service')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#service-patron')).toBeFocused();
  await page.locator('#service-close').click();
  await page.evaluate(function () { FB.ui.showTab('network'); });
  // Network shortcuts can be folded; the entry is still wired in the retained panel.
  await page.locator('#network-service').evaluate(function (button) { button.click(); });
  await page.locator('#service-leave').click();
  await page.locator('#service-cancel').click();
  await expect(page.locator('#service-leave')).toBeFocused();
  expect(await page.evaluate(function () { return FB.state.player.householdService.status; })).toBe('active');
  await page.locator('#service-leave').click();
  await page.locator('#service-confirm').click();
  expect(await page.evaluate(function () {
    const s = FB.state;
    return {turn:s.turn,status:s.player.householdService.status,
      label:FB.focusLabel(s, FB.focusStatus(s, s.player.focus).action)};
  })).toMatchObject({turn:turn + 2,status:'ended',label:'Work the fields'});
});

test('service list and review keep portraits, pay and blockers on the face with rules behind Details', async function ({ page }) {
  await page.setViewportSize({width:390,height:844});
  const expected = await page.evaluate(function () {
    const s = FB.state;
    FB.ui.showHouseholdService();
    return {pay:FB.T('{money:pay} per 90 working days', {pay:FBDATA.householdServiceRoles.captain.wage}),
      blocker:FB.householdServiceStatus(s, 'captain').missing[0],
      missing:FB.householdServiceStatus(s, 'captain').missing.length};
  });
  await expect(page.locator('#service-patron canvas.pface')).toHaveCount(1);
  await expect(page.locator('[data-list-section^="service-path-"]')).toHaveCount(4);
  const captain = page.locator('#service-review-captain');
  await expect(captain).toContainText(expected.pay);
  await expect(captain).toContainText(expected.blocker);
  await expect(captain.locator('.large-list-face-state')).toHaveText('Unavailable');
  await expect(page.locator('#service-details-captain')).toBeHidden();
  await expect(page.locator('#gm-title-details')).toBeHidden();
  await expect(page.locator('#gm-title-details')).toContainText('Travel, captivity and campaigning pause service.');
  await page.locator('[data-list-filter="available"]').click();
  await expect(captain).toBeHidden();
  await expect(page.locator('#service-review-helper')).toBeVisible();
  await page.locator('[data-list-filter="all"]').click();
  await captain.click();
  await expect(page.locator('[data-service-review-sheet] .review-people canvas.pface')).toHaveCount(1);
  await expect(page.locator('.service-requirements li')).toHaveCount(expected.missing);
  await expect(page.locator('#service-confirm')).toBeDisabled();
  await expect(page.locator('.modal-action-card[tabindex="0"]')).toHaveCount(1);
  await page.locator('#service-cancel').click();
  await page.locator('#service-review-helper').click();
  await expect(page.locator('#service-confirm')).toBeEnabled();
  await expect(page.locator('#service-confirm')).toContainText('Takes 1 day');
  await expect(page.locator('[data-service-review-sheet] .kv').first()).toContainText('Pay');
  await expect(page.locator('.service-requirements')).toHaveCount(0);
});

for (const width of [390, 690]) {
  test('service role state labels never split a word at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:800 });
    await page.evaluate(function () { FB.ui.showHouseholdService(); });
    const labels = await page.locator('.large-list-face-state').evaluateAll(function (nodes) {
      return nodes.map(function (node) {
        // Each word must render on a single line box.
        const text = node.firstChild;
        const words = [];
        const re = /\S+/g;
        let match;
        while ((match = re.exec(text.textContent))) {
          const range = document.createRange();
          range.setStart(text, match.index);
          range.setEnd(text, match.index + match[0].length);
          const tops = Array.from(range.getClientRects()).map(function (r) { return Math.round(r.top); });
          words.push(new Set(tops).size);
        }
        return { text:node.textContent, split:words.some(function (lines) { return lines > 1; }) };
      });
    });
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.filter(function (label) { return label.split; })).toEqual([]);
  });
}
