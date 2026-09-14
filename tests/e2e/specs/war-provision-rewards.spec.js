'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/armies.js', 'js/events.js', 'js/world.js',
  'js/wars.js', 'js/logistics.js', 'js/ui_modals.js', 'data/events_war.js',
  'data/map_data.js', 'data/technology.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('raiding refills the assigned host immediately and previews its actual capped reward', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = FB.playerHost(s), war = FB.ordinaryWarById(s, host.warId);
    host.supply = 96;
    const before = { strength:war.strength, men:host.men, at:host.at, path:host.path.slice() };
    const ev = FB.eventById('war_local_requisition'), option = ev.options[1];
    const ctx = { warId:war.id };
    const quote = FB.warProvisionQuote(s, ctx), rng = FB.getRngState();
    const preview = FB.previewEventOption(s, ev, option, ctx);
    const unchangedRng = rng === FB.getRngState();
    const impact = preview.sections[0].impacts.find(function (row) { return row.type === 'hostProvisions'; });
    FB.applyEffects(s, option.effects, ctx, ev);
    const saved = JSON.parse(FB.save.serialize());
    const again = FB.warProvisionQuote(s, ctx);
    return { amount:quote.amount, preview:impact.amount, previewText:FB.eventImpactText(s, impact, 'preview'),
      supply:host.supply, unchangedRng:unchangedRng,
      same:before.strength === war.strength && before.men === host.men && before.at === host.at &&
        JSON.stringify(before.path) === JSON.stringify(host.path),
      saved:saved.state.armies.find(function (a) { return a.id === host.id; }).supply,
      again:again.amount, effect:war.effects[war.effects.length - 1],
      technology:FBDATA.techImpactReviews.features.war_event_provisions.mode };
  });
  expect(r.amount).toBe(4);
  expect(r.preview).toBe(4);
  expect(r.previewText).toContain('+4');
  expect(r.supply).toBe(100);
  expect(r.saved).toBe(100);
  expect(r.again).toBe(0);
  expect(r.same).toBe(true);
  expect(r.unchangedRng).toBe(true);
  expect(r.effect).toMatchObject({ condition:'provisions', target:'provisions', provisionsDelta:4, strengthDelta:0 });
  expect(r.technology).toBe('none');
});

test('a supply reward cannot feed a larger host in another war or an ended campaign', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = FB.playerHost(s), war = FB.ordinaryWarById(s, host.warId);
    host.supply = 20;
    const other = Object.assign({}, host, { id:'other-campaign-host', warId:'unrelated', men:host.men + 1000, supply:0 });
    s.armies.push(other);
    const quote = FB.warProvisionQuote(s, { warId:war.id });
    const staleEvent = FB.warProvisionQuote(s, { warEventId:'expired-event' });
    const wrongEnemy = FB.warProvisionQuote(s, { warId:war.id, warEnemyId:'unrelated-enemy' });
    FB.withOrdinaryWar(s, war.id, function () {
      FB.fns.war_supply(s, { warId:war.id }, FB.eventById('war_grain_seller'));
    });
    const supplied = host.supply;
    s.armies = [other];
    const missing = FB.warProvisionQuote(s, { warId:war.id });
    FB.withOrdinaryWar(s, war.id, function () { FB.fns.war_supply(s, { warId:war.id }); });
    war.status = 'ended';
    const stale = FB.warProvisionQuote(s, { warId:war.id });
    return { host:quote.hostId === host.id, supplied:supplied, other:other.supply,
      missing:missing.amount, stale:stale.amount,
      staleEvent:staleEvent.amount, wrongEnemy:wrongEnemy.amount };
  });
  expect(r).toEqual({ host:true, supplied:30, other:0, missing:0, stale:0, staleEvent:0, wrongEnemy:0 });
});

test('reorganization shows the capped combat modifier and does not move or feed the host', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = FB.playerHost(s), war = FB.ordinaryWarById(s, host.warId);
    host.supply = 40; war.strength = 1.08;
    const ev = FB.eventById('war_council'), option = ev.options[1];
    const ctx = { warId:war.id };
    const preview = FB.previewEventOption(s, ev, option, ctx);
    const effect = preview.sections[0].impacts.find(function (row) { return row.type === 'warCondition'; });
    const at = host.at, route = JSON.stringify(host.path);
    FB.applyEffects(s, option.effects, ctx, ev);
    return { text:option.desc, delta:effect.amount, strength:war.strength, supply:host.supply,
      stayed:host.at === at && JSON.stringify(host.path) === route };
  });
  expect(r.delta).toBeCloseTo(0.02, 8);
  expect(r.strength).toBeCloseTo(1.1, 8);
  expect(r.text).toContain('Combat-effectiveness modifier');
  expect(r.supply).toBe(40);
  expect(r.stayed).toBe(true);
});
