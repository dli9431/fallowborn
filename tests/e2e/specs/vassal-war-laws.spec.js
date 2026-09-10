'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/wars.js', 'js/actions.js', 'js/world.js',
  'js/institutions.js', 'data/policies.js', 'data/technology.js', 'js/ui_wars.js']);
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
