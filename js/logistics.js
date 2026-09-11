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
    data.purses = record(data.purses);
    data.counties = record(data.counties);
    data.last = record(data.last);
    return data;
  }
  FB.armyProvisionTarget = function (army) {
    const auto = FB.game.auto || {};
    const value = army.realm === 'player' ? Number(auto.supplyTarget) : 85;
    return FB.clamp(isFinite(value) ? value : 75, 25, 100);
  };
  function purchases(army) {
    return army.realm !== 'player' || !FB.game.auto || FB.game.auto.buySupplies !== false;
  }
  function budget(state, rid) {
    return B('armyProvisionAIBudgetBase', 10) +
      Math.max(0, FB.realmStrength(state, rid)) * B('armyProvisionAIBudgetStrength', 2);
  }
  function purseView(state, rid) {
    if (rid === 'player') return { gold:number(state.player.gold) };
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
    else {
      const purse = Object.assign({}, purseView(state, rid));
      purse.gold = Math.max(0, purse.gold - amount);
      ensure(state).purses[rid] = purse;
    }
  }
  function credit(state, rid, amount) {
    if (!rid || amount <= 0) return;
    if (rid === 'player') state.player.gold += amount;
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
    return mouths / Math.max(1, B('armyProvisionMenPerUnit', 120)) / 90 /
      Math.max(0.01, B('supplyDrainBase', 1.2));
  }
  FB.armyProvisionUse = function (state, army, pid) {
    const pr = FB.world.byId[pid || army.at] || {};
    const terrain = FBDATA.balance.supplyDrainTerrain || {};
    const winter = state.date.season === 3 ? B('supplyWinterDrainMult', 1.5) : 1;
    const campaign = army.realm === 'player' && army.warId === 'holy' && FB.campaignHostModBonus
      ? Math.max(0.1, 1 + FB.campaignHostModBonus(state, 'supplyUse')) : 1;
    return B('supplyDrainBase', 1.2) * (terrain[pr.terrain] || 1) * winter *
      Math.max(0.1, 1 - FB.techBonus(state, 'supply', army.realm)) * campaign;
  };
  FB.playerProvisionEstimate = function (state) {
    let cost = 0;
    (state.armies || []).forEach(function (army) {
      if (army.realm !== 'player' || !purchases(army) || control(state, army, army.at).hostile) return;
      cost += unitsPerPoint(army) * FB.armyProvisionUse(state, army) * 90 *
        B('armyProvisionPrice', 0.45) * FB.marketPrice(state, army.at, 'provisions');
    });
    return cost;
  };
  FB.armyProvisionQuote = function (state, army, pid) {
    pid = pid || army.at;
    const market = FB.marketProvisionSource(state, pid);
    const use = FB.armyProvisionUse(state, army, pid);
    const target = FB.armyProvisionTarget(army);
    const result = { mode:'none', units:0, cost:0, points:0, use:use, target:target,
      protection:0, available:0, net:-use, reason:'empty' };
    if (!market || !army.men || army.rebellionId) return result;
    const rights = control(state, army, pid);
    result.mode = rights.hostile ? 'requisition' : 'purchase';
    result.protection = rights.protection;
    if (!rights.hostile && !purchases(army)) { result.reason = 'disabled'; return result; }
    const perPoint = unitsPerPoint(army);
    if (!perPoint) return result;
    const tech = FB.techBonus(state, 'supply', army.realm);
    const loading = B('supplyRecoverRate', 3) * (1 + tech);
    const desiredPoints = Math.min(use + loading, Math.max(0, target - number(army.supply) + use));
    const data = state.armyLogistics;
    const today = data && data.counties && data.counties[pid];
    const used = today && today.day === state.turn ? number(today.used) : 0;
    const capacity = market.demand / 90 * B('armyProvisionMarketDays', 2);
    const available = Math.max(0, market.stock - market.reserve * rights.protection);
    const room = Math.max(0, capacity * (1 - rights.protection) - used);
    const price = B('armyProvisionPrice', 0.45) * market.price;
    const funds = rights.hostile ? Infinity : purseView(state, army.realm).gold;
    const affordable = rights.hostile || !price ? Infinity : funds / price;
    result.available = Math.min(available, room);
    result.units = Math.max(0, Math.min(desiredPoints * perPoint, result.available, affordable));
    result.cost = rights.hostile ? 0 : result.units * price;
    result.points = result.units / perPoint;
    result.net = result.points - use;
    result.reason = result.units > 0 ? null : !desiredPoints ? 'reserve' : !affordable ? 'coin' : rights.protection ? 'fort' : 'empty';
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
    const row = data.counties[army.at] = data.counties[army.at] || emptyCounty();
    if (row.day !== state.turn) { row.day = state.turn; row.used = 0; }
    if (q.units > 0) {
      // No tenths rounding here: small daily purchases must remove real stock.
      if (!FB.marketWithdrawProvisions(state, army.at, q.units)) return null;
      row.used += q.units;
      if (q.mode === 'purchase') {
        pay(state, army.realm, q.cost);
        const dues = q.cost * B('armyProvisionDues', 0.1);
        const holder = (state.holder || {})[army.at] || (state.owner || {})[army.at];
        const sovereign = holder === 'player' ? FB.playerRealmId(state) || 'player' : FB.topRealm(state, holder);
        credit(state, holder, holder === sovereign ? dues : dues * 0.8);
        if (holder !== sovereign) credit(state, sovereign, dues * 0.2);
        row.bought += q.units; row.paid += q.cost; row.dues += dues;
      } else {
        row.taken += q.units;
        const source = FB.marketProvisionSource(state, army.at);
        const burden = Math.min(0.35, row.taken / Math.max(1, source.demand));
        const id = 'requisition:' + army.at;
        const old = state.market.shocks.filter(function (s) { return s.id === id; })[0];
        FB.addMarketShock(state, { id:id, source:'army_requisition', provinceId:army.at,
          goodId:'provisions', production:-Math.max(burden, old ? -old.production : 0),
          flow:-Math.max(burden, old ? -old.flow : 0), remaining:2, severe:burden >= 0.2 });
        if (FB.adjustCountySupport) FB.adjustCountySupport(state, army.at,
          -Math.min(2, q.units / Math.max(1, source.demand) * 40));
      }
    }
    army.supply = FB.clamp(number(army.supply) - q.use + q.points, 0, 100);
    army.provisioning = { turn:state.turn, pid:army.at, mode:q.mode, cost:q.cost,
      units:q.units, net:q.net, protection:q.protection, reason:q.reason };
    const timing = FB.game._fastForwardTiming;
    if (timing) {
      timing.count('Provisioning hosts');
      timing.count(q.mode === 'purchase' ? 'Provisions purchased' : 'Provisions requisitioned', q.units);
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
  FB.armyProvisionSeason = function (state) {
    if (!state.armyLogistics) return;
    const data = ensure(state);
    data.last = data.counties;
    data.counties = {};
    Object.keys(data.purses).forEach(function (rid) {
      if (!state.realms[rid] || !state.realms[rid].alive) delete data.purses[rid];
    });
  };
  FB.armyProvisionCounty = function (state, pid) {
    const data = state.armyLogistics;
    return data && { current:(data.counties || {})[pid] || emptyCounty(), last:(data.last || {})[pid] || emptyCounty() };
  };
  FB.armyProvisionText = function (state, army) {
    const q = FB.armyProvisionQuote(state, army);
    if (q.reason === 'reserve') return FB.T('Using carried supplies toward the {percent}% reserve target.', { percent:q.target });
    if (q.reason === 'disabled') return FB.T('Supply purchases off; carried reserves feed the host.');
    if (q.reason === 'coin') return FB.T('No coin for provisions; carried reserves feed the host.');
    if (q.reason === 'fort') return FB.T('Enemy fort protects remaining supplies.');
    if (q.reason === 'empty') return FB.T('Local provisions or loading capacity exhausted.');
    if (q.mode === 'requisition') return FB.T('Requisitioning food; fort protection {percent}%. County stocks and Popular support fall.',
      { percent:Math.round(q.protection * 100) });
    return FB.T('Automatic provisions: up to {money:cost} today. Reserve target {percent}%.',
      { cost:q.cost, percent:q.target });
  };
  // The search visits only reachable counties, with a bounded local probe.
  // It never overwrites hand-issued player or patron-host orders.
  FB.armySupplyGoal = function (state, army) {
    const auto = FB.game.auto || {};
    if (army.realm === 'player' && (auto.hostResupply === false || auto.buySupplies === false)) {
      delete army.autoResupply; return null;
    }
    const supply = FB.hostSupply(army);
    const target = FB.armyProvisionTarget(army);
    if (supply >= target - 1) { delete army.autoResupply; return null; }
    if (!army.autoResupply && supply > 15) return null;
    const local = FB.armyProvisionQuote(state, army);
    if (!army.autoResupply && local.net >= 0) return null;
    army.autoResupply = 1;
    const canRefill = function (pid) {
      const q = FB.armyProvisionQuote(state, army, pid);
      return q.mode === 'purchase' && q.net > 0.05 && FB.armyCanPursue(state, army, pid);
    };
    if (canRefill(army.at)) return army.at;
    const prior = army.supplyStop;
    if (prior && canRefill(prior) && FB.armyHasRouteTo(state, army, prior)) return prior;
    if (army.supplySearchTurn !== undefined && state.turn - army.supplySearchTurn < 7) return army.goal || army.at;
    army.supplySearchTurn = state.turn;
    const queue = [army.at], seen = {};
    seen[army.at] = true;
    for (let i = 0; i < queue.length && i < 60; i++) {
      const pid = queue[i];
      if (pid !== army.at && canRefill(pid)) {
        const path = FB.findArmyPath(state, army, pid);
        if (path && !path.blockedByFort) { army.supplyStop = pid; return pid; }
      }
      Object.keys(FB.world.adj[pid] || {}).sort().forEach(function (next) {
        if (!seen[next]) { seen[next] = true; queue.push(next); }
      });
    }
    return FB.armyRetreatGoal(state, army) || army.at;
  };
}());
