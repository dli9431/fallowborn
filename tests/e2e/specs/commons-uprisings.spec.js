'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/institutions.js', 'js/events.js', 'js/modifiers.js',
  'js/world.js', 'js/actions.js', 'js/main.js', 'js/save.js', 'js/ui_modals.js', 'js/ui_misc.js',
  'data/political_institutions.js', 'data/modifiers.js', 'data/events_politics.js',
  'data/events_noble.js', 'data/map_data.js', 'data/technology.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    p.tier = 4;
    p.liege = null;
    p.provs = [pid];
    p.pop = -50;
    p.gold = 100;
    p.prestige = 100;
    p.war = null;
    p.flags = {};
    s.owner[pid] = 'player';
    s.holder[pid] = 'player';
    FB.foundPlayerRealm(s);
    s.realms.player.capital = pid;
    s.eventQueue = [];
    FB.ensureInstitutions(s, { silent:true });
    window.refuseCommons = function () {
      const state = FB.state;
      // Exact demand identity isolates escalation from the annual priority contest.
      state.collectiveDemands.pending = {
        id:'demand:tax_remission:' + state.turn,
        definitionId:'tax_remission', privilegeId:'tax_concession',
        constituency:'commons', scopeId:state.player.provinceId,
        protagonistId:state.player.charId, polityId:state.player.liege || 'player',
        demandedTurn:state.turn, demandedYear:state.date.year, technologyApproved:true
      };
      const pending = state.collectiveDemands.pending;
      return FB.fns.collective_demand_refuse(state, {
        demandId:pending.id, definitionId:pending.definitionId, privilegeId:pending.privilegeId
      });
    };
    window.uprisingEvent = function (id) {
      return FB.state.eventQueue.find(function (entry) { return entry.id === id; });
    };
    window.deferCommons = function () {
      const item = window.uprisingEvent('commons_uprising_warning');
      const ev = FB.eventById(item.id);
      return FB.resolveEventOption(FB.state, ev, ev.options[1], item.ctx);
    };
    window.beginCommons = function () {
      window.refuseCommons();
      window.deferCommons();
      FB.state.turn = FB.state.collectiveDemands.uprising.dueTurn;
      FB.institutionsDay(FB.state);
      return window.uprisingEvent('commons_uprising_begins');
    };
  });
});

test('an annual commons demand escalates only after refusal and the full warning interval', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    FB.notePoliticalMistreatment(s, 'extraordinary_tax', { gold:40 });
    const pending = FB.institutionsYearly(s);
    const beforeRefusal = FB.commonsUprisingSummary(s);
    FB.fns.collective_demand_refuse(s, { demandId:pending.id,
      definitionId:pending.definitionId, privilegeId:pending.privilegeId });
    const warning = window.uprisingEvent('commons_uprising_warning');
    const first = FB.commonsUprisingSummary(s);
    s.turn += 200;
    FB.institutionsDay(s);
    const stillPetition = FB.commonsUprisingSummary(s).stage;
    window.deferCommons();
    const due = s.collectiveDemands.uprising.dueTurn;
    s.turn = due - 1;
    FB.institutionsDay(s);
    const early = FB.hasModifier(s, 'commons_uprising', s.player.provinceId);
    s.turn = due;
    FB.institutionsDay(s);
    FB.institutionsDay(s);
    return { beforeRefusal:beforeRefusal, first:first, warning:!!warning,
      stillPetition:stillPetition, early:early,
      active:FB.commonsUprisingSummary(s),
      count:s.eventQueue.filter(function (entry) { return entry.id === 'commons_uprising_begins'; }).length,
      tax:FB.modBonus(s, 'tax', s.player.provinceId),
      levy:FB.modBonus(s, 'levy', s.player.provinceId) };
  });
  expect(result.beforeRefusal).toBeNull();
  expect(result.warning).toBe(true);
  expect(result.first.stage).toBe('petition');
  expect(result.stillPetition).toBe('petition');
  expect(result.early).toBe(false);
  expect(result.active).toMatchObject({ stage:'active', days:180 });
  expect(result.count).toBe(1);
  expect(result.tax).toBeCloseTo(-0.60625);
  expect(result.levy).toBeCloseTo(-0.60625);
});

test('concession is available without research, clears opposition, and cannot replay', async function ({ page }) {
  const result = await page.evaluate(function () {
    window.refuseCommons();
    window.deferCommons();
    const s = FB.state, id = s.collectiveDemands.uprising.id;
    const before = s.player.pop;
    const first = FB.concedeCommonsUprising(s, id);
    const snapshot = JSON.stringify(s), rng = FB.getRngState();
    const second = FB.concedeCommonsUprising(s, id);
    return { first:!!first, second:second, support:s.player.pop - before,
      privilege:FB.hasPrivilege(s, 'tax_concession', s.player.provinceId),
      cleared:!s.collectiveDemands.uprising && !s.collectiveDemands.opposition.commons,
      unchanged:snapshot === JSON.stringify(s), rngSame:rng === FB.getRngState(),
      technology:FBDATA.techImpactReviews.features.local_commons_uprisings.mode };
  });
  expect(result).toMatchObject({ first:true, second:false, support:6,
    privilege:true, cleared:true, unchanged:true, rngSame:true, technology:'none' });
});

test('recovering support during grace prevents the uprising and starts cooldown', async function ({ page }) {
  const result = await page.evaluate(function () {
    window.refuseCommons();
    window.deferCommons();
    const s = FB.state;
    s.player.pop = -9;
    FB.institutionsDay(s);
    const cooldown = s.collectiveDemands.uprisingCooldownUntil;
    s.player.pop = -60;
    window.refuseCommons();
    return { active:FB.commonsUprisingSummary(s), cooldown:cooldown - s.turn,
      downfall:FB.fns.commons_downfall_available(s),
      modifier:FB.hasModifier(s, 'commons_uprising', s.player.provinceId) };
  });
  expect(result).toEqual({ active:null, cooldown:1080, downfall:false, modifier:false });
});

for (const response of [1, 2, 3]) {
  for (const success of response === 3 ? [false] : [true, false]) {
    test('uprising response ' + response + ' success=' + success + ' preserves war and territorial state', async function ({ page }) {
      const result = await page.evaluate(function (args) {
        const item = window.beginCommons(), s = FB.state;
        const ev = FB.eventById(item.id);
        const enemy = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive; });
        s.player.war = { enemy:enemy, target:null, defending:true, wins:0, losses:0, seasons:0 };
        const territory = JSON.stringify([s.owner, s.holder, s.player.provs, s.player.war, Object.keys(s.realms)]);
        const end = s.collectiveDemands.uprising.dueTurn;
        const beforeGold = s.player.gold;
        const beforePop = s.player.pop;
        const rng = FB.rng;
        FB.rng = function () { return args.success ? 0 : 0.999999; };
        let receipt;
        try { receipt = FB.resolveEventOption(s, ev, ev.options[args.response], item.ctx); }
        finally { FB.rng = rng; }
        const snapshot = JSON.stringify(s), rngState = FB.getRngState();
        const replay = FB.resolveEventOption(s, ev, ev.options[args.response], item.ctx);
        const replaySafe = replay === false && snapshot === JSON.stringify(s) && rngState === FB.getRngState();
        const active = FB.commonsUprisingSummary(s);
        const support = s.player.pop - beforePop;
        s.turn = end;
        FB.institutionsDay(s);
        return { receipt:!!receipt, replaySafe:replaySafe, active:active,
          spent:beforeGold - s.player.gold, support:support,
          expired:!FB.hasModifier(s, 'commons_uprising', s.player.provinceId) && !s.collectiveDemands.uprising,
          territorySame:territory === JSON.stringify([s.owner, s.holder, s.player.provs, s.player.war, Object.keys(s.realms)]) };
      }, { response:response, success:success });
      expect(result.receipt).toBe(true);
      expect(result.replaySafe).toBe(true);
      expect(result.spent).toBe(response === 3 ? 0 : 20);
      expect(result.territorySame).toBe(true);
      expect(result.expired).toBe(true);
      if (success) expect(result.active).toBeNull();
      else expect(result.active).toMatchObject({ stage:'aftermath', days:180 });
      if (response === 2) expect(result.support).toBe(success ? -8 : -12);
    });
  }
}

test('a stale affordable button cannot spend money after funds disappear', async function ({ page }) {
  const result = await page.evaluate(function () {
    const item = window.beginCommons(), s = FB.state, ev = FB.eventById(item.id);
    s.player.gold = 0;
    const before = JSON.stringify(s), rng = FB.getRngState();
    const result = FB.resolveEventOption(s, ev, ev.options[2], item.ctx);
    return { rejected:result === false, same:before === JSON.stringify(s), rngSame:rng === FB.getRngState() };
  });
  expect(result).toEqual({ rejected:true, same:true, rngSame:true });
});

for (const change of ['holder', 'succession', 'liege', 'rank', 'death']) {
  test(change + ' invalidates the incident and stale events without effects', async function ({ page }) {
    const result = await page.evaluate(function (change) {
      const item = window.beginCommons(), s = FB.state;
      if (change === 'holder') s.holder[s.player.provinceId] = s.player.liege || 'lost';
      if (change === 'succession') s.player.charId = Object.keys(s.chars).find(function (id) { return id !== s.player.charId; });
      if (change === 'liege') s.player.liege = 'changed';
      if (change === 'rank') s.player.tier = 2;
      if (change === 'death') s.player.dead = true;
      const ev = FB.eventById(item.id), before = JSON.stringify(s), rng = FB.getRngState();
      const rejected = FB.resolveEventOption(s, ev, ev.options[2], item.ctx) === false;
      const noEffects = before === JSON.stringify(s) && rng === FB.getRngState();
      FB.commonsUprisingDay(s);
      return { rejected:rejected, noEffects:noEffects, cleared:!s.collectiveDemands.uprising,
        modifier:FB.hasModifier(s, 'commons_uprising', s.player.provinceId) };
    }, change);
    expect(result).toEqual({ rejected:true, noEffects:true, cleared:true, modifier:false });
  });
}

test('save restoration retains deadlines and repair does not duplicate the uprising', async function ({ page }) {
  const result = await page.evaluate(function () {
    window.beginCommons();
    const row = Object.assign({}, FB.state.collectiveDemands.uprising);
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const s = FB.state;
    FB.ensureInstitutions(s, { silent:true });
    FB.institutionsDay(s);
    FB.institutionsDay(s);
    return { row:row, restored:s.collectiveDemands.uprising,
      modifiers:FB.countyModifierRecords(s, row.scopeId).filter(function (record) { return record.id === 'commons_uprising'; }).length,
      events:s.eventQueue.filter(function (entry) { return entry.id === 'commons_uprising_begins'; }).length };
  });
  expect(result.restored).toEqual(result.row);
  expect(result.modifiers).toBe(1);
  expect(result.events).toBe(1);
});

for (const blocker of ['baron', 'healthy_support', 'downfall', 'queued_downfall', 'active']) {
  test(blocker + ' prevents an additional local uprising', async function ({ page }) {
    const result = await page.evaluate(function (blocker) {
      const s = FB.state;
      if (blocker === 'baron') s.player.tier = 3;
      if (blocker === 'healthy_support') s.player.pop = 30;
      if (blocker === 'downfall') s.player.flags.df_unrest = 1;
      if (blocker === 'queued_downfall') FB.queueEvent(s, 'df_murmurs', {});
      if (blocker === 'active') window.beginCommons();
      const before = s.collectiveDemands.uprising && s.collectiveDemands.uprising.id;
      window.refuseCommons();
      return { before:before || null, after:s.collectiveDemands.uprising && s.collectiveDemands.uprising.id || null,
        warnings:s.eventQueue.filter(function (entry) { return entry.id === 'commons_uprising_warning'; }).length };
    }, blocker);
    expect(result.after).toBe(result.before);
    expect(result.warnings).toBe(blocker === 'active' ? 1 : 0);
  });
}

for (const width of [390, 1280]) {
  test('warning and inline concession show clear terms at ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    await page.evaluate(function () {
      window.refuseCommons();
      const item = window.uprisingEvent('commons_uprising_warning');
      FB.state.eventQueue = [];
      FB.ui.runEvents([item]);
    });
    await expect(page.locator('#ev-text')).toContainText('90 days');
    await expect(page.locator('#ev-text')).toContainText('Popular support above -10');
    await page.locator('#ev-options button').filter({ hasText:'Take time to address' }).click();
    await page.evaluate(function () { FB.ui.showPrivileges(); });
    await expect(page.locator('#commons-uprising-status')).toContainText('90 days to act');
    await expect(page.locator('#commons-uprising-status')).toContainText('+6 Popular support, -2 prestige');
    await page.locator('#commons-uprising-concede').click();
    await expect(page.locator('#commons-uprising-status')).toHaveCount(0);
    await expect(page.locator('#gm-body')).toContainText('Tax Concession');
    await expect(page.locator('#privileges-back')).toBeFocused();
  });
}

for (const stage of ['petition', 'active']) {
  test('restore recovers a consumed ' + stage + ' event exactly once', async function ({ page }) {
    const result = await page.evaluate(function (stage) {
      if (stage === 'active') window.beginCommons();
      else window.refuseCommons();
      FB.state.eventQueue = [];
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      FB.restoreCommonsUprising(FB.state);
      FB.restoreCommonsUprising(FB.state);
      const id = stage === 'active' ? 'commons_uprising_begins' : 'commons_uprising_warning';
      const items = FB.state.eventQueue.filter(function (item) { return item.id === id; });
      return { count:items.length, valid:items.length === 1 &&
        FB.eventContextStillValid(FB.state, FB.eventById(id), items[0].ctx) };
    }, stage);
    expect(result).toEqual({ count:1, valid:true });
  });
}

test('previews and incident summaries are read-only and expose concession effects', async function ({ page }) {
  const result = await page.evaluate(function () {
    window.refuseCommons();
    const s = FB.state, item = window.uprisingEvent('commons_uprising_warning');
    const ev = FB.eventById(item.id), before = JSON.stringify(s), rng = FB.getRngState();
    FB.commonsUprisingSummary(s);
    const adapter = FB.eventImpactAdapters.commons_uprising_concede;
    const preview = adapter.preview(s, item.ctx);
    return { same:before === JSON.stringify(s), rngSame:rng === FB.getRngState(),
      modifier:preview.find(function (record) { return record.type === 'modifier'; }),
      explanation:FB.eventImpactText(s, preview[0], 'preview'),
      valid:FB.eventContextStillValid(s, ev, item.ctx) };
  });
  expect(result.same).toBe(true);
  expect(result.rngSame).toBe(true);
  expect(result.valid).toBe(true);
  expect(result.modifier).toMatchObject({ action:'add', id:'tax_concession' });
  expect(result.explanation).toContain('Settle the local grievance');
});

test('an old save without uprising fields stays free of incidents', async function ({ page }) {
  const result = await page.evaluate(function () {
    delete FB.state.collectiveDemands.uprising;
    delete FB.state.collectiveDemands.uprisingCooldownUntil;
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    FB.institutionsDay(FB.state);
    return { summary:FB.commonsUprisingSummary(FB.state),
      introduced:Object.prototype.hasOwnProperty.call(FB.state.collectiveDemands, 'uprising'),
      downfall:FB.fns.commons_downfall_available(FB.state) };
  });
  expect(result).toEqual({ summary:null, introduced:false, downfall:true });
});

test('the original customary concession remains available after research is lost', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, tech = FB.realmTechRecord(s);
    tech.completed = tech.completed.filter(function (id) { return id !== 'customary_law'; });
    s.collectiveDemands.pending = {
      id:'demand:commons_custom:grandfathered', definitionId:'commons_custom',
      privilegeId:'confirmed_custom', constituency:'commons',
      scopeId:s.player.provinceId, protagonistId:s.player.charId, polityId:'player',
      demandedTurn:s.turn, demandedYear:s.date.year, technologyApproved:true
    };
    FB.fns.collective_demand_refuse(s, { demandId:s.collectiveDemands.pending.id,
      definitionId:'commons_custom', privilegeId:'confirmed_custom' });
    const blockedNewGrant = !FB.privilegeGrantStatus(s, 'confirmed_custom').ready;
    const success = FB.concedeCommonsUprising(s, s.collectiveDemands.uprising.id);
    return { blockedNewGrant:blockedNewGrant, success:!!success,
      granted:FB.hasPrivilege(s, 'confirmed_custom', s.player.provinceId) };
  });
  expect(result).toEqual({ blockedNewGrant:true, success:true, granted:true });
});

for (const sample of [
  { support:10, reduction:0.25 },
  { support:-20, reduction:0.25 },
  { support:-60, reduction:0.625 },
  { support:-100, reduction:1 },
  { support:-150, reduction:1 }
]) {
  test('live revolt reduction at Popular support ' + sample.support, async function ({ page }) {
    const result = await page.evaluate(function (support) {
      window.beginCommons();
      const s = FB.state, pid = s.player.provinceId;
      s.player.pop = support;
      const before = JSON.stringify(s), rng = FB.getRngState();
      const tax = FB.modBonus(s, 'tax', pid);
      const levy = FB.modBonus(s, 'levy', pid);
      const display = FB.modifierEffects(s, 'commons_uprising');
      return { tax:tax, levy:levy, display:display,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() };
    }, sample.support);
    expect(result.tax).toBeCloseTo(-sample.reduction);
    expect(result.levy).toBeCloseTo(-sample.reduction);
    expect(result.display.tax).toBeCloseTo(-sample.reduction);
    expect(result.display.levy).toBeCloseTo(-sample.reduction);
    expect(result.pure).toBe(true);
  });
}

test('effective support scales resistance after county bonuses and recovery preserves expiry', async function ({ page }) {
  const result = await page.evaluate(function () {
    window.beginCommons();
    const s = FB.state, pid = s.player.provinceId;
    FB.addModifier(s, 'roads_patrolled', pid); // +4% tax
    FB.addModifier(s, 'muster_burden', pid); // +15% levy, -6 support
    const due = s.collectiveDemands.uprising.dueTurn;
    s.player.pop = -94;
    const shut = { support:FB.popEffective(s), tax:FB.modBonus(s, 'tax', pid),
      levy:FB.modBonus(s, 'levy', pid), text:FB.ui._shared.modifierEffectText(s, 'commons_uprising') };
    s.player.pop = -54;
    const recovering = { support:FB.popEffective(s), tax:FB.modBonus(s, 'tax', pid),
      levy:FB.modBonus(s, 'levy', pid) };
    return { shut:shut, recovering:recovering, sameDeadline:due === s.collectiveDemands.uprising.dueTurn };
  });
  expect(result.shut.support).toBe(-100);
  expect(result.shut.tax).toBe(-1);
  expect(result.shut.levy).toBe(-1);
  expect(result.shut.text).toContain('-100% county tax');
  expect(result.shut.text).toContain('-100% county levy');
  expect(result.recovering.support).toBe(-60);
  expect(result.recovering.tax).toBeCloseTo(1.04 * 0.375 - 1);
  expect(result.recovering.levy).toBeCloseTo(1.15 * 0.375 - 1);
  expect(result.sameDeadline).toBe(true);
});
