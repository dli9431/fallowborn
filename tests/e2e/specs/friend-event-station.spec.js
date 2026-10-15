'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/events_common.js', 'data/events_paths.js', 'data/events_peasant.js',
  'js/events.js', 'js/model.js', 'js/world.js', 'js/lordships.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('friend casting checks the friend station independently of the player tier', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.profession = 'soldier'; p.flags.seen_battle = 1; p.flags.sworn_friend = 1;
    const friend = FB.makeCharacter(s, { name:'Event Friend', born:s.date.year - 30,
      station:0, homeCounty:p.provinceId, traitsN:0 });
    friend.opinion = 80;
    s.roles.friend = friend.id;
    const rows = [];
    const rng = FB.getRngState();
    for (let tier = 0; tier <= 2; tier++) {
      p.tier = tier;
      for (let station = 0; station <= 4; station++) {
        friend.station = station;
        for (const id of ['friend_in_need', 'friend_vouch', 'wardeath_friend',
          'sworn_aid', 'devoted_friend']) {
          p.gold = id === 'sworn_aid' ? 0 : 20;
          const ev = FB.eventById(id), ctx = FB.eventContextFor(s, ev, {});
          rows.push({ tier:tier, station:station, id:id,
            eligible:FB.checkTrigger(s, ev.trigger, ctx),
            valid:FB.eventContextStillValid(s, ev, ctx) });
        }
      }
    }
    return { rows:rows, rngStable:JSON.stringify(rng) === JSON.stringify(FB.getRngState()) };
  });
  expect(result.rows).toHaveLength(75);
  for (const row of result.rows) {
    const eligible = row.id === 'sworn_aid' || row.id === 'devoted_friend' || row.station < 2;
    expect(row.eligible, JSON.stringify(row)).toBe(eligible);
    expect(row.valid, JSON.stringify(row)).toBe(eligible);
  }
  expect(result.rngStable).toBe(true);
});

test('promotion expires queued and retained friend decisions without effects or RNG', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 0; p.gold = 20;
    const friend = FB.makeCharacter(s, { name:'Promoted Friend', born:s.date.year - 30,
      station:1, homeCounty:p.provinceId, traitsN:0 });
    friend.opinion = 80; s.roles.friend = friend.id;
    s.eventQueue = []; s.slotDays = [];
    const rows = [];
    for (const id of ['friend_in_need', 'friend_vouch', 'wardeath_friend']) {
      friend.station = 1;
      const ev = FB.eventById(id), item = FB.queueEvent(s, id, {});
      const ctx = JSON.parse(JSON.stringify(item.ctx));
      friend.station = 2;
      const before = JSON.stringify({ player:p, friend:friend, rng:FB.getRngState() });
      const manual = FB.resolveEventOption(s, ev, ev.options[0], ctx);
      const auto = FB.resolveEventOption(s, ev, ev.options[0], ctx, { automated:true });
      const unchanged = before === JSON.stringify({ player:p, friend:friend, rng:FB.getRngState() });
      const picked = FB.pickDailyEvents(s);
      rows.push({ id:id, queuedId:item.ctx.participants.friend,
        manualRejected:manual === false, autoRejected:auto === false,
        unchanged:unchanged, discarded:!picked.length && !s.eventQueue.length });
    }
    return rows;
  });
  for (const row of result) {
    expect(row.queuedId).toEqual(expect.any(String));
    expect(row.manualRejected).toBe(true);
    expect(row.autoRejected).toBe(true);
    expect(row.unchanged).toBe(true);
    expect(row.discarded).toBe(true);
  }
});

test('friend events retain the exact friend and reject death or replacement after serialization', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    const friend = FB.makeCharacter(s, { name:'Original Friend', born:s.date.year - 30,
      station:0, homeCounty:p.provinceId, traitsN:0 });
    const replacement = FB.makeCharacter(s, { name:'Replacement Friend', born:s.date.year - 30,
      station:0, homeCounty:p.provinceId, traitsN:0 });
    const rows = [];
    for (const id of ['friend_in_need', 'friend_vouch', 'wardeath_friend',
      'sworn_aid', 'devoted_friend', 'swarm_in_eaves']) {
      s.roles.friend = friend.id;
      const ev = FB.eventById(id), ctx = JSON.parse(JSON.stringify(FB.eventContextFor(s, ev, {})));
      const option = ev.options[id === 'swarm_in_eaves' ? 1 : 0];
      friend.dead = true;
      const deadRejected = FB.resolveEventOption(s, ev, option, ctx) === false;
      friend.dead = false;
      s.roles.friend = replacement.id;
      FB.ensureEventParticipants(s, ev, ctx);
      const before = JSON.stringify({ player:p, friend:friend,
        replacement:replacement, rng:FB.getRngState() });
      const replacedRejected = FB.resolveEventOption(s, ev, option, ctx, { automated:true }) === false;
      rows.push({ id:id, exact:ctx.participants.friend === friend.id,
        deadRejected:deadRejected, replacedRejected:replacedRejected,
        unchanged:before === JSON.stringify({ player:p, friend:friend,
          replacement:replacement, rng:FB.getRngState() }) });
    }
    return rows;
  });
  for (const row of result) {
    expect(row.exact).toBe(true);
    expect(row.deadRejected).toBe(true);
    expect(row.replacedRejected).toBe(true);
    expect(row.unchanged).toBe(true);
  }
});

test('shared bee work requires a local commoner friend while other choices remain available', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, ev = FB.eventById('swarm_in_eaves');
    const option = ev.options[1];
    const friend = FB.makeCharacter(s, { name:'Bee Friend', born:s.date.year - 30,
      station:1, homeCounty:p.provinceId, traitsN:0 });
    friend.homeProvinceId = p.provinceId;
    s.roles.friend = friend.id;
    const ctx = FB.eventContextFor(s, ev, {});
    const ready = FB.eventOptionStatus(s, ev, option, ctx).ready;
    const gold = p.gold;
    const receipt = FB.resolveEventOption(s, ev, option, ctx);
    const paid = p.gold - gold;
    const rows = [];
    for (const kind of ['gentry', 'remote', 'absent']) {
      friend.station = kind === 'gentry' ? 2 : 1;
      friend.homeProvinceId = kind === 'remote' ? Object.keys(FB.world.byId).find(function (id) {
        return id !== p.provinceId;
      }) : p.provinceId;
      if (kind === 'absent') delete s.roles.friend;
      const current = FB.eventContextFor(s, ev, {});
      const before = JSON.stringify({ player:p, friend:friend, rng:FB.getRngState() });
      const manual = FB.resolveEventOption(s, ev, option, current);
      const auto = FB.resolveEventOption(s, ev, option, current, { automated:true });
      rows.push({ kind:kind, ready:FB.eventOptionStatus(s, ev, option, current).ready,
        rejected:manual === false && auto === false,
        unchanged:before === JSON.stringify({ player:p, friend:friend, rng:FB.getRngState() }),
        otherChoice:!!FB.resolveEventOption(s, ev, ev.options[3], current) });
    }
    friend.station = 1; friend.homeProvinceId = p.provinceId;
    const withoutFriend = FB.eventContextFor(s, ev, {});
    s.roles.friend = friend.id;
    const noRecast = !FB.eventOptionStatus(s, ev, option, withoutFriend).ready;
    const retained = FB.eventContextFor(s, ev, {});
    friend.station = 2;
    const staleRejected = FB.resolveEventOption(s, ev, option, retained) === false;
    return { ready:ready, resolved:!!receipt, paid:paid, rows:rows,
      staleRejected:staleRejected, noRecast:noRecast };
  });
  expect(result.ready).toBe(true);
  expect(result.resolved).toBe(true);
  expect(result.paid).toBe(3);
  expect(result.staleRejected).toBe(true);
  expect(result.noRecast).toBe(true);
  for (const row of result.rows) {
    expect(row.ready).toBe(false);
    expect(row.rejected).toBe(true);
    expect(row.unchanged).toBe(true);
    expect(row.otherChoice).toBe(true);
  }
});

test('neighbor and witness casting skips gentry contacts and newly reigning lowborn friends', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    const friend = FB.makeCharacter(s, { name:'Peer Friend', born:s.date.year - 30,
      station:1, homeCounty:p.provinceId, traitsN:0 });
    friend.homeProvinceId = p.provinceId; s.roles.friend = friend.id;
    const rows = [];
    for (const source of ['local_neighbor', 'local_witness']) {
      const spec = { slot:'peer', source:source, required:true, sameHome:true };
      const ev = { id:'peer_cast_test', participants:[spec], options:[{ label:'Listen.', effects:{} }] };
      const ctx = FB.eventContextFor(s, ev, {});
      friend.station = 2;
      const before = JSON.stringify(s), rng = FB.getRngState();
      const candidates = FB.eventParticipantCandidates(s, spec, {});
      rows.push({ source:source, original:ctx.participants.peer === friend.id,
        skipped:!candidates.some(function (c) { return c.id === friend.id; }),
        pure:before === JSON.stringify(s) && JSON.stringify(rng) === JSON.stringify(FB.getRngState()),
        stale:!FB.eventContextStillValid(s, ev, ctx) });
      friend.station = 1;
    }
    const rid = FB.homeCountyAuthority(s).realmId, realm = s.realms[rid];
    realm.succession.members[realm.succession.rulerMemberId].charId = friend.id;
    FB.rebuildRulerIndex(s);
    friend.station = 0;
    const reigningBlocked = !FB.fns.friend_lowborn_valid(s, {});
    const suretyBlocked = !FB.fns.friend_vouch_valid(s, {});
    const reigningSkipped = ['local_neighbor', 'local_witness'].every(function (source) {
      return !FB.eventParticipantCandidates(s, { slot:'peer', source:source }, {}).some(function (c) {
        return c.id === friend.id;
      });
    });
    return { rows:rows, reigningBlocked:reigningBlocked, suretyBlocked:suretyBlocked,
      reigningSkipped:reigningSkipped };
  });
  for (const row of result.rows) {
    expect(row.original).toBe(true);
    expect(row.skipped).toBe(true);
    expect(row.pure).toBe(true);
    expect(row.stale).toBe(true);
  }
  expect(result.reigningBlocked).toBe(true);
  expect(result.suretyBlocked).toBe(true);
  expect(result.reigningSkipped).toBe(true);
});
