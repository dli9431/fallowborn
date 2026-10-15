'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/world.js', 'js/save.js', 'js/main.js',
  'js/population.js', 'js/travel.js', 'js/settlement.js', 'data/events_travel.js',
  'data/travel.js', 'data/map_data.js', 'data/counties.js', 'js/market.js', 'js/actions.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('wasteland conversion completes its market before any price read', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, home = s.player.provinceId;
    const pid = FB.world.provs.filter(function (pr) { return pr.wasteland; })[0].id;
    const previous = JSON.parse(JSON.stringify(s.market.counties));
    const converted = FB.materializeWasteland(s, pid, {
      holderId:s.holder[home], ownerId:s.owner[home]
    });
    // Inspect the ledger before any market helper can fill a missing row.
    const ready = !!s.market.counties[pid];
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.marketPrice(s, home, 'provisions');
    FB.marketPrice(s, pid, 'provisions');
    FB.landPlotCost(s, 1);
    const current = {};
    Object.keys(previous).forEach(function (id) { current[id] = s.market.counties[id]; });
    return { converted:!!converted, ready:ready, previous:previous, current:current,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toMatchObject({ converted:true, ready:true, pure:true });
  expect(result.current).toEqual(result.previous);
});

for (const mode of ['noble', 'commoner', 'legacy']) {
  test(mode + ' wasteland settlement survives a fresh page and switching saves', async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const prepared = await page.evaluate(function (mode) {
      const s = FB.state;
      FB.game.setPaused(true);
      s.player.gold = 5000;
      s.player.prestige = 500;
      const empty = FB.save.serialize();
      let pid;
      if (mode === 'commoner') {
        s.player.tier = 1;
        const destination = FB.travelDestinations(s, 'frontier')[0];
        pid = destination.destinationId;
        FB.travelStart(s, 'frontier', pid, null);
        s.player.travel.remainingRoute = [];
        s.player.travel.legDaysLeft = 0;
        FB.travelTick(s);
        const item = s.eventQueue.filter(function (entry) { return entry.id === 'travel_capstone_frontier'; })[0];
        const ev = FB.eventById(item.id);
        FB.resolveEventOption(s, ev, ev.options[0], item.ctx, { automated:false });
        for (let i = 0; i < FBDATA.balance.frontierMilestonesRequired; i++) FB.fns.frontier_milestone(s);
        s.turn += FBDATA.balance.travelSettleOfferDays;
        if (!FB.frontierSettle(s)) throw new Error('Frontier setup did not settle');
      } else {
        pid = FB.world.provs.filter(function (pr) { return pr.wasteland; })[0].id;
        FB.settleWaste(s, pid);
      }
      s.dev[pid] = 3;
      const expected = {
        culture:FB.world.byId[pid].culture, religion:FB.world.byId[pid].religion,
        holder:s.holder[pid], owner:s.owner[pid], dev:s.dev[pid], gold:s.player.gold,
        population:s.population.counties[pid].count,
        sites:JSON.stringify(FB.world.sitesByProv[pid]), home:s.player.provinceId
      };
      const saved = JSON.parse(FB.save.serialize());
      if (mode === 'legacy') delete saved.state.wastelandSettlements;
      return { pid:pid, expected:expected, saved:saved, empty:empty };
    }, mode);

    // Navigation discards the mutated bookmark cache, reproducing the reported restart.
    await openGame(page, testInfo);
    await page.evaluate(function (saved) {
      return new Promise(function (resolve) { FB.game.loadData(saved, resolve); });
    }, prepared.saved);
    const restored = await page.evaluate(function (pid) {
      const s = FB.state;
      return {
        culture:FB.world.byId[pid].culture, religion:FB.world.byId[pid].religion,
        holder:s.holder[pid], owner:s.owner[pid], dev:s.dev[pid], gold:s.player.gold,
        population:s.population.counties[pid].count,
        sites:JSON.stringify(FB.world.sitesByProv[pid]), home:s.player.provinceId
      };
    }, prepared.pid);
    expect(restored).toEqual(prepared.expected);

    const switched = await page.evaluate(function (prepared) {
      const pid = prepared.pid, s = FB.state;
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const before = JSON.stringify(s);
      FB.restoreWastelandSettlements(s);
      FB.restoreWastelandSettlements(s);
      const unchanged = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const settled = JSON.parse(FB.save.serialize());
      FB.save.restore(JSON.parse(prepared.empty));
      const empty = FB.world.byId[pid].wasteland && !FB.world.sitesByProv[pid] &&
        !FB.world.sites.some(function (site) { return site.pid === pid; }) &&
        !FB.world.sitesRender.some(function (site) { return site.pid === pid; });
      FB.save.restore(settled);
      return { unchanged:unchanged, empty:empty,
        restored:!FB.world.byId[pid].wasteland,
        record:FB.state.wastelandSettlements[pid],
        unique:FB.world.sites.filter(function (site) { return site.pid === pid; }).length ===
          FB.world.sitesByProv[pid].list.length };
    }, prepared);
    expect(switched).toEqual({ unchanged:true, empty:true, restored:true, unique:true,
      record:{ culture:prepared.expected.culture, religion:prepared.expected.religion } });
  });
}
