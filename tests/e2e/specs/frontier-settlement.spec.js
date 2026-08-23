'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/travel.js',
  'js/world.js',
  'js/armies.js',
  'js/market.js',
  'js/population.js',
  'data/actions.js',
  'js/actions.js',
  'js/events.js',
  'js/save.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'data/travel.js',
  'data/events_travel.js',
  'data/counties.js',
  'data/map_data.js',
  'data/technology.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('only freeholders and gentry may begin a frontier withdrawal',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      state.player.gold = 5000;
      const out = { setup:true };
      state.player.tier = 0;
      out.serf = FB.travelEligible(state, 'frontier');
      out.serfDestinations = FB.travelDestinations(state, 'frontier').length;
      state.player.tier = 1;
      out.freeholder = FB.travelEligible(state, 'frontier');
      state.player.tier = 2;
      out.gentry = FB.travelEligible(state, 'frontier');
      state.player.tier = 3;
      out.baron = FB.travelEligible(state, 'frontier');
      state.player.tier = 1;
      return out;
    });

    expect(result.setup).toBe(true);
    expect(result.serf).not.toBe(true);
    expect(result.serfDestinations).toBe(0);
    expect(result.freeholder).toBe(true);
    expect(result.gentry).toBe(true);
    expect(result.baron).not.toBe(true);
  });

test('frontier routes stay settled until one final wasteland leg',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      state.player.gold = 5000;
      state.player.tier = 1;
      const destinations = FB.travelDestinations(state, 'frontier');
      if (!destinations.length) return { setup:false };
      const shape = destinations.every(function (d) {
        const waste = FB.world.byId[d.destinationId];
        const gateway = FB.world.byId[d.gatewayId];
        if (!waste || !waste.wasteland) return false;
        if (!gateway || gateway.wasteland) return false;
        if (!(FB.world.adj[d.gatewayId] &&
            FB.world.adj[d.gatewayId][d.destinationId])) return false;
        if (!d.route.length || d.route[d.route.length - 1] !== d.destinationId) {
          return false;
        }
        for (let i = 0; i < d.route.length - 1; i++) {
          const leg = FB.world.byId[d.route[i]];
          if (!leg || leg.wasteland || !leg.culture || !leg.religion) {
            return false;
          }
        }
        /* the gateway is the last settled leg, or the home county itself */
        const expectedGateway = d.route.length >= 2
          ? d.route[d.route.length - 2] : state.player.provinceId;
        return d.gatewayId === expectedGateway;
      });
      return { setup:true, count:destinations.length, shape:shape };
    });

    expect(result.setup).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(result.shape).toBe(true);
  });

test('travel, couriers, trade, and armies never route through wastelands',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const wasteOf = function (route) {
        return (route || []).some(function (pid) {
          const pr = FB.world.byId[pid];
          return pr && pr.wasteland;
        });
      };

      /* ordinary travel between distant settled counties */
      const home = state.player.provinceId;
      let far = null;
      for (let i = 0; i < FB.world.provs.length; i++) {
        const pr = FB.world.provs[i];
        if (!pr.wasteland && pr.id !== home && FB.world.adj[pr.id] &&
            pr.religion === 'sunni') { far = pr.id; break; }
      }
      const travelRoute = far ? FB.travelRoute(home, far) : null;

      /* trade ventures reuse the settled destination list */
      const markets = FB.developedMarketDestinations(state, 4);
      const tradeClean = markets.every(function (m) { return !wasteOf(m.route); });

      /* a foreign courier route, when one is offerable */
      let courierClean = true;
      let courierChecked = false;
      for (const rid in state.realms) {
        const r = state.realms[rid];
        if (!r.alive || rid === 'player' ||
            state.owner[home] === FB.topRealm(state, rid)) continue;
        const preview = FB.giftDeliveryPreview(state, 'ruler', rid,
          { readOnly:true });
        if (preview.eligible && preview.foreign) {
          courierChecked = true;
          courierClean = !wasteOf(preview.route);
          break;
        }
      }

      /* armies: between two settled neighbors of one wasteland the weighted
         route must never step onto the empty land */
      let armyChecked = false;
      let armyClean = true;
      for (let i = 0; i < FB.world.provs.length && !armyChecked; i++) {
        const waste = FB.world.provs[i];
        if (!waste.wasteland) continue;
        const neighbors = Object.keys(FB.world.adj[waste.id] || {})
          .filter(function (pid) {
            const pr = FB.world.byId[pid];
            return pr && !pr.wasteland;
          }).sort();
        if (neighbors.length < 2) continue;
        const army = { realm:'player', men:100, at:neighbors[0] };
        const path = FB.findArmyPath(state, army, neighbors[1]);
        armyChecked = true;
        armyClean = !path || !wasteOf(path.path);
      }

      return {
        travelClean:!!travelRoute && !wasteOf(travelRoute),
        travelFound:!!travelRoute,
        tradeClean:tradeClean,
        tradeCount:markets.length,
        courierChecked:courierChecked,
        courierClean:courierClean,
        armyChecked:armyChecked,
        armyClean:armyClean
      };
    });

    expect(result.travelFound).toBe(true);
    expect(result.travelClean).toBe(true);
    expect(result.tradeCount).toBeGreaterThan(0);
    expect(result.tradeClean).toBe(true);
    expect(result.courierChecked).toBe(true);
    expect(result.courierClean).toBe(true);
    expect(result.armyChecked).toBe(true);
    expect(result.armyClean).toBe(true);
  });

test('the frontier attempt snapshot survives save/load deterministically',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      state.player.gold = 5000;
      state.player.tier = 1;
      const destination = FB.travelDestinations(state, 'frontier')[0];
      if (!destination) return { setup:false };
      const started = FB.travelStart(state, 'frontier',
        destination.destinationId, null);
      if (!started) return { setup:false };
      const snapshot = JSON.parse(JSON.stringify(
        state.player.travel.frontier));
      const liveHolder = state.holder[destination.gatewayId];
      const liveSovereign = state.owner[destination.gatewayId];
      FB.save.restore(JSON.parse(FB.save.serialize()));
      state = FB.state;
      const restored = state.player.travel &&
        state.player.travel.frontier
        ? JSON.parse(JSON.stringify(state.player.travel.frontier)) : null;
      return {
        setup:true,
        snapshot:snapshot,
        restored:restored,
        holderMatchesLive:snapshot.holderId === liveHolder,
        sovereignMatchesLive:snapshot.sovereignId === liveSovereign,
        protagonist:snapshot.charId === state.player.charId
      };
    });

    expect(result.setup).toBe(true);
    expect(result.restored).toEqual(result.snapshot);
    expect(result.holderMatchesLive).toBe(true);
    expect(result.sovereignMatchesLive).toBe(true);
    expect(result.protagonist).toBe(true);
  });

test('residence and work milestones gate the permanent homestead',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.gold = 5000;
      state.player.tier = 1;
      const destination = FB.travelDestinations(state, 'frontier')[0];
      if (!destination) return { setup:false };
      FB.travelStart(state, 'frontier', destination.destinationId, null);
      state.player.travel.remainingRoute = [];
      state.player.travel.legDaysLeft = 0;
      FB.travelTick(state);
      const capstoneItem = state.eventQueue.filter(function (item) {
        return item.id === 'travel_capstone_frontier';
      })[0];
      const capstone = FB.eventById('travel_capstone_frontier');
      FB.resolveEventOption(state, capstone, capstone.options[0],
        capstoneItem.ctx, { automated:false });
      const earlyReason = FB.frontierSettlementEligible(state);
      const required = FBDATA.balance.frontierMilestonesRequired;
      for (let i = 0; i < required; i++) FB.fns.frontier_milestone(state);
      const milestoneOnlyReason = FB.frontierSettlementEligible(state);
      state.turn += FBDATA.balance.travelSettleOfferDays;
      const readyReason = FB.frontierSettlementEligible(state);
      const status = FB.frontierStatus(state);

      /* the commoner settles: a real county appears, the household moves */
      const homeBefore = state.player.provinceId;
      const gatewayId = destination.gatewayId;
      const gatewayHolder = state.holder[gatewayId];
      const gatewayOwner = state.owner[gatewayId];
      const settled = FB.frontierSettle(state);
      const pid = destination.destinationId;
      const pr = FB.world.byId[pid];
      const plots = FB.landPlots(state).filter(function (plot) {
        return plot.provinceId === pid;
      });
      const dejure = FB.dejureOf(pid);
      FB.ensureMarket(state);
      return {
        setup:true,
        capstoneQueued:!!capstoneItem,
        earlyIsReason:typeof earlyReason === 'string',
        milestoneOnlyIsReason:typeof milestoneOnlyReason === 'string',
        ready:readyReason === true,
        statusReady:status && status.settlementReady,
        statusMilestones:status && status.milestones,
        settled:settled,
        wastelandCleared:!pr.wasteland,
        dev:(state.dev[pid] || 0),
        culture:pr.culture === me.culture,
        religion:pr.religion === me.religion,
        noDejure:!dejure.duchy && !dejure.kingdom && !dejure.empire,
        holder:state.holder[pid] === gatewayHolder,
        owner:state.owner[pid] === gatewayOwner,
        moved:state.player.provinceId === pid,
        homeMoved:homeBefore !== pid,
        lifetimeMove:!!state.player.travelSettlement &&
          state.player.travelSettlement.destinationId === pid,
        travelCleared:!state.player.travel,
        plotCount:plots.length,
        plotAtHead:plots.length > 0 && plots[0].settlement === 0,
        noProvs:!(state.player.provs && state.player.provs.indexOf(pid) >= 0),
        tierKept:state.player.tier === 1,
        sites:FB.settlementsOf(state, pid).length,
        marketSeeded:!!(state.market.counties && state.market.counties[pid]),
        population:FB.countyPopulation(state, pid),
        lordRole:!!(state.roles.lord && state.chars[state.roles.lord] &&
          !state.chars[state.roles.lord].dead),
        priestRole:!!(state.roles.priest && state.chars[state.roles.priest] &&
          !state.chars[state.roles.priest].dead),
        chronicle:state.log.some(function (entry) {
          return entry.msg && entry.msg.key === 'news.world.wasteland_settled';
        }) && state.log.some(function (entry) {
          return entry.msg && entry.msg.key === 'news.travel.frontier_settled';
        }),
        /* and the land now routes like any settled county */
        routeNow:!!FB.travelRoute(state.player.provinceId, homeBefore)
      };
    });

    expect(result.setup).toBe(true);
    expect(result.capstoneQueued).toBe(true);
    expect(result.earlyIsReason).toBe(true);
    expect(result.milestoneOnlyIsReason).toBe(true);
    expect(result.ready).toBe(true);
    expect(result.statusReady).toBe(true);
    expect(result.statusMilestones).toBe(4);
    expect(result.settled).toBe(true);
    expect(result.wastelandCleared).toBe(true);
    expect(result.dev).toBe(1);
    expect(result.culture).toBe(true);
    expect(result.religion).toBe(true);
    expect(result.noDejure).toBe(true);
    expect(result.holder).toBe(true);
    expect(result.owner).toBe(true);
    expect(result.moved).toBe(true);
    expect(result.homeMoved).toBe(true);
    expect(result.lifetimeMove).toBe(true);
    expect(result.travelCleared).toBe(true);
    expect(result.plotCount).toBe(1);
    expect(result.plotAtHead).toBe(true);
    expect(result.noProvs).toBe(true);
    expect(result.tierKept).toBe(true);
    expect(result.sites).toBeGreaterThan(0);
    expect(result.marketSeeded).toBe(true);
    expect(result.population).toBeGreaterThan(0);
    expect(result.lordRole).toBe(true);
    expect(result.priestRole).toBe(true);
    expect(result.chronicle).toBe(true);
    expect(result.routeNow).toBe(true);
  });

test('a second permanent move in the same life is refused',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      state.player.gold = 9000;
      state.player.tier = 1;
      const destinations = FB.travelDestinations(state, 'frontier');
      if (destinations.length < 2) return { setup:false };
      const settle = function (destination) {
        FB.travelStart(state, 'frontier', destination.destinationId, null);
        state.player.travel.remainingRoute = [];
        state.player.travel.legDaysLeft = 0;
        FB.travelTick(state);
        const item = state.eventQueue.filter(function (entry) {
          return entry.id === 'travel_capstone_frontier';
        })[0];
        const capstone = FB.eventById('travel_capstone_frontier');
        FB.resolveEventOption(state, capstone, capstone.options[0],
          item.ctx, { automated:false });
        for (let i = 0; i < FBDATA.balance.frontierMilestonesRequired; i++) {
          FB.fns.frontier_milestone(state);
        }
        state.turn += FBDATA.balance.travelSettleOfferDays;
        return FB.frontierSettle(state);
      };
      const first = settle(destinations[0]);
      /* the one lifetime move is spent; a second attempt can depart but
         can never settle again */
      const cooldownCleared = state.player.cooldowns;
      delete cooldownCleared.take_road;
      const again = FB.travelDestinations(state, 'frontier')
        .filter(function (d) {
          return FB.world.byId[d.destinationId].wasteland;
        })[0];
      if (!again) return { setup:true, first:first, second:'no-destination' };
      FB.travelStart(state, 'frontier', again.destinationId, null);
      state.player.travel.remainingRoute = [];
      state.player.travel.legDaysLeft = 0;
      FB.travelTick(state);
      const item = state.eventQueue.filter(function (entry) {
        return entry.id === 'travel_capstone_frontier';
      })[0];
      const capstone = FB.eventById('travel_capstone_frontier');
      FB.resolveEventOption(state, capstone, capstone.options[0],
        item.ctx, { automated:false });
      for (let i = 0; i < FBDATA.balance.frontierMilestonesRequired; i++) {
        FB.fns.frontier_milestone(state);
      }
      state.turn += FBDATA.balance.travelSettleOfferDays;
      const secondEligible = FB.frontierSettlementEligible(state);
      const second = FB.frontierSettle(state);
      const stillWaste = FB.world.byId[again.destinationId].wasteland;
      return {
        setup:true,
        first:first,
        secondEligible:secondEligible,
        second:second,
        stillWaste:stillWaste
      };
    });

    expect(result.setup).toBe(true);
    expect(result.first).toBe(true);
    if (result.second !== 'no-destination') {
      expect(typeof result.secondEligible).toBe('string');
      expect(result.second).toBe(false);
      expect(result.stillWaste).toBe(true);
    }
  });

test('cancellation, imprisonment, war, and rank change end the attempt cleanly',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      const out = { setup:true };
      const begin = function () {
        state.player.gold = 5000;
        state.player.tier = 1;
        delete state.player.cooldowns.take_road;
        const destination = FB.travelDestinations(state, 'frontier')
          .filter(function (d) {
            return FB.world.byId[d.destinationId].wasteland;
          })[0];
        if (!destination) return null;
        FB.travelStart(state, 'frontier', destination.destinationId, null);
        return destination.destinationId;
      };
      const clean = function (pid) {
        const pr = FB.world.byId[pid];
        return !state.player.travel && pr.wasteland &&
          !(state.player.provs && state.player.provs.indexOf(pid) >= 0) &&
          !FB.landPlots(state).some(function (plot) {
            return plot.provinceId === pid;
          });
      };

      /* explicit cancellation */
      let pid = begin();
      if (!pid) return { setup:false };
      FB.travelCancel(state);
      out.cancelled = clean(pid);

      /* imprisonment cancels on the next day tick */
      pid = begin();
      state.player.flags.in_prison = 1;
      FB.travelTick(state);
      delete state.player.flags.in_prison;
      out.imprisoned = clean(pid);

      /* personal war cancels on the next day tick */
      pid = begin();
      let enemy = null;
      for (const rid in state.realms) {
        if (state.realms[rid].alive && !state.realms[rid].liege &&
            rid !== FB.playerRealmId(state)) { enemy = rid; break; }
      }
      state.player.war = { enemy:enemy, startedTurn:state.turn };
      FB.travelTick(state);
      state.player.war = null;
      out.war = clean(pid);

      /* leaving tiers 1–2 cancels on the next day tick */
      pid = begin();
      state.player.tier = 3;
      FB.travelTick(state);
      state.player.tier = 1;
      out.rankChanged = clean(pid);

      /* a dead protagonist's journey is cancelled */
      pid = begin();
      state.player.dead = true;
      FB.travelTick(state);
      state.player.dead = false;
      out.death = clean(pid);

      return out;
    });

    expect(result.setup).toBe(true);
    expect(result.cancelled).toBe(true);
    expect(result.imprisoned).toBe(true);
    expect(result.war).toBe(true);
    expect(result.rankChanged).toBe(true);
    expect(result.death).toBe(true);
  });

test('noble settle_waste keeps its costs and political result via the helper',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.gold = 1000;
      state.player.prestige = 200;
      const waste = FB.world.provs.filter(function (pr) {
        return pr.wasteland;
      })[0];
      if (!waste) return { setup:false };
      const pid = waste.id;
      const goldBefore = state.player.gold;
      const prestigeBefore = state.player.prestige;
      FB.settleWaste(state, pid);
      const pr = FB.world.byId[pid];
      const dejure = FB.dejureOf(pid);
      FB.ensureMarket(state);
      return {
        setup:true,
        converted:!pr.wasteland,
        culture:pr.culture === me.culture,
        religion:pr.religion === me.religion,
        dev:(state.dev[pid] || 0),
        holder:state.holder[pid] === 'player',
        owner:state.owner[pid] === FB.playerRealmId(state),
        inProvs:(state.player.provs || []).indexOf(pid) >= 0,
        goldSpent:goldBefore - state.player.gold,
        prestigeSpent:prestigeBefore - state.player.prestige,
        noDejure:!dejure.duchy && !dejure.kingdom && !dejure.empire,
        sites:FB.settlementsOf(state, pid).length,
        marketSeeded:!!(state.market.counties && state.market.counties[pid]),
        chronicle:state.log.some(function (entry) {
          return entry.msg && entry.msg.key === 'news.world.wasteland_settled';
        })
      };
    });

    expect(result.setup).toBe(true);
    expect(result.converted).toBe(true);
    expect(result.culture).toBe(true);
    expect(result.religion).toBe(true);
    expect(result.dev).toBe(1);
    expect(result.holder).toBe(true);
    expect(result.owner).toBe(true);
    expect(result.inProvs).toBe(true);
    expect(result.goldSpent).toBe(250);
    expect(result.prestigeSpent).toBe(50);
    expect(result.noDejure).toBe(true);
    expect(result.sites).toBeGreaterThan(0);
    expect(result.marketSeeded).toBe(true);
    expect(result.chronicle).toBe(true);
  });

test('the frontier technology impact review passes the validator',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const reviews = FBDATA.techImpactReviews.features;
      return {
        errors:FB.validateTechnologyData(),
        mode:reviews.commoner_frontier_settlement &&
          reviews.commoner_frontier_settlement.mode
      };
    });

    expect(result.errors).toEqual([]);
    expect(result.mode).toBe('none');
  });
