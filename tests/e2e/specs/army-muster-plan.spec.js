'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/main.js', 'js/armies.js', 'js/world.js', 'js/logistics.js', 'js/market.js',
  'js/treasury.js', 'js/population.js', 'js/actions.js', 'js/ui_wars.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'js/ui_panels.js', 'js/keys.js',
  'js/fortifications.js', 'js/wars.js', 'js/holywar.js', 'js/save.js',
  'data/actions.js', 'data/technology.js', 'data/map_data.js', 'data/units.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function setup(page, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state;
    s.armies = []; s.armyDown = {}; s.armyCohorts = {};
    delete s.player.musterSelection; delete s.player.musterFormation;
    s.player.war.mass = 0; s.player.war.mercCos = 0; s.player.war.musterPool = null;
    FB.game.auto.forceSupplies = false; FB.game.auto.buySupplies = true;
    FB.ensureMarket(s);
  });
  return ids;
}

for (const formation of ['gather', 'county']) {
  test('county muster plan conserves selected units and quotes field costs: ' + formation, async function ({ page }, testInfo) {
    await setup(page, testInfo);
    const r = await page.evaluate(function (formation) {
      const s = FB.state, full = FB.playerMusterSelectionQuote(s, null, formation), selection = {};
      full.rows.forEach(function (row) { selection[row.pid] = Math.floor(row.maximum / 2); });
      const quote = FB.playerMusterSelectionQuote(s, selection, formation);
      const before = JSON.stringify([s.player, s.armies, s.armyCohorts, s.market]);
      const rng = FB.getRngState();
      FB.playerMusterSelectionQuote(s, selection, formation);
      const pure = before === JSON.stringify([s.player, s.armies, s.armyCohorts, s.market]) && rng === FB.getRngState();
      FB.savePlayerMusterSelection(s, selection, formation);
      const restored = JSON.parse(JSON.stringify(s));
      const persisted = FB.playerMusterSelectionQuote(restored);
      const gold = s.player.gold, support = full.rows.map(function (row) { return FB.countySupportBase(s, row.pid); });
      FB.raisePlayerHost(s);
      const hosts = s.armies.filter(function (host) { return host.realm === 'player'; });
      const units = {};
      hosts.forEach(function (host) { Object.keys(host.units).forEach(function (key) { units[key] = (units[key] || 0) + host.units[key]; }); });
      const upkeep = hosts.reduce(function (sum, host) { return sum + FB.hostFieldUpkeepParts(s, host).total; }, 0);
      const food = hosts.reduce(function (sum, host) { return sum + FB.armyProvisionCommitment(s, host, 1); }, 0);
      FB.raisePlayerHost(s);
      return { pure:pure, full:full.men, men:quote.men, quotedHosts:quote.hosts,
        persisted:persisted.men === quote.men && persisted.formation === formation,
        units:units, expected:quote.units, count:hosts.length, currentCount:s.armies.length,
        positions:hosts.map(function (host) { return host.at; }).sort(), rally:quote.rally,
        counties:quote.rows.filter(function (row) { return row.selected > 0; }).map(function (row) { return row.pid; }).sort(),
        sizes:hosts.every(function (host) { return host.size === host.men; }),
        upkeep:upkeep, standing:quote.standing, food:food, quotedFood:quote.food,
        goldUnchanged:s.player.gold === gold, supportUnchanged:quote.rows.every(function (row, i) { return FB.countySupportBase(s, row.pid) === support[i]; }) };
    }, formation);
    expect(r.pure).toBe(true); expect(r.persisted).toBe(true);
    expect(r.men).toBeLessThan(r.full); expect(r.men).toBeGreaterThan(0);
    expect(r.units).toEqual(r.expected); expect(r.count).toBe(r.quotedHosts);
    expect(r.currentCount).toBe(r.count); expect(r.sizes).toBe(true);
    expect(r.positions).toEqual(formation === 'gather' ? [r.rally] : r.counties);
    expect(r.upkeep).toBeCloseTo(r.standing); expect(r.food).toBeCloseTo(r.quotedFood);
    expect(r.goldUnchanged).toBe(true); expect(r.supportUnchanged).toBe(true);
  });
}

test('muster plans honor zero calls, per-host minimums, blocked counties and rearm waits', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const r = await page.evaluate(function (ids) {
    const s = FB.state;
    const empty = {}; FB.savePlayerMusterSelection(s, empty, 'gather');
    const zero = FB.raisePlayerHost(s) === null && s.armies.length === 0;
    const small = {}; small[ids.home] = 20; small[ids.second] = 20;
    const separate = FB.playerMusterSelectionQuote(s, small, 'county');
    const gathered = FB.playerMusterSelectionQuote(s, small, 'gather');
    FB.savePlayerMusterSelection(s, small, 'county');
    const minimum = FB.raisePlayerHost(s) === null;
    const full = FB.playerMusterSelectionQuote(s, null, 'gather'), all = {};
    full.rows.forEach(function (row) { all[row.pid] = row.maximum; });
    FB.savePlayerMusterSelection(s, all, 'gather');
    s.armyDown.player = s.turn;
    const delayed = !FB.playerMusterSelectionQuote(s).canRaise && FB.raisePlayerHost(s) === null;
    delete s.armyDown.player;
    const blocked = FB.recruitmentCountyBlocked;
    try {
      FB.recruitmentCountyBlocked = function (state, realm, pid) { return pid === ids.home; };
      const q = FB.playerMusterSelectionQuote(s);
      return { zero:zero, minimum:minimum, separate:separate.valid, gathered:gathered.valid, delayed:delayed,
        blocked:q.rows.every(function (row) { return row.pid !== ids.home; }), rally:q.rally };
    } finally { FB.recruitmentCountyBlocked = blocked; }
  }, ids);
  expect(r.zero).toBe(true); expect(r.minimum).toBe(true);
  expect(r.separate).toBe(false); expect(r.gathered).toBe(true);
  expect(r.delayed).toBe(true); expect(r.blocked).toBe(true); expect(r.rally).toBe(ids.second);
});

test('automatic war footing uses the saved call and leaves old unplanned saves at full strength', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, full = FB.playerMusterPreview(s), selection = {};
    const rows = FB.playerMusterSelectionQuote(s, null).rows;
    rows.forEach(function (row) { selection[row.pid] = Math.floor(row.maximum / 2); });
    FB.raisePlayerHost(s);
    const legacy = s.armies.reduce(function (sum, host) { return sum + host.men; }, 0);
    s.armies = [];
    FB.savePlayerMusterSelection(s, selection, 'county');
    const expected = FB.playerMusterSelectionQuote(s);
    FB.warFooting(s);
    return { legacy:legacy, full:full.men, selected:s.armies.reduce(function (sum, host) { return sum + host.men; }, 0),
      expected:expected.men, hosts:s.armies.length, expectedHosts:expected.hosts };
  });
  expect(r.legacy).toBe(r.full); expect(r.selected).toBe(r.expected);
  expect(r.selected).toBeLessThan(r.full); expect(r.hosts).toBe(r.expectedHosts);
});

for (const width of [390, 1280]) {
  test('muster sheet keeps editing focus, cancels cleanly and confirms the chosen assembly at ' + width, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:width, height:844 });
    await setup(page, testInfo);
    await page.evaluate(function () { window.musterTurn = FB.state.turn; FB.ui.showMusterPlan(); });
    const first = page.locator('[data-muster-county]').first();
    await first.fill('80'); await expect(first).toBeFocused();
    await expect(page.locator('#muster-costs')).toContainText('No immediate loss');
    await expect(page.locator('[aria-controls="muster-call-details"]')).toHaveCount(0);
    await page.locator('#muster-back').click();
    expect(await page.evaluate(function () { return FB.state.player.musterSelection === undefined && FB.state.armies.length === 0 && FB.state.turn === window.musterTurn; })).toBe(true);
    await page.evaluate(function () { FB.ui.showMusterPlan(); });
    await page.locator('[data-muster-percent="50"]').click();
    await page.locator('#muster-formation').selectOption('county');
    const expected = await page.evaluate(function () {
      const selection = {};
      document.querySelectorAll('[data-muster-county]').forEach(function (el) { selection[el.dataset.musterCounty] = Number(el.value); });
      return FB.playerMusterSelectionQuote(FB.state, selection, 'county').hosts;
    });
    await expect(page.locator('#muster-raise')).toBeEnabled();
    await page.locator('#muster-raise').click();
    expect(await page.evaluate(function () { return FB.state.armies.filter(function (host) { return host.realm === 'player'; }).length; })).toBe(expected);
    expect(await page.evaluate(function () { return FB.state.player.musterFormation; })).toBe('county');
  });
}


test('returned-veteran caps and purchased companies survive partial county musters', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, military = s.military && s.military.player || s.player.war;
    military.musterPool = { levy:160, ret:0, arch:0, cav:0 };
    military.mercCos = 1;
    const full = FB.playerMusterSelectionQuote(s, null, 'gather'), selection = {};
    full.rows.forEach(function (row) { selection[row.pid] = Math.floor(row.maximum / 2); });
    FB.savePlayerMusterSelection(s, selection, 'gather');
    const q = FB.playerMusterSelectionQuote(s);
    FB.raisePlayerHost(s);
    const totals = s.armies.reduce(function (out, host) { out.levy += host.units.levy || 0; out.mercs += host.units.mercs || 0; return out; }, { levy:0, mercs:0 });
    return { totals:totals, selected:q.rows.reduce(function (n, row) { return n + row.selected; }, 0),
      fixed:q.fixed, company:FBDATA.balance.mercCompanySize || 150,
      rallyMercs:s.armies.filter(function (host) { return host.at === q.rally; })[0].units.mercs };
  });
  expect(r.totals.levy).toBe(r.selected);
  expect(r.totals.levy).toBeLessThanOrEqual(160);
  expect(r.totals.mercs).toBe(r.company); expect(r.fixed).toBe(r.company);
  expect(r.rallyMercs).toBe(r.company);
});

test('muster budgeting explains forced food and nested Back retains parent controls', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state;
    const paid = FB.playerMusterSelectionQuote(s);
    FB.game.auto.forceSupplies = true;
    const forced = FB.playerMusterSelectionQuote(s);
    FB.ui._shared.openModal(FB.T('Parent'), '<label>Search<input id="muster-parent-search" value="kept"></label>', { historyView:true });
    document.getElementById('muster-parent-search').focus();
    FB.ui.showMusterPlan();
    return { paid:paid.total, forced:forced.total, standing:forced.standing, food:paid.food };
  });
  expect(r.paid).toBeCloseTo(r.forced + r.food);
  expect(r.forced).toBeCloseTo(r.standing);
  await expect(page.locator('#muster-costs')).toContainText('Forced supplies');
  await page.locator('[data-muster-county]').first().fill('0');
  await page.locator('#muster-back').click();
  await expect(page.locator('#muster-parent-search')).toHaveValue('kept');
  expect(await page.evaluate(function () { return FB.state.player.musterSelection; })).toBeUndefined();
});


for (const width of [390, 1280]) {
  test('county presets affect only their county and rally choice stays a draft at ' + width, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:width, height:844 });
    const ids = await setup(page, testInfo);
    await page.evaluate(function () { FB.ui.showMusterPlan(); });
    const inputs = page.locator('[data-muster-county]');
    const before = await inputs.evaluateAll(function (els) { return els.map(function (el) { return el.value; }); });
    const pid = await inputs.first().getAttribute('data-muster-county');
    const maximum = Number(await inputs.first().getAttribute('max'));
    for (const percent of [0,25,50,100]) {
      const button = page.locator('[data-muster-county-preset="' + pid + '"][data-percent="' + percent + '"]');
      await button.click();
      await expect(button).toBeFocused();
      await expect(inputs.first()).toHaveValue(String(Math.floor(maximum * percent / 100)));
      await expect(inputs.nth(1)).toHaveValue(before[1]);
    }
    await page.locator('#muster-rally').focus();
    await page.locator('#muster-rally').selectOption(ids.second);
    await expect(page.locator('#muster-rally')).toBeFocused();
    await page.locator('#muster-back').click();
    expect(await page.evaluate(function () { return FB.state.player.musterRally; })).toBeUndefined();
    await page.evaluate(function () { FB.ui.showMusterPlan(); });
    await page.locator('#muster-rally').selectOption(ids.second);
    await page.locator('#muster-save').click();
    expect(await page.evaluate(function () { return FB.state.player.musterRally; })).toBe(ids.second);
  });
}

for (const formation of ['gather', 'county']) {
  test('chosen rally drives quotes and actual muster locations: ' + formation, async function ({ page }, testInfo) {
    const ids = await setup(page, testInfo);
    const r = await page.evaluate(function (args) {
      const s = FB.state, ids = args.ids;
      const ledger = s.military && s.military.player || s.player.war;
      ledger.mercCos = 1;
      const quote = FB.playerMusterSelectionQuote(s, null, args.formation, ids.second);
      FB.savePlayerMusterSelection(s, null, args.formation, ids.second);
      const copy = JSON.parse(JSON.stringify(s));
      const restored = FB.playerMusterSelectionQuote(copy);
      FB.raisePlayerHost(s);
      const hosts = s.armies.filter(function (host) { return host.realm === 'player'; });
      const cost = hosts.reduce(function (sum, host) { return sum + FB.hostFieldUpkeepParts(s, host).total; }, 0);
      const food = hosts.reduce(function (sum, host) { return sum + FB.armyProvisionCommitment(s, host, 1); }, 0);
      return { rally:quote.rally, restored:restored.rally, positions:hosts.map(function (host) { return host.at; }),
        mercenaryAt:hosts.filter(function (host) { return host.units.mercs > 0; })[0].at,
        cost:cost, expected:quote.standing, food:food, expectedFood:quote.food };
    }, { ids:ids, formation:formation });
    expect(r.rally).toBe(ids.second); expect(r.restored).toBe(ids.second);
    expect(r.mercenaryAt).toBe(ids.second);
    if (formation === 'gather') expect(r.positions).toEqual([ids.second]);
    else expect(r.positions.sort()).toEqual([ids.home, ids.second].sort());
    expect(r.cost).toBeCloseTo(r.expected); expect(r.food).toBeCloseTo(r.expectedFood);
  });
}

test('a saved rally that becomes unavailable falls back to an eligible county', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const r = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.savePlayerMusterSelection(s, null, 'gather', ids.second);
    const original = FB.recruitmentCountyBlocked;
    try {
      FB.recruitmentCountyBlocked = function (state, realm, pid) { return pid === ids.second; };
      const q = FB.playerMusterSelectionQuote(s);
      const host = FB.raisePlayerHost(s);
      return { quoted:q.rally, actual:host.at };
    } finally { FB.recruitmentCountyBlocked = original; }
  }, ids);
  expect(r).toEqual({ quoted:ids.home, actual:ids.home });
});


for (const width of [390, 1280]) {
  test('county muster controls collapse without losing the draft at ' + width, async function ({ page }, testInfo) {
    await setup(page, testInfo);
    await page.setViewportSize({ width:width, height:650 });
    await page.evaluate(function () { FB.ui.showMusterPlan(); });
    await expect(page.locator('#muster-call-details-section .settcard-info')).toHaveCount(0);
    const input = page.locator('[data-muster-county]').first();
    await input.fill('0');
    const costs = await page.locator('#muster-costs').innerText();
    const toggle = page.locator('#muster-counties-toggle');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#muster-counties')).toBeHidden();
    await expect(toggle).toBeFocused();
    await expect(page.locator('#muster-costs')).toHaveText(costs, { useInnerText:true });
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toHaveValue('0');
    // Global presets still update the draft while individual controls are hidden.
    await toggle.click();
    await page.locator('[data-muster-percent="0"]').click();
    await toggle.click();
    expect(await page.locator('[data-muster-county]').evaluateAll(function (inputs) {
      return inputs.every(function (el) { return el.value === '0'; });
    })).toBe(true);
  });
}


for (const formation of ['gather', 'county']) {
  test('an inherited field host leaves the remaining levy available: ' + formation, async function ({ page }, testInfo) {
    const ids = await setup(page, testInfo);
    const result = await page.evaluate(function (args) {
      const s = FB.state, ids = args.ids;
      const composition = FB.playerComposition;
      try {
        // The owner's save has a 370-man inherited professional host with
        // 406 replacement ranks, while the household levy remains uncalled.
        FB.playerComposition = function () { return { levy:800, arch:29, cav:20, ret:260, crossbow:61 }; };
        s.armies.push({ id:'inherited-muster-host', realm:ids.other,
          at:ids.home, from:ids.home, men:370, size:406,
          units:{ levy:0, arch:29, cav:20, ret:260, crossbow:61, mercs:0 },
          warId:s.player.war.id, supply:75, path:[], moveLeft:0, goal:null, manual:1 });
        FB.remapWarRealm(s, ids.other, 'player');
        FB.armiesEnsure(s);
        const inherited = s.armies[0];
        FB.hostUnits(inherited);
        const before = JSON.stringify(inherited);
        const rng = FB.getRngState();
        const quote = FB.playerMusterSelectionQuote(s, null, args.formation);
        const pure = before === JSON.stringify(inherited) && rng === FB.getRngState();
        FB.savePlayerMusterSelection(s, null, args.formation);
        const raised = FB.raisePlayerHost(s);
        const added = s.armies.filter(function (host) { return host.id !== inherited.id; });
        const repeat = FB.raisePlayerHost(s);
        const exhausted = FB.playerMusterSelectionQuote(s);
        return { pure:pure, canRaise:quote.canRaise, quoted:quote.men,
          added:added.reduce(function (sum, host) { return sum + host.men; }, 0),
          levy:added.reduce(function (sum, host) { return sum + host.units.levy; }, 0),
          raised:!!raised, unchanged:before === JSON.stringify(inherited),
          duplicate:!!repeat, exhausted:exhausted.men, disabled:!exhausted.canRaise };
      } finally { FB.playerComposition = composition; }
    }, { ids:ids, formation:formation });
    expect(result).toEqual({ pure:true, canRaise:true, quoted:764, added:764,
      levy:764, raised:true, unchanged:true, duplicate:false, exhausted:0, disabled:true });
  });
}

test('increasing a saved call raises only the remainder and preserves casualty ranks after reload', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, full = FB.playerMusterSelectionQuote(s, null, 'gather'), half = {};
    full.rows.forEach(function (row) { half[row.pid] = Math.floor(row.maximum / 2); });
    FB.savePlayerMusterSelection(s, half, 'gather');
    const first = FB.raisePlayerHost(s), firstMen = first.men;
    const repeated = FB.raisePlayerHost(s);
    FB.savePlayerMusterSelection(s, null, 'gather');
    const remaining = FB.playerMusterSelectionQuote(s);
    FB.raisePlayerHost(s);
    const total = s.armies.reduce(function (sum, host) { return sum + host.men; }, 0);
    const casualty = Math.min(20, first.units.levy);
    first.units.levy -= casualty; first.men -= casualty;
    const copy = JSON.parse(JSON.stringify(s));
    return { first:firstMen, full:full.men, repeated:!!repeated, remaining:remaining.men,
      total:total, casualty:casualty, afterLoss:FB.playerMusterSelectionQuote(s).men,
      restored:FB.playerMusterSelectionQuote(copy).men };
  });
  expect(result.first).toBeLessThan(result.full);
  expect(result.repeated).toBe(false);
  expect(result.remaining).toBe(result.full - result.first);
  expect(result.total).toBe(result.full);
  expect(result.casualty).toBeGreaterThan(0);
  expect(result.afterLoss).toBe(0); expect(result.restored).toBe(0);
});

test('partial repeated calls cannot bypass returned-veteran or hired-company limits', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, ledger = s.military.player;
    ledger.musterPool = { levy:160 }; ledger.mercCos = 1;
    const full = FB.playerMusterSelectionQuote(s, null, 'gather'), half = {};
    full.rows.forEach(function (row) { half[row.pid] = Math.floor(row.maximum / 2); });
    FB.savePlayerMusterSelection(s, half, 'gather'); FB.raisePlayerHost(s);
    FB.savePlayerMusterSelection(s, null, 'gather');
    const quote = FB.playerMusterSelectionQuote(s);
    FB.raisePlayerHost(s); FB.raisePlayerHost(s);
    return { levy:s.armies.reduce(function (n, host) { return n + host.units.levy; }, 0),
      mercs:s.armies.reduce(function (n, host) { return n + host.units.mercs; }, 0),
      extraMercs:quote.units.mercs, company:FBDATA.balance.mercCompanySize || 150,
      remaining:FB.playerMusterSelectionQuote(s).men, cap:ledger.musterPool.levy };
  });
  expect(result.levy).toBe(160); expect(result.mercs).toBe(result.company);
  expect(result.extraMercs).toBe(0); expect(result.remaining).toBe(0); expect(result.cap).toBe(160);
});

for (const width of [390, 1280]) {
  test('muster sheet raises the remainder beside an existing host at ' + width, async function ({ page }, testInfo) {
    await setup(page, testInfo);
    await page.setViewportSize({ width:width, height:844 });
    await page.evaluate(function () {
      const s = FB.state, full = FB.playerMusterSelectionQuote(s, null, 'gather'), half = {};
      full.rows.forEach(function (row) { half[row.pid] = Math.floor(row.maximum / 2); });
      FB.savePlayerMusterSelection(s, half, 'gather'); FB.raisePlayerHost(s);
      FB.ui.showMusterPlan();
    });
    await page.locator('[data-muster-percent="100"]').click();
    await expect(page.locator('#muster-raise')).toBeEnabled();
    await expect(page.locator('#muster-costs')).toContainText('Additional troops / hosts');
    await page.locator('#muster-raise').click();
    expect(await page.evaluate(function () {
      return FB.state.armies.filter(function (host) { return host.realm === 'player'; }).length;
    })).toBe(2);
  });
}


test('all field hosts count toward the target and defensive allies cannot muster twice', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, composition = FB.playerComposition, allies = FB.alliedReinforcement;
    try {
      FB.playerComposition = function () { return { levy:800 }; };
      FB.alliedReinforcement = function () { return { ally:ids.other, men:120 }; };
      s.player.war.defending = true;
      const full = FB.playerMusterSelectionQuote(s, null, 'gather');
      [200, 220].forEach(function (men, i) {
        s.armies.push({ id:'fielded-' + i, realm:'player', at:ids.home, from:ids.home,
          men:men, size:men, units:{ levy:men }, supply:100, path:[], moveLeft:0,
          warId:s.player.war.id, allied:i ? { ally:ids.other, men:120 } : null });
      });
      const q = FB.playerMusterSelectionQuote(s, null, 'gather');
      const added = FB.raisePlayerHost(s);
      return { full:full.men, remaining:q.men, fixed:q.fixed, added:added.men,
        allied:added.allied ? added.allied.men : 0, exhausted:FB.playerMusterSelectionQuote(s).men };
    } finally { FB.playerComposition = composition; FB.alliedReinforcement = allies; }
  }, ids);
  expect(result).toEqual({ full:920, remaining:500, fixed:0, added:500, allied:0, exhausted:0 });
});
