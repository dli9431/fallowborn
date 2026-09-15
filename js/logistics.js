/* Automatic field provisioning: finite county goods, paid trade and requisition. */
(function () {
  'use strict';
  function B(key, fallback) {
    const value = FBDATA.balance[key];
    return value === undefined ? fallback : Math.max(0, Number(value) || 0);
  }
  function number(value) { return isFinite(Number(value)) ? Math.max(0, Number(value) || 0) : 0; }
  function emptyCounty() { return { bought:0, taken:0, paid:0, dues:0, used:0, day:null }; }
  function ensure(state) {
    function record(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
    const data = state.armyLogistics = record(state.armyLogistics);
    if (!(state.treasuryAccounting && state.treasuryAccounting.mode === 'active')) data.purses = record(data.purses);
    data.counties = record(data.counties);
    data.last = record(data.last);
    return data;
  }
  FB.armyProvisionTarget = function (army) {
    const auto = FB.game.auto || {};
    const value = army.realm === 'player' ? Number(auto.supplyTarget) : 85;
    return FB.clamp(isFinite(value) ? value : 75, 25, 100);
  };
  function forced(army) {
    return army.realm === 'player' && FB.game.auto && FB.game.auto.forceSupplies === true;
  }
  function purchases(army) {
    return army.realm !== 'player' || !FB.game.auto || FB.game.auto.buySupplies !== false;
  }
  function budget(state, rid) {
    return B('armyProvisionAIBudgetBase', 10) +
      Math.max(0, FB.realmStrength(state, rid)) * B('armyProvisionAIBudgetStrength', 2);
  }
  function purseView(state, rid) {
    if (rid === 'player') return { gold:number(state.player.gold) };
    if (state.treasuryAccounting && state.treasuryAccounting.mode === 'active') {
      return { gold:FB.treasuryAvailable(state, rid) };
    }
    const data = state.armyLogistics;
    const saved = data && data.purses && data.purses[rid];
    const season = Math.floor(state.turn / 90);
    if (saved && saved.season === season) return saved;
    const allowance = budget(state, rid);
    const periods = saved ? FB.clamp(season - number(saved.season), 0, 2) : 1;
    return { gold:Math.min(allowance * 2, number(saved && saved.gold) + allowance * periods),
      season:season, allowance:allowance };
  }
  function pay(state, rid, amount) {
    if (rid === 'player') state.player.gold = Math.max(0, state.player.gold - amount);
    else if (state.treasuryAccounting && state.treasuryAccounting.mode === 'active') FB.treasurySpend(state, rid, amount);
    else {
      const purse = Object.assign({}, purseView(state, rid));
      purse.gold = Math.max(0, purse.gold - amount);
      ensure(state).purses[rid] = purse;
    }
  }
  function credit(state, rid, amount) {
    if (!rid || amount <= 0) return;
    if (rid === 'player') state.player.gold += amount;
    else if (state.treasuryAccounting && state.treasuryAccounting.mode === 'active') FB.treasuryCredit(state, rid, amount);
    else if (state.realms[rid] && state.realms[rid].alive) {
      const purse = Object.assign({}, purseView(state, rid));
      purse.gold = Math.min(purse.allowance * 2, purse.gold + amount);
      ensure(state).purses[rid] = purse;
    }
  }
  function control(state, army, pid) {
    const owner = (state.holder || {})[pid] || (state.owner || {})[pid];
    const hostile = !!(owner && FB.armiesHostile(state, army, { realm:owner }));
    const fort = hostile ? FB.fortAt(state, pid) : null;
    const defended = hostile && fort && !fort.ruined && FB.fortBlocksArmy(state, pid, army);
    const protection = defended ? Math.min(0.8, number(fort.level) * B('armyProvisionFortProtection', 0.2)) : 0;
    return { owner:owner, hostile:hostile, protection:protection };
  }
  // Horses and pack-dependent classes consume more of the provisions basket.
  function unitsPerPoint(army) {
    let mouths = number(army.men);
    const units = army.units || {};
    Object.keys(units).forEach(function (id) {
      const def = FBDATA.unitClasses[id];
      if (def && def.basket && number(def.basket.transport) >= 0.4) mouths += number(units[id]);
    });
    return mouths / Math.max(1, B('armyProvisionMenPerUnit', 30)) / 90 /
      Math.max(0.01, B('supplyDrainBase', 1.2));
  }
  FB.armyProvisionUse = function (state, army, pid, supplyTech) {
    const pr = FB.world.byId[pid || army.at] || {};
    const terrain = FBDATA.balance.supplyDrainTerrain || {};
    const winter = state.date.season === 3 ? B('supplyWinterDrainMult', 1.5) : 1;
    const campaign = army.realm === 'player' && army.warId === 'holy' && FB.campaignHostModBonus
      ? Math.max(0.1, 1 + FB.campaignHostModBonus(state, 'supplyUse')) : 1;
    return B('supplyDrainBase', 1.2) * (terrain[pr.terrain] || 1) * winter *
      Math.max(0.1, 1 - (supplyTech === undefined ? FB.techBonus(state, 'supply', army.realm) : supplyTech)) * campaign;
  };
  FB.armyProvisionCommitment = function (state, army, seasons) {
    return unitsPerPoint(army) * (FB.armyProvisionUse(state, army) * 90 * seasons +
      Math.max(0, FB.armyProvisionTarget(army) - number(army.supply))) *
      B('armyProvisionPrice', 0.1125) * FB.marketPrice(state, army.at, 'provisions');
  };
  FB.playerProvisionEstimate = function (state) {
    let cost = 0;
    (state.armies || []).forEach(function (army) {
      if (army.realm !== 'player' || forced(army) || !purchases(army) || control(state, army, army.at).hostile) return;
      cost += unitsPerPoint(army) * FB.armyProvisionUse(state, army) * 90 *
        B('armyProvisionPrice', 0.1125) * FB.marketPrice(state, army.at, 'provisions');
    });
    return cost;
  };
  // Only safe overland connections inside the same sovereign realm carry food.
  function regionalSources(state, army, pid, atRest) {
    const realm = army.realm === 'player' ? FB.playerRealmId(state) : FB.topRealm(state, army.realm);
    function safe(id) {
      const pr = FB.world.byId[id], rights = control(state, army, id);
      const owner = rights.owner === 'player' ? FB.playerRealmId(state) : FB.topRealm(state, rights.owner);
      return pr && !pr.wasteland && realm && owner === realm && !rights.hostile &&
        !(FB.countyOccupiedOrBesieged && FB.countyOccupiedOrBesieged(state, id)) &&
        !Object.keys(state.wars || {}).some(function (wid) {
          const war = state.wars[wid], occupation = war && war.occupations && war.occupations[id];
          return war && war.status !== 'ended' && occupation && (occupation.occupied || occupation.progress > 0);
        }) &&
        !(state.armies || []).some(function (other) {
          return other.at === id && other.men > 0 && FB.armiesHostile(state, army, other);
        });
    }
    if (!atRest || !safe(pid)) return [pid];
    const queue = [{ pid:pid, depth:0 }], seen = {};
    seen[pid] = true;
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      if (current.depth >= 2) continue;
      Object.keys(FB.world.adj[current.pid] || {}).sort().forEach(function (next) {
        if (seen[next] || FB.waterCrossing(current.pid, next) || !safe(next)) return;
        seen[next] = true;
        queue.push({ pid:next, depth:current.depth + 1 });
      });
    }
    return queue.map(function (item) { return item.pid; });
  }
  FB.armyProvisionQuote = function (state, army, pid, supplyTech, atRest) {
    pid = pid || army.at;
    const timing = FB.game && FB.game._fastForwardTiming;
    if (timing && timing.repeat) {
      timing.repeat('Provision quotes: host and county', JSON.stringify([army.id, army.realm, pid]), state.turn);
      timing.repeat('Provision quotes: realm and county', JSON.stringify([army.realm, pid]), state.turn);
    }
    const market = FB.marketProvisionSource(state, pid);
    const tech = supplyTech === undefined ? FB.techBonus(state, 'supply', army.realm) : supplyTech;
    const use = FB.armyProvisionUse(state, army, pid, tech);
    const target = FB.armyProvisionTarget(army);
    const result = { mode:'none', units:0, cost:0, points:0, use:use, target:target,
      protection:0, available:0, net:-use, reason:'empty' };
    if (!market || !army.men || army.rebellionId) return result;
    const rights = control(state, army, pid);
    result.forced = forced(army);
    const seizure = rights.hostile || result.forced;
    result.mode = seizure ? 'requisition' : 'purchase';
    result.protection = rights.protection;
    if (!seizure && !purchases(army)) { result.reason = 'disabled'; return result; }
    const perPoint = unitsPerPoint(army);
    if (!perPoint) return result;
    const loading = B('supplyRecoverRate', 3) * (1 + tech);
    const desiredPoints = Math.min(use + loading, Math.max(0, target - number(army.supply) + use));
    const sources = seizure ? [pid] : regionalSources(state, army, pid,
      atRest === true || (!(army.path && army.path.length) && !(army.moveLeft > 0)));
    result.regional = sources.length > 1;
    result.sources = [];
    result.stockAvailable = 0; result.loadingAvailable = 0; result.affordable = 0;
    let funds = seizure ? Infinity : purseView(state, army.realm).gold;
    sources.forEach(function (sourcePid) {
      const source = sourcePid === pid ? market : FB.marketProvisionSource(state, sourcePid);
      if (!source) return;
      const data = state.armyLogistics;
      const today = data && data.counties && data.counties[sourcePid];
      const used = today && today.day === state.turn ? number(today.used) : 0;
      const available = Math.max(0, source.stock - source.reserve * rights.protection);
      const room = Math.max(0, source.demand / 90 * B('armyProvisionMarketDays', 2) * (1 - rights.protection) - used);
      const price = B('armyProvisionPrice', 0.1125) * source.price;
      const affordable = seizure || !price ? Infinity : funds / price;
      const units = Math.max(0, Math.min(desiredPoints * perPoint - result.units, available, room, affordable));
      const cost = seizure ? 0 : Math.min(funds, units * price);
      result.stockAvailable += available; result.loadingAvailable += room;
      result.affordable += affordable; result.available += Math.min(available, room);
      if (units > 0) result.sources.push({ pid:sourcePid, units:units, cost:cost });
      result.units += units; result.cost += cost; funds -= cost;
    });
    result.points = result.units / perPoint;
    result.net = result.points - use;
    result.reason = result.units > 0 ? null : !desiredPoints ? 'reserve' : !result.affordable ? 'coin'
      : !result.stockAvailable ? (rights.protection && market.stock > 0 ? 'fort' : 'stock') : 'loading';
    return result;
  };
  FB.provisionArmy = function (state, army) {
    const timing = FB.game._fastForwardTiming;
    if (!timing) return provisionArmy(state, army);
    const entry = timing.enter('Army operation: local provisioning');
    try { return provisionArmy(state, army); }
    finally { timing.leave(entry); }
  };
  function provisionArmy(state, army) {
    if (army.rebellionId) return null;
    const q = FB.armyProvisionQuote(state, army);
    const data = ensure(state);
    (q.sources || []).forEach(function (purchase) {
      const row = data.counties[purchase.pid] = data.counties[purchase.pid] || emptyCounty();
      if (row.day !== state.turn) { row.day = state.turn; row.used = 0; }
      if (purchase.units > 0) {
        // No tenths rounding here: small daily purchases must remove real stock.
        if (!FB.marketWithdrawProvisions(state, purchase.pid, purchase.units)) {
          q.units -= purchase.units; q.cost -= purchase.cost;
          q.points = q.units / unitsPerPoint(army); q.net = q.points - q.use;
          return;
        }
        row.used += purchase.units;
        if (q.mode === 'purchase') {
          pay(state, army.realm, purchase.cost);
          const dues = purchase.cost * B('armyProvisionDues', 0.1);
          const holder = (state.holder || {})[purchase.pid] || (state.owner || {})[purchase.pid];
          const sovereign = holder === 'player' ? FB.playerRealmId(state) || 'player' : FB.topRealm(state, holder);
          credit(state, holder, holder === sovereign ? dues : dues * 0.8);
          if (holder !== sovereign) credit(state, sovereign, dues * 0.2);
          row.bought += purchase.units; row.paid += purchase.cost; row.dues += dues;
        } else {
          row.taken += purchase.units;
          const source = FB.marketProvisionSource(state, purchase.pid);
          const burden = Math.min(0.35, row.taken / Math.max(1, source.demand));
          const id = 'requisition:' + purchase.pid;
          const old = state.market.shocks.filter(function (s) { return s.id === id; })[0];
          FB.addMarketShock(state, { id:id, source:'army_requisition', provinceId:purchase.pid,
            goodId:'provisions', production:-Math.max(burden, old ? -old.production : 0),
            flow:-Math.max(burden, old ? -old.flow : 0), remaining:2, severe:burden >= 0.2 });
          if (FB.adjustCountySupport) FB.adjustCountySupport(state, purchase.pid,
            -Math.min(2, purchase.units / Math.max(1, source.demand) * 40));
          if (q.forced) {
            const holder = (state.holder || {})[purchase.pid] || (state.owner || {})[purchase.pid];
            if (holder && holder !== army.realm && FB.adjustStanding) {
              const target = { kind:'realm', id:holder };
              const standing = FB.standingOf(state, target);
              const loss = Math.min(2, purchase.units / Math.max(1, source.demand) * 40);
              FB.adjustStanding(state, target, Math.min(-25, standing - loss) - standing, 'army:forced_provisions');
            }
          }
        }
      }
    });
    army.supply = FB.clamp(number(army.supply) - q.use + q.points, 0, 100);
    army.provisioning = { turn:state.turn, pid:army.at, mode:q.mode, cost:q.cost,
      units:q.units, net:q.net, protection:q.protection, reason:q.reason };
    const timing = FB.game._fastForwardTiming;
    if (timing) {
      timing.count('Provisioning hosts');
      timing.count(q.mode === 'purchase' ? 'Provisions purchased' : 'Provisions requisitioned', q.units);
      timing.count('Provisioning coin spent', q.cost);
      if (q.reason) timing.count('Provisioning reason: ' + q.reason);
      if (q.net < 0) timing.count('Provisioning shortfall host-days');
    }
    return q;
  }
  FB.armyMarketDemand = function (state) {
    const counties = state.armyLogistics && state.armyLogistics.counties || {}, out = {};
    Object.keys(counties).forEach(function (pid) {
      out[pid] = number(counties[pid].bought) + number(counties[pid].taken);
    });
    return out;
  };
  function producerAdjustment(producer, counties) {
    const row = counties[producer.pid] || emptyCounty(), start = producer.start;
    const bought = Math.max(0, number(row.bought) - start.bought);
    const taken = Math.max(0, number(row.taken) - start.taken);
    const receipts = Math.max(0, number(row.paid) - number(row.dues) - start.receipts);
    const share = producer.output / producer.countyOutput;
    const scale = Math.min(1, producer.countyOutput / Math.max(0.000001, bought + taken));
    const allocatedBought = bought * share * scale, allocatedTaken = taken * share * scale;
    const earned = receipts * share * scale;
    return { gain:Math.min(producer.income * 0.25, earned,
      Math.max(0, earned - producer.income * allocatedBought / producer.output)),
      loss:Math.min(producer.income * 0.5, producer.income * allocatedTaken / producer.output) };
  }
  FB.armyProducerCloseMissing = function (state, present) {
    const data = state.armyLogistics;
    if (!data || !data.producers) return;
    const remaining = [];
    for (const row of data.producers.rows) {
      if (present[row.uid]) { remaining.push(row); continue; }
      const adjustment = producerAdjustment(row, data.counties || {});
      state.player.gold += adjustment.gain - adjustment.loss;
    }
    data.producers.rows = remaining;
  };
  FB.armyProvisionSeason = function (state) {
    if (!state.armyLogistics) return;
    const data = ensure(state);
    if (data.producers) {
      let gain = 0, loss = 0;
      for (const producer of data.producers.rows) {
        const adjustment = producerAdjustment(producer, data.counties);
        gain += adjustment.gain; loss += adjustment.loss;
      }
      data.producerPending = (isFinite(data.producerPending) ? Number(data.producerPending) : 0) + gain - loss;
      data.producerLast = { gain:gain, loss:loss, period:data.producers.period };
      delete data.producers;
    }
    data.last = data.counties;
    data.counties = {};
    Object.keys(data.purses || {}).forEach(function (rid) {
      if (!state.realms[rid] || !state.realms[rid].alive) delete data.purses[rid];
    });
  };
  FB.armyProducerSnapshot = function (state, reports) {
    if (!state.treasuryAccounting || state.treasuryAccounting.mode !== 'active') return;
    const data = ensure(state), period = Math.floor(state.turn / 90);
    if (data.producers && data.producers.period === period) return;
    const rows = [], totals = {};
    for (const enterprise of FB.enterpriseList(state)) {
      const allOutput = FB.marketEnterpriseOutput(state, enterprise);
      const output = number(allOutput.provisions);
      if (!output) continue;
      const pid = enterprise.provinceId, current = data.counties[pid] || emptyCounty();
      const income = number(FB.enterprisePhysicalYield(state, enterprise));
      let totalOutput = 0;
      for (const good in allOutput) totalOutput += number(allOutput[good]);
      rows.push({ uid:enterprise.uid, pid:pid, output:output,
        income:income * output / Math.max(output, totalOutput),
        start:{ bought:number(current.bought), taken:number(current.taken),
          receipts:number(current.paid) - number(current.dues) } });
      totals[pid] = (totals[pid] || 0) + output;
    }
    const good = state.market.goods.indexOf('provisions');
    for (const row of rows) {
      const report = reports && reports[row.pid];
      const market = !report && FB.marketProvisionSource(state, row.pid);
      const source = report ? number(report.production[good]) : number(market && market.demand);
      row.countyOutput = Math.max(row.output, totals[row.pid], source);
    }
    data.producers = { period:period, rows:rows };
  };
  FB.armyProducerSettle = function (state) {
    const data = state.armyLogistics;
    if (!data || !isFinite(data.producerPending)) return;
    state.player.gold += data.producerPending;
    data.producerPending = 0;
  };
  FB.armyProvisionCounty = function (state, pid) {
    const data = state.armyLogistics;
    return data && { current:(data.counties || {})[pid] || emptyCounty(), last:(data.last || {})[pid] || emptyCounty() };
  };
  FB.armyProvisionText = function (state, army) {
    const q = FB.armyProvisionQuote(state, army);
    if (q.forced && q.units > 0) return FB.T('Forcing supplies without payment. County Popular support falls; its direct ruler becomes hostile toward you (Standing at most -25) and loses more Standing with further seizures. Stocks and loading limits still apply.');
    if (q.reason === 'reserve') return FB.T('Using carried supplies toward the {percent}% reserve target.', { percent:q.target });
    if (q.reason === 'disabled') return FB.T('Supply purchases off; carried reserves feed the host.');
    if (q.reason === 'coin') return FB.T('No coin for provisions; carried reserves feed the host.');
    if (q.reason === 'fort') return FB.T('Enemy fort protects remaining supplies.');
    if (q.regional && q.reason === 'stock') return FB.T('Local and nearby markets have no food left. Coin alone cannot refill this host here.');
    if (q.regional && q.reason === 'loading') return FB.T('Local and nearby markets have reached their daily food-loading limits.');
    if (q.regional && q.net < 0) return FB.T('Local and nearby markets deliver {loaded} of {needed} supply points needed today. Carried reserves cover the shortfall.', {
      loaded:Math.round(q.points * 10) / 10, needed:Math.round(q.use * 10) / 10 });
    if (q.sources && q.sources.some(function (source) { return source.pid !== army.at; })) return FB.T('Buying food locally and from nearby markets: up to {money:cost} today. Reserve target {percent}%. Deliveries travel up to two counties through safe land in your realm.',
      { cost:q.cost, percent:q.target });
    if (q.reason === 'stock' || q.reason === 'empty') return FB.T('Local food stocks are exhausted. Coin alone cannot refill this host here.');
    if (q.reason === 'loading') return FB.T('This county has reached its daily food-loading limit. More can be loaded tomorrow if stocks remain.');
    if (q.net < 0) return FB.T('Local food covers {loaded} of {needed} supply points needed today. Carried reserves cover the shortfall; county stocks and daily loading limit purchases.', {
      loaded:Math.round(q.points * 10) / 10, needed:Math.round(q.use * 10) / 10 });
    if (q.mode === 'requisition') return FB.T('Requisitioning food; fort protection {percent}%. County stocks and Popular support fall.',
      { percent:Math.round(q.protection * 100) });
    return FB.T('Automatic provisions: up to {money:cost} today. Reserve target {percent}%.',
      { cost:q.cost, percent:q.target });
  };
  // The search visits only reachable counties, with a bounded local probe.
  // It never overwrites hand-issued player or patron-host orders.
  FB.armySupplyGoal = function (state, army) {
    const auto = FB.game.auto || {};
    if (army.realm === 'player' && (auto.hostResupply === false || (auto.buySupplies === false && !forced(army)))) {
      delete army.autoResupply; delete army.supplyStop; delete army.supplyRetreat; delete army.supplySearchTurn; return null;
    }
    const offensive = army.realm === 'player' && auto.hosts === 'off';
    function realmCounty(pid) {
      const rights = control(state, army, pid);
      const owner = rights.owner === 'player' ? FB.playerRealmId(state) : FB.topRealm(state, rights.owner);
      return owner === FB.playerRealmId(state) && !rights.hostile &&
        FB.armyFriendlyProvince(state, army, pid) &&
        !(FB.countyOccupiedOrBesieged && FB.countyOccupiedOrBesieged(state, pid)) &&
        !(state.armies || []).some(function (other) {
          return other.at === pid && other.men > 0 && FB.armiesHostile(state, army, other);
        });
    }
    const supply = FB.hostSupply(army);
    const target = FB.armyProvisionTarget(army);
    if (supply >= target - 1) {
      delete army.autoResupply; delete army.supplyStop; delete army.supplyRetreat; delete army.supplySearchTurn; return null;
    }
    if (!army.autoResupply && supply > 15) return null;
    // No purchases or movement occur inside this synchronous search.
    const quotes = Object.create(null), tech = FB.techBonus(state, 'supply', army.realm);
    function quote(pid) {
      if (!quotes[pid]) quotes[pid] = FB.armyProvisionQuote(state, army, pid, tech, true);
      return quotes[pid];
    }
    const local = quote(army.at);
    if (!army.autoResupply && local.net >= 0 && !forced(army)) return null;
    army.autoResupply = 1;
    const funds = purseView(state, army.realm).gold;
    const canRefill = function (pid) {
      if (offensive && !realmCounty(pid)) return false;
      // This goal seeks purchases only. With no coin a positive-price market
      // cannot refill; free markets still need the full quote. Local seizure
      // and the ordinary retreat fallback remain independent of this shortcut.
      if (!quotes[pid] && funds <= 0 && !forced(army)) {
        const market = FB.marketProvisionSource(state, pid);
        if (!market || B('armyProvisionPrice', 0.1125) * market.price > 0) {
          const timing = FB.game && FB.game._fastForwardTiming;
          if (timing) timing.count('Supply search: unaffordable quotes skipped');
          return false;
        }
      }
      const q = quote(pid);
      return (q.mode === 'purchase' || q.forced) && q.net > 0.05 && FB.armyCanPursue(state, army, pid);
    };
    if (canRefill(army.at)) { army.supplyStop = army.at; delete army.supplyRetreat; return army.at; }
    const prior = army.supplyStop;
    if (prior && prior !== army.at && canRefill(prior)) {
      const route = FB.armyHasRouteTo(state, army, prior) || FB.findArmyPath(state, army, prior);
      if (route && !route.blockedByFort) return prior;
    }
    delete army.supplyStop;
    if (army.supplySearchTurn !== undefined && state.turn - army.supplySearchTurn < 7) {
      const retreat = army.supplyRetreat;
      if (retreat && (!offensive || realmCounty(retreat)) && FB.armyFriendlyProvince(state, army, retreat) &&
          FB.armyCanPursue(state, army, retreat)) {
        const route = FB.armyHasRouteTo(state, army, retreat) || FB.findArmyPath(state, army, retreat);
        if (route && !route.blockedByFort) return retreat;
      }
      delete army.supplyRetreat;
      return army.at;
    }
    army.supplySearchTurn = state.turn;
    const queue = [army.at], seen = {};
    seen[army.at] = true;
    for (let i = 0; i < queue.length && i < 60; i++) {
      const pid = queue[i];
      if (pid !== army.at && canRefill(pid)) {
        const path = FB.findArmyPath(state, army, pid);
        if (path && !path.blockedByFort) { army.supplyStop = pid; delete army.supplyRetreat; return pid; }
      }
      Object.keys(FB.world.adj[pid] || {}).sort().forEach(function (next) {
        if (!seen[next]) { seen[next] = true; queue.push(next); }
      });
    }
    const retreat = FB.armyRetreatGoal(state, army, offensive ? realmCounty : null) || army.at;
    army.supplyRetreat = retreat;
    return retreat;
  };
}());
