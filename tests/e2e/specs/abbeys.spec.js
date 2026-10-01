'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/economy.js', 'data/actions.js', 'data/technology.js', 'data/papacy.js',
  'js/abbeys.js', 'js/economy.js', 'js/actions.js', 'js/model.js',
  'js/events.js', 'js/lordships.js', 'js/papacy.js', 'js/main.js',
  'js/world.js', 'js/save.js', 'js/messages.js', 'js/ui_modals.js',
  'js/ui_panels.js', 'js/ui_misc.js', 'js/keys.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* Scenario setup stays here: ordinary shared journeys have no abbey assumptions. */
async function prepare(page) {
  await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    FB.game.setPaused(true);
    p.tier = 2; p.provs = []; p.gold = 3000; p.piety = 300; p.prestige = 300;
    p.profession = 'monk'; p.professionBack = null; p.manor = null;
    p.landPlots = []; p.landPlotMigration = 1;
    delete p.flags.bishop; delete p.flags.pope; delete p.flags.abbot;
    c.sex = 'f'; c.religion = 'catholic'; c.station = 2;
    c.born = s.date.year - 40; c.spouseId = null; c.betrothedId = null;
    c.skills.lea = 15; c.skills.ste = 12; c.skills.dip = 12;
    c.traits = []; delete c.unfree; delete c.bishopric; delete c.papalOffice;
    c.career = { profession:'monk', rank:'master', experience:12,
      startedYear:s.date.year - 12, chosen:true, guildRank:'none', guildStanding:0 };
    c.religiousRanks = { catholic_monastic:2 };
    for (const id in s.chars) {
      if (s.chars[id].spouseId === c.id) s.chars[id].spouseId = null;
      if (s.chars[id].betrothedId === c.id) s.chars[id].betrothedId = null;
    }
    FB.touchFamily();
    FB.realmRulerCharacter(s, s.owner[p.provinceId]);
    window.abbeyTestElect = function () {
      const chance = FB.chance;
      FB.chance = function () { return true; };
      try { return FB.seekAbbeyAppointment(s, FB.abbeyAt(s, p.provinceId), c).house; }
      finally { FB.chance = chance; }
    };
    window.abbeyTestGuest = function (age, name) {
      const g = FB.makeCharacter(s, { sex:'f', religion:'catholic', culture:c.culture,
        born:s.date.year - age, dyn:'Guest house', name:name, station:2, traitsN:0 });
      g.homeProvinceId = p.provinceId; g.spouseId = null; g.betrothedId = null;
      g.career = { profession:'noble', rank:'journeyman', experience:0, chosen:true,
        startedYear:s.date.year, guildRank:'none', guildStanding:0 };
      return g;
    };
  });
}

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await prepare(page);
});

test('religious elections are free, contested, and grant an office without secular land', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    const before = { gold:p.gold, rng:FB.getRngState(), state:JSON.stringify(s.abbeys || null) };
    const preview = FB.abbeyAppointmentStatus(s, null, c);
    const afterPreview = { rng:FB.getRngState(), state:JSON.stringify(s.abbeys || null) };
    const chance = FB.chance;
    let refusal;
    try { FB.chance = function () { return false; }; refusal = FB.seekAbbeyAppointment(s, null, c); }
    finally { FB.chance = chance; }
    const cooldown = FB.abbeyAppointmentStatus(s, refusal.house, c).ready;
    const retry = FB.seekAbbeyAppointment(s, refusal.house, c);
    s.turn += 360;
    FB.abbeySeason(s);
    let h;
    try {
      FB.chance = function () { return true; };
      h = FB.seekAbbotAppointment(s, c).house;
    } finally { FB.chance = chance; }
    FB.ensureSettlementLordships(s);
    return { before:before, afterPreview:afterPreview, ready:preview.ready,
      refusal:refusal.accepted, cooldown:cooldown, retry:retry,
      gold:p.gold, tier:p.tier, rank:c.religiousRanks.catholic_monastic,
      holder:h.holderId === c.id, vows:FB.papacyCelibateSnapshot(s, c),
      income:FB.abbeyIncome(s), troops:FB.abbeyRetinue(s),
      counties:p.provs.length, sites:FB.directSettlements(s).length,
      governance:FB.governanceEligible(s), title:FB.titleFor(s),
      focus:FB.defaultFocus(s), churchFocus:FB.focusStatus(s, 'serve_church').can,
      books:FB.focusStatus(s, 'copy_books').can,
      bishop:FB.bishopAppointmentStatus(s, c).ready };
  });
  expect(result.ready).toBe(true);
  expect(result.afterPreview).toEqual({ rng:result.before.rng, state:result.before.state });
  expect(result.refusal).toBe(false);
  expect(result.cooldown).toBe(false);
  expect(result.retry).toBe(false);
  expect(result.gold).toBe(result.before.gold);
  expect(result).toMatchObject({ tier:3, rank:3, holder:true, vows:true, income:6,
    troops:80, counties:0, sites:0, governance:false, bishop:false,
    focus:'serve_church', churchFocus:true, books:true });
  expect(result.title).toContain('Abbess');
});

test('a married lay founder retains secular life; mature widows can seek office', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    c.career.profession = 'noble'; c.career.experience = 0; c.religiousRanks = {};
    const spouse = FB.makeCharacter(s, { sex:'m', religion:'catholic', culture:c.culture,
      born:s.date.year - 45, dyn:'Spouse', traitsN:0 });
    c.spouseId = spouse.id; spouse.spouseId = c.id; FB.touchFamily();
    const gold = p.gold, h = FB.foundAbbey(s);
    const whileMarried = FB.abbeyAppointmentStatus(s, h, c).ready;
    const vowsBefore = FB.papacyCelibateSnapshot(s, c);
    FB.killChar(s, spouse);
    const widow = FB.abbeyAppointmentStatus(s, h, c).ready;
    c.skills.ste = 1;
    const insufficient = FB.abbeyAppointmentStatus(s, h, c).ready;
    c.skills.ste = 12; c.sex = 'm';
    const male = FB.abbeyAppointmentStatus(s, h, c).ready;
    return { cost:gold - p.gold, patron:h.patronDyn === c.dyn, holder:h.holderId,
      whileMarried:whileMarried, vowsBefore:vowsBefore, widow:widow,
      insufficient:insufficient, male:male, tier:p.tier };
  });
  expect(result).toMatchObject({ cost:160, patron:true, holder:null, whileMarried:false,
    vowsBefore:false, widow:true, insufficient:false, male:false, tier:2 });
});

test('endowments transfer income permanently and reject pledged or changed land', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    const h = FB.foundAbbey(s);
    for (let i = 0; i < 5; i++) p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
    p.manor = { provinceId:p.provinceId, settlement:0 };
    const group = FB.landBreakdown(s)[0], income = FB.landYield(s);
    const e = FB.ensureEconomy(s);
    e.loans.push({ id:9001, status:'active', collateral:{ kind:'land',
      id:group.provinceId + ':' + group.settlement, provinceId:group.provinceId,
      settlement:group.settlement, count:group.count } });
    const pledged = FB.endowAbbey(s, h, group);
    const retained = p.landPlots.length;
    e.loans[e.loans.length - 1].status = 'repaid';
    const stale = FB.endowAbbey(s, h, Object.assign({}, group, { count:4 }));
    const revenue = FB.abbeyFinance(s, h).revenue;
    const donated = FB.endowAbbey(s, h, group);
    const repeated = FB.endowAbbey(s, h, group);
    const newRevenue = FB.abbeyFinance(s, h).revenue;
    const gold = p.gold, capital = h.capital;
    const cash = FB.endowAbbey(s, h);
    return { pledged:pledged, retained:retained, stale:stale, donated:donated,
      repeated:repeated, plots:p.landPlots.length, manor:p.manor,
      income:income, delta:newRevenue - revenue, familyIncome:FB.landYield(s),
      cash:cash, paid:gold - p.gold, capital:h.capital - capital,
      vows:!!c.abbeyVows };
  });
  expect(result).toMatchObject({ pledged:false, retained:5, stale:false, donated:true,
    repeated:false, plots:0, manor:null, familyIncome:0, cash:true, paid:100, capital:100, vows:false });
  expect(result.delta).toBeCloseTo(result.income);
});

test('hospitality preserves lay status, educates pupils and retains connections after departure', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, h = window.abbeyTestElect();
    const pupil = window.abbeyTestGuest(10, 'Abbey pupil'); pupil.skills.lea = 1;
    const guest = window.abbeyTestGuest(40, 'Abbey widow');
    const chance = FB.chance;
    let p, g;
    try {
      FB.chance = function () { return true; };
      p = FB.inviteAbbeyResident(s, h, pupil, 'pupil');
      g = FB.inviteAbbeyResident(s, h, guest, 'guest');
      FB.runAbbeyAction(s, h, 'school');
    } finally { FB.chance = chance; }
    const during = { count:h.residents.length, upkeep:FB.abbeyFinance(s, h).upkeep,
      learning:pupil.skills.lea, vows:FB.papacyCelibateSnapshot(s, guest),
      home:FB.characterResidence(s, guest), original:guest.homeProvinceId };
    s.turn += 720; h.treasury = 100;
    FB.abbeySeason(s);
    return { pupil:p.accepted, guest:g.accepted, during:during,
      residents:h.residents.length, connections:h.connections.length,
      remains:!!s.chars[guest.id], home:FB.characterResidence(s, guest) };
  });
  expect(result).toMatchObject({ pupil:true, guest:true, residents:0, connections:2, remains:true });
  expect(result.during).toMatchObject({ count:2, upkeep:8, learning:2, vows:false });
  expect(result.home).toBe(result.during.original);
});

test('refuge creates political consequences and mediation settles the actual dispute', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, h = window.abbeyTestElect();
    const localId = s.holder[h.provinceId] || s.owner[h.provinceId];
    const lord = FB.realmRulerCharacter(s, localId);
    const guest = window.abbeyTestGuest(32, 'Refuge seeker');
    const before = FB.standingOf(s, { kind:'character', id:lord.id });
    const chance = FB.chance;
    let arrival;
    try { FB.chance = function () { return true; }; arrival = FB.inviteAbbeyResident(s, h, guest, 'refuge'); }
    finally { FB.chance = chance; }
    const hostile = FB.standingOf(s, { kind:'character', id:lord.id });
    const disputed = h.dispute && h.dispute.lordId === lord.id;
    const funds = h.treasury;
    const result = FB.runAbbeyAction(s, h, 'mediate');
    const repeated = FB.runAbbeyAction(s, h, 'mediate');
    return { arrived:arrival.accepted, disputed:disputed, before:before, hostile:hostile,
      mediated:!!result, repeated:repeated, cleared:!h.dispute, paid:funds - h.treasury };
  });
  expect(result).toMatchObject({ arrived:true, disputed:true, mediated:true, repeated:false, cleared:true, paid:4 });
  expect(result.hostile).toBeLessThan(result.before);
});

test('hospitality capacity and refusals prevent repeated invitations', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, h = window.abbeyTestElect(), chance = FB.chance;
    const guests = [20, 25, 30, 35].map(function (age) { return window.abbeyTestGuest(age, 'Noble guest'); });
    let refusal, retry, full, fourth;
    try {
      FB.chance = function () { return false; };
      refusal = FB.inviteAbbeyResident(s, h, guests[0], 'guest');
      retry = FB.inviteAbbeyResident(s, h, guests[0], 'guest');
      s.turn += 180; FB.chance = function () { return true; };
      guests.slice(0, 3).forEach(function (g) { FB.inviteAbbeyResident(s, h, g, 'guest'); });
      full = FB.inviteAbbeyResident(s, h, guests[3], 'guest');
      h.privileges.push('royal');
      fourth = FB.inviteAbbeyResident(s, h, guests[3], 'guest');
    } finally { FB.chance = chance; }
    return { refusal:refusal.accepted, retry:retry, full:full, fourth:fourth.accepted,
      residents:h.residents.length, upkeep:FB.abbeyFinance(s, h).upkeep };
  });
  expect(result).toEqual({ refusal:false, retry:false, full:false, fourth:true, residents:4, upkeep:12 });
});

test('privileges have costs and cooldowns and add concrete capacity and income after 1100', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, h = window.abbeyTestElect();
    s.date.year = 1150; s.turn += 360; h.support = 80; h.treasury = 200;
    const q = FB.abbeyPrivilegeStatus(s, h, 'royal');
    const chance = FB.chance;
    let refusal, accepted, papal;
    try {
      FB.chance = function () { return false; };
      refusal = FB.seekAbbeyPrivilege(s, h, 'royal');
      const blocked = FB.seekAbbeyPrivilege(s, h, 'royal');
      if (blocked !== false) throw new Error('Privilege petition repeated during cooldown');
      s.turn += 720;
      FB.chance = function () { return true; };
      accepted = FB.seekAbbeyPrivilege(s, h, 'royal');
      FB.ensurePapacy(s);
      papal = FB.seekAbbeyPrivilege(s, h, 'papal');
    } finally { FB.chance = chance; }
    return { ready:q.ready, refusal:refusal.accepted, accepted:accepted.accepted, papal:papal.accepted,
      treasury:h.treasury, privilege:h.privileges, income:FB.abbeyIncome(s),
      retinue:FB.abbeyRetinue(s), station:FB.stationOf(s.chars[s.player.charId]),
      prestige:FB.rankPrestigeYearly(s).religious, duplicate:FB.seekAbbeyPrivilege(s, h, 'royal') };
  });
  expect(result).toMatchObject({ ready:true, refusal:false, accepted:true, papal:true, treasury:110,
    privilege:['royal','papal'], income:10, retinue:120, station:4, prestige:40, duplicate:false });
});

test('abbey season settles its allowance once and ends unsupported hospitality', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, h = window.abbeyTestElect();
    const f = FB.abbeyFinance(s, h), before = h.treasury;
    const tax = FB.playerTaxParts(s);
    s.turn += 90; FB.abbeySeason(s);
    const settled = h.treasury;
    FB.abbeySeason(s);
    const duplicate = h.treasury;
    const guest = window.abbeyTestGuest(22, 'Unsupported guest'), chance = FB.chance;
    try { FB.chance = function () { return true; }; FB.inviteAbbeyResident(s, h, guest, 'guest'); }
    finally { FB.chance = chance; }
    const hosted = h.residents.length;
    h.treasury = 0; h.rents = 0; h.capital = 0;
    const broke = FB.abbeyFinance(s, h);
    s.turn += 90; FB.abbeySeason(s);
    return { before:before, expected:f.balance, settled:settled, duplicate:duplicate,
      ledger:tax.abbey, broke:broke.allowance, hosted:hosted, remaining:h.residents.length };
  });
  expect(result.settled - result.before).toBeCloseTo(result.expected);
  expect(result.duplicate).toBe(result.settled);
  expect(result.ledger).toBe(6);
  expect(result.broke).toBe(0);
  expect(result.hosted).toBe(1);
  expect(result.remaining).toBe(0);
});

for (const retirement of [true, false]) {
test((retirement ? 'retirement' : 'death') + ' preserves the house without inheriting its office', async function ({ page }) {
  const result = await page.evaluate(function (retiring) {
    const s = FB.state, p = s.player, old = s.chars[p.charId];
    const h = FB.foundAbbey(s); window.abbeyTestElect();
    const heir = FB.makeCharacter(s, { sex:'f', culture:old.culture, religion:'catholic',
      born:s.date.year - 25, dyn:old.dyn, motherId:old.id, station:2, traitsN:0 });
    old.childrenIds.push(heir.id); FB.touchFamily();
    p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
    const capital = h.capital, patron = h.patronDyn;
    if (!retiring) { FB.game.die('Abbey succession test'); FB.ui.closeModal(); }
    FB.game.succeedTo(heir.id, { livingAbdication:retiring });
    const after = { tier:p.tier, holder:h.holderId, plots:p.landPlots.length,
      capital:h.capital, patron:h.patronDyn, inherited:!!FB.abbeyOf(s, heir) };
    s.turn += FBDATA.abbeys.vacancyDays + 90;
    FB.abbeySeason(s);
    const next = s.chars[h.holderId];
    FB.killChar(s, next);
    return { after:after, capital:capital, patron:patron,
      elected:next && next.id !== heir.id && next.abbeyVows,
      vacantAgain:h.holderId === null };
  }, retirement);
  expect(result.after).toMatchObject({ tier:2, holder:null, plots:1, inherited:false });
  expect(result.after.capital).toBe(result.capital);
  expect(result.after.patron).toBe(result.patron);
  expect(result.elected).toBe(true);
  expect(result.vacantAgain).toBe(true);
});
}

test('old rank-only abbesses acquire no estate during repair', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId];
    c.religiousRanks.catholic_monastic = 3; s.player.flags.abbot = 1;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.repairAbbeys(s);
    return { house:FB.abbeyOf(s), state:!!s.abbeys,
      rng:FB.getRngState() === rng, uid:FB.getUidCounter() === uid,
      candidate:FB.abbeyAppointmentStatus(s, null, c).ready };
  });
  expect(result).toEqual({ house:null, state:false, rng:true, uid:true, candidate:true });
});

test('leaving the faith before a seasonal update cannot turn a saved abbacy into a barony', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, h = window.abbeyTestElect(), c = s.chars[s.player.charId];
    c.religion = 'muslim';
    const before = FB.getRngState(), uid = FB.getUidCounter();
    FB.repairAbbeys(s);
    const neutral = FB.getRngState() === before && FB.getUidCounter() === uid;
    FB.ensureSettlementLordships(s);
    return { holder:h.holderId, tier:s.player.tier, vows:!!c.abbeyVows,
      sites:FB.directSettlements(s).length, neutral:neutral, income:FB.abbeyIncome(s) };
  });
  expect(result).toEqual({ holder:null, tier:2, vows:true, sites:0, neutral:true, income:0 });
});

test('a qualified daughter of another dynasty can be nominated without receiving family property', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], h = FB.foundAbbey(s);
    c.born = s.date.year - 60;
    const daughter = FB.makeCharacter(s, { sex:'f', religion:'catholic', culture:c.culture,
      born:s.date.year - 35, motherId:c.id, dyn:'Another dynasty', station:2, traitsN:0 });
    daughter.skills.lea = 12; daughter.skills.ste = 12;
    daughter.spouseId = null; daughter.betrothedId = null;
    c.childrenIds.push(daughter.id); FB.touchFamily();
    const q = FB.abbeyAppointmentStatus(s, h, daughter), chance = FB.chance;
    let elected;
    try { FB.chance = function () { return true; }; elected = FB.seekAbbeyAppointment(s, h, daughter); }
    finally { FB.chance = chance; }
    return { ready:q.ready, accepted:elected.accepted, holder:h.holderId === daughter.id,
      playerOffice:!!FB.abbeyOf(s), tier:s.player.tier, candidateVows:!!daughter.abbeyVows,
      playerVows:!!c.abbeyVows, patron:h.patronDyn === c.dyn };
  });
  expect(result).toEqual({ ready:true, accepted:true, holder:true, playerOffice:false,
    tier:2, candidateVows:true, playerVows:false, patron:true });
});

test('save restore preserves offices, vows and endowments without RNG or land grants', async function ({ page }) {
  const result = await page.evaluate(function () {
    let s = FB.state;
    const h = window.abbeyTestElect();
    FB.endowAbbey(s, h);
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); s = FB.state;
    const before = FB.getRngState(), uid = FB.getUidCounter();
    FB.repairAbbeys(s);
    const restored = FB.abbeyOf(s);
    return { capital:restored.capital, rank:s.chars[s.player.charId].religiousRanks.catholic_monastic,
      vows:FB.papacyCelibateSnapshot(s, s.chars[s.player.charId]),
      sites:FB.directSettlements(s).length, rng:FB.getRngState() === before,
      uid:FB.getUidCounter() === uid, version:saved.v,
      ledger:Object.keys(FBDATA.techImpactReviews.features).filter(function (id) { return id.indexOf('abbey_') === 0; }).every(function (id) {
        return FBDATA.techImpactReviews.features[id].mode === 'none';
      }) };
  });
  expect(result).toMatchObject({ capital:100, rank:3, vows:true, sites:0, rng:true, uid:true, version:3, ledger:true });
});

test('the Work election discloses vows and opens the endowed office after acceptance', async function ({ page }) {
  await page.evaluate(function () {
    window.abbeySavedChance = FB.chance;
    FB.chance = function () { return true; };
    FB.ui.showCareerPicker(FB.state.player.charId);
  });
  await page.locator('#career-religious').click();
  await expect(page.locator('#gm-title')).toHaveText('Seek election as abbess');
  await expect(page.locator('#gm-body')).toContainText('permanent religious vows');
  await page.locator('#abbey-confirm').click();
  await expect(page.locator('[data-religious-office-result]')).toBeVisible();
  await page.evaluate(function () { FB.chance = window.abbeySavedChance; });
  await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
  await page.locator('#office-result-continue').click();
  await expect(page.locator('#abbey-residents')).toBeVisible();
  const result = await page.evaluate(function () {
    return { office:!!FB.abbeyOf(FB.state), vows:!!FB.state.chars[FB.state.player.charId].abbeyVows };
  });
  expect(result).toEqual({ office:true, vows:true });
});

for (const width of [390, 1280]) {
  test('abbey reviews and character sheets preserve position at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:720 });
    await page.evaluate(function () {
      const h = window.abbeyTestElect(); h.support = 80; h.treasury = 200;
      FB.ui.showAbbeys(h.id);
    });
    const rents = page.locator('#abbey-action-rents');
    await rents.scrollIntoViewIfNeeded();
    await rents.focus();
    const top = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    expect(top).toBeGreaterThan(0);
    await rents.click();
    await expect(page.locator('#abbey-confirm')).toBeVisible();
    await page.locator('#abbey-back').click();
    await expect(rents).toBeVisible();
    await expect.poll(async function () {
      return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    }).toBe(top);
    await rents.click();
    await page.locator('[id^="abbey-person-"]').scrollIntoViewIfNeeded();
    const reviewTop = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    await page.locator('[id^="abbey-person-"]').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#abbey-confirm')).toBeVisible();
    await expect.poll(async function () {
      return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    }).toBe(reviewTop);
    /* The footer Back must return to the retained review, not close the modal. */
    await page.locator('[id^="abbey-person-"]').click();
    await expect(page.locator('#cm-close')).toHaveText('Back');
    await page.locator('#cm-close').click();
    await expect(page.locator('#abbey-confirm')).toBeVisible();
    await expect.poll(async function () {
      return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    }).toBe(reviewTop);
    const overflow = await page.locator('#gm-body').evaluate(function (el) { return el.scrollWidth - el.clientWidth; });
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('changed terms replace the abbey review in place', async function ({ page }) {
  await page.evaluate(function () {
    const h = window.abbeyTestElect(); h.treasury = 200;
    FB.ui.showAbbeys(h.id);
  });
  await page.locator('#abbey-action-relief').click();
  await expect(page.locator('#abbey-confirm')).toBeEnabled();
  await page.evaluate(function () { FB.abbeyOf(FB.state).treasury = 0; });
  await page.locator('#abbey-confirm').click();
  await expect(page.locator('#gm-body .warnote')).toContainText('The terms changed');
  await expect(page.locator('#abbey-confirm')).toBeDisabled();
  await expect(page.locator('#gm-body')).toContainText('Abbey treasury needs');
  /* One Cancel reaches the house sheet: the stale review left no history entry. */
  await page.locator('#abbey-back').click();
  await expect(page.locator('#abbey-action-relief')).toBeVisible();
  await expect(page.locator('#abbey-confirm')).toHaveCount(0);
});

test('after an estate action the refreshed sheet goes Back to the house list', async function ({ page }) {
  const pid = await page.evaluate(function () {
    const h = window.abbeyTestElect(); h.treasury = 200;
    FB.ui.showAbbeys(h.id);
    return h.provinceId;
  });
  await page.locator('#abbey-action-relief').click();
  await expect(page.locator('#gm-body')).toContainText('Abbey treasury');
  await page.locator('#abbey-confirm').click();
  await expect(page.locator('[data-religious-office-result]')).toBeVisible();
  await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
  await page.locator('#office-result-continue').click();
  await expect(page.locator('#abbey-action-relief')).toBeVisible();
  await expect(page.locator('#abbey-back')).toHaveText('Back');
  await page.locator('#abbey-back').click();
  await expect(page.locator('#gm-title')).toHaveText('Abbeys and patronage');
  await expect(page.locator('#abbey-open-' + pid)).toBeVisible();
});

test('blocked election candidates stay listed, filter by state and review every requirement', async function ({ page }) {
  const cid = await page.evaluate(function () {
    const s = FB.state, h = FB.foundAbbey(s);
    s.chars[s.player.charId].skills.lea = 1;
    FB.ui.showAbbeys(h.id);
    return s.player.charId;
  });
  await page.locator('#abbey-candidates').click();
  const row = page.locator('#abbey-candidate-' + cid);
  await expect(row).toBeVisible();
  await expect(row).toContainText('Learning 9');
  await expect(row).toContainText('Unavailable');
  await page.locator('[data-list-filter="available"]').click();
  await expect(row).toBeHidden();
  await page.locator('[data-list-filter="unavailable"]').click();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.locator('#abbey-confirm')).toBeDisabled();
  await expect(page.locator('#gm-body')).toContainText('Candidate');
  await expect(page.locator('#gm-body')).toContainText('Learning 9');
  await page.locator('#abbey-back').click();
  await expect(row).toBeVisible();
  await expect(page.locator('[data-list-filter="unavailable"]')).toHaveAttribute('aria-pressed', 'true');
});

test('endowment cards and reviews share one label and cost', async function ({ page }) {
  await page.evaluate(function () {
    const h = window.abbeyTestElect();
    FBDATA.abbeys.donation = 70;
    FB.ui.showAbbeyEndowments(h.id);
  });
  await expect(page.locator('#abbey-endow-0')).toContainText('Endow');
  await expect(page.locator('#abbey-endow-0')).toContainText('70');
  await page.locator('#abbey-endow-0').click();
  await expect(page.locator('#gm-title')).toContainText('Endow');
  await expect(page.locator('#gm-body')).toContainText('Family funds');
  await expect(page.locator('#gm-body')).toContainText('70');
});

test('estate action text and effects read the same data record', async function ({ page }) {
  await page.evaluate(function () {
    FBDATA.abbeys.actions.rents.treasury = 11;
    FBDATA.abbeys.actions.rents.support = -3;
    const h = window.abbeyTestElect(); h.support = 80;
    FB.ui.showAbbeys(h.id);
  });
  await expect(page.locator('#abbey-action-rents')).toContainText('+');
  await expect(page.locator('#abbey-action-rents')).toContainText('11');
  await expect(page.locator('#abbey-action-rents')).toContainText('−3');
  const result = await page.evaluate(function () {
    const s = FB.state, h = FB.abbeyOf(s), treasury = h.treasury, support = h.support;
    FB.runAbbeyAction(s, h, 'rents');
    return { gained:h.treasury - treasury, support:h.support - support };
  });
  expect(result).toEqual({ gained:11, support:-3 });
});

test('the Self entry describes the abbey sheet and opens it', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showTab('char'); });
  const entry = page.locator('#self-abbeys');
  await expect(entry).toContainText('⛪');
  await expect(entry.locator('.adesc')).toContainText('Found or endow a religious house');
  await entry.click();
  await expect(page.locator('#gm-title')).toHaveText('Abbeys and patronage');
  await expect(page.locator('#abbey-back')).toHaveText('Close');
});
