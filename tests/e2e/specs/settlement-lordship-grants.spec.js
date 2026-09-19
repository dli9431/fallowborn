'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/util.js',
  'js/lordships.js', 'js/actions.js', 'js/events.js', 'js/armies.js', 'js/main.js',
  'js/treasury.js', 'js/world.js', 'js/model.js', 'js/items.js', 'js/population.js', 'js/modifiers.js',
  'js/technology.js', 'js/ui_modals.js', 'js/ui_misc.js', 'js/ui_panels.js', 'js/mapview.js',
  'data/map_data.js', 'data/actions.js', 'data/technology.js', 'data/events_war.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 2; p.provs = []; p.lineDepth = 1; p.gentryGeneration = 0;
    p.gold = 10000; p.prestige = 1000; p.piety = 100;
    s.dev[p.provinceId] = 8;
    FB.rememberSettlementSites(s, p.provinceId);
    const lord = FB.getRole(s, 'lord', true);
    FB.adjustStanding(s, { kind:'character', id:lord.id },
      100 - FB.standingOf(s, { kind:'character', id:lord.id }), 'test:grant');
  });
});

for (const width of [390, 1280]) {
  test('Grant Land offers settlements to a single-county ruler and retains navigation at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    const setup = await page.evaluate(function () {
      const s = FB.state, p = s.player, pid = p.provinceId, me = s.chars[p.charId];
      p.tier = 4; p.provs = [pid]; p.liege = null;
      s.owner[pid] = 'player'; s.holder[pid] = 'player';
      FB.foundPlayerRealm(s); FB.invalidateSettlementLordships(s, pid);
      const c = FB.makeCharacter(s, { name:'Settlement Candidate', station:2,
        born:s.date.year - 30, culture:me.culture, religion:me.religion, traits:[] });
      c.homeProvinceId = pid;
      const sites = FB.settlementGrantSites(s, pid, 'player');
      const slot = sites[sites.length - 1].settlement;
      s.buildings[pid] = [{ s:slot, id:'mill' }];
      FB.invalidateBuildingIndex(s, pid);
      const income = FB.settlementFiscalProjection(s, pid, slot).amounts.net;
      const status = FB.instantStatus(s, 'grant_land');
      FB.runInstant(s, 'grant_land');
      return { pid:pid, cid:c.id, count:sites.length, ready:status.can,
        gold:p.gold, turn:s.turn, slot:slot,
        summary:FB.T('Buildings: {count} · Net income / season: {money:amount}', { count:1, amount:income }) };
    });
    expect(setup.ready).toBe(true);
    expect(setup.count).toBeGreaterThan(0);
    await expect(page.locator('#gm-title')).toHaveText('Grant Land');
    await expect(page.locator('[data-grant-land-site]')).toHaveCount(setup.count);
    await expect(page.locator('[data-grant-land-slot="0"]')).toHaveCount(0);
    const selector = '[data-grant-land-site="' + setup.pid +
      '"][data-grant-land-slot="' + setup.slot + '"]';
    const site = page.locator(selector);
    await expect(site.locator('.adesc')).toHaveText(setup.summary);
    await site.focus();
    const scroll = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    // Repeated entry must retain the actual parent, not append a recipient view
    // behind a newly rendered Grant Land sheet. Exercise footer and browser Back.
    await site.evaluate(function (el) { el.dataset.retainedGrantOrigin = 'yes'; });
    for (const back of ['footer', 'browser']) {
      await site.press('Enter');
      await expect(page.locator('#grant-search')).toBeVisible();
      if (back === 'footer') await page.locator('#grant-back').click();
      else await page.evaluate(function (width) {
        if (width === 390) window.history.back();
        else FB.ui.backModal();
      }, width);
      await expect(page.locator('#gm-title')).toHaveText('Grant Land');
      await expect(site).toHaveAttribute('data-retained-grant-origin', 'yes');
      await expect(site).toBeFocused();
      await expect.poll(async function () {
        return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
      }).toBe(scroll);
    }
    await site.press('Enter');
    await page.locator('#grant-search').fill('Settlement Candidate');
    const recipient = page.locator('[data-grant-recipient="' + setup.cid + '"]');
    if (width === 390) {
      const shell = recipient.locator('..');
      const help = shell.locator('.settcard-info');
      await help.scrollIntoViewIfNeeded();
      const bounds = await shell.evaluate(function (shell) {
        const help = shell.querySelector('.settcard-info').getBoundingClientRect();
        const card = shell.querySelector('.person-assignment-card').getBoundingClientRect();
        const bounds = shell.getBoundingClientRect();
        const hit = document.elementFromPoint(help.left + help.width / 2, help.top + help.height / 2);
        return { helpLeft:help.left, right:help.right, height:bounds.height,
          bottom:help.bottom, cardRight:card.right, shellRight:bounds.right,
          shellBottom:bounds.bottom, reachable:!!hit && hit.closest('.settcard-info') !== null };
      });
      expect(bounds.helpLeft).toBeGreaterThanOrEqual(bounds.cardRight);
      expect(bounds.right).toBeLessThanOrEqual(bounds.shellRight);
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.shellBottom);
      expect(bounds.height).toBeLessThan(120);
      expect(bounds.reachable).toBe(true);
      await help.click();
      await expect(shell.locator('.person-assignment-details')).toBeVisible();
      await help.click();
    }
    await recipient.press('Enter');
    await expect(page.locator('[data-settlement-grant-summary]')).toContainText('Upkeep transferred');
    await page.locator('#grant-cancel').click();
    await expect(page.locator('#gm-title')).toHaveText('Grant Land');
    await expect(page.locator('#grant-search')).toHaveCount(0);
    await expect(site).toBeFocused();
    await expect.poll(async function () {
      return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    }).toBe(scroll);
    await site.press('Enter');
    await page.locator('#grant-search').fill('Settlement Candidate');
    await recipient.click();
    await page.locator('#grant-confirm').click();
    expect(await page.evaluate(function (setup) {
      const s = FB.state;
      return { holder:FB.settlementHolder(s, setup.pid, setup.slot),
        counties:s.player.provs, gold:s.player.gold, turn:s.turn };
    }, setup)).toEqual({ holder:{ kind:'character', id:setup.cid },
      counties:[setup.pid], gold:setup.gold, turn:setup.turn });
    await page.locator('#grant-cancel').click();
    await expect(page.locator('#gm-title')).toHaveText('Grant Land');
    await expect(page.locator(selector)).toHaveCount(0);
    await expect(page.locator('[data-grant-land-site]')).toHaveCount(setup.count - 1);
    const summaries = await page.evaluate(function () {
      return Array.from(document.querySelectorAll('[data-grant-land-site]')).map(function (button) {
        const pid = button.dataset.grantLandSite, slot = Number(button.dataset.grantLandSlot);
        return { actual:button.querySelector('.adesc').textContent,
          expected:FB.T('Buildings: {count} · Net income / season: {money:amount}', {
            count:0, amount:FB.settlementFiscalProjection(FB.state, pid, slot).amounts.net
          }) };
      });
    });
    for (const row of summaries) expect(row.actual).toBe(row.expected);
  });
}

for (const width of [390, 1280]) {
  test('county settlement names and holders wrap within the panel at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId, me = s.chars[s.player.charId];
      const baron = FB.makeCharacter(s, { name:'Argilo', dyn:'of Barcelona and Llobregat',
        born:s.date.year - 30, station:3, culture:me.culture, religion:me.religion, traits:[] });
      FB.assignSettlementLordship(s, pid, 1, baron.id);
      FB.world.sitesByProv[pid].list[1].name = 'L\u2019Hospitalet de Llobregat';
      FB.ui.selectProvince(pid);
    });
    const row = page.locator('.land-settlements [data-sett="1"]');
    await expect(row).toBeVisible();
    await expect(row).toContainText('L\u2019Hospitalet de Llobregat');
    await expect(row.locator('.adesc')).toContainText('Barony of');
    expect(await row.evaluate(function (button) {
      const section = button.closest('.land-section').getBoundingClientRect();
      const box = button.getBoundingClientRect();
      const name = button.querySelector('.settlink-name').getBoundingClientRect();
      const holder = button.querySelector('.adesc').getBoundingClientRect();
      return box.left >= section.left && box.right <= section.right &&
        button.scrollWidth <= button.clientWidth && holder.top >= name.bottom && box.height >= 44;
    })).toBe(true);
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#gm-title')).toContainText('L\u2019Hospitalet de Llobregat');
  });
}

test('baron character sheets show linked spouses and children with a retained return', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  const ids = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    function person(name, years) {
      return FB.makeCharacter(s, { name:name, station:2, born:s.date.year - years,
        culture:me.culture, religion:me.religion, traits:[] });
    }
    const baron = person('Family Baron', 40), spouse = person('Baron Spouse', 38);
    const child = person('Baron Child', 15), deadChild = person('Deceased Child', 20);
    baron.spouseId = spouse.id; spouse.spouseId = baron.id;
    child.fatherId = baron.id; deadChild.fatherId = baron.id; deadChild.dead = true;
    FB.assignSettlementLordship(s, s.player.provinceId, 1, baron.id);
    FB.ui.showCharModal(baron.id);
    return { spouse:spouse.id, child:child.id };
  });
  await expect(page.locator('[data-baron-family] button')).toHaveCount(2);
  await expect(page.locator('[data-baron-family-cid="' + ids.spouse + '"]')).toContainText('Baron Spouse');
  const child = page.locator('[data-baron-family-cid="' + ids.child + '"]');
  await expect(child).toContainText('age 15');
  await child.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#gm-title')).toContainText('Baron Child');
  await page.locator('#cm-close').click();
  await expect(page.locator('#gm-title')).toContainText('Family Baron');
  await expect(child).toBeFocused();
});

for (const width of [390, 1280]) {
test('married Freeholder kin grant returns to their character sheet at width ' + width, async function ({ page }) {
  await page.setViewportSize({ width:width, height:844 });
  const cid = await page.evaluate(function () {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    p.tier = 4; p.provs = [p.provinceId]; p.liege = null;
    FB.foundPlayerRealm(s);
    const child = FB.makeCharacter(s, { name:'Grant Heir', station:1, fatherId:me.id,
      born:s.date.year - 25, culture:me.culture, religion:me.religion, traits:[] });
    const spouse = FB.makeCharacter(s, { name:'Spouse', station:2,
      born:s.date.year - 25, culture:me.culture, religion:me.religion, traits:[] });
    child.spouseId = spouse.id; spouse.spouseId = child.id;
    child.homeProvinceId = Object.keys(s.owner).find(function (pid) { return pid !== p.provinceId; });
    window.grantKin = child.id;
    FB.ui.showCharModal(child.id);
    return child.id;
  });
  const grant = page.locator('[data-interaction-action="management.settlement.grant"]');
  await grant.focus();
  const scroll = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
  await grant.press('Enter');
  await page.locator('[data-character-grant-site]').first().click();
  await page.locator('#grant-cancel').click();
  await expect(page.locator('#gm-title')).toContainText('Grant Heir');
  await expect(page.locator('[data-character-grant-site]')).toHaveCount(0);
  await expect(grant).toBeFocused();
  await expect.poll(async function () {
    return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
  }).toBe(scroll);
  await grant.press('Enter');
  await page.locator('[data-character-grant-site]').first().click();
  await expect(page.locator('#gm-title')).toContainText('Review settlement grant');
  await page.locator('#grant-confirm').click();
  await page.locator('#grant-cancel').click();
  await expect(page.locator('#gm-title')).toContainText('Grant Heir');
  await expect(grant).toBeFocused();
  const site = await page.evaluate(function (id) {
    const site = FB.directSettlements(FB.state, { kind:'character', id:id })[0];
    FB.ui.showSettlement(site.provinceId, site.settlement);
    return site;
  }, cid);
  expect(site.settlement).toBeGreaterThan(0);
  await page.locator('#settlement-holder-link').click();
  await expect(page.locator('#gm-title')).toContainText('Grant Heir');
});
}

test('a petition conveys the eligible manor site and local works while retaining private property and county borders', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    p.manor = { provinceId:pid, settlement:1 };
    s.buildings[pid] = [{ s:1, id:'mill' }]; FB.invalidateBuildingIndex(s, pid);
    const property = JSON.stringify([p.manor, p.landPlots, p.enterprises, p.holdings, s.owner, s.holder]);
    const status = FB.rankElevationStatus(s, null, { route:'barony' });
    const ctx = FB.rankElevationContext(s, status), gold = p.gold;
    const claimed = FB.claimRankElevation(s, ctx);
    return { claimed:claimed, site:ctx.siteSettlement, tier:p.tier,
      controlled:FB.settlementConstructionAuthority(s, pid, 1).direct,
      seat:FB.settlementHolder(s, pid, 0), count:FB.settlementCountyHolder(s, pid),
      liege:p.liege, spent:gold - p.gold, cost:status.cost.gold,
      property:property === JSON.stringify([p.manor, p.landPlots, p.enterprises, p.holdings, s.owner, s.holder]),
      works:status.settlementGrant.buildings.map(function (b) { return b.id; }),
      net:FB.settlementFiscalProjection(s, pid, 1).amounts.net, quoted:status.settlementGrant.net };
  });
  expect(r.claimed).toBe(true); expect(r.site).toBe(1); expect(r.tier).toBe(3);
  expect(r.controlled).toBe(true); expect(r.seat).toEqual({ kind:'realm', id:r.count });
  expect(r.liege).toBe(r.count); expect(r.spent).toBe(r.cost); expect(r.property).toBe(true);
  expect(r.works).toEqual(['mill']); expect(r.net).toBeCloseTo(r.quoted, 8);
});

test('eligibility, refusal, stale offers and blocked payment never create or charge a barony', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    p.gentryGeneration = p.lineDepth;
    const unestablished = FB.rankElevationStatus(s, null, { route:'barony' });
    p.gentryGeneration = 0;
    const status = FB.rankElevationStatus(s, null, { route:'barony' });
    const ctx = FB.rankElevationContext(s, status), gold = p.gold;
    const chance = FB.chance;
    let refused;
    try { FB.chance = function () { return false; }; refused = FB.attemptRankElevation(s, 'barony', ctx); }
    finally { FB.chance = chance; }
    const noRefusalCharge = p.gold === gold && p.tier === 2;
    delete p.cooldowns.petition_barony;
    const refreshed = FB.rankElevationContext(s, FB.rankElevationStatus(s, null, { route:'barony' }));
    const me = s.chars[p.charId];
    const other = FB.makeCharacter(s, { station:3, culture:me.culture, religion:me.religion,
      born:s.date.year - 25, traits:[] });
    FB.assignSettlementLordship(s, pid, refreshed.siteSettlement, other.id);
    const stale = FB.attemptRankElevation(s, 'barony', refreshed);
    const next = FB.rankElevationStatus(s, null, { route:'barony' });
    const nextCtx = FB.rankElevationContext(s, next);
    p.gold = 0;
    const poor = FB.claimRankElevation(s, nextCtx);
    for (let i = 1; i < FB.settlementVisibleCount(s, pid); i++) {
      if (!FB.settlementLordship(s, pid, i)) FB.assignSettlementLordship(s, pid, i, other.id);
    }
    p.manor = { provinceId:pid, settlement:0 };
    const unavailable = FB.rankElevationStatus(s, null, { route:'barony' });
    return { unestablished:unestablished.eligible, refused:refused.attempted && !refused.claimed,
      noRefusalCharge:noRefusalCharge, stale:stale.attempted, poor:poor,
      tier:p.tier, unavailable:unavailable.ready, reason:unavailable.reason,
      seat:FB.settlementHolder(s, pid, 0).kind, gold:p.gold };
  });
  expect(r.unestablished).toBe(false); expect(r.refused).toBe(true); expect(r.noRefusalCharge).toBe(true);
  expect(r.stale).toBe(false); expect(r.poor).toBe(false); expect(r.tier).toBe(2);
  expect(r.unavailable).toBe(false); expect(r.reason).toContain('county seat');
  expect(r.seat).toBe('realm'); expect(r.gold).toBe(0);
});

test('count grants transfer upkeep, disclose capacity relief and preserve paired dues', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId, me = s.chars[p.charId];
    p.tier = 4; p.provs = [pid]; s.owner[pid] = 'player'; s.holder[pid] = 'player';
    FB.foundPlayerRealm(s); FB.invalidateSettlementLordships(s, pid);
    const c = FB.makeCharacter(s, { name:'Grant Recipient', station:2, born:s.date.year - 30,
      culture:me.culture, religion:me.religion, traits:[] });
    c.homeProvinceId = pid;
    const child = FB.makeCharacter(s, { station:2, born:s.date.year - 10,
      culture:me.culture, religion:me.religion, traits:[] });
    FBDATA.buildings.grant_test = { name:'Grant test', cost:50, tax:5, upkeep:2 };
    s.buildings[pid] = [{ s:1, id:'grant_test' }]; FB.invalidateBuildingIndex(s, pid);
    const before = FB.settlementActorFiscal(s, 'player');
    const q = FB.settlementGrantQuote(s, pid, 1, c.id, 'player');
    const gold = p.gold, turn = s.turn;
    const granted = FB.confirmSettlementGrant(s, q);
    const after = FB.settlementActorFiscal(s, 'player');
    const baron = FB.settlementActorFiscal(s, { kind:'character', id:c.id });
    return { granted:granted, child:FB.settlementGrantRecipient(s, child.id, 'player'),
      seat:FB.settlementGrantQuote(s, pid, 0, c.id, 'player'),
      released:before.upkeep - after.upkeep, quoted:q.upkeep, expected:q.dues,
      received:after.duesIn - before.duesIn, paid:baron.duesOut,
      relief:q.directBefore - q.directAfter, station:c.station,
      noCost:gold === p.gold && turn === s.turn, twice:FB.confirmSettlementGrant(s, q) };
  });
  expect(r.granted).toBe(true); expect(r.child).toBe(false); expect(r.seat).toBeNull();
  expect(r.released).toBe(r.quoted); expect(r.received).toBeCloseTo(r.expected, 8);
  expect(r.paid).toBeCloseTo(r.expected, 8); expect(r.relief).toBe(1);
  expect(r.station).toBe(3); expect(r.noCost).toBe(true); expect(r.twice).toBe(false);
});

test('military rewards require their exact available settlement and never fall back to a landless title', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    const rid = FB.settlementCountyHolder(s, pid), site = FB.baronyPetitionSite(s);
    const grant = FB.settlementGrantQuote(s, pid, site.settlement, p.charId, rid);
    const ctx = { protagonistId:p.charId, realmId:rid, settlementGrant:grant };
    const firstLife = p.gentryGeneration = p.lineDepth;
    const valid = FB.fns.military_settlement_available(s, ctx);
    const gold = p.gold;
    const granted = FB.fns.military_settlement_grant(s, ctx);
    const noSecond = FB.fns.military_settlement_grant(s, ctx);
    const controlled = FB.settlementConstructionAuthority(s, pid, site.settlement).direct;
    p.tier = 2;
    const next = FB.baronyPetitionSite(s);
    const stale = { protagonistId:p.charId,
      settlementGrant:FB.settlementGrantQuote(s, pid, next.settlement, p.charId, rid) };
    s.buildings[pid] = [{ s:next.settlement, id:'mill' }]; FB.invalidateBuildingIndex(s, pid);
    const rejected = FB.fns.military_settlement_grant(s, stale);
    return { valid:valid, granted:granted, noSecond:noSecond, controlled:controlled,
      noGoldCost:p.gold === gold, rejected:rejected, tier:p.tier,
      firstLife:firstLife === p.lineDepth,
      effect:FB.eventById('military_barony_victory').options[0].effects };
  });
  expect(r.valid).toBe(true); expect(r.granted).toBe(true); expect(r.noSecond).toBe(false);
  expect(r.controlled).toBe(true); expect(r.noGoldCost).toBe(true); expect(r.rejected).toBe(false);
  expect(r.tier).toBe(2); expect(r.firstLife).toBe(true);
  expect(r.effect).toEqual({ custom:'military_settlement_grant' });
});

test('seasonal delegation protects seats and baron development is affordable, bounded and replay-stable', async function ({ page }) {
  const r = await page.evaluate(function () {
    const original = FB.state, pid = original.player.provinceId;
    const rid = FB.settlementCountyHolder(original, pid);
    const realm = original.realms[rid];
    realm.liege = null;
    original.realms = {}; original.realms[rid] = realm;
    original.owner = {}; original.owner[pid] = rid;
    original.holder = {}; original.holder[pid] = rid;
    FB.invalidateSettlementLordships(original);
    FBDATA.buildings.grant_ai_test = { name:'Affordable local work', cost:5, tax:2, upkeep:1 };
    const lord = FB.realmRulerCharacterSnapshot(original, rid);
    if (lord) lord.skills.ste = 0;
    FBDATA.balance.settlementDomainBase = 1;
    // Isolate the existing soft capacity rule from bookmark-specific national bonuses.
    const tech = FB.techBonus;
    FB.techBonus = function (state, key, realm) { return key === 'domain' ? 0 : tech(state, key, realm); };
    const initial = JSON.stringify(original), rng = FB.getRngState(), uid = FB.getUidCounter();
    function run() {
      const s = JSON.parse(initial); FB.state = s; FB.invalidateSettlementLordships(s);
      FB.setRngState(rng); FB.setUidCounter(uid);
      FB.settlementLordshipSeason(s, 1);
      const rows = s.settlementLordships.counties[pid].lordships;
      const slots = Object.keys(rows), cid = rows[slots[0]].holderId;
      FB.settleBaronyAccounts(s, 1);
      const account = s.settlementLordships.accounts[cid]; account.gold = 0;
      const countBefore = (s.buildings[pid] || []).length;
      FB.settlementLordshipSeason(s, 2);
      const noFree = (s.buildings[pid] || []).length === countBefore;
      account.gold = 10000;
      const gold = account.gold;
      const before = (s.buildings[pid] || []).length;
      FB.settlementLordshipSeason(s, 3);
      const added = (s.buildings[pid] || []).length - before;
      const duplicate = FB.settlementLordshipSeason(s, 3);
      return { noFree:noFree, added:added, spent:gold - account.gold, duplicate:duplicate,
        seat:FB.settlementHolder(s, pid, 0), rid:rid,
        serialized:JSON.stringify([s.settlementLordships, s.buildings, FB.getRngState()]) };
    }
    let a, b;
    try { a = run(); b = run(); }
    finally { FB.techBonus = tech; FB.state = original; FB.invalidateSettlementLordships(original); }
    return { noFree:a.noFree, added:a.added, spent:a.spent, duplicate:a.duplicate,
      seat:a.seat, rid:a.rid, deterministic:a.serialized === b.serialized };
  });
  expect(r.noFree).toBe(true); expect(r.added).toBe(1);
  expect(r.spent).toBeGreaterThan(0);
  expect(r.duplicate).toBe(false); expect(r.seat).toEqual({ kind:'realm', id:r.rid });
  expect(r.deterministic).toBe(true);
});

for (const width of [390, 1280]) {
  for (const dismiss of ['close', 'backdrop']) {
    test('revocation ' + dismiss + ' leaves map settlement gestures fresh at width ' + width, async function ({ page }) {
      await page.setViewportSize({ width:width, height:844 });
      const site = await page.evaluate(function () {
        const s = FB.state, p = s.player, pid = p.provinceId, me = s.chars[p.charId];
        p.tier = 4; p.provs = [pid]; s.owner[pid] = 'player'; s.holder[pid] = 'player';
        FB.foundPlayerRealm(s); FB.invalidateSettlementLordships(s, pid);
        const baron = FB.makeCharacter(s, { station:3, born:s.date.year - 30,
          culture:me.culture, religion:me.religion, traits:[] });
        FB.assignSettlementLordship(s, pid, 1, baron.id);
        FB.ui.showSettlement(pid, 1);
        return { pid:pid, name:FB.settlementsOf(s, pid)[0].name,
          holder:FB.settlementHolder(s, pid, 1) };
      });
      await page.locator('#settlement-revoke').click();
      await expect(page.locator('#lordship-change-confirm')).toBeVisible();
      await page.evaluate(function (args) {
        const gm = document.getElementById('genmodal');
        if (args.dismiss === 'close') gm.querySelector('[data-modal-nav="close"]').click();
        else {
          gm.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
          gm.dispatchEvent(new MouseEvent('click', { bubbles:true, detail:1 }));
        }
        if (!gm.classList.contains('hidden')) throw new Error('Dismissal left a modal open');
        // Reopen before pending browser Back events finish. Model the map's
        // pointerup opening and a compatibility click retargeted at the new UI.
        document.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
        const pr = FB.world.byId[args.site.pid];
        FB.map.onTap(pr, pr.cx, pr.cy, { pid:args.site.pid, index:0 });
        document.getElementById('settlement-rename').dispatchEvent(
          new MouseEvent('click', { bubbles:true, cancelable:true, detail:1 }));
      }, { dismiss:dismiss, site:site });
      await expect(page.locator('#gm-title')).toContainText(site.name);
      await expect(page.locator('#settlement-name')).toHaveCount(0);
      await expect(page.locator('[data-modal-nav="back"]')).toBeDisabled();
      // A separate, deliberate gesture still opens Rename and retains Back.
      await page.locator('#settlement-rename').click();
      await expect(page.locator('#settlement-name')).toBeVisible();
      await page.locator('[data-modal-nav="back"]').click();
      await expect(page.locator('#gm-title')).toContainText(site.name);
      await expect(page.locator('[data-modal-nav="back"]')).toBeDisabled();
      expect(await page.evaluate(function (site) {
        return FB.settlementHolder(FB.state, site.pid, 1);
      }, site)).toEqual(site.holder);
    });
  }
}

test('closing an unsubmitted grant lets mobile map taps open settlement sheets afresh', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  const site = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    p.tier = 4; p.provs = [pid]; s.owner[pid] = 'player'; s.holder[pid] = 'player';
    FB.foundPlayerRealm(s); FB.invalidateSettlementLordships(s, pid);
    FB.ui.showSettlement(pid, 1);
    return { pid:pid, name:FB.settlementsOf(s, pid)[1].name,
      holder:FB.settlementHolder(s, pid, 1) };
  });
  await page.locator('#settlement-grant').click();
  await expect(page.locator('#grant-search')).toBeVisible();
  // Open the map destination before asynchronous browser history has unwound.
  await page.evaluate(function (site) {
    document.querySelector('#gm-body [data-modal-nav="close"]').click();
    const pr = FB.world.byId[site.pid];
    FB.map.onTap(pr, pr.cx, pr.cy, { pid:site.pid, index:1 });
  }, site);
  await expect(page.locator('#gm-title')).toContainText(site.name);
  await expect(page.locator('#grant-search')).toHaveCount(0);
  await expect(page.locator('#settlement-grant')).toBeVisible();
  await page.locator('#settlement-grant').click();
  await page.locator('#gm-body [data-modal-nav="close"]').click();
  await expect(page.locator('#genmodal')).toBeHidden();
  await page.evaluate(function (site) {
    const pr = FB.world.byId[site.pid];
    FB.map.onTap(pr, pr.cx, pr.cy, { pid:site.pid, index:1 });
  }, site);
  await expect(page.locator('#gm-title')).toContainText(site.name);
  await expect(page.locator('#grant-search')).toHaveCount(0);
  expect(await page.evaluate(function (site) {
    return FB.settlementHolder(FB.state, site.pid, 1);
  }, site)).toEqual(site.holder);
});

for (const mobile of [false, true]) {
  test('grant review preserves keyboard focus and return position' + (mobile ? ' on mobile' : ''), async function ({ page }) {
    if (mobile) await page.setViewportSize({ width:390, height:844 });
    await page.evaluate(function () {
      const s = FB.state, p = s.player, pid = p.provinceId, me = s.chars[p.charId];
      p.tier = 4; p.provs = [pid]; s.owner[pid] = 'player'; s.holder[pid] = 'player';
      FB.foundPlayerRealm(s); FB.invalidateSettlementLordships(s, pid);
      for (let i = 0; i < 24; i++) {
        const c = FB.makeCharacter(s, { name:'Candidate ' + ('0' + i).slice(-2), station:2,
          born:s.date.year - 30, culture:me.culture, religion:me.religion, traits:[] });
        c.homeProvinceId = pid;
      }
      FB.ui.showSettlement(pid, 1);
    });
    await page.locator('#settlement-grant').focus();
    const originScroll = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    await page.locator('#settlement-grant').press('Enter');
    await page.locator('#grant-search').fill('Candidate');
    if (mobile) {
      const first = page.locator('[data-grant-recipient]:visible').first().locator('..');
      await first.scrollIntoViewIfNeeded();
      const alignment = await first.evaluate(function (card) {
        const face = card.querySelector('.pface').getBoundingClientRect();
        const name = card.querySelector('.person-assignment-name').getBoundingClientRect();
        const standing = card.querySelector('.person-assignment-state').getBoundingClientRect();
        const help = card.querySelector('.settcard-info').getBoundingClientRect();
        const bounds = card.getBoundingClientRect();
        return { faceRight:face.right, nameLeft:name.left, standingLeft:standing.left,
          helpRight:help.right, helpBottom:help.bottom, right:bounds.right, bottom:bounds.bottom };
      });
      expect(alignment.nameLeft).toBeGreaterThanOrEqual(alignment.faceRight + 7);
      expect(alignment.standingLeft).toBe(alignment.nameLeft);
      expect(alignment.helpRight).toBeLessThanOrEqual(alignment.right);
      expect(alignment.helpBottom).toBeLessThanOrEqual(alignment.bottom);
      // Scroll controls across the footer boundary, then verify its hit targets.
      for (const fraction of [0.25, 0.5, 0.75, 1]) {
        await page.locator('#gm-body').evaluate(function (body, fraction) {
          body.scrollTop = (body.scrollHeight - body.clientHeight) * fraction;
        }, fraction);
        const footerClear = await page.locator('#gm-body > .gm-footer').evaluate(function (footer) {
          const r = footer.getBoundingClientRect();
          for (let y = r.top + 4; y < r.bottom; y += 8) {
            for (let x = r.left + 4; x < r.right; x += 8) {
              const hit = document.elementFromPoint(x, y);
              if (hit && hit.closest('.person-assignment-actions')) return false;
            }
          }
          return true;
        });
        expect(footerClear).toBe(true);
      }
    }
    const candidate = page.locator('[data-grant-recipient]:visible').last();
    await candidate.focus();
    await candidate.press('Enter');
    await expect(page.locator('[data-settlement-grant-summary]')).toContainText('Upkeep transferred');
    await expect(page.locator('[data-settlement-grant-summary]')).toContainText('Direct settlements');
    if (mobile) await page.evaluate(function () { window.history.back(); });
    else await page.locator('#grant-cancel').press('Enter');
    await expect(page.locator('#grant-search')).toHaveCount(0);
    await expect(page.locator('#settlement-grant')).toBeFocused();
    await expect.poll(async function () {
      return page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    }).toBe(originScroll);
    await page.locator('#settlement-grant').press('Enter');
    await page.locator('#grant-search').fill('Candidate');
    await page.locator('[data-grant-recipient]:visible').last().click();
    await page.locator('#grant-confirm').click();
    await page.locator('#grant-cancel').click();
    await expect(page.locator('#settlement-holder-link')).toBeVisible();
    await expect(page.locator('#settlement-grant')).toHaveCount(0);
    await expect(page.locator('#grant-search')).toHaveCount(0);
  });
}

test('petition cancellation is free and changed terms require another review', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showRankElevation('barony'); });
  await expect(page.locator('[data-settlement-grant-summary]')).toContainText('Net local income');
  const before = await page.evaluate(function () {
    return { gold:FB.state.player.gold, turn:FB.state.turn };
  });
  await page.locator('#rank-elevation-cancel').click();
  expect(await page.evaluate(function () {
    return { gold:FB.state.player.gold, turn:FB.state.turn };
  })).toEqual(before);
  await page.evaluate(function () {
    FB.ui.showRankElevation('barony');
    FB.state.buildings[FB.state.player.provinceId] = [{ s:1, id:'mill' }];
    FB.invalidateBuildingIndex(FB.state, FB.state.player.provinceId);
  });
  await page.locator('#rank-elevation-confirm').click();
  expect(await page.evaluate(function () {
    return { gold:FB.state.player.gold, turn:FB.state.turn, tier:FB.state.player.tier };
  })).toEqual({ gold:before.gold, turn:before.turn, tier:2 });
  await expect(page.locator('[data-rank-elevation-sheet]')).toBeVisible();
});

test('new Baron initialization grants a non-seat holding or rejects an unavailable site', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    p.tier = 3; p.manor = { provinceId:pid, settlement:0 };
    const fresh = FB.initializeBaronyStart(s);
    const sites = FB.directSettlements(s);
    const owned = sites[0];
    const me = s.chars[p.charId];
    const c = FB.makeCharacter(s, { station:3, culture:me.culture, religion:me.religion,
      born:s.date.year - 30, traits:[] });
    for (let i = 1; i < FB.settlementVisibleCount(s, pid); i++) FB.assignSettlementLordship(s, pid, i, c.id);
    const noSite = FB.initializeBaronyStart(s);
    return { fresh:fresh, nonSeat:owned.settlement > 0, noSite:noSite,
      seat:FB.settlementHolder(s, pid, 0).kind, personal:FB.directSettlements(s).length };
  });
  expect(r.fresh).toBe(true); expect(r.nonSeat).toBe(true); expect(r.noSite).toBe(false);
  expect(r.seat).toBe('realm'); expect(r.personal).toBe(0);
});

test('victory without a remaining grant offers a purse and no territorial promise', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, me = s.chars[s.player.charId];
    const patron = FB.settlementCountyHolder(s, pid);
    const c = FB.makeCharacter(s, { station:3, born:s.date.year - 30,
      culture:me.culture, religion:me.religion, traits:[] });
    for (let i = 1; i < FB.settlementVisibleCount(s, pid); i++) FB.assignSettlementLordship(s, pid, i, c.id);
    const active = FB.activeMilitaryCommand, hostile = FB.armiesHostile;
    try {
      FB.activeMilitaryCommand = function () { return { patronRealmId:patron, sovereignRealmId:patron }; };
      FB.armiesHostile = function () { return true; };
      FB.noteMilitaryCommandVictory(s, { realm:patron }, { realm:'enemy' }, pid);
    } finally { FB.activeMilitaryCommand = active; FB.armiesHostile = hostile; }
    return { tier:s.player.tier, queued:s.eventQueue.map(function (e) { return e.id; }) };
  });
  expect(r.tier).toBe(2); expect(r.queued).toContain('military_victory_purse');
  expect(r.queued).not.toContain('military_barony_victory');
});

test('large-world seasonal work caps grants and funded building projects', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const pids = Object.keys(s.owner).sort().filter(function (pid) {
      return FB.settlementVisibleCount(s, pid) > 1 && FB.settlementCountyHolder(s, pid);
    }).slice(0, 30);
    FBDATA.buildings.grant_budget_test = { name:'Local work', cost:1, tax:1 };
    s.settlementLordships.accounts = {};
    for (const pid of pids) {
      const c = FB.makeCharacter(s, { name:'Budget Baron', station:3, born:s.date.year - 30,
        culture:me.culture, religion:me.religion, traits:[] });
      c.homeProvinceId = pid;
      FB.assignSettlementLordship(s, pid, 1, c.id);
      s.settlementLordships.accounts[c.id] = { gold:10000, lastSeason:0 };
    }
    function grants() {
      let total = 0;
      for (const pid of Object.keys(s.settlementLordships.counties)) {
        total += Object.keys(s.settlementLordships.counties[pid].lordships).length;
      }
      return total;
    }
    function buildings() {
      let total = 0;
      for (const pid of Object.keys(s.buildings)) total += s.buildings[pid].length;
      return total;
    }
    const before = buildings(), oldGrants = grants();
    FB.settlementLordshipSeason(s, 1);
    return { fixtures:pids.length, projects:buildings() - before, grants:grants() - oldGrants,
      allSeatsProtected:pids.every(function (pid) { return !FB.settlementLordship(s, pid, 0); }) };
  });
  expect(r.fixtures).toBe(30); expect(r.projects).toBe(24);
  expect(r.grants).toBeLessThanOrEqual(12); expect(r.allSeatsProtected).toBe(true);
});
