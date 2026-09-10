'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/rebellions.js', 'css/style.css', 'js/keys.js','js/institutions.js', 'js/events.js', 'js/modifiers.js',
  'js/world.js', 'js/actions.js', 'js/main.js', 'js/save.js', 'js/ui_modals.js', 'js/ui_misc.js',
  'data/political_institutions.js', 'data/modifiers.js', 'data/events_politics.js',
  'data/events_noble.js', 'data/map_data.js', 'data/technology.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

// Each case owns a fresh context and world; no state crosses test boundaries.
// Distribute the many independent starts across the configured worker pool.
test.describe.configure({ mode:'parallel' });

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    p.tier = 4;
    p.liege = null;
    p.provs = [pid];
    FB.setCountySupport(s, s.player.provinceId, -50);
    p.gold = 10000;
    // These cases cover unarmed resistance; armed escalation has its own spec.
    FBDATA.balance.revoltArmedSupport = -1000;
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
    window.beginCommons = function (count) {
      window.refuseCommons();
      if (count > 1) {
        // Restore a previously spread multi-county incident for roster-only tests.
        const s = FB.state, row = s.collectiveDemands.uprising;
        row.countyIds = s.player.provs.slice(0, count);
        row.countyIds.forEach(function (pid) { FB.setCountySupport(s, pid, -58); });
        delete row.countyStates;
        FB.ensureInstitutions(s, { silent:true });
        FB.restoreCommonsUprising(s);
      }
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
  expect(result.tax).toBeCloseTo(0.42 * (1 - 0.60625) - 1);
  expect(result.levy).toBeCloseTo(0.42 * (1 - 0.60625) - 1);
});

test('concession is available without research, clears opposition, and cannot replay', async function ({ page }) {
  const result = await page.evaluate(function () {
    window.refuseCommons();
    window.deferCommons();
    const s = FB.state, id = s.collectiveDemands.uprising.id;
    const before = FB.countySupportBase(s, s.player.provinceId);
    const first = FB.concedeCommonsUprising(s, id);
    const snapshot = JSON.stringify(s), rng = FB.getRngState();
    const second = FB.concedeCommonsUprising(s, id);
    return { first:!!first, second:second, support:FB.countySupportBase(s, s.player.provinceId) - before,
      privilege:FB.hasPrivilege(s, 'tax_concession', s.player.provinceId),
      cleared:!s.collectiveDemands.uprising && !s.collectiveDemands.opposition.commons,
      unchanged:snapshot === JSON.stringify(s), rngSame:rng === FB.getRngState(),
      technology:FBDATA.techImpactReviews.features.local_commons_uprisings.mode };
  });
  expect(result).toMatchObject({ first:true, second:false, support:0,
    privilege:true, cleared:true, unchanged:true, rngSame:true, technology:'none' });
});

test('recovering support during grace prevents the uprising and starts cooldown', async function ({ page }) {
  const result = await page.evaluate(function () {
    window.refuseCommons();
    window.deferCommons();
    const s = FB.state;
    FB.setCountySupport(s, s.player.provinceId, -9);
    FB.institutionsDay(s);
    const cooldown = s.collectiveDemands.uprisingCooldownUntil;
    FB.setCountySupport(s, s.player.provinceId, -60);
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
        const quote = FB.revoltResponseTerms(s, s.collectiveDemands.uprising.countyIds, 'player');
        const expectedSpent = args.response === 3 ? 0 : args.response === 1 ? quote.negotiate : quote.suppress;
        const beforePop = FB.countySupportBase(s, s.player.provinceId);
        const rng = FB.rng;
        FB.rng = function () { return args.success ? 0 : 0.999999; };
        let receipt;
        try { receipt = FB.resolveEventOption(s, ev, ev.options[args.response], item.ctx); }
        finally { FB.rng = rng; }
        const snapshot = JSON.stringify(s), rngState = FB.getRngState();
        const replay = FB.resolveEventOption(s, ev, ev.options[args.response], item.ctx);
        const replaySafe = replay === false && snapshot === JSON.stringify(s) && rngState === FB.getRngState();
        const active = FB.commonsUprisingSummary(s);
        const support = FB.countySupportBase(s, s.player.provinceId) - beforePop;
        s.turn = end;
        FB.institutionsDay(s);
        return { receipt:!!receipt, replaySafe:replaySafe, active:active,
          spent:beforeGold - s.player.gold, expectedSpent:expectedSpent, support:support,
          expired:!FB.hasModifier(s, 'commons_uprising', s.player.provinceId) && !s.collectiveDemands.uprising,
          territorySame:territory === JSON.stringify([s.owner, s.holder, s.player.provs, s.player.war, Object.keys(s.realms)]) };
      }, { response:response, success:success });
      expect(result.receipt).toBe(true);
      expect(result.replaySafe).toBe(true);
      expect(result.spent).toBe(result.expectedSpent);
      expect(result.territorySame).toBe(true);
      expect(result.expired).toBe(true);
      if (success) expect(result.active).toBeNull();
      else expect(result.active).toMatchObject({ stage:'aftermath', days:180 });
      if (response === 2) expect(result.support).toBe(success ? -20 : -30);
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
      if (blocker === 'healthy_support') FB.setCountySupport(s, s.player.provinceId, 30);
      if (blocker === 'downfall') s.player.flags.df_unrest = 1;
      if (blocker === 'queued_downfall') FB.queueEvent(s, 'df_murmurs', {});
      if (blocker === 'active') window.beginCommons();
      const before = s.collectiveDemands.uprising && s.collectiveDemands.uprising.id;
      window.refuseCommons();
      return { before:before || null, after:s.collectiveDemands.uprising && s.collectiveDemands.uprising.id || null,
        warnings:s.eventQueue.filter(function (entry) { return entry.id === 'commons_uprising_warning'; }).length };
    }, blocker);
    expect(result.after).toBe(result.before);
    expect(result.warnings).toBe(0);
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
    await expect(page.locator('#ev-title')).toHaveText('A final petition');
    await expect(page.locator('#ev-text')).toContainText('25 to 100%');
    await expect(page.locator('#ev-text')).toContainText('180 days');
    await expect(page.locator('#event-choice-details-0 .event-concession-terms')).toHaveCount(2);
    await expect(page.locator('#event-choice-details-1 .event-impact-chip')).toHaveCount(4);
    await expect(page.locator('#event-choice-details-1')).toContainText('If unresolved: tax and levies -25% to -100%');
    await expect(page.locator('#event-choice-details-0 .event-concession-terms > :not(.event-impact-chip)')).toHaveCount(0);
    await expect(page.locator('#event-choice-details-0')).not.toContainText('No seasonal upkeep');
    await expect(page.locator('#event-choice-details-0')).toContainText('Grievance settled');
    if (width === 390) {
      const details = page.locator('.event-choice').first().locator('.event-details-button');
      await details.click();
      await expect(details).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#event-choice-details-0')).toBeVisible();
      await details.click();
    }
    await expect.poll(function () {
      return page.evaluate(function () { return !FB.ui.eventInputGuarded(); });
    }).toBe(true);
    await page.locator('#ev-options button').filter({ hasText:'Take time to address' }).click();
    await expect.poll(function () {
      return page.evaluate(function () { return FB.state.collectiveDemands.uprising.stage; });
    }).toBe('warning');
    await page.evaluate(function () { FB.ui.showPrivileges(); });
    await expect(page.locator('#commons-uprising-status')).toContainText('90 days to grant the concession');
    await expect(page.locator('#commons-uprising-status')).toContainText('Five-year concessions');
    await page.locator('#commons-uprising-concede').click();
    await expect(page.locator('[data-uprising-result]')).toContainText('Prestige -2');
    await expect(page.locator('#uprising-result-details')).toBeHidden();
    expect(await page.locator('[data-uprising-result] .event-impact-chip').evaluateAll(function (chips) {
      return chips.length > 0 && chips.every(function (chip) { return !!chip.closest('.settcard-details'); });
    })).toBe(true);
    if (width === 390) {
      await page.locator('[aria-controls="uprising-result-details"]').click();
      await expect(page.locator('#uprising-result-details')).toBeVisible();
    } else {
      await page.locator('[data-uprising-result] .settcard-head').focus();
      await expect(page.locator('#tooltip .event-impact-chip').first()).toBeVisible();
    }
    await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
    await page.locator('#uprising-continue').click();
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
      FB.setCountySupport(s, s.player.provinceId, support);
      const before = JSON.stringify(s), rng = FB.getRngState();
      const tax = FB.modBonus(s, 'tax', pid);
      const levy = FB.modBonus(s, 'levy', pid);
      const display = FB.modifierEffects(s, 'commons_uprising');
      return { tax:tax, levy:levy, display:display,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() };
    }, sample.support);
    expect(result.tax).toBeCloseTo(Math.max(0, 1 + sample.support / 100) * (1 - sample.reduction) - 1);
    expect(result.levy).toBeCloseTo(Math.max(0, 1 + sample.support / 100) * (1 - sample.reduction) - 1);
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
    FB.setCountySupport(s, s.player.provinceId, -94);
    const shut = { support:FB.popEffective(s), tax:FB.modBonus(s, 'tax', pid),
      levy:FB.modBonus(s, 'levy', pid), text:FB.ui._shared.modifierEffectText(s, 'commons_uprising') };
    FB.setCountySupport(s, s.player.provinceId, -54);
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
  expect(result.recovering.tax).toBeCloseTo(1.04 * 0.4 * 0.375 - 1);
  expect(result.recovering.levy).toBeCloseTo(1.15 * 0.4 * 0.375 - 1);
  expect(result.sameDeadline).toBe(true);
});

async function addCommonsCounties(page, count) {
  return page.evaluate(function (count) {
    const s = FB.state;
    const ids = FB.world.provs.filter(function (province) {
      return !province.wasteland && s.player.provs.indexOf(province.id) < 0;
    }).slice(0, count).map(function (province) { return province.id; });
    ids.forEach(function (pid) {
      s.player.provs.push(pid);
      s.owner[pid] = 'player';
      s.holder[pid] = 'player';
    });
    FB.invalidateRealmCache();
    return ids;
  }, count);
}

test('a new uprising starts only in the demanding county', async function ({ page }) {
  const ids = await addCommonsCounties(page, 5);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.grantPrivilege(s, 'tax_concession', { scopeId:ids[0], grandfathered:true });
    s.holder[ids[1]] = 'other';
    window.refuseCommons();
    const row = s.collectiveDemands.uprising;
    const before = JSON.stringify(s), rng = FB.getRngState();
    const summary = FB.commonsUprisingSummary(s);
    return { counties:row.countyIds, summary:summary.countyIds,
      expected:[s.player.provinceId],
      pure:before === JSON.stringify(s) && rng === FB.getRngState() };
  }, ids);
  expect(result.counties).toEqual(result.expected);
  expect(result.summary).toEqual(result.expected);
  expect(result.pure).toBe(true);
});

test('one uprising and concession cover the roster with resource changes charged once', async function ({ page }) {
  await addCommonsCounties(page, 3);
  const result = await page.evaluate(function () {
    window.beginCommons(3);
    const s = FB.state, row = s.collectiveDemands.uprising;
    const affected = row.countyIds.slice();
    const unrest = affected.map(function (pid) { return FB.hasModifier(s, 'commons_uprising', pid); });
    const excluded = s.player.provs.filter(function (pid) { return affected.indexOf(pid) < 0; });
    const gold = s.player.gold, prestige = s.player.prestige, pop = FB.countySupportBase(s, s.player.provinceId);
    const receipt = FB.concedeCommonsUprising(s, row.id);
    return { count:affected.length, unrest:unrest,
      excludedClear:excluded.every(function (pid) { return !FB.hasModifier(s, 'commons_uprising', pid); }),
      granted:affected.every(function (pid) { return FB.hasPrivilege(s, 'tax_concession', pid); }),
      clear:affected.every(function (pid) { return !FB.hasModifier(s, 'commons_uprising', pid); }),
      gold:s.player.gold - gold, prestige:s.player.prestige - prestige, pop:FB.countySupportBase(s, s.player.provinceId) - pop,
      receipt:!!receipt, finished:!s.collectiveDemands.uprising };
  });
  expect(result).toEqual({ count:3, unrest:[true, true, true], excludedClear:true,
    granted:true, clear:true, gold:-3566, prestige:-10, pop:0, receipt:true, finished:true });
});

for (const change of ['transfer', 'separate_concession']) {
  test(change + ' removes only one county and refreshes the unanswered response', async function ({ page }) {
    await addCommonsCounties(page, 2);
    const result = await page.evaluate(function (change) {
      const old = window.beginCommons(3), s = FB.state;
      const row = s.collectiveDemands.uprising;
      const lost = row.scopeId, beforeIds = row.countyIds.slice(), due = row.dueTurn;
      if (change === 'transfer') {
        s.holder[lost] = 'other';
        s.owner[lost] = 'other';
        s.player.provs = s.player.provs.filter(function (pid) { return pid !== lost; });
      } else FB.grantPrivilege(s, row.privilegeId, { scopeId:lost, grandfathered:true });
      const ev = FB.eventById(old.id), before = JSON.stringify(s), rng = FB.getRngState();
      const stale = FB.resolveEventOption(s, ev, ev.options[2], old.ctx);
      const safe = stale === false && before === JSON.stringify(s) && rng === FB.getRngState();
      FB.commonsUprisingDay(s);
      FB.commonsUprisingDay(s);
      const fresh = s.eventQueue.filter(function (item) {
        return item.id === old.id && FB.eventContextStillValid(s, ev, item.ctx);
      });
      return { safe:safe, counties:s.collectiveDemands.uprising.countyIds,
        expected:beforeIds.filter(function (pid) { return pid !== lost; }),
        originalRemoved:!FB.hasModifier(s, 'commons_uprising', lost),
        othersActive:s.collectiveDemands.uprising.countyIds.every(function (pid) {
          return FB.hasModifier(s, 'commons_uprising', pid);
        }), sameDeadline:s.collectiveDemands.uprising.dueTurn === due,
        events:fresh.length, eventCounties:fresh[0].ctx.countyIds };
    }, change);
    expect(result.safe).toBe(true);
    expect(result.counties).toEqual(result.expected);
    expect(result.eventCounties).toEqual(result.expected);
    expect(result.originalRemoved).toBe(true);
    expect(result.othersActive).toBe(true);
    expect(result.sameDeadline).toBe(true);
    expect(result.events).toBe(1);
  });
}

test('new holdings do not join immediately and skipped ticks do not backfill expired spread', async function ({ page }) {
  await addCommonsCounties(page, 1);
  await page.evaluate(function () { window.beginCommons(); });
  const added = await addCommonsCounties(page, 2);
  const result = await page.evaluate(function (added) {
    const s = FB.state, row = s.collectiveDemands.uprising, ids = row.countyIds.slice();
    FB.commonsUprisingDay(s);
    const unchanged = JSON.stringify(row.countyIds) === JSON.stringify(ids);
    s.turn = row.dueTurn;
    FB.commonsUprisingDay(s);
    return { unchanged:unchanged, count:ids.length, finished:!s.collectiveDemands.uprising,
      clear:ids.concat(added).every(function (pid) { return !FB.hasModifier(s, 'commons_uprising', pid); }) };
  }, added);
  expect(result).toEqual({ unchanged:true, count:1, finished:true, clear:true });
});

test('legacy single-county incidents migrate without expanding or losing their decision', async function ({ page }) {
  await page.evaluate(function () { window.beginCommons(); });
  await addCommonsCounties(page, 2);
  const result = await page.evaluate(function () {
    const s = FB.state, row = s.collectiveDemands.uprising, due = row.dueTurn;
    delete row.countyIds;
    delete row.countyStates;
    delete row.visitedCountyIds;
    delete row.sovereignId;
    delete row.nextSpreadTurn;
    s.eventQueue.forEach(function (item) { if (item.ctx) delete item.ctx.countyIds; });
    const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const restored = FB.state;
    const valid = restored.eventQueue.filter(function (item) {
      return item.id === 'commons_uprising_begins' &&
        FB.eventContextStillValid(restored, FB.eventById(item.id), item.ctx);
    });
    return { ids:restored.collectiveDemands.uprising.countyIds,
      expected:[row.scopeId], due:restored.collectiveDemands.uprising.dueTurn,
      expectedDue:due, count:valid.length };
  });
  expect(result.ids).toEqual(result.expected);
  expect(result.due).toBe(result.expectedDue);
  expect(result.count).toBe(1);
});

test('the privilege roll names every county and states concession effects per county', async function ({ page }) {
  await addCommonsCounties(page, 2);
  const names = await page.evaluate(function () {
    window.beginCommons();
    const names = FB.state.collectiveDemands.uprising.countyIds.map(function (pid) { return FB.world.byId[pid].name; });
    FB.ui.showPrivileges();
    return names;
  });
  for (const name of names) await expect(page.locator('#commons-uprising-status')).toContainText(name);
  await expect(page.locator('#commons-uprising-status')).toContainText('Settle every listed county');
  await expect(page.locator('#commons-uprising-status')).toContainText('prestige');
});

async function prepareSpreadChain(page) {
  const ids = await addCommonsCounties(page, 4);
  return page.evaluate(function (ids) {
    const s = FB.state, home = s.player.provinceId;
    // A controlled chain isolates reachability from the bookmark's geography.
    s.player.provs = [home];
    s.realms.commonsTestVassal = Object.assign({}, s.realms.player, {
      id:'commonsTestVassal', alive:true, tier:3, liege:'player', provs:ids.slice(), capital:ids[0]
    });
    ids.forEach(function (pid) { s.holder[pid] = 'commonsTestVassal'; });
    const chain = [home].concat(ids);
    chain.forEach(function (pid) { FB.setCountySupport(s, pid, -60); });
    FB.world.adj = {};
    chain.forEach(function (pid, index) {
      FB.world.adj[pid] = {};
      if (index) FB.world.adj[pid][chain[index - 1]] = 1;
      if (index + 1 < chain.length) FB.world.adj[pid][chain[index + 1]] = 1;
    });
    FB.invalidateRealmCache();
    window.beginCommons();
    // Spread-only scenarios isolate the frontier from independent local settlements.
    s.collectiveDemands.uprising.localNegotiations = { commonsTestVassal:{ turn:s.turn, success:false, countyIds:[] } };
    const item = window.uprisingEvent('commons_uprising_begins');
    FB.resolveEventOption(s, FB.eventById(item.id), FB.eventById(item.id).options[3], item.ctx);
    window.advanceCommons = function (days) {
      for (let i = 0; i < days; i++) { FB.state.turn++; FB.commonsUprisingDay(FB.state); }
    };
    window.answerSpread = function () {
      const item = FB.state.eventQueue.find(function (item) {
        return item.id === 'commons_uprising_spread' && FB.fns.commons_uprising_valid(FB.state, item.ctx);
      });
      return FB.resolveEventOption(FB.state, FB.eventById(item.id), FB.eventById(item.id).options[1], item.ctx);
    };
    return chain;
  }, ids);
}

test('spread traverses every connected subordinate county with independent warnings and expiries', async function ({ page }) {
  const chain = await prepareSpreadChain(page);
  const result = await page.evaluate(function (chain) {
    const s = FB.state, start = s.turn, firstDue = s.collectiveDemands.uprising.countyStates[chain[0]].dueTurn;
    window.advanceCommons(29);
    const early = s.collectiveDemands.uprising.countyIds.length;
    window.advanceCommons(1);
    const first = s.collectiveDemands.uprising.countyStates[chain[1]];
    const petition = first.phase;
    window.advanceCommons(10);
    window.answerSpread();
    const ownGrace = first.dueTurn - s.turn;
    window.advanceCommons(89);
    const before = FB.hasModifier(s, 'commons_uprising', chain[1]);
    window.advanceCommons(1);
    const after = FB.hasModifier(s, 'commons_uprising', chain[1]);
    const independent = first.dueTurn === start + 130 + 180 &&
      s.collectiveDemands.uprising.countyStates[chain[0]].dueTurn === firstDue;
    // Answer each subsequent petition and keep checking through all county expiries.
    for (let i = 0; i < 700 && s.collectiveDemands.uprising; i++) {
      if (s.eventQueue.some(function (item) {
        return item.id === 'commons_uprising_spread' && FB.fns.commons_uprising_valid(s, item.ctx);
      })) window.answerSpread();
      window.advanceCommons(1);
    }
    return { early:early, petition:petition, ownGrace:ownGrace, before:before, after:after,
      independent:independent, finished:!s.collectiveDemands.uprising,
      clear:chain.every(function (pid) { return !FB.hasModifier(s, 'commons_uprising', pid); }),
      outbreaks:s.log.filter(function (item) {
        return JSON.stringify(item).indexOf('news.commons_uprising.begins') >= 0;
      }).length };
  }, chain);
  expect(result).toMatchObject({ early:1, petition:'petition', ownGrace:90, before:false,
    after:true, independent:true, finished:true, clear:true });
  expect(result.outbreaks).toBe(chain.length);
});

test('support pauses spread, resets its interval, and clears warnings without resetting active expiry', async function ({ page }) {
  const chain = await prepareSpreadChain(page);
  const result = await page.evaluate(function (chain) {
    const s = FB.state, due = s.collectiveDemands.uprising.countyStates[chain[0]].dueTurn;
    window.advanceCommons(20);
    FB.setCountySupport(s, s.player.provinceId, -15);
    window.advanceCommons(30);
    const paused = !s.collectiveDemands.uprising.nextSpreadTurn;
    FB.setCountySupport(s, s.player.provinceId, -60);
    window.advanceCommons(30);
    const early = s.collectiveDemands.uprising.countyIds.length;
    window.advanceCommons(1);
    const joined = s.collectiveDemands.uprising.countyIds.length;
    chain.forEach(function (pid) { FB.setCountySupport(s, pid, 50); });
    window.advanceCommons(1);
    return { paused:paused, early:early, joined:joined,
      counties:s.collectiveDemands.uprising.countyIds,
      sameDue:s.collectiveDemands.uprising.countyStates[chain[0]].dueTurn === due,
      active:FB.hasModifier(s, 'commons_uprising', chain[0]) };
  }, chain);
  expect(result).toEqual({ paused:true, early:1, joined:2, counties:[chain[0]], sameDue:true, active:true });
});

test('spread save restoration preserves distinct deadlines and replaces stale decisions', async function ({ page }) {
  const chain = await prepareSpreadChain(page);
  const result = await page.evaluate(function (chain) {
    window.advanceCommons(30);
    const s = FB.state, stale = window.uprisingEvent('commons_uprising_spread');
    const old = JSON.parse(JSON.stringify(stale.ctx));
    window.answerSpread();
    const before = JSON.stringify(s), rng = FB.getRngState();
    const ev = FB.eventById(stale.id);
    const rejected = FB.resolveEventOption(s, ev, ev.options[0], old) === false;
    const safe = before === JSON.stringify(s) && rng === FB.getRngState();
    const counties = JSON.stringify(s.collectiveDemands.uprising.countyStates);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    FB.restoreCommonsUprising(FB.state);
    return { rejected:rejected, safe:safe,
      deadlines:JSON.stringify(FB.state.collectiveDemands.uprising.countyStates) === counties,
      phase:FB.state.collectiveDemands.uprising.countyStates[chain[1]].phase };
  }, chain);
  expect(result).toEqual({ rejected:true, safe:true, deadlines:true, phase:'warning' });
});

for (const boundary of ['foreign', 'sibling', 'protected', 'disconnected']) {
  test('spread excludes ' + boundary + ' counties', async function ({ page }) {
    const chain = await prepareSpreadChain(page);
    const result = await page.evaluate(function (args) {
      const s = FB.state, chain = args.chain;
      if (args.boundary === 'disconnected') FB.world.adj[chain[0]] = {};
      if (args.boundary === 'foreign') s.owner[chain[1]] = 'elsewhere';
      if (args.boundary === 'protected') FB.grantPrivilege(s, 'tax_concession', { scopeId:chain[1], grandfathered:true });
      if (args.boundary === 'sibling') {
        s.realms.commonsTestSovereign = { alive:true, liege:null };
        s.realms.player.liege = 'commonsTestSovereign';
        s.player.liege = 'commonsTestSovereign';
        s.realms.commonsTestVassal.liege = 'commonsTestSovereign';
        chain.forEach(function (pid) { s.owner[pid] = 'commonsTestSovereign'; });
        s.collectiveDemands.uprising.liegeId = 'commonsTestSovereign';
        s.collectiveDemands.uprising.sovereignId = 'commonsTestSovereign';
      }
      window.advanceCommons(60);
      return s.collectiveDemands.uprising.countyIds;
    }, { chain:chain, boundary:boundary });
    expect(result).toEqual([chain[0]]);
  });
}

test('internal vassal transfers retain disruption and one concession settles both holder types', async function ({ page }) {
  const chain = await prepareSpreadChain(page);
  const result = await page.evaluate(function (chain) {
    const s = FB.state;
    window.advanceCommons(30);
    s.holder[chain[0]] = 'commonsTestVassal';
    s.player.provs = [];
    FB.commonsUprisingDay(s);
    const retained = FB.hasModifier(s, 'commons_uprising', chain[0]);
    const territory = JSON.stringify({ owner:s.owner, holder:s.holder, liege:s.realms.commonsTestVassal.liege });
    const pop = FB.countySupportBase(s, s.player.provinceId), prestige = s.player.prestige;
    FB.concedeCommonsUprising(s, s.collectiveDemands.uprising.id);
    return { retained:retained, granted:chain.slice(0, 2).every(function (pid) {
      return FB.hasPrivilege(s, 'tax_concession', pid);
    }), pop:FB.countySupportBase(s, s.player.provinceId) - pop, prestige:s.player.prestige - prestige,
      territory:territory === JSON.stringify({ owner:s.owner, holder:s.holder, liege:s.realms.commonsTestVassal.liege }),
      finished:!s.collectiveDemands.uprising };
  }, chain);
  expect(result).toEqual({ retained:true, granted:true, pop:0, prestige:-10, territory:true, finished:true });
});

test('a consumed spread petition restores once and starts its full grace only when answered', async function ({ page }) {
  const chain = await prepareSpreadChain(page);
  const result = await page.evaluate(function (chain) {
    window.advanceCommons(30);
    FB.state.eventQueue = [];
    FB.save.restore(JSON.parse(FB.save.serialize()));
    FB.restoreCommonsUprising(FB.state);
    FB.restoreCommonsUprising(FB.state);
    const s = FB.state;
    const events = s.eventQueue.filter(function (item) { return item.id === 'commons_uprising_spread'; });
    window.advanceCommons(100);
    const waiting = s.collectiveDemands.uprising.countyStates[chain[1]].phase;
    const originalDue = s.collectiveDemands.uprising.countyStates[chain[0]].dueTurn;
    window.answerSpread();
    FB.ui.showPrivileges();
    return { count:events.length, waiting:waiting,
      grace:s.collectiveDemands.uprising.countyStates[chain[1]].dueTurn - s.turn,
      originalDue:s.collectiveDemands.uprising.countyStates[chain[0]].dueTurn === originalDue };
  }, chain);
  expect(result).toEqual({ count:1, waiting:'petition', grace:90, originalDue:true });
  await expect(page.locator('#commons-uprising-status')).toContainText('90 days to grant the concession');
  await expect(page.locator('#commons-uprising-status')).toContainText('days of disruption remain');
  await expect(page.locator('#commons-uprising-status')).toContainText('Next spread check');
});

async function prepareLocalNegotiation(page) {
  const chain = await prepareSpreadChain(page);
  return page.evaluate(function (chain) {
    const s = FB.state;
    const rid = Object.keys(s.realms).find(function (id) {
      return id !== 'player' && id !== 'commonsTestVassal' && FB.realmRulerCharacterSnapshot(s, id);
    });
    s.realms[rid].liege = 'player';
    s.realms[rid].provs = chain.slice(1);
    chain.slice(1).forEach(function (pid) { s.holder[pid] = rid; });
    FB.invalidateRealmCache();
    window.advanceCommons(30);
    return { chain:chain, vassal:rid };
  }, chain);
}

for (const success of [true, false]) {
  test('player local talks success=' + success + ' affect only direct counties and consume one attempt', async function ({ page }) {
    const setup = await prepareLocalNegotiation(page);
    const result = await page.evaluate(function (args) {
      const s = FB.state, row = s.collectiveDemands.uprising, home = args.setup.chain[0];
      const other = args.setup.chain[1], otherState = JSON.stringify(row.countyStates[other]);
      const globalStage = row.stage, deadline = row.countyStates[home].dueTurn;
      const ctx = FB.commonsUprisingLocalContext(s);
      const snapshot = JSON.stringify(s), rngState = FB.getRngState();
      const terms = FB.commonsUprisingLocalTerms(s, 'player');
      const pure = snapshot === JSON.stringify(s) && rngState === FB.getRngState();
      const beforeGold = s.player.gold, beforePop = FB.countySupportBase(s, s.player.provinceId), beforePrestige = s.player.prestige;
      const territory = JSON.stringify([s.owner, s.holder, s.player.provs, s.player.war]);
      const rng = FB.rng;
      FB.rng = function () { return args.success ? 0 : 0.999999; };
      let receipt;
      try { receipt = FB.negotiateCommonsUprisingLocal(s, ctx); }
      finally { FB.rng = rng; }
      const after = JSON.stringify(s), afterRng = FB.getRngState();
      const rejected = FB.negotiateCommonsUprisingLocal(s, ctx) === false;
      return { receipt:!!receipt, pure:pure, direct:terms.countyIds, spent:beforeGold - s.player.gold,
        pop:FB.countySupportBase(s, s.player.provinceId) - beforePop, prestige:s.player.prestige - beforePrestige,
        replaySafe:rejected && after === JSON.stringify(s) && afterRng === FB.getRngState(),
        granted:FB.hasPrivilege(s, row.privilegeId, home),
        active:FB.hasModifier(s, 'commons_uprising', home),
        otherUnchanged:otherState === JSON.stringify(row.countyStates[other]) && !FB.hasPrivilege(s, row.privilegeId, other),
        stageUnchanged:row.stage === globalStage,
        deadlineUnchanged:args.success || row.countyStates[home].dueTurn === deadline,
        visited:row.visitedCountyIds.indexOf(home) >= 0,
        territory:territory === JSON.stringify([s.owner, s.holder, s.player.provs, s.player.war]),
        grantor:FB.privilegeSummary(s).filter(function (r) { return r.scopeId === home && r.defId === row.privilegeId; }).map(function (r) { return r.grantorId; }) };
    }, { setup:setup, success:success });
    expect(result).toMatchObject({ receipt:true, pure:true, direct:[setup.chain[0]], spent:2408,
      pop:0, prestige:-10, replaySafe:true, granted:success, active:!success,
      otherUnchanged:true, stageUnchanged:true, deadlineUnchanged:true, visited:true, territory:true });
    expect(result.grantor).toEqual(success ? ['player'] : []);
  });
}

for (const success of [true, false]) {
  test('a vassal independently negotiates spread from its liege success=' + success, async function ({ page }) {
    const setup = await prepareLocalNegotiation(page);
    const result = await page.evaluate(function (args) {
      const s = FB.state, row = s.collectiveDemands.uprising;
      const home = args.setup.chain[0], local = args.setup.chain[1], rid = args.setup.vassal;
      const localBefore = JSON.stringify(row.countyStates[local]), homeBefore = JSON.stringify(row.countyStates[home]);
      const money = s.player.gold, pop = FB.countySupportBase(s, s.player.provinceId), prestige = s.player.prestige;
      const territory = JSON.stringify([s.owner, s.holder, s.player.provs, s.player.war]);
      window.advanceCommons(29);
      const early = !!(row.localNegotiations && row.localNegotiations[rid]);
      const rng = FB.rng;
      let rolls = 0;
      FB.rng = function () { rolls++; return args.success ? 0 : 0.999999; };
      try { window.advanceCommons(1); FB.commonsUprisingDay(s); FB.commonsUprisingDay(s); }
      finally { FB.rng = rng; }
      const attempt = JSON.parse(JSON.stringify(row.localNegotiations[rid]));
      const grantors = FB.privilegeSummary(s).filter(function (r) {
        return r.scopeId === local && r.defId === row.privilegeId;
      }).map(function (r) { return r.grantorId; });
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored = FB.state;
      const afterRestore = FB.getRngState();
      FB.commonsUprisingDay(restored);
      return { early:early, rolls:rolls, result:attempt.success, affected:attempt.countyIds,
        homeUnchanged:homeBefore === JSON.stringify(restored.collectiveDemands.uprising.countyStates[home]),
        localUnchanged:args.success || localBefore === JSON.stringify(restored.collectiveDemands.uprising.countyStates[local]),
        localRemoved:restored.collectiveDemands.uprising.countyIds.indexOf(local) < 0,
        grantors:grantors, playerUncharged:money === s.player.gold && pop === FB.countySupportBase(s, s.player.provinceId) && prestige === s.player.prestige,
        territory:territory === JSON.stringify([s.owner, s.holder, s.player.provs, s.player.war]),
        savedAttempt:JSON.stringify(restored.collectiveDemands.uprising.localNegotiations[rid]) === JSON.stringify(attempt),
        noReroll:afterRestore === FB.getRngState() };
    }, { setup:setup, success:success });
    expect(result).toMatchObject({ early:false, rolls:1, result:success, affected:[setup.chain[1]],
      homeUnchanged:true, localUnchanged:true, localRemoved:success, playerUncharged:true,
      territory:true, savedAttempt:true, noReroll:true });
    expect(result.grantors).toEqual(success ? [setup.vassal] : []);
  });
}

for (const change of ['funds', 'holder', 'ruler', 'incident', 'spent', 'missing_scope']) {
  test('stale local talks reject ' + change + ' changes before costs or RNG', async function ({ page }) {
    const setup = await prepareLocalNegotiation(page);
    const result = await page.evaluate(function (args) {
      const s = FB.state, ctx = FB.commonsUprisingLocalContext(s), row = s.collectiveDemands.uprising;
      if (args.change === 'funds') s.player.gold = 0;
      if (args.change === 'holder') s.holder[args.setup.chain[0]] = args.setup.vassal;
      if (args.change === 'ruler') ctx.localRulerCharId = 'former_ruler';
      if (args.change === 'incident') ctx.uprisingId = 'earlier_uprising';
      if (args.change === 'missing_scope') delete ctx.localCountyIds;
      if (args.change === 'spent') row.localNegotiations = { player:{ turn:s.turn, success:false } };
      const before = JSON.stringify(s), rng = FB.getRngState();
      return { rejected:FB.negotiateCommonsUprisingLocal(s, ctx) === false,
        unchanged:before === JSON.stringify(s), rng:rng === FB.getRngState() };
    }, { setup:setup, change:change });
    expect(result).toEqual({ rejected:true, unchanged:true, rng:true });
  });
}

for (const width of [1280, 390]) {
  test('local negotiation terms and affordability are visible at ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    const setup = await prepareLocalNegotiation(page);
    const names = await page.evaluate(function (setup) {
      FB.state.player.gold = 19;
      FB.ui.showPrivileges();
      return setup.chain.slice(0, 2).map(function (pid) { return FB.world.byId[pid].name; });
    }, setup);
    const local = page.locator('#commons-uprising-local');
    await expect(local).toContainText(names[0]);
    await expect(local).not.toContainText(names[1]);
    await expect(local).toContainText('One local attempt per uprising');
    await expect(page.locator('#commons-uprising-negotiate-local')).toBeDisabled();
    await page.evaluate(function () {
      FB.state.player.gold = 10000;
      window.localCost = FB.commonsUprisingLocalTerms(FB.state, 'player').cost;
      FB.ui.showPrivileges();
      window.localRng = FB.rng;
      FB.rng = function () { return 0.999999; };
    });
    await page.locator('#commons-uprising-negotiate-local').click();
    await page.evaluate(function () { FB.rng = window.localRng; });
    await expect(page.locator('#gm-title')).toHaveText('Negotiation failed');
    await expect(page.locator('[data-uprising-result]')).toContainText(await page.evaluate(function () {
      return FB.T('Money {change}', { change:'−' + FB.money(window.localCost) });
    }));
    await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
    await page.locator('#uprising-continue').click();
    await expect(page.locator('#commons-uprising-local')).toContainText('attempt has been used');
    await expect(page.locator('#commons-uprising-negotiate-local')).toBeDisabled();
    await expect(page.locator('#privileges-back')).toBeFocused();
    expect(await page.evaluate(function () { return FB.state.player.gold + window.localCost; })).toBe(10000);
  });
}

test('local talks settle all direct holdings together while preserving a subordinate county', async function ({ page }) {
  await addCommonsCounties(page, 2);
  const result = await page.evaluate(function () {
    const s = FB.state;
    window.beginCommons(3);
    const row = s.collectiveDemands.uprising;
    const indirect = row.countyIds[2], direct = row.countyIds.slice(0, 2);
    const rid = Object.keys(s.realms).find(function (id) {
      return id !== 'player' && FB.realmRulerCharacterSnapshot(s, id);
    });
    s.realms[rid].liege = 'player';
    s.holder[indirect] = rid;
    s.player.provs = direct.slice();
    const due = row.countyStates[indirect].dueTurn;
    const ctx = FB.commonsUprisingLocalContext(s), gold = s.player.gold;
    const rng = FB.rng;
    FB.rng = function () { return 0; };
    try { FB.negotiateCommonsUprisingLocal(s, ctx); }
    finally { FB.rng = rng; }
    return { scope:ctx.localCountyIds, expected:direct, remaining:row.countyIds,
      expectedRemaining:[indirect], spent:gold - s.player.gold,
      active:FB.hasModifier(s, 'commons_uprising', indirect),
      due:row.countyStates[indirect].dueTurn === due,
      settled:direct.every(function (pid) {
        return FB.hasPrivilege(s, row.privilegeId, pid) && !FB.hasModifier(s, 'commons_uprising', pid);
      }), globalResponse:row.stage };
  });
  expect(result.scope).toEqual(result.expected);
  expect(result.remaining).toEqual(result.expectedRemaining);
  expect(result).toMatchObject({ spent:2696, active:true, due:true, settled:true, globalResponse:'active' });
});

test('a vassal can end active local disruption without ending its liege’s uprising', async function ({ page }) {
  const setup = await prepareLocalNegotiation(page);
  const result = await page.evaluate(function (setup) {
    const s = FB.state, local = setup.chain[1], home = setup.chain[0];
    FBDATA.balance.commonsUprisingLocalNegotiationDays = 120;
    window.answerSpread();
    window.advanceCommons(90);
    const activeBefore = FB.hasModifier(s, 'commons_uprising', local);
    const due = s.collectiveDemands.uprising.countyStates[home].dueTurn;
    const rng = FB.rng;
    FB.rng = function () { return 0; };
    try { window.advanceCommons(30); }
    finally { FB.rng = rng; }
    return { activeBefore:activeBefore, localActive:FB.hasModifier(s, 'commons_uprising', local),
      settled:FB.hasPrivilege(s, 'tax_concession', local),
      homeActive:FB.hasModifier(s, 'commons_uprising', home),
      homeDue:s.collectiveDemands.uprising.countyStates[home].dueTurn === due,
      attempt:s.collectiveDemands.uprising.localNegotiations[setup.vassal].success };
  }, setup);
  expect(result).toEqual({ activeBefore:true, localActive:false, settled:true, homeActive:true, homeDue:true, attempt:true });
});

for (const acknowledgement of ['Continue', 'Escape']) {
  test('successful local talks retain a receipt and return through ' + acknowledgement, async function ({ page }) {
    await page.setViewportSize({ width:390, height:520 });
    await prepareLocalNegotiation(page);
    await page.evaluate(function () {
      FB.state.player.gold = 10000;
      window.localCost = FB.commonsUprisingLocalTerms(FB.state, 'player').cost;
      FB.ui.showPrivileges();
      window.localRng = FB.rng;
      FB.rng = function () { return 0; };
      document.getElementById('commons-uprising-negotiate-local').addEventListener('click', function () {
        window.uprisingReturnScroll = document.getElementById('gm-body').scrollTop;
      }, true);
    });
    await page.locator('#commons-uprising-negotiate-local').click();
    await page.evaluate(function () { FB.rng = window.localRng; });
    await expect(page.locator('#gm-title')).toHaveText('Grievance settled');
    await expect(page.locator('[data-uprising-result]')).toContainText('end resistance');
    await expect(page.locator('[data-uprising-result]')).toContainText(await page.evaluate(function () {
      return FB.T('Money {change}', { change:'−' + FB.money(window.localCost) });
    }));
    expect(await page.evaluate(function () { return window.uprisingReturnScroll; })).toBeGreaterThan(0);
    await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
    if (acknowledgement === 'Escape') await page.keyboard.press('Escape');
    else await page.locator('#uprising-continue').click();
    await expect(page.locator('#privileges-back')).toBeFocused();
    await expect.poll(function () { return page.evaluate(function () {
      const body = document.getElementById('gm-body');
      return Math.abs(body.scrollTop - Math.min(window.uprisingReturnScroll, body.scrollHeight - body.clientHeight));
    }); }).toBeLessThanOrEqual(1);
    expect(await page.evaluate(function () { return FB.state.player.gold + window.localCost; })).toBe(10000);
  });
}

for (const width of [390, 1280]) {
  test('uprising terms group identical county concessions at ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    await page.evaluate(function () {
      const item = window.beginCommons();
      FB.state.eventQueue = [];
      FB.ui.runEvents([item]);
    });
    await expect(page.locator('#ev-title')).toHaveText('The commons rise');
    await expect(page.locator('#ev-text')).toContainText('Unrest can spread every 30 days');
    await expect(page.locator('#ev-text')).toContainText('180 days');
    await expect(page.locator('#event-choice-details-0 .event-concession-terms')).toHaveCount(2);
    await expect(page.locator('#event-choice-details-0')).toContainText('1080 days');
    await expect(page.locator('#event-choice-details-0')).toContainText('-8% county tax');
    await expect(page.locator('#event-choice-details-1 .event-concession-terms')).toHaveCount(2);
    await expect(page.locator('#event-choice-details-1')).toContainText('Grievance settled');
    await expect(page.locator('#event-choice-details-1')).toContainText('Disruption continues');
    await expect(page.locator('#event-choice-details-1')).not.toContainText('Active counties keep their own');
    await expect(page.locator('#event-choice-details-2')).toContainText('Uprising ended');
    await expect(page.locator('#event-choice-details-2')).toContainText('Original deadlines unchanged');
    await expect(page.locator('#event-choice-details-3 .event-impact-chip')).toHaveCount(3);
    await expect(page.locator('#event-choice-details-3')).toContainText('Low support: unrest may spread');
  });
}


test('healthy neighboring counties stop spread until their own support falls', async function ({ page }) {
  const chain = await prepareSpreadChain(page);
  const result = await page.evaluate(function (chain) {
    const s = FB.state;
    FB.setCountySupport(s, chain[1], 25);
    window.advanceCommons(60);
    const isolated = s.collectiveDemands.uprising.countyIds.slice();
    FB.setCountySupport(s, chain[1], -40);
    window.advanceCommons(30);
    const spread = s.collectiveDemands.uprising.countyIds.slice();
    FB.setCountySupport(s, chain[1], 25);
    window.advanceCommons(1);
    return { isolated:isolated, spread:spread, recovered:s.collectiveDemands.uprising.countyIds,
      originSupport:FB.countyPopularSupport(s, chain[0]),
      originActive:FB.hasModifier(s, 'commons_uprising', chain[0]) };
  }, chain);
  expect(result.isolated).toEqual([chain[0]]);
  expect(result.spread).toEqual([chain[0], chain[1]]);
  expect(result.recovered).toEqual([chain[0]]);
  expect(result.originSupport).toBeLessThan(-20);
  expect(result.originActive).toBe(true);
});
