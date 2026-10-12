'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startHistoricalGame } = require('../support/game/historical-start');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/religious_activities.js', 'data/religious_institutions.js',
  'data/travel.js', 'data/events_travel.js', 'data/cultures.js', 'data/technology.js',
  'data/economy.js', 'data/political_institutions.js', 'data/systems.js',
  'js/religious_activities.js', 'js/religious_institutions.js', 'js/travel.js',
  'js/events.js', 'js/abbeys.js', 'js/population.js', 'js/treasury.js', 'js/mods.js',
  'js/main.js', 'js/actions.js', 'js/model.js', 'js/authority.js', 'js/institutions.js',
  'js/religion.js', 'js/settlement.js', 'js/justice.js', 'js/intrigue.js',
  'js/save.js', 'js/save_v4.js', 'js/economy.js', 'js/market.js', 'js/systems.js',
  'data/actions.js', 'js/ui_religious_activities.js', 'js/ui_misc.js', 'js/ui_modals.js',
  'js/items.js', 'js/world.js', 'js/wars.js', 'css/style.css'
]);

function installActivities() {
  var s = FB.state, c = s.chars[s.player.charId], pid = s.player.provinceId;
  FB.game.setPaused(true);
  c.born = s.date.year - 30; c.health = 8; c.religion = 'catholic'; c.skills.int = 4;
  s.player.gold = 500; s.player.piety = 10; s.player.prestige = 0;
  s.player.travel = null; s.player.travelHistory = []; s.player.cooldowns = {};
  c.traits = c.traits.filter(function (id) { return id !== 'pilgrim'; });
  FB.setPlayerTier(s, 1, { stationFarewell:false });
  s.player.manor = null; s.player.landPlotMigration = 1;
  s.player.landPlots = [{ provinceId:pid, settlement:0 }, { provinceId:pid, settlement:0 }];
  FBDATA.religiousInstitutionProfiles.test_activity_school = {
    name:'Fictional local school', faithIds:[c.religion], period:{ yearMin:1, yearMax:null }, system:null,
    roles:{ learner:{ name:'Learner', minAge:16, sexes:[], unmarried:false, professions:[], skills:{}, affiliationId:null } },
    selection:null, recognition:null, actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  };
  var defs = Object.assign({}, FB.campaignBookmark(s).localInstitutions || {});
  defs.test_activity_school = { city:'Fictional local school', kind:'school', provinceId:pid,
    site:FB.world.sitesByProv[pid].list[0].site, religion:c.religion, culture:c.culture,
    profileId:'test_activity_school', vacant:true, jurisdictionIds:[pid], abbeyId:'activity_school_property' };
  var raw = FBDATA.bookmarks[s.start.id];
  if (raw.revisions) raw.revisions[s.start.revision || 'baseline'].localInstitutions = defs;
  else raw.localInstitutions = defs;
  s.localInstitutions = s.localInstitutions || {};
  s.localInstitutions.test_activity_school = FB.religiousInstitutionOpeningRow('test_activity_school', defs.test_activity_school);
  function base(name) { return { name:name, period:{ yearMin:1, yearMax:null }, openings:[],
    faithIds:[c.religion], affiliationIds:[], roleIds:[], institutionId:null }; }
  FBDATA.religiousActivities.test_learning = Object.assign(base('Fictional household learning'), {
    mode:'local', purpose:null, siteId:null, payer:'household', cost:2, reserve:5, duration:2,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'test_learning_done',
    reward:{ piety:1, prestige:0, skills:{ int:1 } }, legacy:null, service:null
  });
  FBDATA.religiousActivities.test_schooling = Object.assign(base('Fictional funded lesson'), {
    institutionId:'test_activity_school', mode:'local', purpose:null, siteId:null, payer:'household', cost:0,
    reserve:0, duration:1, calendar:'any_day', interruption:'retain_cost', recipient:'institution',
    milestone:'test_schooling_done', reward:{ piety:0, prestige:0, skills:{ int:1 } }, legacy:null,
    service:{ fund:'learning', cost:3 }
  });
  FBDATA.religiousPatronage.test_patronage = Object.assign(base('Fictional school patronage'), {
    institutionId:'test_activity_school', payer:'household', reserve:5,
    foundation:{ startup:4, capital:10, treasury:6, landRequired:true },
    funds:{ learning:{ capacity:4, unitCost:3 } }, outreach:['voluntary']
  });
  window.activityFixture = { pid:pid, cid:c.id, land:{ provinceId:pid, settlement:0, count:2 } };
  window.foundActivityHouse = function () {
    var q = FB.religiousPatronageQuote(s, 'test_patronage', c.id, 'foundation', { land:activityFixture.land });
    if (!q || !q.allowed || !FB.religiousPatronageApply(s, q)) throw new Error('foundation: ' + (q && q.reason));
    return s.abbeys.houses.filter(function (h) { return h.activityInstitutionId === 'test_activity_school'; })[0];
  };
}
test.beforeEach(async function ({ page }, testInfo) {
  if (testInfo.title.includes('CrazyGames restore')) {
    await startHistoricalGame(page, testInfo, { bookmark:'867', code:'CADENCE-867-farmer-london-f-Ada' }, true);
  } else { await openGame(page, testInfo); await startDeterministicGame(page); }
  await page.evaluate(installActivities);
});

function installActivityHousehold() {
  var s = FB.state, me = s.chars[s.player.charId];
  var c = JSON.parse(JSON.stringify(me));
  c.id = 'test_activity_spouse'; c.name = 'Fictional participant'; c.spouseId = me.id;
  delete c.religiousActivity; delete c.religiousActivityHistory; delete c.royalLine;
  s.chars[c.id] = c; activityFixture.member = c.id;
}

test('household participation charges one purse and observes location, health and military obligations', async function ({ page }) {
  await page.evaluate(installActivityHousehold);
  const result = await page.evaluate(function () {
    var s = FB.state, f = activityFixture, c = s.chars[f.member], gold = s.player.gold;
    var q = FB.religiousActivityQuote(s, 'test_learning', c.id);
    var start = FB.religiousActivityApply(s, q);
    s.turn += 2; FB.religiousActivityTick(s);
    var completed = c.skills.int === 5 && c.religiousActivityHistory.test_learning_done.rewarded;
    var d = FBDATA.religiousActivities.test_learning; d.milestone = 'test_other';
    c.health = 0; var ill = !FB.religiousActivityQuote(s, 'test_learning', c.id).allowed; c.health = 8;
    s.player.flags.on_campaign = true;
    var duty = !FB.religiousActivityQuote(s, 'test_learning', c.id).allowed; s.player.flags.on_campaign = false;
    d.institutionId = 'test_activity_school';
    var home = s.player.provinceId;
    s.player.provinceId = Object.keys(s.owner).filter(function (pid) { return pid !== home && s.owner[pid]; })[0];
    var away = !FB.religiousActivityQuote(s, 'test_learning', c.id).allowed;
    s.player.provinceId = home;
    return { managed:FB.religiousActivityPeople(s).indexOf(c.id) >= 0, start:start, completed:completed,
      spent:gold - s.player.gold, ill:ill, duty:duty, away:away };
  });
  expect(result).toEqual({ managed:true, start:true, completed:true, spent:2, ill:true, duty:true, away:true });
});

test('cancellation, death and access loss preserve funded institution property', async function ({ page }) {
  await page.evaluate(installActivityHousehold);
  const result = await page.evaluate(function () {
    var s = FB.state, f = activityFixture, c = s.chars[f.member], h = foundActivityHouse();
    FB.religiousPatronageApply(s, FB.religiousPatronageQuote(s, 'test_patronage', f.cid, 'donation', { fund:'learning', amount:6 }));
    var property = JSON.stringify(h), outcomes = [];
    ['cancel','death','access'].forEach(function (kind) {
      c.dead = false; s.localInstitutions.test_activity_school.status = 'active';
      var start = FB.religiousActivityApply(s, FB.religiousActivityQuote(s, 'test_schooling', c.id));
      if (kind === 'cancel') {
        var stale = JSON.parse(JSON.stringify(c.religiousActivity)); stale.paid++;
        outcomes.push(!FB.religiousActivityCancel(s, c.id, stale));
        outcomes.push(FB.religiousActivityCancel(s, c.id, c.religiousActivity));
      } else {
        if (kind === 'death') c.dead = true;
        else s.localInstitutions.test_activity_school.status = 'closed';
        s.turn++; FB.religiousActivityTick(s);
      }
      outcomes.push(start && !c.religiousActivity && !c.religiousActivityHistory && property === JSON.stringify(h));
    });
    return outcomes;
  });
  expect(result).toEqual([true,true,true,true,true]);
});

test('quarterly AI spends only its own treasury and starts at most four declared local activities', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, d = FBDATA.religiousActivities.test_learning;
    d.payer = 'public'; d.ai = true; d.faithIds = []; d.reward.piety = 0;
    FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active'; s.turn = 90;
    var before = {}, eligible = 0, household = s.player.gold, piety = s.player.piety;
    Object.keys(s.realms).forEach(function (rid) {
      var c = FB.realmRulerCharacterSnapshot(s, rid);
      if (!c || !FB.treasuryCounterparty(s, rid)) return;
      c.health = 8; c.born = s.date.year - 30;
      s.realms[rid].treasury.gold = 100; s.realms[rid].treasury.militaryAccrued = 0;
      before[rid] = FB.treasuryAvailable(s, rid);
      if (!FB.isRealmAtWar(s, rid) && FB.treasuryCharacterRealm(s, c.id) === rid) eligible++;
    });
    var count = FB.religiousActivityAI(s), repeat = FB.religiousActivityAI(s), spent = 0, own = true;
    Object.keys(before).forEach(function (rid) {
      var c = FB.realmRulerCharacterSnapshot(s, rid), delta = before[rid] - FB.treasuryAvailable(s, rid);
      spent += delta;
      if (delta !== (c.religiousActivity ? 2 : 0)) own = false;
    });
    s.turn += 2; FB.religiousActivityTick(s);
    d.milestone = 'test_insolvent';
    Object.keys(before).forEach(function (rid) { s.realms[rid].treasury.gold = 0; });
    s.turn = 180;
    return { eligible:eligible > 0, started:count > 0 && count <= 4, repeat:repeat,
      conserved:spent === count * 2, own:own, insolvent:FB.religiousActivityAI(s),
      household:household === s.player.gold && piety === s.player.piety };
  });
  expect(result).toEqual({ eligible:true, started:true, repeat:0, conserved:true, own:true, insolvent:0, household:true });
});

test('public patronage uses the actual ruler account and the institution existing service contract', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = activityFixture, h = foundActivityHouse();
    FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active';
    var rid = Object.keys(s.realms).sort().filter(function (id) {
      var c = FB.realmRulerCharacterSnapshot(s, id);
      return c && FB.treasuryCharacterRealm(s, c.id) === id && FB.characterResidence(s, c) === f.pid;
    })[0];
    if (!rid) {
      rid = Object.keys(s.realms).sort().filter(function (id) {
        var c = FB.realmRulerCharacterSnapshot(s, id); return c && FB.treasuryCharacterRealm(s, c.id) === id;
      })[0];
      s.realms[rid].capital = f.pid;
    }
    var c = FB.realmRulerCharacterSnapshot(s, rid); c.religion = 'catholic'; c.health = 8; c.born = s.date.year - 30;
    s.realms[rid].treasury.gold = 100; s.realms[rid].treasury.militaryAccrued = 0;
    var d = JSON.parse(JSON.stringify(FBDATA.religiousPatronage.test_patronage)); d.payer = 'public'; d.ai = true;
    FBDATA.religiousPatronage.test_public_patronage = d;
    var gold = s.player.gold, before = FB.treasuryAvailable(s, rid);
    var q = FB.religiousPatronageQuote(s, 'test_public_patronage', c.id, 'donation', { fund:'learning', amount:3 });
    var applied = FB.religiousPatronageApply(s, q);
    d.funds.learning.unitCost++;
    var mismatch = FB.religiousPatronageQuote(s, 'test_public_patronage', c.id, 'donation', { fund:'learning', amount:4 });
    return { applied:applied, payer:q.payer.id === rid, spent:before - FB.treasuryAvailable(s, rid),
      fund:h.restrictedFunds.learning, household:s.player.gold === gold, mismatch:!mismatch.allowed };
  });
  expect(result).toEqual({ applied:true, payer:true, spent:3, fund:3, household:true, mismatch:true });
});

test('headless household learning leaves profession, rank, abbey and papacy gates unchanged', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, c = s.chars[activityFixture.cid], d = FBDATA.religiousActivities.test_learning;
    c.religion = 'jewish'; d.faithIds = ['jewish'];
    FBDATA.religions.jewish.properties = Object.assign({}, FBDATA.religions.jewish.properties, { religiousPaths:null });
    FB.invalidateReligionData();
    var before = JSON.stringify([s.abbeys, s.papacy, c.religiousRanks, s.player.profession,
      FB.systemAvailable(s, 'abbeys'), FB.systemAvailable(s, 'papacy')]);
    var denied = !FB.religiousCareerReview(s, c, 'priest', true).allowed;
    var start = FB.religiousActivityApply(s, FB.religiousActivityQuote(s, 'test_learning', c.id));
    s.turn += 2; FB.religiousActivityTick(s);
    return { visible:FB.religiousActivityVisible(s, c.id), start:start, denied:denied,
      unchanged:before === JSON.stringify([s.abbeys, s.papacy, c.religiousRanks, s.player.profession,
        FB.systemAvailable(s, 'abbeys'), FB.systemAvailable(s, 'papacy')]), skill:c.skills.int };
  });
  expect(result).toEqual({ visible:true, start:true, denied:true, unchanged:true, skill:5 });
});

test('activity reviews are pure, retain Details and focus, and reject a changed purse on mobile', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () {
    window.activityBeforeReview = [JSON.stringify(FB.state), FB.getRngState(), FB.getUidCounter()];
    FB.ui.showReligiousActivities();
  });
  const review = page.locator('#activity-review-test_learning');
  const card = review.locator('xpath=../..');
  await card.getByRole('button', { name:'Details', exact:true }).click();
  await review.click();
  await expect(page.locator('#gm-body')).toContainText('Household purse');
  await expect(page.locator('#gm-body')).toContainText('2 days at this location');
  expect(await page.evaluate(function () {
    return JSON.stringify(activityBeforeReview) === JSON.stringify([JSON.stringify(FB.state), FB.getRngState(), FB.getUidCounter()]);
  })).toBe(true);
  await page.keyboard.press('Escape');
  await expect(review).toBeFocused();
  await expect(card.getByRole('button', { name:'Details', exact:true })).toHaveAttribute('aria-expanded', 'true');
  await review.click();
  await page.evaluate(function () { FB.state.player.gold = 0; window.activityStale = JSON.stringify(FB.state); });
  await page.locator('#activity-confirm').click();
  await expect(page.getByRole('heading', { name:'Terms changed', exact:true })).toBeVisible();
  expect(await page.evaluate(function () { return activityStale === JSON.stringify(FB.state); })).toBe(true);
  await page.locator('#activity-continue').click();
  expect(await page.evaluate(function () {
    var box = document.getElementById('gm-body'); return box.scrollWidth <= box.clientWidth + 1;
  })).toBe(true);
});

test('detached save validation rejects malformed activity records without normalizing state', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, cid = activityFixture.cid;
    FB.religiousActivityApply(s, FB.religiousActivityQuote(s, 'test_learning', cid));
    var before = JSON.stringify(s), rejected = [];
    [function (v) { v.chars[cid].religiousActivity.dueTurn++; },
      function (v) { v.chars[cid].religiousActivity.paid = -1; },
      function (v) { v.chars[cid].religiousActivity.location = 'missing_place'; },
      function (v) { v.religiousActivityAI = { period:999999 }; }].forEach(function (change) {
      var v = JSON.parse(before); change(v);
      try { FB.validateReligiousActivityState(v); rejected.push(false); } catch (e) { rejected.push(true); }
    });
    FB.validateReligiousActivityState(s);
    return { rejected:rejected, pure:before === JSON.stringify(s) };
  });
  expect(result).toEqual({ rejected:[true,true,true,true], pure:true });
});

function retainedActivityFacts() {
  var s = FB.state;
  return JSON.parse(JSON.stringify({ start:s.start, rng:FB.getRngState() >>> 0, uid:FB.getUidCounter(),
    player:[s.player.gold, s.player.piety, s.player.prestige, s.player.travel, s.player.travelHistory, s.player.landPlots],
    person:s.chars[s.player.charId], member:s.chars[activityFixture.member], abbeys:s.abbeys,
    population:s.population, ai:s.religiousActivityAI, institutions:s.localInstitutions }));
}

for (const distribution of ['standard','CrazyGames']) {
  test(distribution + ' restore after another bookmark retains activities, legacy ranks, routes and funded property', async function ({ page }) {
    await page.evaluate(installActivityHousehold);
    const original = await page.evaluate(function () {
      var s = FB.state, f = activityFixture;
      var house = foundActivityHouse();
      s.turn = 90; s.religiousActivityAI = { period:1 };
      s.population.counties[f.pid].communityProjects = { faith:{ target:'catholic', sponsor:s.owner[f.pid],
        policy:'voluntary', startTurn:0, progress:0.375, converted:12, resistance:0.2, lastTransfer:2, lastYear:s.date.year,
        activitySupport:{ institutionId:'test_activity_school', amount:3, untilTurn:s.turn + 360 } } };
      house.activitySpent += 3; s.player.gold -= 3;
      FB.religiousPatronageApply(s, FB.religiousPatronageQuote(s, 'test_patronage', f.cid, 'donation', { fund:'learning', amount:6 }));
      FB.religiousActivityApply(s, FB.religiousActivityQuote(s, 'test_schooling', f.member));
      s.chars[f.cid].religiousRanks = { catholic_lay:2 };
      s.player.travelHistory = [{ purpose:'pilgrimage', destinationId:f.pid, turn:s.turn }];
      var choice = FB.travelDestinations(s, 'study')[0];
      if (!choice || !FB.travelStart(s, 'study', choice.destinationId, null)) throw new Error('Expected an existing route');
      return FB.save.serialize();
    });
    const before = await page.evaluate(retainedActivityFacts);
    await page.evaluate(function () { FB.state.turn++; FB.religiousActivityTick(FB.state); });
    const after = await page.evaluate(retainedActivityFacts);
    await page.evaluate(function () {
      return new Promise(function (resolve, reject) {
        FB.activateBookmark('1204', null, function (error) { if (error) reject(error); else resolve(); });
      });
    });
    await restoreBookmark(page, original);
    expect(await page.evaluate(retainedActivityFacts)).toEqual(before);
    await page.evaluate(function () { FB.state.turn++; FB.religiousActivityTick(FB.state); });
    expect(await page.evaluate(retainedActivityFacts)).toEqual(after);
  });
}

test('independent local and existing pilgrimage declarations validate without opening placements', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, d = JSON.parse(JSON.stringify(FBDATA.religiousActivities.test_learning));
    var choice = FB.travelDestinations(s, 'pilgrimage')[0];
    if (!choice) throw new Error('Fixture requires a reachable existing pilgrimage');
    var site = FBDATA.travelSites.filter(function (v) { return v.purpose === 'pilgrimage' && v.provinceId === choice.destinationId; })[0];
    Object.assign(d, { name:'Existing pilgrimage adapter', mode:'journey', purpose:'pilgrimage', siteId:site.id,
      cost:0, duration:0, milestone:'test_journey_done', reward:{ piety:0, prestige:0, skills:{} },
      legacy:{ trait:'pilgrim', pathId:'catholic_lay', rank:2, purpose:'pilgrimage' } });
    FBDATA.religiousActivities.test_journey = d;
    var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    var q = FB.religiousActivityQuote(s, 'test_journey', s.player.charId);
    var pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    var faults = FB.religiousActivityCatalogFaults(FBDATA);
    var applied = FB.religiousActivityApply(s, q);
    return { faults:faults, pure:pure, applied:applied, purpose:s.player.travel.purpose,
      cost:s.player.travel.cost === q.cost, route:JSON.stringify(s.player.travel.outboundRoute) === JSON.stringify(q.travel.route),
      position:!s.chars[s.player.charId].religiousActivity };
  });
  expect(result).toEqual({ faults:[], pure:true, applied:true, purpose:'pilgrimage', cost:true, route:true, position:true });
});

test('pure dated reviews reject stale funds and definition changes without mutation', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, cid = activityFixture.cid, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    var q = FB.religiousActivityQuote(s, 'test_learning', cid);
    for (var i = 0; i < 5; i++) FB.religiousActivityQuote(s, 'test_learning', cid);
    var pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.player.gold--; before = JSON.stringify(s);
    var stale = !FB.religiousActivityApply(s, q) && before === JSON.stringify(s);
    var d = FBDATA.religiousActivities.test_learning;
    d.period.yearMin = s.date.year + 1;
    var dated = !FB.religiousActivityQuote(s, 'test_learning', cid).allowed;
    d.period.yearMin = 1; d.openings = [{ id:s.start.id, revision:'unaccepted_revision' }];
    var revision = !FB.religiousActivityQuote(s, 'test_learning', cid).allowed;
    d.openings = []; d.calendar = 'fixed_summer_hajj';
    return { pure:pure, stale:stale, dated:dated, revision:revision, invalidCalendar:FB.religiousActivityCatalogFaults(FBDATA).length > 0 };
  });
  expect(result).toEqual({ pure:true, stale:true, dated:true, revision:true, invalidCalendar:true });
});

test('local completion consumes time and rewards once; interruption retains only the disclosed cost', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, cid = activityFixture.cid, c = s.chars[cid];
    var q = FB.religiousActivityQuote(s, 'test_learning', cid), gold = s.player.gold;
    var start = FB.religiousActivityApply(s, q), early = FB.religiousActivityFinish(s, cid, false);
    s.turn += 2; var done = FB.religiousActivityFinish(s, cid, false);
    var repeat = FB.religiousActivityFinish(s, cid, false);
    FBDATA.religiousActivities.test_learning.milestone = 'test_interrupted';
    FB.religiousActivityApply(s, FB.religiousActivityQuote(s, 'test_learning', cid));
    c.health = 0; s.turn += 2; FB.religiousActivityTick(s);
    return { start:start, early:early, done:done, repeat:repeat, learning:c.skills.int,
      gold:gold - s.player.gold, active:!!c.religiousActivity, interrupted:!!c.religiousActivityHistory.test_interrupted };
  });
  expect(result).toEqual({ start:true, early:false, done:true, repeat:false, learning:5, gold:4, active:false, interrupted:false });
});

test('foundation conserves exact owned plots and startup money; gifts stay restricted and fund actual teaching', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, cid = activityFixture.cid, before = JSON.stringify(s);
    var q = FB.religiousPatronageQuote(s, 'test_patronage', cid, 'foundation', { land:activityFixture.land });
    var pure = before === JSON.stringify(s), gold = s.player.gold, h = foundActivityHouse();
    var total = h.capital + h.treasury + h.activitySpent;
    var gift = FB.religiousPatronageQuote(s, 'test_patronage', cid, 'donation', { fund:'learning', amount:6 });
    var given = FB.religiousPatronageApply(s, gift), twice = FB.religiousPatronageApply(s, gift);
    var lesson = FB.religiousActivityApply(s, FB.religiousActivityQuote(s, 'test_schooling', cid));
    s.turn++; var taught = FB.religiousActivityFinish(s, cid, false);
    return { pure:pure, total:total, disclosed:q.cost, remainingLand:s.player.landPlots.length, plots:h.plots[0].count,
      given:given, twice:twice, lesson:lesson, taught:taught, restricted:h.restrictedFunds.learning,
      spent:h.activitySpent, gold:gold - s.player.gold, learning:s.chars[cid].skills.int, legacy:FB.abbeyHouses(s).indexOf(h) < 0 };
  });
  expect(result).toEqual({ pure:true, total:20, disclosed:20, remainingLand:0, plots:2, given:true, twice:false,
    lesson:true, taught:true, restricted:3, spent:7, gold:26, learning:5, legacy:true });
});

test('missing property, changed recipient, capacity and an unfunded service fail closed', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, cid = activityFixture.cid;
    var missing = !FB.religiousPatronageQuote(s, 'test_patronage', cid, 'foundation', {}).allowed;
    foundActivityHouse();
    var noService = !FB.religiousActivityQuote(s, 'test_schooling', cid).allowed;
    var capacity = !FB.religiousPatronageQuote(s, 'test_patronage', cid, 'donation', { fund:'learning', amount:13 }).allowed;
    var q = FB.religiousPatronageQuote(s, 'test_patronage', cid, 'donation', { fund:'learning', amount:3 });
    s.localInstitutions.test_activity_school.status = 'closed';
    var before = JSON.stringify(s), stale = !FB.religiousPatronageApply(s, q) && before === JSON.stringify(s);
    return { missing:missing, noService:noService, capacity:capacity, stale:stale };
  });
  expect(result).toEqual({ missing:true, noService:true, capacity:true, stale:true });
});

test('outreach funds one matching county or settlement project without resetting its fractional progress', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = activityFixture; foundActivityHouse();
    s.owner[f.pid] = 'player'; s.holder[f.pid] = 'player';
    s.realms.player.alive = true; s.realms.player.liege = null;
    var rec = s.population.counties[f.pid];
    function project() { return { target:s.chars[f.cid].religion, sponsor:'player', policy:'voluntary', startTurn:s.turn,
      progress:0.375, converted:12, resistance:0.2, lastTransfer:2, lastYear:s.date.year }; }
    rec.communityProjects = { faith:project() };
    rec.settlementCommunityProjects = { 0:{ faith:project() } };
    var terms = { fund:'learning', amount:3, provinceId:f.pid, settlement:null, target:s.chars[f.cid].religion, policy:'voluntary' };
    var before = JSON.stringify(rec.communities), p = rec.communityProjects.faith;
    var q = FB.religiousPatronageQuote(s, 'test_patronage', f.cid, 'outreach', terms);
    var applied = FB.religiousPatronageApply(s, q), repeat = FB.religiousPatronageApply(s, q);
    terms.settlement = 0;
    var local = FB.religiousPatronageApply(s, FB.religiousPatronageQuote(s, 'test_patronage', f.cid, 'outreach', terms));
    return { applied:applied, repeat:repeat, local:local, progress:p.progress, converted:p.converted,
      communities:before === JSON.stringify(rec.communities), support:p.activitySupport.amount,
      localProgress:rec.settlementCommunityProjects[0].faith.progress, otherFund:!s.chars[f.cid].religiousActivity };
  });
  expect(result).toEqual({ applied:true, repeat:false, local:true, progress:0.375, converted:12,
    communities:true, support:3, localProgress:0.375, otherFund:true });
});

test('legacy standing prevents equivalent rewards without fabricating rite performance', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, c = s.chars[activityFixture.cid], d = FBDATA.religiousActivities.test_learning;
    d.legacy = { trait:'pilgrim', pathId:'catholic_lay', rank:2, purpose:'pilgrimage' };
    c.religiousRanks = { catholic_lay:2 };
    var before = JSON.stringify(s), q = FB.religiousActivityQuote(s, 'test_learning', c.id);
    return { blocked:!q.allowed, pure:before === JSON.stringify(s), performance:!!c.religiousActivityHistory };
  });
  expect(result).toEqual({ blocked:true, pure:true, performance:false });
});

test('stale activity capstones are rejected before any reward effect', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, c = s.chars[activityFixture.cid];
    var ev = FBDATA.events.filter(function (e) { return e.id === 'travel_capstone_pilgrimage'; })[0];
    var ctx = { activityJourneyTurn:s.turn - 1, destinationId:activityFixture.pid };
    var before = JSON.stringify(s), rng = FB.getRngState();
    var result = FB.resolveEventOption(s, ev, ev.options[0], ctx);
    return { rejected:result === false, pure:before === JSON.stringify(s) && rng === FB.getRngState(), noRite:!c.religiousActivityHistory };
  });
  expect(result).toEqual({ rejected:true, pure:true, noRite:true });
});

test('pledged land and unauthorized public payers preserve every purse and property record', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = activityFixture;
    s.economy = s.economy || {};
    s.economy.loans = [{ id:99, status:'active', collateral:{ kind:'land', id:f.pid + ':0' } }];
    var before = JSON.stringify(s), q = FB.religiousPatronageQuote(s, 'test_patronage', f.cid, 'foundation', { land:f.land });
    var pledged = !q.allowed && !FB.religiousPatronageApply(s, q) && before === JSON.stringify(s);
    s.economy.loans = [];
    FBDATA.religiousPatronage.test_patronage.payer = 'public';
    before = JSON.stringify(s);
    q = FB.religiousPatronageQuote(s, 'test_patronage', f.cid, 'foundation', { land:f.land });
    var ownPurse = !q.allowed && !FB.religiousPatronageApply(s, q) && before === JSON.stringify(s);
    delete s.economy; delete s.modifiers;
    FBDATA.religiousPatronage.test_patronage.payer = 'household';
    before = JSON.stringify(s);
    FB.religiousPatronageQuote(s, 'test_patronage', f.cid, 'foundation', { land:f.land });
    return { pledged:pledged, ownPurse:ownPurse, absentRecords:before === JSON.stringify(s) };
  });
  expect(result).toEqual({ pledged:true, ownPurse:true, absentRecords:true });
});

test('interrupted activity journeys use ordinary travel cleanup and retain institutional property', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, cid = activityFixture.cid; foundActivityHouse();
    var property = JSON.stringify(s.abbeys), choice = FB.travelDestinations(s, 'pilgrimage')[0];
    var site = FBDATA.travelSites.filter(function (v) { return v.purpose === 'pilgrimage' && v.provinceId === choice.destinationId; })[0];
    var d = JSON.parse(JSON.stringify(FBDATA.religiousActivities.test_learning));
    Object.assign(d, { mode:'journey', purpose:'pilgrimage', siteId:site.id, cost:0, duration:0,
      milestone:'test_interrupted_journey', reward:{ piety:0, prestige:0, skills:{} } });
    FBDATA.religiousActivities.test_journey = d;
    var started = FB.religiousActivityApply(s, FB.religiousActivityQuote(s, 'test_journey', cid));
    var gold = s.player.gold;
    s.chars[cid].health = 0; FB.religiousActivityTick(s);
    return { started:started, cleared:s.player.travel === null, costRetained:s.player.gold === gold,
      history:s.player.travelHistory.length, receipt:!!s.chars[cid].religiousActivityHistory,
      property:property === JSON.stringify(s.abbeys) };
  });
  expect(result).toEqual({ started:true, cleared:true, costRetained:true, history:0, receipt:false, property:true });
});

test('an activity journey pays its existing capstone once and keeps rite performance separate', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, cid = activityFixture.cid, choice = FB.travelDestinations(s, 'pilgrimage')[0];
    if (!choice) throw new Error('Fixture requires a reachable pilgrimage');
    var site = FBDATA.travelSites.filter(function (v) { return v.purpose === 'pilgrimage' && v.provinceId === choice.destinationId; })[0];
    var d = JSON.parse(JSON.stringify(FBDATA.religiousActivities.test_learning));
    Object.assign(d, { mode:'journey', purpose:'pilgrimage', siteId:site.id, cost:0, duration:0,
      milestone:'test_journey_done', reward:{ piety:0, prestige:0, skills:{} } });
    FBDATA.religiousActivities.test_journey = d;
    if (!FB.religiousActivityApply(s, FB.religiousActivityQuote(s, 'test_journey', cid))) throw new Error('journey failed');
    var t = s.player.travel;
    t.phase = 'arrived'; t.currentId = t.destinationId; t.remainingRoute = [];
    var ev = FBDATA.events.filter(function (e) { return e.id === 'travel_capstone_pilgrimage'; })[0];
    var ctx = { activityJourneyTurn:t.startTurn, destinationId:t.destinationId, locationId:t.destinationId };
    var piety = s.player.piety;
    FB.resolveEventOption(s, ev, ev.options[0], ctx);
    var before = JSON.stringify(s), rejected = FB.resolveEventOption(s, ev, ev.options[0], ctx) === false;
    return { gain:s.player.piety - piety, rejected:rejected, pure:before === JSON.stringify(s),
      completed:t.completed, history:s.player.travelHistory.length,
      performed:s.chars[cid].religiousActivityHistory.test_journey_done.performed };
  });
  expect(result).toEqual({ gain:30, rejected:true, pure:true, completed:true, history:1, performed:false });
});
