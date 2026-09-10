'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/wars.js', 'js/world.js', 'js/actions.js', 'js/armies.js',
  'js/events.js', 'js/save.js', 'js/fortifications.js', 'js/holywar.js',
  'js/ui_wars.js', 'js/ui_panels.js', 'js/ui_modals.js', 'data/policies.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('two campaigns survive repair and ending one preserves the other host and events', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.ensureWars(s);
    const first = FB.realmWars(s, 'player')[0];
    const second = FB.registerOrdinaryWar(s, 'player', { enemy:ids.other,
      target:s.realms[ids.other].capital, casus:{ type:'border' } });
    const host = FB.playerHost(s);
    FB.assignHostCampaign(s, host.id, second.id);
    const context = FB.withOrdinaryWar(s, second.id, function () { return FB.warEventContext(s, {}); });
    const rng = FB.getRngState();
    FB.repairWars(s);
    const retained = FB.realmWars(s, 'player').length;
    const ambiguous = FB.endPlayerWar(s);
    FB.settleOrdinaryWar(s, first.id, 'white_peace');
    FB.repairWars(s);
    return { retained:retained, ambiguous:ambiguous,
      remaining:FB.realmWars(s, 'player').map(function (w) { return w.id; }),
      expected:second.id, host:!!FB.playerHost(s),
      eventValid:FB.fns.war_event_context_valid(s, context),
      truce:FB.truceExpiry(s, 'player', ids.enemy) > s.turn,
      unrelatedTruce:FB.truceExpiry(s, 'player', ids.other), rngSame:rng === FB.getRngState() };
  }, ids);
  expect(result.retained).toBe(2);
  expect(result.ambiguous).toBe(false);
  expect(result.remaining).toEqual([result.expected]);
  expect(result.host).toBe(true);
  expect(result.eventValid).toBe(true);
  expect(result.truce).toBe(true);
  expect(result.unrelatedTruce).toBe(0);
  expect(result.rngSame).toBe(true);
});

test('war event effects retain their exact campaign and expired events cannot affect another war', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, first = FB.realmWars(s, 'player')[0];
    const second = FB.registerOrdinaryWar(s, 'player', { enemy:ids.other, target:s.realms[ids.other].capital });
    const ctx = FB.withOrdinaryWar(s, second.id, function () { return FB.warEventContext(s, {}); });
    FB.applyEffects(s, { custom:'war_press_on' }, ctx);
    const correct = !first.tributeDeclined && second.tributeDeclined === 1;
    FB.settleOrdinaryWar(s, second.id, 'white_peace');
    const gold = s.player.gold;
    FB.applyEffects(s, { gold:1000 }, ctx);
    return { correct:correct, safe:s.player.gold === gold && !first.tributeDeclined };
  }, ids);
  expect(result).toEqual({ correct:true, safe:true });
});

test('registry saves contain one authoritative war store and migrate without randomness', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.registerOrdinaryWar(s, 'player', { enemy:ids.other, target:s.realms[ids.other].capital });
    const encoded = JSON.stringify(s), copy = JSON.parse(encoded), rng = FB.getRngState();
    const noAlias = !Object.prototype.hasOwnProperty.call(copy.player, 'war');
    FB.ensureWars(copy);
    const once = JSON.stringify(copy);
    FB.ensureWars(copy);
    return { count:FB.realmWars(copy, 'player').length, noAlias:noAlias,
      stable:once === JSON.stringify(copy), rngSame:rng === FB.getRngState() };
  }, ids);
  expect(result).toEqual({ count:2, noAlias:true, stable:true, rngSame:true });
});

test('host reassignment preserves troops and a third neutral realm stays neutral', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, host = FB.playerHost(s);
    const second = FB.registerOrdinaryWar(s, 'player', { enemy:ids.other, target:s.realms[ids.other].capital });
    const before = JSON.stringify([host.men, host.units, host.supply, host.at]);
    const changed = FB.assignHostCampaign(s, host.id, second.id);
    return { changed:changed, conserved:before === JSON.stringify([host.men, host.units, host.supply, host.at]),
      hostile:FB.armiesHostile(s, host, { realm:ids.other }),
      neutral:FB.armiesHostile(s, { realm:ids.enemy }, { realm:ids.other }),
      liege:FB.armiesHostile(s, host, { realm:ids.liege }) };
  }, ids);
  expect(result).toEqual({ changed:true, conserved:true, hostile:true, neutral:false, liege:false });
});

test('peace in another campaign does not release the first campaign’s prisoner', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, first = FB.realmWars(s, 'player')[0];
    const second = FB.registerOrdinaryWar(s, 'player', { enemy:ids.other, target:s.realms[ids.other].capital });
    s.player.flags.in_prison = true; s.player.captiveWarId = first.id;
    FB.settleOrdinaryWar(s, second.id, 'white_peace');
    const retained = !!s.player.flags.in_prison;
    FB.settleOrdinaryWar(s, first.id, 'white_peace');
    return { retained:retained, released:!s.player.flags.in_prison };
  }, ids);
  expect(result).toEqual({ retained:true, released:true });
});


test('legacy captivity migrates to its campaign without consuming randomness', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const copy = JSON.parse(JSON.stringify(FB.state));
    delete copy.wars; delete copy.military;
    copy.player.war = { enemy:ids.enemy, target:copy.realms[ids.enemy].capital };
    copy.player.flags.in_prison = true;
    delete copy.player.captiveWarId;
    const rng = FB.getRngState();
    FB.ensureWars(copy);
    return { assigned:copy.player.captiveWarId === FB.realmWars(copy, 'player')[0].id,
      unchanged:rng === FB.getRngState() };
  }, ids);
  expect(result).toEqual({ assigned:true, unchanged:true });
});

test('captivity processes once per season and only in the capturing campaign', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, first = FB.realmWars(s, 'player')[0];
    const second = FB.registerOrdinaryWar(s, 'player', { enemy:ids.other, target:s.realms[ids.other].capital });
    s.player.flags.in_prison = true; s.player.captiveWarId = first.id;
    delete s.player.captivitySeasonTurn;
    s.council = s.council || {}; s.council.authority = 50;
    const initial = FB.getRngState();
    FB.withOrdinaryWar(s, second.id, function () { FB.warCaptivityTick(s); });
    const unrelated = initial === FB.getRngState() && s.council.authority === 50;
    FB.withOrdinaryWar(s, first.id, function () { FB.warCaptivityTick(s); });
    const once = FB.getRngState();
    FB.withOrdinaryWar(s, first.id, function () { FB.warCaptivityTick(s); });
    return { unrelated:unrelated, authority:s.council.authority,
      once:once === FB.getRngState(), processed:s.player.captivitySeasonTurn === s.turn };
  }, ids);
  expect(result).toEqual({ unrelated:true, authority:48, once:true, processed:true });
});
