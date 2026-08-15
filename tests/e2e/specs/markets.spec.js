'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

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

test('the Market lens and sheet are keyboard/touch accessible and storage stays bounded',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:844 });
    await page.locator('#btn-marketlens').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#market-lens-controls')).toBeVisible();
    await page.locator('#market-lens-good').selectOption('luxuries');
    await expect(page.locator('#market-lens-good')).toHaveValue('luxuries');
    await page.locator('#market-lens-details').click();
    await expect(page.getByRole('heading', { name:/market$/i })).toBeVisible();
    await expect(page.locator('#market-sheet-good')).toBeVisible();
    await expect(page.locator('#gm-body')).toContainText('Historical endowments');
    await page.getByRole('button', { name:'Done', exact:true }).click();

    const result = await page.evaluate(function () {
      const s = FB.state;
      const controls = document.getElementById('market-lens-controls');
      const selector = document.getElementById('market-lens-good');
      const before = s.market && s.market.lastTurn;
      s.date.day = 90;
      FB.game.observe = true;
      const observeHousehold = FB.marketHouseholdDemand(s);
      FB.game.passDay();
      FB.game.observe = false;
      return {
        controlHeight:controls.getBoundingClientRect().height,
        selectorHeight:selector.getBoundingClientRect().height,
        progressed:s.market.lastTurn !== before,
        marketBytes:JSON.stringify(s.market).length,
        saveBytes:FB.save.serialize().length,
        routes:FB.marketRouteLines(s).length,
        selectedGood:FB.map.marketGood,
        observeHousehold:observeHousehold
      };
    });

    expect(result.selectorHeight).toBeGreaterThanOrEqual(44);
    expect(result.controlHeight).toBeGreaterThanOrEqual(44);
    expect(result.progressed).toBe(true);
    expect(Object.values(result.observeHousehold).every(function (amount) {
      return amount === 0;
    })).toBe(true);
    expect(result.marketBytes).toBeLessThan(64 * 1024);
    expect(result.saveBytes).toBeLessThan(1.5 * 1024 * 1024);
    expect(result.routes).toBeLessThanOrEqual(4);
    expect(result.selectedGood).toBe('luxuries');
  });
