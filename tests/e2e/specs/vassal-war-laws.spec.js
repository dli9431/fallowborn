'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/wars.js', 'js/actions.js', 'js/world.js',
  'js/institutions.js', 'data/policies.js', 'data/technology.js', 'js/armies.js', 'js/ui_wars.js', 'js/ui_modals.js', 'js/i18n.js', 'js/messages.js', 'js/events.js', 'data/events_war.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function vassalSetup(page, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  return page.evaluate(function (ids) {
    const s = FB.state;
    FB.realmWars(s, 'player').forEach(function (w) { FB.settleOrdinaryWar(s, w.id, 'invalid'); });
    s.truces = {};
    s.player.liege = ids.liege; s.realms.player.liege = ids.liege;
    s.player.provs.forEach(function (pid) { s.owner[pid] = ids.liege; });
    const target = Object.keys(FB.world.adj[ids.home]).filter(function (pid) {
      return !FB.world.byId[pid].wasteland && s.player.provs.indexOf(pid) < 0;
    }).sort()[0];
    s.owner[target] = ids.enemy; s.holder[target] = ids.enemy;
    FB.invalidateRealmCache();
    FB.saveFabricatedClaim(s, target);
    ids.cause = { type:'fabricated', target:target, enemy:ids.enemy };
    return ids;
  }, ids);
}

test('customary, permission and prohibited laws retain exact campaign authorization', async function ({ page }, testInfo) {
  const ids = await vassalSetup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, cause = ids.cause, initial = FB.warDeclarationPreview(s, 'player', [cause]);
    s.warLaws = {}; s.warLaws[ids.liege] = { external_campaigns:{ level:'permission' } };
    const blocked = FB.warDeclarationPreview(s, 'player', [cause]).unlawful;
    FB.adjustStanding(s, { kind:'realm', id:ids.liege }, 200, 'test');
    const granted = FB.requestWarPermission(s, 'player', [cause]);
    const allowed = !FB.warDeclarationPreview(s, 'player', [cause]).unlawful;
    s.warLaws[ids.liege].external_campaigns.level = 'prohibited';
    const prohibited = FB.warDeclarationPreview(s, 'player', [cause]).unlawful;
    const denied = FB.startPlayerWar(s, cause);
    const started = FB.startPlayerWar(s, cause, { confirmUnlawful:true });
    return { defaultAllowed:initial.valid && !initial.unlawful, blocked:blocked,
      granted:granted, allowed:allowed, prohibited:prohibited, denied:denied, started:started,
      demand:FB.realmWars(s, 'player')[0].peaceDemand.deadline === s.turn + 90 };
  }, ids);
  expect(result).toEqual({ defaultAllowed:true, blocked:true, granted:true, allowed:true,
    prohibited:true, denied:false, started:true, demand:true });
});

test('refusing peace permits a distinct liege enforcement campaign', async function ({ page }, testInfo) {
  const ids = await vassalSetup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    s.warLaws = {}; s.warLaws[ids.liege] = { external_campaigns:{ level:'prohibited' } };
    FB.startPlayerWar(s, ids.cause, { confirmUnlawful:true });
    const w = FB.realmWars(s, 'player')[0];
    const premature = FB.startPeaceEnforcement(s, w.id);
    FB.answerPeaceDemand(s, w.id, false);
    const enforcement = FB.startPeaceEnforcement(s, w.id);
    const total = FB.realmWars(s, 'player').length;
    FB.settleOrdinaryWar(s, w.id, 'white_peace');
    return { premature:premature, enforcement:enforcement, total:total,
      closed:FB.realmWars(s, 'player').length === 0, truce:FB.truceExpiry(s, 'player', ids.liege) };
  }, ids);
  expect(result).toEqual({ premature:false, enforcement:true, total:2, closed:true, truce:0 });
});

test('enforcement victory ends only its offending campaign and preserves the offender’s land', async function ({ page }, testInfo) {
  const ids = await vassalSetup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    s.warLaws = {}; s.warLaws[ids.liege] = { external_campaigns:{ level:'prohibited' } };
    FB.startPlayerWar(s, ids.cause, { confirmUnlawful:true });
    const unlawful = FB.realmWars(s, 'player')[0];
    FB.answerPeaceDemand(s, unlawful.id, false);
    FB.startPeaceEnforcement(s, unlawful.id);
    const enforcing = FB.realmWars(s, 'player').filter(function (w) { return w.enforcementOf; })[0];
    const unrelated = FB.registerOrdinaryWar(s, 'player', { enemy:ids.other, target:s.realms[ids.other].capital });
    const land = s.player.provs.slice(), prestige = s.player.prestige;
    enforcing.occupations[enforcing.target] = { occupied:true, progress:0 };
    FB.withOrdinaryWar(s, enforcing.id, function () { FB.warCapture(s); });
    return { remaining:FB.realmWars(s, 'player').map(function (w) { return w.id; }), expected:unrelated.id,
      landSame:JSON.stringify(land) === JSON.stringify(s.player.provs), penalty:prestige - s.player.prestige,
      truce:FB.truceExpiry(s, 'player', ids.liege) === s.turn + 720 };
  }, ids);
  expect(result.remaining).toEqual([result.expected]);
  expect(result.landSame).toBe(true);
  expect(result.penalty).toBe(50);
  expect(result.truce).toBe(true);
});

test('an independent duke can proclaim war law without research and existing wars keep their terms', async function ({ page }, testInfo) {
  const ids = await vassalSetup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.startPlayerWar(s, ids.cause);
    const w = FB.realmWars(s, 'player')[0];
    s.player.liege = null; s.realms.player.liege = null; s.player.tier = 5; s.realms.player.rank = 2;
    s.player.provs.forEach(function (pid) { s.owner[pid] = 'player'; });
    FB.invalidateRealmCache();
    const before = s.player.gold;
    const status = FB.realmPolicyStatus(s, 'internal_peace', 'prohibited');
    const enacted = FB.realmPolicyProclaim(s, 'internal_peace', 'prohibited');
    const second = FB.realmPolicyProclaim(s, 'internal_peace', 'customary');
    return { ready:status.ready, enacted:enacted, second:second,
      paid:before - s.player.gold, expected:status.cost,
      grandfathered:!!FB.ordinaryWarById(s, w.id) && !w.unlawful && !w.peaceDemand,
      mode:FBDATA.techImpactReviews.features.vassal_war_laws.mode };
  }, ids);
  expect(result.ready).toBe(true);
  expect(result.enacted).toBe(true);
  expect(result.second).toBe(false);
  expect(result.paid).toBe(result.expected);
  expect(result.grandfathered).toBe(true);
  expect(result.mode).toBe('none');
});


for (const answer of ['comply', 'refuse']) {
  test('dedicated peace demand ' + answer + ' affects only its campaign', async function ({ page }, testInfo) {
    const ids = await vassalSetup(page, testInfo);
    const result = await page.evaluate(function (input) {
      const s = FB.state, ids = input.ids;
      s.warLaws = {}; s.warLaws[ids.liege] = { external_campaigns:{ level:'prohibited' } };
      FB.startPlayerWar(s, ids.cause, { confirmUnlawful:true });
      const war = FB.realmWars(s, 'player')[0];
      const other = FB.registerOrdinaryWar(s, 'player', { enemy:ids.other, target:s.realms[ids.other].capital });
      FB.campaignDaily(s); FB.campaignDaily(s);
      const entries = s.eventQueue.filter(function (e) { return e.id === 'war_peace_demand'; });
      const ev = FB.eventById('war_peace_demand'), prestige = s.player.prestige;
      FB.resolveEventOption(s, ev, ev.options[input.answer === 'comply' ? 0 : 1], entries[0].ctx);
      return { count:entries.length, exact:entries[0].ctx.warId === war.id,
        ended:!FB.ordinaryWarById(s, war.id), other:!!FB.ordinaryWarById(s, other.id),
        status:war.peaceDemand.status, noWithdrawalCost:s.player.prestige === prestige,
        stale:!FB.fns.war_peace_demand_valid(s, entries[0].ctx) };
    }, { ids:ids, answer:answer });
    expect(result).toEqual({ count:1, exact:true, ended:answer === 'comply', other:true,
      status:answer === 'comply' ? 'complied' : 'refused', noWithdrawalCost:true, stale:true });
  });
}

for (const change of ['peace', 'liege', 'deadline']) {
  test('peace-demand event rejects stale ' + change + ' context', async function ({ page }, testInfo) {
    const ids = await vassalSetup(page, testInfo);
    const result = await page.evaluate(function (input) {
      const s = FB.state, ids = input.ids;
      s.warLaws = {}; s.warLaws[ids.liege] = { external_campaigns:{ level:'prohibited' } };
      FB.startPlayerWar(s, ids.cause, { confirmUnlawful:true });
      const w = FB.realmWars(s, 'player')[0];
      const ctx = s.eventQueue.filter(function (e) { return e.id === 'war_peace_demand'; })[0].ctx;
      if (input.change === 'peace') FB.settleOrdinaryWar(s, w.id, 'white_peace');
      if (input.change === 'liege') { s.player.liege = ids.other; s.realms.player.liege = ids.other; }
      if (input.change === 'deadline') s.turn = w.peaceDemand.deadline;
      const before = JSON.stringify(s);
      const valid = FB.fns.war_peace_demand_valid(s, ctx);
      FB.fns.war_peace_demand_comply(s, ctx);
      return { valid:valid, unchanged:before === JSON.stringify(s) };
    }, { ids:ids, change:change });
    expect(result).toEqual({ valid:false, unchanged:true });
  });
}

test('older pending demands queue once and campaign sheets contain no demand choices', async function ({ page }, testInfo) {
  const ids = await vassalSetup(page, testInfo);
  const queued = await page.evaluate(function (ids) {
    const s = FB.state;
    s.warLaws = {}; s.warLaws[ids.liege] = { external_campaigns:{ level:'prohibited' } };
    FB.startPlayerWar(s, ids.cause, { confirmUnlawful:true });
    const w = FB.realmWars(s, 'player')[0];
    delete w.peaceDemand.eventQueued; s.eventQueue = [];
    FB.campaignDaily(s); FB.campaignDaily(s);
    FB.ui.showCampaign(w.id);
    return s.eventQueue.filter(function (e) { return e.id === 'war_peace_demand'; }).length;
  }, ids);
  expect(queued).toBe(1);
  await expect(page.locator('#campaign-comply, #campaign-defy')).toHaveCount(0);
  await expect(page.locator('#campaign-peace')).toHaveText('Withdraw');
});


test('enforcement declares its cause in a campaign-bound modal, toast and report', async function ({ page }, testInfo) {
  const ids = await vassalSetup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    s.warLaws = {}; s.warLaws[ids.liege] = { external_campaigns:{ level:'prohibited' } };
    FB.startPlayerWar(s, ids.cause, { confirmUnlawful:true });
    const unlawful = FB.realmWars(s, 'player')[0];
    FB.answerPeaceDemand(s, unlawful.id, false);
    s.eventQueue = [];
    const push = FB.fx.push, intents = [];
    FB.fx.push = function (intent) { intents.push(intent); return push.call(this, intent); };
    try { FB.startPeaceEnforcement(s, unlawful.id); }
    finally { FB.fx.push = push; }
    const war = FB.realmWars(s, 'player').find(function (w) { return w.enforcementOf === unlawful.id; });
    FB.announcePlayerDefense(s, war);
    const events = s.eventQueue.filter(function (e) { return e.id === 'war_enforcement_defense'; });
    const toastCount = intents.filter(function (fx) {
      return fx.kind === 'toast' && fx.message && fx.message.key === 'news.war.enforcement_declared';
    }).length;
    const valid = FB.fns.war_event_context_valid(s, events[0].ctx);
    const ev = FB.eventById('war_enforcement_defense');
    const before = JSON.stringify(s), rng = FB.getRngState();
    const message = FB.eventMessage(s, s.player.charId, ev, 'text', events[0].ctx);
    const params = FB.textParams(s, s.player.charId, '{enemy} / {target}', events[0].ctx, true);
    const originalParams = FB.textParams(s, s.player.charId, '{enemy} / {target}', { warId:unlawful.id }, true);
    const legacyParams = FB.textParams(s, s.player.charId, '{enemy} / {target}', { warEventId:war.eventId }, true);
    const staleParams = FB.textParams(s, s.player.charId, '{enemy} / {target}', { warId:'missing_campaign' }, false);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState();
    FB.ui.runEvents([events[0]]);
    return { events:events.length, exact:events[0].ctx.warId === war.id, valid:valid,
      toastCount:toastCount, reportId:war.hostileReportId, pure:pure,
      params:params, legacyParams:legacyParams, originalParams:originalParams, staleParams:staleParams,
      liege:s.realms[ids.liege].name, target:FB.world.byId[war.target].name,
      originalEnemy:s.realms[ids.enemy].name, originalTarget:FB.world.byId[unlawful.target].name,
      messageText:FB.renderMessage(JSON.parse(JSON.stringify(message)), { state:s, viewer:s.player.charId }) };
  }, ids);
  expect(result.events).toBe(1);
  expect(result.exact).toBe(true);
  expect(result.valid).toBe(true);
  expect(result.toastCount).toBe(1);
  expect(result.pure).toBe(true);
  expect(result.params).toEqual({ enemy:result.liege, target:result.target });
  expect(result.legacyParams).toEqual(result.params);
  expect(result.originalParams).toEqual({ enemy:result.originalEnemy, target:result.originalTarget });
  expect(result.staleParams).toEqual({ enemy:'the enemy', target:'their lands' });
  expect(result.messageText).toContain(result.liege + ' declares war');
  await expect(page.locator('#eventmodal')).toBeVisible();
  await expect(page.locator('#ev-text')).toContainText(result.liege + ' declares war');
  await expect(page.locator('#ev-text')).toContainText('marches on ' + result.target);
  await expect(page.locator('#eventmodal')).toContainText('refusal to end an unlawful campaign');
  await page.evaluate(function (id) { FB.ui.showHostileReport(id); }, result.reportId);
  await expect(page.locator('#gm-body')).toContainText('Enforcement of the liege’s peace demand');
  await expect(page.locator('#gm-body')).not.toContainText('{title}');
});


for (const resolution of ['enforced', 'bought']) {
  test('peace outcome displays actual ' + resolution + ' terms without hiding them', async function ({ page }, testInfo) {
    const ids = await vassalSetup(page, testInfo);
    const result = await page.evaluate(function (input) {
      const s = FB.state, ids = input.ids;
      s.warLaws = {}; s.warLaws[ids.liege] = { external_campaigns:{ level:'prohibited' } };
      FB.startPlayerWar(s, ids.cause, { confirmUnlawful:true });
      const unlawful = FB.realmWars(s, 'player')[0];
      FB.answerPeaceDemand(s, unlawful.id, false);
      FB.startPeaceEnforcement(s, unlawful.id);
      const war = FB.realmWars(s, 'player').find(function (w) { return w.enforcementOf === unlawful.id; });
      s.eventQueue = []; s.player.prestige = 7; s.player.gold = 100;
      war.losses = 1;
      if (input.resolution === 'enforced') {
        war.occupations[war.target] = { occupied:true, progress:0 };
        FB.withOrdinaryWar(s, war.id, function () { FB.warCapture(s); });
      } else FB.fns.war_terms(s, { warId:war.id });
      const report = FB.hostileReport(s, war.hostileReportId);
      const terms = JSON.parse(JSON.stringify(report.peaceTerms));
      // Later household changes must not rewrite the concluded peace terms.
      s.player.gold = 500; s.player.prestige = 90;
      const event = s.eventQueue.find(function (e) { return e.id === 'decision_outcome'; });
      FB.ui.runEvents([event]);
      return { terms:terms, reportId:report.id, unlawful:!!FB.ordinaryWarById(s, unlawful.id) };
    }, { ids:ids, resolution:resolution });
    expect(result.terms.prestige).toBe(-7);
    expect(result.terms.gold).toBe(resolution === 'bought' ? -20 : 0);
    expect(result.terms.lost).toEqual([]);
    expect(result.unlawful).toBe(resolution === 'bought');
    const terms = page.locator('#ev-text .war-peace-terms');
    await expect(terms).toBeVisible();
    await expect(terms).toContainText('Prestige');
    await expect(terms).toContainText('7');
    await expect(terms).toContainText('No land changes hands.');
    if (resolution === 'enforced') await expect(terms).toContainText('The unlawful campaign is ended.');
    else await expect(terms).toContainText('Tribute paid:');
    await page.evaluate(function (id) { FB.ui.showHostileReport(id); }, result.reportId);
    await expect(page.locator('#gm-body .war-peace-terms')).toBeVisible();
    await expect(page.locator('#gm-body .war-peace-terms')).toContainText('No land changes hands.');
  });
}
