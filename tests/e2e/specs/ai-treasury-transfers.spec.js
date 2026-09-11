'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'js/main.js', 'js/treasury.js', 'js/world.js', 'js/wars.js',
  'js/actions.js', 'js/events.js', 'js/travel.js', 'js/intrigue.js', 'js/council.js',
  'js/agency.js', 'js/parliament.js', 'js/save.js', 'js/messages.js', 'data/events_world.js',
  'data/events_war.js', 'data/events_council.js', 'data/events_agency.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('news shares owned messages but isolates caller data and receipt snapshots', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state;
    const params = { amount:1, nested:{ name:'before' } };
    const message = FB.message('news.gift.copy_probe', params);
    const first = FB.news(s, message, { toast:false });
    const packed = s.chronicle.entries[s.chronicle.entries.length - 1];
    params.nested.name = 'after';
    const raw = JSON.parse(JSON.stringify(message));
    const second = FB.news(s, raw, { toast:false });
    raw.params.nested.name = 'changed';
    const receipt = { schema:1, impacts:[{ value:7 }] };
    const third = FB.news(s, message, { toast:false, receipt:receipt });
    const saved = JSON.stringify(s.chronicle.entries[s.chronicle.entries.length - 1]);
    receipt.impacts[0].value = 20;
    third.receipt.impacts[0].value = 30;
    return { shared:first.msg === message, callerIsolated:second.msg !== raw,
      first:first.msg.params.nested.name, second:second.msg.params.nested.name,
      packedShared:packed[3][1] === message.params,
      frozen:Object.isFrozen(packed) && Object.isFrozen(packed[3][1].nested),
      receiptIsolated:saved === JSON.stringify(s.chronicle.entries[s.chronicle.entries.length - 1]) };
  });
  expect(result).toEqual({ shared:true, callerIsolated:true, first:'before', second:'before',
    packedShared:true, frozen:true, receiptIsolated:true });
});

test('courier batches preserve state while sharing cooldown and head bookkeeping', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const original = FB.state, initial = JSON.stringify(original);
    const note = FB.chronicleNoteHead, turns = FB.realmGiftTurns;
    let heads = 0, scans = 0;
    FB.chronicleNoteHead = function (s) { heads++; return note(s); };
    FB.realmGiftTurns = function (s) { scans++; return turns(s); };
    function run(batch) {
      const s = JSON.parse(initial); FB.state = s;
      const r = s.realms[ids.other];
      const gifts = [0, 1, 2].map(function (i) {
        return { id:'batch_' + i, senderCharId:s.player.charId,
          recipientKind:'ruler', recipientId:ids.other,
          recipientGeneration:r.ruler.generation === undefined ? 1 : r.ruler.generation,
          giftKind:'cash', amount:1, effect:1, currentId:r.capital,
          destinationId:r.capital, phase:'outbound', remainingRoute:[], legDays:1 };
      });
      heads = 0; scans = 0;
      if (batch) { s.player.giftDeliveries = gifts; FB.giftDeliveryTick(s); }
      else gifts.forEach(function (gift) { s.player.giftDeliveries = [gift]; FB.giftDeliveryTick(s); });
      return { state:JSON.stringify(s), heads:heads, scans:scans };
    }
    try { return { separate:run(false), batch:run(true) }; }
    finally { FB.state = original; FB.chronicleNoteHead = note; FB.realmGiftTurns = turns; }
  }, ids);
  expect(result.batch.state).toBe(result.separate.state);
  expect(result.batch.heads).toBe(1); expect(result.batch.scans).toBe(1);
  expect(result.separate.heads).toBe(3); expect(result.separate.scans).toBe(3);
});

test('gift profiling scopes helper rows and restores wrappers', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, g = FB.game, r = s.realms[ids.other];
    const original = { day:g.passDay, frame:window.requestAnimationFrame,
      finish:FB.ui.fastForwardFinished, coach:FB.ui.coachmarkOpen,
      ensure:FB.giftDeliveryEnsure, transfer:FB.treasuryTransfer, news:FB.news };
    s.player.giftDeliveries = [{ id:'profile_gift', senderCharId:s.player.charId,
      recipientKind:'ruler', recipientId:ids.other, recipientGeneration:r.ruler.generation === undefined ? 1 : r.ruler.generation,
      giftKind:'cash', amount:1, effect:1, currentId:r.capital, destinationId:r.capital,
      phase:'outbound', remainingRoute:[], legDays:1 }];
    const callbacks = [];
    window.requestAnimationFrame = function (fn) { callbacks.push(fn); return callbacks.length; };
    FB.ui.fastForwardFinished = function () {};
    FB.ui.coachmarkOpen = function () { return false; };
    g.passDay = function () {
      FB.giftDeliveryEnsure(s); // Outside the gift tick: must not enter the helper row.
      FB.giftDeliveryTick(s);
      return 'season';
    };
    try {
      g.fastForwardTiming.enable(true); g.skipAhead();
      while (callbacks.length && g.fastForwarding) callbacks.shift()();
      const report = g.fastForwardTiming.last;
      return { rows:report.rows, counters:report.counters,
        restored:FB.giftDeliveryEnsure === original.ensure && FB.treasuryTransfer === original.transfer &&
          FB.news === original.news && !g._fastForwardTiming };
    } finally {
      g.fastForwarding = false; g.paused = true; g.fastForwardTiming.enable(false);
      g.passDay = original.day; window.requestAnimationFrame = original.frame;
      FB.ui.fastForwardFinished = original.finish; FB.ui.coachmarkOpen = original.coach;
    }
  }, ids);
  expect(result.rows['Gift input: giftDeliveryEnsure'].calls).toBe(1);
  expect(result.rows['Gift input: treasuryTransfer'].calls).toBe(1);
  expect(result.rows['Gift input: news'].calls).toBe(1);
  expect(result.rows['Gifts: queue removal'].calls).toBe(1);
  expect(result.counters['Gifts: pending visits']).toBe(1);
  expect(result.counters['Gifts: removed']).toBe(1);
  expect(result.restored).toBe(true);
});

test('parliament subsidies credit the liege once and reject unaffordable payments', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state; FB.treasuryInitialize(s);
    s.player.liege = ids.liege;
    const row = s.realms[ids.liege].treasury, balance = row.gold;
    const amount = FBDATA.balance.parliamentSubsidyGold || 20;
    s.player.gold = amount - 1;
    const ctx = {};
    const refused = FB.fns.parliament_subsidy_pay(s, ctx);
    const untouched = row.gold === balance && !ctx.treasuryPaid;
    s.player.gold = amount * 2;
    FB.fns.parliament_subsidy_pay(s, ctx);
    FB.fns.parliament_subsidy_pay(s, JSON.parse(JSON.stringify(ctx)));
    return { refused:refused, untouched:untouched, gold:s.player.gold,
      credit:row.gold - balance, amount:amount };
  }, ids);
  expect(result.refused).toBe(false); expect(result.untouched).toBe(true);
  expect(result.gold).toBe(result.amount); expect(result.credit).toBe(result.amount);
});

test('transfers conserve balances, protect accrued bills, and retain compulsory liabilities', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state; FB.treasuryInitialize(s);
    const a = s.realms[ids.enemy].treasury, b = s.realms[ids.other].treasury;
    a.gold = 12; a.militaryAccrued = 10; b.gold = 0;
    const refused = FB.treasuryTransfer(s, ids.enemy, ids.other, 3);
    const paid = FB.treasuryTransfer(s, ids.enemy, ids.other, 2);
    const binding = FB.treasuryTransfer(s, ids.enemy, ids.other, 25, true);
    const invalid = FB.treasuryTransfer(s, ids.enemy, 'missing', 1, true);
    return { refused:refused, paid:paid, binding:binding, invalid:invalid,
      gold:a.gold, accrued:a.militaryAccrued, recipient:b.gold };
  }, ids);
  expect(result).toEqual({ refused:false, paid:true, binding:true, invalid:false,
    gold:-15, accrued:10, recipient:27 });
});

test('peace offers reprice at acceptance and cannot pay twice', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state; FB.treasuryInitialize(s);
    const row = s.realms[ids.enemy].treasury;
    row.gold = 30; row.militaryAccrued = 10;
    const preview = FB.warPeaceTerms(s, 'war_accept_tribute').gold;
    row.gold = 13;
    const before = s.player.gold;
    FB.fns.war_accept_tribute(s);
    FB.fns.war_accept_tribute(s);
    return { preview:preview, received:s.player.gold - before, remaining:row.gold,
      ended:!s.player.war };
  }, ids);
  expect(result).toEqual({ preview:20, received:3, remaining:10, ended:true });
});

test('an empty treasury still permits a noncash peace', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state; FB.treasuryInitialize(s);
    s.realms[ids.enemy].treasury.gold = -10;
    const before = s.player.gold;
    const quote = FB.warPeaceTerms(s, 'war_accept_tribute').gold;
    FB.fns.war_accept_tribute(s);
    return { quote:quote, delta:s.player.gold - before, ended:!s.player.war };
  }, ids);
  expect(result).toEqual({ quote:0, delta:0, ended:true });
});

test('saved prepaid courier gifts credit only on delivery without another player debit', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state; FB.treasuryInitialize(s);
    const r = s.realms[ids.other], p = s.player;
    const before = p.gold, balance = r.treasury.gold;
    p.gold -= 15;
    p.giftDeliveries = JSON.parse(JSON.stringify([{
      id:'legacy_prepaid_gift', senderCharId:p.charId, recipientKind:'ruler',
      recipientId:ids.other, recipientGeneration:r.ruler.generation === undefined ? 1 : r.ruler.generation,
      recipientName:r.ruler.name, giftKind:'cash', amount:15, effect:5,
      currentId:r.capital, destinationId:r.capital, phase:'outbound', remainingRoute:[], legDays:1
    }]));
    FB.giftDeliveryTick(s); FB.giftDeliveryTick(s);
    return { debit:p.gold - before, credit:r.treasury.gold - balance, pending:p.giftDeliveries.length };
  }, ids);
  expect(result).toEqual({ debit:-15, credit:15, pending:0 });
});

test('context payments survive serialization without duplicate credit', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state; FB.treasuryInitialize(s);
    const row = s.realms[ids.other].treasury, before = s.player.gold, balance = row.gold;
    const ctx = { realmId:ids.other }, fx = { gold:-20, goldCounterparty:'context' };
    FB.applyEffects(s, fx, ctx);
    FB.applyEffects(s, fx, JSON.parse(JSON.stringify(ctx)));
    return { debit:s.player.gold - before, credit:row.gold - balance, paid:ctx.treasuryGoldPaid };
  }, ids);
  expect(result).toEqual({ debit:-20, credit:20, paid:true });
});

test('a ruler ransom retains the saved demand despite insolvency and releases once', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state; FB.treasuryInitialize(s);
    const ruler = FB.materializeRealmRuler(s, ids.other);
    const row = s.realms[ids.other].treasury; row.gold = 1; row.militaryAccrued = 0;
    const record = FB.captureIntrigue(s, s.player.charId, ruler.id, 'abduction', 'player');
    const amount = record.demand.amount, before = s.player.gold;
    s.intrigue.captives = JSON.parse(JSON.stringify(s.intrigue.captives));
    const first = FB.intrigueRansomCaptive(s, s.player.charId);
    const again = FB.intrigueRansomCaptive(s, s.player.charId);
    return { first:first, again:again, delta:s.player.gold - before, balance:row.gold, amount:amount };
  }, ids);
  expect(result.first).toBe(true); expect(result.again).toBe(false);
  expect(result.delta).toBe(result.amount); expect(result.balance).toBe(1 - result.amount);
});
