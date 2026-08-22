'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/economy.js',
  'js/market.js',
  'js/modifiers.js',
  'js/technology.js',
  'js/ui_modals.js',
  'data/economy.js',
  'data/markets.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');
const COMPLETE_SAVE_BUDGET = 1.6 * 1024 * 1024;

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('historical endowments are authored, capped, bookmark-safe, and RNG-neutral',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const rngBefore = JSON.stringify(FB.getRngState());
      const bruges = FB.marketEndowments(s, 'bruges');
      const venezia = FB.marketEndowments(s, 'venezia');
      s.market = null;
      const market = FB.ensureMarket(s);
      const rngAfter = JSON.stringify(FB.getRngState());
      const bookmarkPresence = ['867','1066'].map(function (id) {
        const ids = FB.bookmark(id).provinces.map(function (province) {
          return province.id;
        });
        return Object.keys(FBDATA.marketEndowments.counties).every(function (pid) {
          return ids.indexOf(pid) >= 0;
        });
      });
      const malformed = FB.validateMarketData(FBDATA.marketGoods,
        FBDATA.marketEndowmentTypes, {
          duchies:{ missing_duchy:['grain'] },
          counties:{ london:{ add:['missing_endowment'] } }
        });
      const malformedShape = FB.validateMarketData([], FBDATA.marketEndowmentTypes,
        FBDATA.marketEndowments);
      const endowmentsBefore = FBDATA.marketEndowments;
      const marketBefore = JSON.stringify(s.market);
      let modRejected = false;
      try {
        FB.mods.apply({
          marketEndowments:{
            duchies:{ missing_duchy:['grain'] }, counties:{}
          }
        });
      } catch (error) {
        modRejected = true;
      }
      return {
        goods:market.goods,
        brugesTags:bruges.tags,
        brugesProvisions:bruges.production.provisions,
        veneziaTags:venezia.tags,
        veneziaProvisions:venezia.production.provisions,
        bookmarkPresence:bookmarkPresence,
        rngUnchanged:rngBefore === rngAfter,
        coreFaults:FB.validateMarketData(FBDATA.marketGoods,
          FBDATA.marketEndowmentTypes, FBDATA.marketEndowments),
        malformed:malformed,
        malformedShape:malformedShape,
        modRejected:modRejected,
        definitionsUnchanged:FBDATA.marketEndowments === endowmentsBefore,
        saveUnchanged:JSON.stringify(s.market) === marketBefore
      };
    });

    expect(result.goods).toEqual([
      'provisions','wares','materials','transport','luxuries'
    ]);
    expect(result.brugesTags).toEqual(expect.arrayContaining([
      'grain','wool_textiles','fisheries','luxury_entrepot'
    ]));
    expect(result.brugesProvisions).toBe(0.4);
    expect(result.veneziaTags).not.toContain('grain');
    expect(result.veneziaTags).toEqual(expect.arrayContaining([
      'wine_oil','salt_trade','luxury_entrepot'
    ]));
    expect(result.veneziaProvisions).toBe(0.2);
    expect(result.bookmarkPresence).toEqual([true,true]);
    expect(result.rngUnchanged).toBe(true);
    expect(result.coreFaults).toEqual([]);
    expect(result.malformed.some(function (fault) {
      return fault.indexOf('unknown duchy missing_duchy') >= 0;
    })).toBe(true);
    expect(result.modRejected).toBe(true);
    expect(result.malformedShape).toContain('marketGoods must be an object.');
    expect(result.definitionsUnchanged).toBe(true);
    expect(result.saveUnchanged).toBe(true);
    expect(result.malformed.some(function (fault) {
      return fault.indexOf('unknown endowment missing_endowment') >= 0;
    })).toBe(true);
  });

test('seasonal markets conserve flow, use exactly two bounded passes, and remap saves',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const source = FB.state;
      source.market = null;
      const initial = FB.ensureMarket(source);
      const home = source.player.provinceId;
      const neighbor = Object.keys(FB.world.adj[home]).sort()[0];
      const goodAt = initial.goods.indexOf('provisions');
      initial.counties[home][0][goodAt] += 1000;
      initial.counties[neighbor][0][goodAt] = 0;
      const before = {};
      initial.goods.forEach(function (id, index) {
        before[id] = 0;
        for (const pid in initial.counties) before[id] += initial.counties[pid][0][index];
      });
      source.turn = 90;
      const priorPrices = {};
      for (const pid in initial.counties) priorPrices[pid] = initial.counties[pid][1].slice();
      FB.marketSeason(source);
      const after = {};
      const expectedChange = {};
      let maxPriceMove = 0;
      initial.goods.forEach(function (id) {
        after[id] = 0;
        expectedChange[id] = 0;
      });
      for (const pid in source.market.counties) {
        const county = FB.marketCounty(source, pid);
        initial.goods.forEach(function (id, index) {
          after[id] += source.market.counties[pid][0][index];
          expectedChange[id] += county.goods[id].production - county.goods[id].demand;
          maxPriceMove = Math.max(maxPriceMove,
            Math.abs(source.market.counties[pid][1][index] /
              priorPrices[pid][index] - 1));
        });
      }
      const firstNeighborFlow = FB.marketCounty(source, neighbor)
        .goods.provisions.netFlow;
      const conservationError = {};
      initial.goods.forEach(function (id) {
        conservationError[id] = Math.abs(after[id] - before[id] - expectedChange[id]);
      });
      const firstOutput = JSON.stringify(source.market.counties);
      const clone = JSON.parse(JSON.stringify(source));
      clone.turn += 90;
      source.turn += 90;
      FBDATA.balance.marketFlowPasses = 99;
      FB.marketSeason(source);
      FBDATA.balance.marketFlowPasses = 0;
      FB.marketSeason(clone);
      const exactlyTwo = JSON.stringify(source.market.counties) ===
        JSON.stringify(clone.market.counties);
      FBDATA.balance.marketFlowPasses = 2;

      const crisisAt = source.market.goods.indexOf('provisions');
      source.market.counties[home][0][crisisAt] = 0;
      source.market.counties[home][1][crisisAt] = 1;
      FB.addMarketShock(source, {
        id:'test-crisis', provinceId:home, goodId:'provisions',
        production:-1, flow:-0.8, severe:true, remaining:2
      });
      source.turn += 90;
      FB.marketSeason(source);
      const crisisPrice = source.market.counties[home][1][crisisAt];
      const crisisRemaining = source.market.shocks.filter(function (shock) {
        return shock.id === 'test-crisis';
      })[0].remaining;

      const replacement = JSON.parse(JSON.stringify(source.market));
      replacement.goods = ['luxuries','provisions','removed_good'];
      for (const pid in replacement.counties) {
        replacement.counties[pid] = [[7,11,999],[1.2,0.8,2],[0,0,0]];
      }
      source.market = replacement;
      const remapped = FB.ensureMarket(source);
      return {
        neighborFlow:firstNeighborFlow,
        firstOutputLength:firstOutput.length,
        conservationError:conservationError,
        maxPriceMove:maxPriceMove,
        exactlyTwo:exactlyTwo,
        remappedGoods:remapped.goods,
        remappedProvisions:remapped.counties[home][0][
          remapped.goods.indexOf('provisions')],
        remappedLuxuries:remapped.counties[home][0][
          remapped.goods.indexOf('luxuries')],
        crisisPrice:crisisPrice,
        crisisRemaining:crisisRemaining
      };
    });

    Object.values(result.conservationError).forEach(function (error) {
      expect(error).toBeLessThan(40);
    });
    expect(result.neighborFlow).toBeGreaterThan(0);
    expect(result.maxPriceMove).toBeLessThanOrEqual(0.201);
    expect(result.exactlyTwo).toBe(true);
    expect(result.remappedGoods).toEqual([
      'provisions','wares','materials','transport','luxuries'
    ]);
    expect(result.remappedProvisions).toBe(11);
    expect(result.remappedLuxuries).toBe(7);
    expect(result.firstOutputLength).toBeLessThan(64 * 1024);
    expect(result.crisisPrice).toBe(1.2);
    expect(result.crisisRemaining).toBe(1);
  });

test('seasonal markets snapshot invariant inputs instead of recomputing them per edge',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      state.player.enterprises = [];
      const countyCount = Object.keys(FB.world.byId).filter(function (pid) {
        return !FB.world.byId[pid].wasteland;
      }).length;
      const calls = {
        endowments:0, technology:0, modifiers:0,
        corridor:0, monopoly:0
      };
      const wrapped = [
        ['marketEndowments', 'endowments'],
        ['techBonus', 'technology'],
        ['modBonus', 'modifiers'],
        ['marketCorridorCapacityBonus', 'corridor'],
        ['guildMonopolyActive', 'monopoly']
      ];
      const originals = {};
      for (let i = 0; i < wrapped.length; i++) {
        const name = wrapped[i][0], key = wrapped[i][1];
        originals[name] = FB[name];
        FB[name] = function () {
          calls[key]++;
          return originals[name].apply(this, arguments);
        };
      }
      state.turn += 90;
      try {
        FB.marketSeason(state);
      } finally {
        for (let i = 0; i < wrapped.length; i++) {
          FB[wrapped[i][0]] = originals[wrapped[i][0]];
        }
      }
      return { countyCount:countyCount, calls:calls };
    });

    expect(result.calls.endowments).toBe(result.countyCount);
    expect(result.calls.technology).toBeLessThanOrEqual(result.countyCount);
    expect(result.calls.modifiers).toBe(0);
    expect(result.calls.corridor).toBe(0);
    expect(result.calls.monopoly).toBe(2);
  });

test('household demand, tangible quotes, hardship, and mortality obey their boundaries',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const market = FB.ensureMarket(s);
      const home = s.player.provinceId;
      const provisions = market.goods.indexOf('provisions');
      const transport = market.goods.indexOf('transport');
      market.counties[home][1][provisions] = 2;
      market.counties[home][1][transport] = 2;
      const me = s.chars[s.player.charId];
      const originalSex = me.sex;
      const demandA = FB.marketHouseholdDemand(s);
      me.sex = originalSex === 'f' ? 'm' : 'f';
      const demandB = FB.marketHouseholdDemand(s);
      me.sex = originalSex;
      const untagged = FB.marketCostQuote(s, 10, null, home, 'up');
      const tagged = FB.marketCostQuote(s, 10, { provisions:1 }, home, 'up');
      const travelCost = FB.travelCost('pilgrimage', 2, s);
      const travelExpected = Math.ceil(3 *
        FB.householdStandardEffects(s).travelCost * 2) + 5;
      const eventLedger = FB.applyEffects(s, { marketShock:{
        id:'event-shortage', provinceId:'home', goodId:'provisions',
        production:-0.2, flow:-0.1, severe:true, seasons:2
      } }, {});
      const harvest = FB.eventById('harvest');
      const pestilence = FB.eventById('pestilence_arrives');
      s.player.gold = 0;
      for (let i = 0; i < 6; i++) FB.marketSettleHouseholdNecessities(s);
      const pressure = FB.marketMortalityPressure(s);
      const short = JSON.parse(JSON.stringify(s.player.marketHardship));
      s.player.gold = 10000;
      FB.marketSettleHouseholdNecessities(s);
      const recovered = JSON.parse(JSON.stringify(s.player.marketHardship));
      const hardshipNews = s.log.filter(function (entry) {
        return entry.msg && entry.msg.key &&
          entry.msg.key.indexOf('news.market.hardship_') === 0;
      }).length;
      for (let i = 0; i < market.goods.length; i++) {
        market.counties[home][1][i] = market.goods[i] === 'provisions' ? 0.5 : 2.5;
      }
      const partialParts = FB.householdUpkeepParts(s);
      s.player.gold = partialParts.provisionsDue;
      FB.marketSettleHouseholdNecessities(s);
      const nonProvisionShort = JSON.parse(JSON.stringify(s.player.marketHardship));
      return {
        demandA:demandA,
        demandB:demandB,
        untagged:untagged,
        tagged:tagged,
        travelCost:travelCost,
        travelExpected:travelExpected,
        pressure:pressure,
        short:short,
        recovered:recovered,
        hardshipNews:hardshipNews,
        nonProvisionShort:nonProvisionShort,
        eventShock:s.market.shocks.filter(function (shock) {
          return shock.id === 'event-shortage';
        })[0],
        eventHome:home,
        eventLedger:eventLedger,
        harvestShock:harvest.options[0].failure.effects.marketShock,
        pestilenceShock:pestilence.options[0].effects.marketShock
      };
    });

    expect(result.demandA).toEqual(result.demandB);
    expect(result.untagged).toBe(10);
    expect(result.tagged).toBe(20);
    expect(result.travelCost).toBe(result.travelExpected);
    expect(result.short.provisionSeasons).toBe(6);
    expect(result.short.unpaidShare).toBeGreaterThan(0);
    expect(result.pressure).toBe(0.02);
    expect(result.recovered).toMatchObject({
      active:false, provisionSeasons:0, unpaidShare:0
    });
    expect(result.nonProvisionShort.active).toBe(true);
    expect(result.nonProvisionShort.unpaidShare).toBeGreaterThan(0);
    expect(result.nonProvisionShort.provisionSeasons).toBe(0);
    expect(result.hardshipNews).toBe(4);
    expect(result.eventShock).toMatchObject({
      provinceId:result.eventHome,
      goodId:'provisions', remaining:2, severe:true
    });
    expect(result.harvestShock).toMatchObject({
      source:'lean_harvest', goodId:'provisions', severe:true
    });
    expect(result.pestilenceShock).toMatchObject({
      source:'pestilence', severe:true
    });
    expect(result.eventLedger.some(function (impact) {
      return impact.type === 'market' && impact.resolved;
    })).toBe(true);
    expect(result.eventLedger.filter(function (impact) {
      return impact.type === 'market';
    })[0]).toMatchObject({
      provinceId:result.eventHome, goodId:'provisions',
      production:-0.2, flow:-0.1, seasons:2, reward:false
    });
  });

test('staffed specializations produce baskets and merchant assets distribute them',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const worker = s.chars[s.player.charId];
      const originalCareer = worker.career ? JSON.parse(JSON.stringify(worker.career)) : null;
      const originalYield = FB.enterpriseYield;
      FB.enterpriseYield = function () { return 2; };
      function workshop(specialization) {
        worker.career = {
          profession:'craftsman', rank:'master', chosen:true,
          guildRank:'guildmaster', guildStanding:100,
          specialization:specialization
        };
        return FB.marketEnterpriseOutput(s, {
          uid:'fixture', type:'workshop_business', workerId:worker.id,
          provinceId:s.player.provinceId, settlement:0
        });
      }
      const smith = workshop('smith');
      const weaver = workshop('weaver');
      const cooper = workshop('cooper');
      const legacy = workshop(null);
      worker.career = {
        profession:'merchant', rank:'master', chosen:true,
        guildRank:'guildmaster', guildStanding:100,
        specialization:'caravan_factor'
      };
      const caravan = FB.marketEnterpriseDistribution(s, {
        uid:'merchant', type:'trade_house_business', workerId:worker.id,
        provinceId:s.player.provinceId, settlement:0
      });
      worker.career.specialization = 'maritime_factor';
      const maritime = FB.marketEnterpriseDistribution(s, {
        uid:'merchant', type:'trade_house_business', workerId:worker.id,
        provinceId:s.player.provinceId, settlement:0
      });
      FB.enterpriseYield = originalYield;
      worker.career = originalCareer;
      return { smith:smith, weaver:weaver, cooper:cooper, legacy:legacy,
        caravan:caravan, maritime:maritime };
    });

    expect(result.smith.materials).toBeGreaterThan(0);
    expect(result.weaver.wares).toBeGreaterThan(0);
    expect(result.cooper.transport).toBeGreaterThan(0);
    expect(result.legacy.wares).toBeGreaterThan(0);
    expect(result.caravan.overland).toBeGreaterThan(result.caravan.water);
    expect(result.maritime.water).toBeGreaterThan(result.maritime.overland);
  });

test('commodity ventures remove stock, use live arrival prices, deliver losses, and preserve legacy payouts',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let s = FB.state;
      s.player.gold = 10000;
      FB.ensureEconomy(s).investments = [];
      s.player.guildMonopolies = { incoming:null, outgoing:null };
      const destination = FB.tradeVentureMarkets(s)[0];
      const preview = FB.tradeVenturePreview(s, 10,
        destination.destinationId, 'provisions');
      const originBefore = FB.marketCounty(s, preview.originId)
        .goods.provisions.stock;
      const inv = FB.startTradeVenture(s, 10, destination.destinationId,
        'cautious', 'e2e', 'provisions');
      const activeLines = FB.marketRouteLines(s);
      const originAfter = FB.marketCounty(s, preview.originId)
        .goods.provisions.stock;
      const destinationRecord = s.market.counties[destination.destinationId];
      const goodAt = s.market.goods.indexOf('provisions');
      destinationRecord[1][goodAt] = 2;
      inv.bands = [{ outcome:'exceptional', multiplier:1.6 }];
      inv.dueTurn = s.turn;
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      s = FB.state;
      const restored = FB.financeActiveTradeVentures(s)[0];
      const destinationBefore = FB.marketCounty(s, restored.destinationId)
        .goods.provisions.stock;
      const resolved = FB.resolveTradeVenture(s, restored);
      const goldAfter = s.player.gold;
      const duplicate = FB.resolveTradeVenture(s, restored);
      const goldAfterDuplicate = s.player.gold;
      const destinationAfter = FB.marketCounty(s, restored.destinationId)
        .goods.provisions.stock;

      const legacy = {
        id:9999, kind:'trade_venture', status:'active', stake:20,
        destinationId:restored.destinationId, route:restored.route.slice(),
        strategy:'cautious', dueTurn:s.turn, modifiers:{ total:0 },
        bands:[{ outcome:'profit', multiplier:1.25 }]
      };
      s.economy.investments.push(legacy);
      const legacyGold = s.player.gold;
      FB.resolveTradeVenture(s, legacy);
      return {
        removed:originBefore - originAfter,
        quantity:preview.quantity,
        resolved:resolved,
        duplicate:duplicate,
        payout:restored.payout,
        expectedPayout:restored.quantity * 2 * 1.6,
        delivered:destinationAfter - destinationBefore,
        expectedDelivered:restored.quantity,
        goldStableAfterDuplicate:goldAfterDuplicate === goldAfter,
        activeVentureLine:activeLines.some(function (line) {
          return line.kind === 'venture' && line.goodId === 'provisions';
        }),
        legacyPayout:s.player.gold - legacyGold
      };
    });

    expect(result.removed).toBeCloseTo(result.quantity, 1);
    expect(result.resolved).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.payout).toBeCloseTo(result.expectedPayout, 2);
    expect(result.delivered).toBeCloseTo(result.expectedDelivered, 1);
    expect(result.goldStableAfterDuplicate).toBe(true);
    expect(result.activeVentureLine).toBe(true);
    expect(result.legacyPayout).toBe(25);
  });

test('typed charters validate scope while legacy contracts and exact ids remain valid',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 3;
      s.player.guildMonopolies = { incoming:null, outgoing:null };
      const technology = FB.realmTechRecord(s);
      if (technology.completed.indexOf('guild_charters') < 0) {
        technology.completed.push('guild_charters');
      }
      const market = FB.tradeVentureMarkets(s)[0];
      const spec = {
        mode:'corridor', goodId:'wares', originId:s.player.provinceId,
        destinationId:market.destinationId, route:market.route.slice()
      };
      FB.ui.showGuildMonopolyGrant('merchant', spec);
      const grantDialogText = document.getElementById('gm-body').textContent;
      FB.ui.closeModal();
      const charter = FB.issueGuildMonopoly(s, 'merchant', spec);
      const exact = charter && FB.guildMonopolyByContract(s, charter.contractId);
      const lines = FB.marketRouteLines(s);
      technology.completed.splice(technology.completed.indexOf('guild_charters'), 1);
      const grandfathered = FB.guildMonopolyActive(s, 'outgoing');
      technology.completed.push('guild_charters');
      s.player.guildMonopolies.outgoing = null;
      const goldBeforeInvalid = s.player.gold;
      const invalid = FB.issueGuildMonopoly(s, 'merchant', {
        mode:'corridor', goodId:'missing_good', originId:s.player.provinceId,
        destinationId:market.destinationId, route:market.route.slice()
      });
      const slotAfterInvalid = s.player.guildMonopolies.outgoing;
      s.player.guildMonopolies.incoming = {
        contractId:'legacy-broad-contract', profession:'craftsman',
        grantorKind:'local', grantorId:null, grantorName:'Old lord',
        scope:'province', scopeId:s.player.provinceId,
        tier:3, startTurn:s.turn, endTurn:s.turn + 360,
        enterpriseBonus:0.2, rulerFee:0, taxBonus:0,
        popularOpinion:0
      };
      const legacy = FB.guildMonopolyActive(s, 'incoming');
      const home = s.player.provinceId;
      s.player.provinceId = Object.keys(FB.world.adj[home]).sort()[0];
      const legacyInvalidated = FB.guildMonopolyActive(s, 'incoming') === null;
      s.player.provinceId = home;
      const worker = s.chars[s.player.charId];
      s.player.guildMonopolies.incoming = {
        contractId:'typed-craft-contract', profession:'craftsman',
        grantorKind:'local', grantorId:null, grantorName:'Old lord',
        scope:'province', scopeId:home,
        tier:3, startTurn:s.turn, endTurn:s.turn + 360,
        enterpriseBonus:0.2, rulerFee:0, taxBonus:0, popularOpinion:0,
        mode:'craft', goodId:'materials', originId:home
      };
      worker.career = {
        profession:'craftsman', rank:'master', chosen:true,
        guildRank:'guildmaster', guildStanding:100, specialization:'smith'
      };
      const workshop = {
        uid:'typed-workshop', type:'workshop_business', workerId:worker.id,
        provinceId:home, settlement:0
      };
      const craftMatch = FB.guildMonopolyEnterpriseBonus(s, 'craftsman', workshop);
      worker.career.specialization = 'weaver';
      const craftMismatch = FB.guildMonopolyEnterpriseBonus(s, 'craftsman', workshop);
      s.player.guildMonopolies.incoming = null;
      s.player.tier = 2;
      worker.career = {
        profession:'merchant', rank:'master', chosen:true,
        guildRank:'guildmaster', guildStanding:100,
        specialization:'broker'
      };
      const grantor = FB.guildMonopolyGrantor(s, true);
      if (grantor) {
        FB.adjustStanding(s, { kind:'character', id:grantor.id }, 100,
          'e2e:market-petition');
      }
      FB.ui.showGuildMonopolyPetition();
      const petitionDialogText = document.getElementById('gm-body').textContent;
      FB.ui.closeModal();
      return {
        charter:charter,
        exactId:exact && exact.record.contractId,
        routeLines:lines,
        invalid:invalid,
        slotAfterInvalid:slotAfterInvalid,
        goldUnchanged:s.player.gold === goldBeforeInvalid,
        grandfatheredId:grandfathered && grandfathered.contractId,
        legacyId:legacy && legacy.contractId,
        legacyMode:legacy && legacy.mode,
        legacyInvalidated:legacyInvalidated,
        craftMatch:craftMatch,
        craftMismatch:craftMismatch,
        petitionText:FB.eventById('guild_monopoly_petition').text,
        grantDialogText:grantDialogText,
        grantDestination:FB.world.byId[market.destinationId].name,
        petitionDialogText:petitionDialogText
      };
    });

    expect(result.charter).toMatchObject({
      mode:'corridor', goodId:'wares'
    });
    expect(result.exactId).toBe(result.charter.contractId);
    expect(result.routeLines.length).toBeLessThanOrEqual(4);
    expect(result.routeLines.some(function (line) {
      return line.kind === 'charter' && line.goodId === 'wares';
    })).toBe(true);
    expect(result.invalid).toBe(false);
    expect(result.slotAfterInvalid).toBeNull();
    expect(result.goldUnchanged).toBe(true);
    expect(result.grandfatheredId).toBe(result.charter.contractId);
    expect(result.legacyId).toBe('legacy-broad-contract');
    expect(result.legacyMode).toBeNull();
    expect(result.legacyInvalidated).toBe(true);
    expect(result.craftMatch).toBe(0.2);
    expect(result.craftMismatch).toBe(0);
    expect(result.petitionText).toContain('commodity privilege you have defined');
    expect(result.petitionText).not.toContain('whole profession');
    expect(result.grantDialogText).toContain('Wares');
    expect(result.grantDialogText).toContain(result.grantDestination);
    expect(result.petitionDialogText).toContain('Choose a commodity');
    expect(result.petitionDialogText).toContain('One corridor');
  });

test('Land and settlement market entry points keep county-wide access in county places',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      s.player.panelIntrosSeen = s.player.panelIntrosSeen || {};
      s.player.panelIntrosSeen.prov = 1;
      FB.ui.selectProvince('london');
      FB.ui.showTab('prov', { history:false });
    });

    const landMarket = page.locator('#tab-prov #county-market');
    await expect(landMarket).toHaveCount(1);
    await expect(page.locator('#tab-prov > #county-market')).toHaveCount(0);
    const landCard = await landMarket.evaluate(function (button) {
      const section = button.closest('.land-section');
      return {
        section:section && section.querySelector('.land-section-title').textContent,
        classes:button.className,
        summary:button.textContent
      };
    });
    expect(landCard.section).toBe('Development');
    expect(landCard.classes).toContain('land-market-card');
    expect(landCard.summary).toContain('County market');
    expect(landCard.summary).toContain('Provisions');

    await landMarket.click();
    await expect(page.getByRole('heading', { name:/London market$/i })).toBeVisible();
    await expect(page.locator('#market-sheet-good')).toHaveAttribute('data-good', 'provisions');
    await page.getByRole('button', { name:'Done', exact:true }).click();

    const settlements = await page.evaluate(function () {
      const list = FB.settlementsOf(FB.state, 'london');
      FB.ui.showSettlement('london', 0);
      return list.map(function (settlement) { return settlement.name; });
    });
    expect(settlements[0]).toBe('London');
    expect(settlements.length).toBeGreaterThan(1);
    await expect(page.locator('#settlement-market')).toBeVisible();
    await page.locator('#settlement-market').click();
    await expect(page.getByRole('heading', { name:/London market$/i })).toBeVisible();
    await page.getByRole('button', { name:'Done', exact:true }).click();

    await page.evaluate(function () { FB.ui.showSettlement('london', 1); });
    await expect(page.locator('#gm-title')).toContainText(settlements[1]);
    await expect(page.locator('#settlement-market')).toHaveCount(0);
  });

test('the Market lens stays contained on compact desktops and tablets',
  async function ({ page }) {
    await page.setViewportSize({ width:1144, height:710 });
    await page.locator('#btn-marketlens').click();
    await expect(page.locator('#market-lens-controls')).toBeVisible();

    async function measure(width, height) {
      await page.setViewportSize({ width:width, height:height });
      await waitForUiRefresh(page);
      await expect(page.locator('#market-lens-controls')).toBeVisible();
      return page.locator('#market-lens-controls').evaluate(function (controls) {
        const map = document.getElementById('mapwrap').getBoundingClientRect();
        const side = document.getElementById('side').getBoundingClientRect();
        const hud = document.getElementById('maphud').getBoundingClientRect();
        const picker = controls.querySelector('.market-lens-picker');
        const label = picker.querySelector('label').getBoundingClientRect();
        const actionsElement = controls.querySelector('.market-lens-actions');
        const actions = actionsElement.getBoundingClientRect();
        const selector = actionsElement.querySelector('.market-lens-select-wrap')
          .getBoundingClientRect();
        const details = actionsElement.querySelector('#market-lens-details')
          .getBoundingClientRect();
        const legend = controls.querySelector('.market-price-legend')
          .getBoundingClientRect();
        const legendKeys = Array.from(controls.querySelectorAll('.market-price-key'));
        const box = controls.getBoundingClientRect();
        return {
          columns:getComputedStyle(controls).gridTemplateColumns.trim().split(/\s+/).length,
          actionColumns:getComputedStyle(actionsElement).gridTemplateColumns
            .trim().split(/\s+/).length,
          leftInset:Math.round(box.left - map.left),
          containedByMap:box.right <= map.right + 0.5,
          clearsSide:box.right <= side.left + 0.5,
          clearsHud:box.right <= hud.left + 0.5,
          labelAboveActions:label.bottom <= actions.top + 0.5,
          legendBelowActions:actions.bottom <= legend.top + 0.5,
          actionRowsStacked:selector.bottom <= details.top + 0.5,
          selectorFullWidth:Math.abs(selector.width - actions.width) <= 1,
          detailsFullWidth:Math.abs(details.width - actions.width) <= 1,
          selectorWidth:selector.width,
          detailsWidth:details.width,
          legendKeysFit:legendKeys.every(function (key) {
            return key.scrollWidth <= key.clientWidth + 1;
          }),
          legendKeysSeparated:legendKeys.every(function (key, index) {
            if (!index) return true;
            return legendKeys[index - 1].getBoundingClientRect().right <=
              key.getBoundingClientRect().left;
          })
        };
      });
    }

    const compact = await measure(1144, 710);
    const smallDesktop = await measure(960, 710);
    const tablet = await measure(733, 653);
    const shortMobile = await measure(616, 320);

    for (const layout of [compact, smallDesktop, tablet, shortMobile]) {
      expect(layout.columns).toBe(1);
      expect(layout.containedByMap).toBe(true);
      expect(layout.clearsSide).toBe(true);
      expect(layout.clearsHud).toBe(true);
      expect(layout.labelAboveActions).toBe(true);
      expect(layout.legendBelowActions).toBe(true);
      expect(layout.legendKeysFit).toBe(true);
      expect(layout.legendKeysSeparated).toBe(true);
    }
    expect(compact.leftInset).toBe(10);
    expect(shortMobile.actionColumns).toBe(1);
    for (const layout of [smallDesktop, tablet, shortMobile]) {
      if (layout.actionColumns === 1) {
        expect(layout.actionRowsStacked).toBe(true);
        expect(layout.selectorFullWidth).toBe(true);
        expect(layout.detailsFullWidth).toBe(true);
      } else {
        expect(layout.actionColumns).toBe(2);
        expect(layout.selectorWidth).toBeGreaterThanOrEqual(135);
        expect(layout.detailsWidth).toBeGreaterThanOrEqual(135);
      }
    }
    expect(tablet.leftInset).toBe(8);
    expect(shortMobile.leftInset).toBe(8);
  });

test('the Market lens and sheet are keyboard/touch accessible and storage stays bounded',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:844 });
    await waitForUiRefresh(page);
    await page.locator('#btn-marketlens').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#market-lens-controls')).toBeVisible();
    await expect(page.locator('#market-lens-good option[value="materials"]'))
      .toHaveText('⚒ Materials');
    await page.locator('#market-lens-good').selectOption('luxuries');
    await expect(page.locator('#market-lens-good')).toHaveValue('luxuries');
    await page.locator('#market-lens-details').click();
    await expect(page.getByRole('heading', { name:/market$/i })).toBeVisible();
    await expect(page.locator('#market-sheet-good')).toBeVisible();
    await expect(page.locator('#gm-body')).toContainText('Historical endowments');
    const closedSheet = await page.locator('.market-sheet-picker').evaluate(
      function (picker) {
        return {
          pickerHeight:picker.getBoundingClientRect().height,
          modalHeight:document.querySelector('#genmodal .modalcard')
            .getBoundingClientRect().height
        };
      });
    await page.locator('#market-sheet-good').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.market-sheet-dropdown')).toHaveAttribute('open', '');
    const sheetPicker = await page.locator('.market-sheet-picker').evaluate(
      function (picker) {
        const label = picker.querySelector('.market-sheet-label').getBoundingClientRect();
        const trigger = picker.querySelector('summary');
        const triggerBox = trigger.getBoundingClientRect();
        const options = picker.querySelector('.market-sheet-options').getBoundingClientRect();
        const option = picker.querySelector('.market-sheet-option:not(.selected)');
        const pickerBox = picker.getBoundingClientRect();
        const modal = document.querySelector('#genmodal .modalcard').getBoundingClientRect();
        return {
          triggerBelowLabel:triggerBox.top >= label.bottom,
          triggerHeight:Math.round(triggerBox.height),
          pickerHeight:pickerBox.height,
          modalHeight:modal.height,
          triggerFullWidth:Math.abs(triggerBox.width - pickerBox.width) <= 1,
          optionsFullWidth:Math.abs(options.width - pickerBox.width) <= 1,
          optionsContained:options.left >= modal.left && options.right <= modal.right &&
            options.left >= 0 && options.right <= window.innerWidth,
          background:getComputedStyle(trigger).backgroundImage,
          optionBackground:getComputedStyle(option).backgroundColor,
          optionHeight:Math.round(option.getBoundingClientRect().height)
        };
      });
    expect(sheetPicker.triggerBelowLabel).toBe(true);
    expect(sheetPicker.triggerHeight).toBeGreaterThanOrEqual(44);
    expect(Math.abs(sheetPicker.pickerHeight - closedSheet.pickerHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(sheetPicker.modalHeight - closedSheet.modalHeight)).toBeLessThanOrEqual(1);
    expect(sheetPicker.triggerFullWidth).toBe(true);
    expect(sheetPicker.optionsFullWidth).toBe(true);
    expect(sheetPicker.optionsContained).toBe(true);
    expect(sheetPicker.background).not.toBe('none');
    expect(sheetPicker.optionBackground).toBe('rgb(42, 34, 24)');
    expect(sheetPicker.optionHeight).toBeGreaterThanOrEqual(44);

    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.market-sheet-option.selected')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('.market-sheet-option[data-good="provisions"]')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.market-sheet-option[data-good="wares"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#market-sheet-good')).toHaveAttribute('data-good', 'wares');

    await page.setViewportSize({ width:1024, height:700 });
    await page.locator('#market-sheet-good').click();
    await expect(page.locator('.market-sheet-dropdown')).toHaveAttribute('open', '');
    const desktopSheetPicker = await page.locator('.market-sheet-picker').evaluate(
      function (picker) {
        const label = picker.querySelector('.market-sheet-label').getBoundingClientRect();
        const trigger = picker.querySelector('summary').getBoundingClientRect();
        const options = picker.querySelector('.market-sheet-options').getBoundingClientRect();
        const modal = document.querySelector('#genmodal .modalcard').getBoundingClientRect();
        return {
          triggerBelowLabel:trigger.top >= label.bottom,
          optionsMatchTrigger:Math.abs(options.width - trigger.width) <= 1,
          optionsContained:options.left >= modal.left && options.right <= modal.right &&
            options.left >= 0 && options.right <= window.innerWidth
        };
      });
    expect(desktopSheetPicker).toEqual({
      triggerBelowLabel:true,
      optionsMatchTrigger:true,
      optionsContained:true
    });
    await page.setViewportSize({ width:390, height:844 });
    await waitForUiRefresh(page);
    await page.getByRole('button', { name:'Done', exact:true }).click();

    const result = await page.evaluate(function () {
      const s = FB.state;
      const controls = document.getElementById('market-lens-controls');
      const selector = document.getElementById('market-lens-good');
      const details = document.getElementById('market-lens-details');
      const picker = controls.querySelector('.market-lens-picker');
      const actions = controls.querySelector('.market-lens-actions');
      const pickerLabel = picker.querySelector('label').getBoundingClientRect();
      const actionsBox = actions.getBoundingClientRect();
      const selectorBox = selector.getBoundingClientRect();
      const detailsBox = details.getBoundingClientRect();
      const legend = controls.querySelector('.market-price-legend');
      const keys = Array.from(legend.querySelectorAll('.market-price-key'));
      const legendStyle = getComputedStyle(legend);
      const keyStyle = getComputedStyle(keys[0]);
      const selectorStyle = getComputedStyle(selector);
      const detailsStyle = getComputedStyle(details);
      const keyColors = keys.map(function (key) { return getComputedStyle(key).color; });
      const market = FB.ensureMarket(s);
      const at = market.goods.indexOf('provisions');
      const counties = FB.world.provs.filter(function (province) {
        return !province.wasteland && market.counties[province.id];
      }).slice(0, 3);
      market.counties[counties[0].id][1][at] = 0.9;
      market.counties[counties[1].id][1][at] = 1;
      market.counties[counties[2].id][1][at] = 1.1;
      const markerColors = {};
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 10;
      const context = canvas.getContext('2d');
      context.strokeText = function () {};
      context.fillText = function (symbol) {
        if (symbol === '▼' || symbol === '●' || symbol === '▲') {
          markerColors[symbol] = context.fillStyle;
        }
      };
      FB.renderMarketRoutes(context, 'provisions', function (x, y) {
        return [x, y];
      }, 2, 1);
      const before = s.market && s.market.lastTurn;
      s.date.day = 90;
      FB.game.observe = true;
      const observeHousehold = FB.marketHouseholdDemand(s);
      FB.game.passDay();
      FB.game.observe = false;
      return {
        controlHeight:controls.getBoundingClientRect().height,
        selectorHeight:selectorBox.height,
        selectorWidth:selectorBox.width,
        selectorBelowLabel:selectorBox.top >= pickerLabel.bottom,
        selectorSharesButtonRow:Math.abs(selectorBox.top - detailsBox.top) <= 1,
        actionsWidth:actionsBox.width,
        detailsHeight:detailsBox.height,
        detailsWidth:detailsBox.width,
        selectorAppearance:selectorStyle.appearance,
        selectorBackground:selectorStyle.backgroundImage,
        optionBackground:getComputedStyle(selector.querySelector('option')).backgroundColor,
        selectorFontSize:selectorStyle.fontSize,
        detailsFontSize:detailsStyle.fontSize,
        legendJustifyItems:legendStyle.justifyItems,
        legendAlignItems:legendStyle.alignItems,
        keyJustifyContent:keyStyle.justifyContent,
        keyTextAlign:keyStyle.textAlign,
        keyColors:keyColors,
        markerColors:markerColors,
        progressed:s.market.lastTurn !== before,
        marketBytes:JSON.stringify(s.market).length,
        saveBytes:FB.save.serialize().length,
        routes:FB.marketRouteLines(s).length,
        selectedGood:FB.map.marketGood,
        observeHousehold:observeHousehold
      };
    });

    expect(result.selectorHeight).toBeGreaterThanOrEqual(44);
    expect(result.selectorBelowLabel).toBe(true);
    expect(result.selectorSharesButtonRow).toBe(true);
    expect(Math.abs(result.selectorWidth - result.detailsWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.selectorWidth + result.detailsWidth + 6 -
      result.actionsWidth)).toBeLessThanOrEqual(1);
    expect(result.detailsHeight).toBeGreaterThanOrEqual(44);
    expect(Math.abs(result.selectorHeight - result.detailsHeight)).toBeLessThanOrEqual(1);
    expect(result.controlHeight).toBeGreaterThanOrEqual(44);
    expect(result.selectorAppearance).toBe('none');
    expect(result.selectorBackground).not.toBe('none');
    expect(result.optionBackground).toBe('rgb(42, 34, 24)');
    expect(result.selectorFontSize).toBe('14px');
    expect(result.detailsFontSize).toBe('13px');
    expect(result.legendJustifyItems).toBe('center');
    expect(result.legendAlignItems).toBe('center');
    expect(result.keyJustifyContent).toBe('center');
    expect(result.keyTextAlign).toBe('center');
    expect(new Set(result.keyColors).size).toBe(3);
    expect(result.markerColors).toEqual({
      '▼':'#6ee5d3', '●':'#f0d170', '▲':'#ff9676'
    });
    expect(result.progressed).toBe(true);
    expect(Object.values(result.observeHousehold).every(function (amount) {
      return amount === 0;
    })).toBe(true);
    expect(result.marketBytes).toBeLessThan(64 * 1024);
    expect(result.saveBytes).toBeLessThan(COMPLETE_SAVE_BUDGET);
    expect(result.routes).toBeLessThanOrEqual(4);
    expect(result.selectedGood).toBe('luxuries');
  });
