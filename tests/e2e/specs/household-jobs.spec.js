'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = require('../fixtures/authoring/household-jobs.json');
dependsOnRuntime(__filename, ['index.html','data/bookmarks.js','data/starts.js','data/technology.js',
  'js/story_household.js','js/stories.js','js/starts.js','js/mods.js','js/main.js','js/world.js',
  'js/save.js','js/save_v4.js','js/actions.js','js/treasury.js','js/model.js','js/economy.js',
  'js/armies.js','js/ui_misc.js','js/ui_panels.js']);

async function importedStart(page, info, start) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/household-jobs.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && !!FB.stories.get('quay_work_example'); });
  await beginBookmark(page, info, '867', start || 'quay_work_example_start');
  await page.evaluate(function () { FB.state.date.day = 30; });
}

test('JSON jobs reserve real funds and replace three focus days, then settle the same escrow once', async function ({ page }, info) {
  await importedStart(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'quay_work_example', t = s.stories[id], turn = s.turn;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.stories.quote(s, id, 'accept'); FB.stories.cards(s);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const original = FB.tickFocus; let focusDays = 0;
    FB.tickFocus = function (state) { focusDays++; return original(state); };
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    const accepted = choose('accept'), reserved = t.jobs.delivery.escrow;
    const checkpoint = JSON.parse(FB.save.serialize());
    const shifts = [choose('shift'),choose('shift')], phase = t.phase;
    const afterWork = { paid:t.jobs.delivery.paid, escrow:t.jobs.delivery.escrow, days:t.jobs.delivery.daysWorked };
    const settled = choose('settlement'), row = JSON.parse(JSON.stringify(t.jobs.delivery));
    const repeated = choose('hearing'); FB.tickFocus = original;
    const closed = JSON.stringify(t); const saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); const retained = closed === JSON.stringify(FB.state.stories[id]);
    FB.save.restore(checkpoint); const pending = FB.state.stories[id].jobs.delivery;
    return { pure, accepted, reserved, shifts, phase, afterWork, settled, repeated, focusDays,
      elapsed:s.turn - turn, row:{ paid:row.paid, escrow:row.escrow, refunded:row.refunded, status:row.status },
      retained, pending:{ days:pending.daysWorked, escrow:pending.escrow, paid:pending.paid } };
  })).toEqual({ pure:true, accepted:true, reserved:4, shifts:[true,true], phase:'account',
    afterWork:{ paid:2, escrow:2, days:3 }, settled:true, repeated:false, focusDays:0, elapsed:3,
    row:{ paid:3, escrow:0, refunded:1, status:'settled' }, retained:true, pending:{ days:1, escrow:4, paid:0 } });
});

test('a hearing spends an additional real day and cannot combine with a smaller settlement', async function ({ page }, info) {
  await importedStart(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'quay_work_example', t = s.stories[id], turn = s.turn;
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    const results = [choose('accept'),choose('shift'),choose('shift'),choose('hearing'),choose('settlement')];
    const row = t.jobs.delivery;
    return { results, days:s.turn - turn, paid:row.paid, refunded:row.refunded, escrow:row.escrow };
  })).toEqual({ results:[true,true,true,true,false], days:4, paid:4, refunded:0, escrow:0 });
});

test('an independent one-day configuration pays in full and restores without replay', async function ({ page }, info) {
  await importedStart(page, info, 'hill_work_example_start');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'hill_work_example', t = s.stories[id], turn = s.turn;
    const ok = FB.stories.apply(s, id, 'accept', FB.stories.quote(s, id, 'accept'));
    const record = JSON.stringify(t), saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    const retained = record === JSON.stringify(FB.state.stories[id]);
    return { ok, days:s.turn - turn, paid:t.jobs.maintenance.paid, escrow:t.jobs.maintenance.escrow,
      phase:t.phase, retained, replay:FB.stories.apply(FB.state, id, 'accept', FB.stories.quote(FB.state, id, 'accept')) };
  })).toEqual({ ok:true, days:1, paid:8, escrow:0, phase:'done', retained:true, replay:false });
});

test('unfunded, stale, imprisoned and blocked-day reviews change neither money nor work', async function ({ page }, info) {
  await importedStart(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'quay_work_example', t = s.stories[id], treasury = s.realms.west_francia.treasury;
    const balance = treasury.gold, before = JSON.stringify(t), turn = s.turn;
    treasury.gold = 0; const unfunded = FB.stories.quote(s, id, 'accept').allowed; treasury.gold = balance;
    const q = FB.stories.quote(s, id, 'accept'); treasury.gold++;
    const stale = FB.stories.apply(s, id, 'accept', q); treasury.gold--;
    s.player.flags.in_prison = 1; const imprisoned = FB.stories.quote(s, id, 'accept').allowed; delete s.player.flags.in_prison;
    const busy = FB.ui.eventsBusy; FB.ui.eventsBusy = function () { return true; };
    const blocked = FB.stories.apply(s, id, 'accept', FB.stories.quote(s, id, 'accept')); FB.ui.eventsBusy = busy;
    return { unfunded, stale, imprisoned, blocked, untouched:JSON.stringify(t) === before && treasury.gold === balance && s.turn === turn };
  })).toEqual({ unfunded:false, stale:false, imprisoned:false, blocked:false, untouched:true });
});

for (const cause of ['departure','control','death','succession','expiry']) {
  test('interrupted work conserves escrow after ' + cause, async function ({ page }, info) {
    await importedStart(page, info);
    expect(await page.evaluate(function (cause) {
      const s = FB.state, id = 'quay_work_example', t = s.stories[id], module = FB.stories.get(id);
      FB.stories.apply(s, id, 'accept', FB.stories.quote(s, id, 'accept'));
      if (cause === 'departure') s.player.provinceId = 'aachen';
      if (cause === 'control') FB.transferProvince(s, 'paris', 'lotharingia');
      if (cause === 'death') s.player.dead = true;
      if (cause === 'succession') s.player.charId = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId && !c.dead; })[0].id;
      if (cause === 'expiry') s.turn = t.jobs.delivery.expiresTurn;
      module.day(s, t); const r = t.jobs.delivery, once = JSON.stringify(r);
      module.day(s, t);
      return { paid:r.paid, refunded:r.refunded, escrow:r.escrow, stable:once === JSON.stringify(r),
        closed:r.status === 'cancelled' || r.status === 'expired', total:r.paid + r.refunded + r.escrow };
    }, cause)).toEqual({ paid:0, refunded:4, escrow:0, stable:true, closed:true, total:4 });
  });
}

test('completed disputed work retains the full entitlement when its payer is interrupted', async function ({ page }, info) {
  await importedStart(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'quay_work_example', t = s.stories[id];
    ['accept','shift','shift'].forEach(function (c) { FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); });
    s.realms.west_francia.alive = false;
    FB.stories.get(id).day(s, t);
    return { paid:t.jobs.delivery.paid, escrow:t.jobs.delivery.escrow, status:t.jobs.delivery.status };
  })).toEqual({ paid:4, escrow:0, status:'cancelled' });
});

test('refunds follow a retired treasury and an unavailable recipient retains refundable escrow', async function ({ page }, info) {
  await importedStart(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'quay_work_example', t = s.stories[id];
    const saved = JSON.parse(FB.save.serialize());
    function start() { return FB.stories.apply(FB.state, id, 'accept', FB.stories.quote(FB.state, id, 'accept')); }
    start();
    FB.treasuryRetireRealm(s, 'west_francia', 'lotharingia');
    s.realms.west_francia.alive = false;
    const balance = s.realms.lotharingia.treasury.gold;
    FB.stories.get(id).day(s, t);
    const routed = s.realms.lotharingia.treasury.gold - balance;
    FB.save.restore(saved); start();
    const next = FB.state, row = next.stories[id].jobs.delivery;
    FB.treasuryRetireRealm(next, 'west_francia', null); next.realms.west_francia.alive = false;
    FB.stories.get(id).day(next, next.stories[id]);
    return { routed, held:row.escrow, refunded:row.refunded, paid:row.paid, closed:row.status };
  })).toEqual({ routed:4, held:4, refunded:0, paid:0, closed:'cancelled' });
});

test('declining leaves both purses and the day untouched', async function ({ page }, info) {
  await importedStart(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'quay_work_example', before = [s.turn,s.player.gold,s.realms.west_francia.treasury.gold];
    const declined = FB.stories.apply(s, id, 'decline', FB.stories.quote(s, id, 'decline'));
    return declined && JSON.stringify(before) === JSON.stringify([s.turn,s.player.gold,s.realms.west_francia.treasury.gold]) &&
      Object.keys(s.stories[id].jobs).length === 0;
  })).toBe(true);
});

for (const fault of ['unknown_field','unfunded_terms','missing_reference','unknown_operation']) {
  test('malformed job declaration rejects without registry, state or random mutation: ' + fault, async function ({ page }, info) {
    await openGame(page, info);
    expect(await page.evaluate(function (input) {
      const mod = JSON.parse(JSON.stringify(input.mod)), def = mod.storyInstances.quay_work_example;
      if (input.fault === 'unknown_field') def.jobs.delivery.effect = { gold:100 };
      if (input.fault === 'unfunded_terms') def.jobs.delivery.completionGold = 5;
      if (input.fault === 'missing_reference') def.jobs.delivery.payerRealmId = 'missing_payer';
      if (input.fault === 'unknown_operation') def.stages.offer.choices[0].operation.kind = 'mint_gold';
      const rng = FB.getRngState(), uid = FB.getUidCounter(), list = FB.stories.list(), before = JSON.stringify(FB.state);
      const errors = FB.mods.validate(mod);
      return errors.length > 0 && before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter() &&
        list.every(function (row, i) { return row === FB.stories.list()[i]; });
    }, { mod:examples, fault })).toBe(true);
  });
}

test('malformed escrow records reject before adopting a save and absent optional ledgers stay absent', async function ({ page }, info) {
  await importedStart(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'quay_work_example';
    FB.stories.apply(s, id, 'accept', FB.stories.quote(s, id, 'accept'));
    const saved = JSON.parse(FB.save.serialize()), old = FB.state;
    saved.state.stories[id].jobs.delivery.escrow++;
    let rejected = false; try { FB.save.restore(saved); } catch (e) { rejected = true; }
    const pure = FB.state === old;
    saved.state.stories[id].jobs.delivery.escrow--;
    delete saved.state.stories[id].jobs; delete saved.state.stories[id].jobPatrons;
    FB.save.restore(saved);
    return { rejected, pure, absent:!Object.prototype.hasOwnProperty.call(FB.state.stories[id], 'jobs') };
  })).toEqual({ rejected:true, pure:true, absent:true });
});
