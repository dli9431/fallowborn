/* Fallowborn — deterministic county commodity markets. */
(function () {
  'use strict';

  const FB = window.FB = window.FB || {};
  const DATA = window.FBDATA = window.FBDATA || {};
  let edgeWorld = null;
  let stableEdges = [];
  let reportState = null;
  let reports = {};
  let overlayCache = { key:null, canvas:null };
  let overlayWorld = null;
  let overlayState = null;
  let ensuredState = null;
  let ensuredMarket = null;

  function balance(key, fallback) {
    const value = Number(DATA.balance && DATA.balance[key]);
    return isFinite(value) ? value : fallback;
  }

  function goodIds() {
    const ids = Object.keys(DATA.marketGoods || {});
    ids.sort(function (a, b) {
      const ao = Number(DATA.marketGoods[a].order) || 0;
      const bo = Number(DATA.marketGoods[b].order) || 0;
      return ao - bo || (a < b ? -1 : a > b ? 1 : 0);
    });
    return ids;
  }

  function stockNumber(value) {
    return Math.max(0, Math.round((Number(value) || 0) * 10) / 10);
  }

  function priceNumber(value) {
    return Math.max(0.01, Math.round((Number(value) || 1) * 100) / 100);
  }

  function emptyVector(ids, value) {
    const out = [];
    for (let i = 0; i < ids.length; i++) out.push(value || 0);
    return out;
  }

  function provinceIds() {
    const ids = [];
    const byId = FB.world && FB.world.byId || {};
    for (const id in byId) if (!byId[id].wasteland) ids.push(id);
    ids.sort();
    return ids;
  }

  function terrainOutput(terrain) {
    const table = {
      farmland:{ provisions:1.20, wares:0.34, materials:0.34, transport:0.36, luxuries:0.10 },
      forest:{ provisions:0.76, wares:0.34, materials:1.12, transport:0.68, luxuries:0.07 },
      hills:{ provisions:0.84, wares:0.43, materials:0.83, transport:0.80, luxuries:0.09 },
      mountains:{ provisions:0.54, wares:0.29, materials:0.93, transport:0.79, luxuries:0.07 },
      desert:{ provisions:0.34, wares:0.24, materials:0.34, transport:0.81, luxuries:0.11 },
      steppe:{ provisions:0.74, wares:0.25, materials:0.34, transport:1.22, luxuries:0.05 },
      marsh:{ provisions:0.79, wares:0.30, materials:0.64, transport:0.46, luxuries:0.05 },
      tundra:{ provisions:0.44, wares:0.24, materials:0.74, transport:0.55, luxuries:0.04 }
    };
    return table[terrain] || table.hills;
  }

  function countyBase(state, pid) {
    const pr = FB.world.byId[pid];
    const dev = Math.max(1, Number(state.dev && state.dev[pid]) || pr.dev0 || pr.dev || 1);
    const sites = FB.settlementsOf ? FB.settlementsOf(state, pid) : [];
    let settlementWeight = 0;
    for (let i = 0; i < sites.length; i++) {
      settlementWeight += sites[i].kind === 'city' ? 1.6 :
        sites[i].kind === 'town' ? 1.25 :
        sites[i].kind === 'castle' ? 0.9 : 0.55;
    }
    const scale = balance('marketStockScale', 12);
    return {
      dev:dev,
      sites:sites,
      amount:(5 + dev * 3 + settlementWeight) * scale
    };
  }

  function baseDemand(state, pid, ids) {
    const base = countyBase(state, pid);
    const popFactor = FB.countyPopulationFactor ? FB.countyPopulationFactor(state, pid) : 1.0;
    const minDemandFactor = balance('populationDemandFactorMin', 0.60);
    const maxDemandFactor = balance('populationDemandFactorMax', 1.60);
    const clampedPopFactor = FB.clamp(popFactor, minDemandFactor, maxDemandFactor);
    const luxury = 0.045 + Math.min(0.075, base.dev * 0.006);
    const ratios = {
      provisions:1,
      wares:0.28,
      materials:0.22,
      transport:0.18,
      luxuries:luxury
    };
    const out = [];
    for (let i = 0; i < ids.length; i++) out.push(base.amount * clampedPopFactor * (ratios[ids[i]] || 0.1));
    return out;
  }

  function arrayMap(oldIds, values, ids, fallback) {
    const out = [];
    for (let i = 0; i < ids.length; i++) {
      const at = oldIds.indexOf(ids[i]);
      out.push(at >= 0 && values && isFinite(Number(values[at])) ? Number(values[at]) : fallback(i));
    }
    return out;
  }

  function normalShock(shock, index) {
    if (!shock || typeof shock !== 'object') return null;
    const ids = goodIds();
    const pid = shock.provinceId || shock.pid || null;
    if (pid && (!FB.world.byId[pid] || FB.world.byId[pid].wasteland)) return null;
    if (shock.goodId && ids.indexOf(shock.goodId) < 0) return null;
    const remaining = Math.max(0, Math.floor(Number(shock.remaining === undefined ?
      shock.seasons : shock.remaining) || 0));
    if (!remaining) return null;
    return {
      id:String(shock.id || ('market_shock_' + index)),
      source:String(shock.source || 'market_disruption'),
      provinceId:pid,
      goodId:shock.goodId || null,
      production:Math.max(-1, Math.min(2, Number(shock.production) || 0)),
      demand:Math.max(-1, Math.min(2, Number(shock.demand) || 0)),
      flow:Math.max(-1, Math.min(2, Number(shock.flow) || 0)),
      severe:shock.severe === true,
      remaining:remaining
    };
  }

  FB.validateMarketData = function (goods, types, endowments, geography) {
    const faults = [];
    if (!goods || typeof goods !== 'object' || Array.isArray(goods)) {
      faults.push('marketGoods must be an object.');
      goods = {};
    }
    if (!types || typeof types !== 'object' || Array.isArray(types)) {
      faults.push('marketEndowmentTypes must be an object.');
      types = {};
    }
    if (!endowments || typeof endowments !== 'object' || Array.isArray(endowments)) {
      faults.push('marketEndowments must be an object.');
      endowments = {};
    }
    const ids = Object.keys(goods);
    if (!ids.length) faults.push('marketGoods must define at least one basket.');
    for (let i = 0; i < ids.length; i++) {
      const good = goods[ids[i]];
      if (!good || typeof good !== 'object' || Array.isArray(good) || !good.name ||
          (good.order !== undefined &&
           (typeof good.order !== 'number' || !isFinite(good.order)))) {
        faults.push('market good ' + ids[i] + ' is malformed.');
      }
    }
    function validateBonuses(typeId, field, bonuses) {
      if (bonuses === undefined) return;
      if (!bonuses || typeof bonuses !== 'object' || Array.isArray(bonuses)) {
        faults.push('market endowment ' + typeId + ' ' + field + ' must be an object.');
        return;
      }
      for (const goodId in bonuses) {
        if (!goods[goodId]) faults.push('market endowment ' + typeId + ' names unknown good ' + goodId + '.');
        const bonus = bonuses[goodId];
        if (typeof bonus !== 'number' || !isFinite(bonus) || bonus < 0 || bonus > 2) {
          faults.push('market endowment ' + typeId + ' has an invalid bonus.');
        }
      }
    }
    for (const typeId in types) {
      const type = types[typeId];
      if (!type || typeof type !== 'object' || !type.name) {
        faults.push('market endowment ' + typeId + ' is malformed.');
        continue;
      }
      validateBonuses(typeId, 'production', type.production);
      validateBonuses(typeId, 'flow', type.flow);
    }
    function validateTags(where, tags) {
      if (!Array.isArray(tags)) {
        faults.push(where + ' must be an array.');
        return;
      }
      for (let i = 0; i < tags.length; i++) {
        if (!types[tags[i]]) faults.push(where + ' names unknown endowment ' + tags[i] + '.');
      }
    }
    let duchies = endowments.duchies || {};
    if (!duchies || typeof duchies !== 'object' || Array.isArray(duchies)) {
      faults.push('market endowment duchies must be an object.');
      duchies = {};
    }
    const knownDuchies = geography && geography.duchies || DATA.duchies;
    for (const id in duchies) {
      if (!knownDuchies || !knownDuchies[id]) faults.push('market endowments name unknown duchy ' + id + '.');
      validateTags('market duchy ' + id, duchies[id]);
    }
    let counties = endowments.counties || {};
    if (!counties || typeof counties !== 'object' || Array.isArray(counties)) {
      faults.push('market endowment counties must be an object.');
      counties = {};
    }
    const provinceTable = geography && geography.provinces || DATA.provinces || [];
    const countyIds = {};
    for (let i = 0; i < provinceTable.length; i++) countyIds[provinceTable[i].id] = 1;
    for (const id in counties) {
      if (!countyIds[id]) faults.push('market endowments name unknown county ' + id + '.');
      const row = counties[id];
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        faults.push('market county ' + id + ' must be an object.');
        continue;
      }
      if (row.add !== undefined) validateTags('market county ' + id + ' add', row.add);
      if (row.suppress !== undefined) validateTags('market county ' + id + ' suppress', row.suppress);
    }
    return faults;
  };

  FB.marketEndowments = function (state, pid) {
    const pr = FB.world && FB.world.byId && FB.world.byId[pid];
    const defs = DATA.marketEndowments || {};
    const tags = [];
    if (pr && defs.duchies && Array.isArray(defs.duchies[pr.duchy])) {
      for (let i = 0; i < defs.duchies[pr.duchy].length; i++) tags.push(defs.duchies[pr.duchy][i]);
    }
    const county = defs.counties && defs.counties[pid];
    const suppress = county && Array.isArray(county.suppress) ? county.suppress : [];
    for (let i = tags.length - 1; i >= 0; i--) {
      if (suppress.indexOf(tags[i]) >= 0) tags.splice(i, 1);
    }
    if (county && Array.isArray(county.add)) {
      for (let i = 0; i < county.add.length; i++) if (tags.indexOf(county.add[i]) < 0) tags.push(county.add[i]);
    }
    const production = {};
    const flow = {};
    const entries = [];
    const cap = balance('marketProductionBonusCap', 0.4);
    for (let i = 0; i < tags.length; i++) {
      const def = DATA.marketEndowmentTypes && DATA.marketEndowmentTypes[tags[i]];
      if (!def) continue;
      entries.push({ id:tags[i], name:def.name, icon:def.icon, desc:def.desc });
      for (const id in (def.production || {})) {
        production[id] = Math.min(cap, (production[id] || 0) + Number(def.production[id] || 0));
      }
      for (const id in (def.flow || {})) flow[id] = (flow[id] || 0) + Number(def.flow[id] || 0);
    }
    return { tags:tags, entries:entries, production:production, flow:flow };
  };

  function initialCounty(state, pid, ids) {
    const demand = baseDemand(state, pid, ids);
    const reserve = balance('marketReserveSeasons', 2);
    const stocks = [];
    for (let i = 0; i < ids.length; i++) stocks.push(stockNumber(demand[i] * reserve));
    return [stocks, emptyVector(ids, 1), emptyVector(ids, 0)];
  }

  FB.ensureMarket = function (state) {
    if (!state || !state.player || !FB.world || !FB.world.byId) return null;
    const ids = goodIds();
    if (ensuredState === state && ensuredMarket === state.market &&
        ensuredMarket && Array.isArray(ensuredMarket.goods) &&
        ensuredMarket.goods.join('|') === ids.join('|')) return ensuredMarket;
    const old = state.market && typeof state.market === 'object' ? state.market : {};
    const oldIds = Array.isArray(old.goods) ? old.goods.slice() : ids.slice();
    const counties = {};
    const pids = provinceIds();
    for (let p = 0; p < pids.length; p++) {
      const pid = pids[p];
      const existing = old.counties && old.counties[pid];
      const fresh = initialCounty(state, pid, ids);
      if (!Array.isArray(existing)) {
        counties[pid] = fresh;
        continue;
      }
      const stock = arrayMap(oldIds, existing[0], ids, function (i) { return fresh[0][i]; });
      const price = arrayMap(oldIds, existing[1], ids, function () { return 1; });
      const flow = arrayMap(oldIds, existing[2], ids, function () { return 0; });
      for (let i = 0; i < ids.length; i++) {
        stock[i] = stockNumber(stock[i]);
        price[i] = priceNumber(price[i]);
        flow[i] = Math.round((Number(flow[i]) || 0) * 10) / 10;
      }
      counties[pid] = [stock, price, flow];
    }
    const shocks = [];
    const source = Array.isArray(old.shocks) ? old.shocks : [];
    for (let i = 0; i < source.length; i++) {
      const shock = normalShock(source[i], i);
      if (shock) shocks.push(shock);
    }
    state.market = {
      goods:ids,
      lastTurn:old.lastTurn !== null && old.lastTurn !== undefined &&
        isFinite(Number(old.lastTurn)) ? Number(old.lastTurn) : null,
      counties:counties,
      shocks:shocks
    };
    ensuredState = state;
    ensuredMarket = state.market;
    return state.market;
  };

  FB.addMarketShock = function (state, shock) {
    const market = FB.ensureMarket(state);
    if (!market) return false;
    const item = normalShock(shock, market.shocks.length);
    if (!item) return false;
    for (let i = 0; i < market.shocks.length; i++) {
      if (market.shocks[i].id !== item.id) continue;
      market.shocks[i] = item;
      return item;
    }
    market.shocks.push(item);
    return item;
  };

  function householdCharacters(state) {
    if (FB.householdMembers) return FB.householdMembers(state);
    const out = [];
    if (!state.player || !state.chars) return out;
    const ids = {};
    const player = state.chars[state.player.charId];
    if (player && !player.dead) { out.push(player); ids[player.id] = 1; }
    const family = state.player.family || [];
    for (let i = 0; i < family.length; i++) {
      const c = state.chars[family[i]];
      if (c && !c.dead && !ids[c.id]) { out.push(c); ids[c.id] = 1; }
    }
    return out;
  }

  FB.marketHouseholdDemand = function (state) {
    const demand = { provisions:0, wares:0, materials:0, transport:0, luxuries:0 };
    if (FB.game && FB.game.observe) return demand;
    const home = state && state.player && state.player.provinceId;
    const people = householdCharacters(state);
    for (let i = 0; i < people.length; i++) {
      const c = people[i];
      if (FB.characterResidence && FB.characterResidence(state, c) !== home) continue;
      const age = FB.ageOf ? FB.ageOf(c, state.date.year) : 20;
      const factor = age < 6 ? 0.45 : age < 13 ? 0.7 : age < 16 ? 0.85 : age >= 60 ? 0.9 : 1;
      demand.provisions += 5.5 * factor;
      demand.wares += 0.9 * factor;
      demand.materials += 0.25 * factor;
    }
    const tier = Math.max(0, Number(state.player.tier) || 0);
    demand.provisions *= 1 + tier * 0.08;
    demand.wares *= 1 + tier * 0.14;
    demand.luxuries += people.length * tier * 0.12;
    const standards = state.player.householdStandards || {};
    for (const id in standards) {
      const level = Math.max(0, Math.floor(Number(standards[id]) || 0));
      if (!level) continue;
      if (FB.householdStandardActive && !FB.householdStandardActive(state, id)) continue;
      if (id === 'board') demand.provisions += level * 1.8;
      else if (id === 'wares') demand.wares += level * 1.4;
      else if (id === 'quarters') demand.materials += level * 1.1;
      else if (id === 'luxuries') demand.luxuries += level * 1.4;
      else if (id === 'transport') demand.transport += level * 1.5;
      else if (id.indexOf('outfit_') === 0) {
        demand.materials += level * 0.5;
        demand.wares += level * 0.4;
        if (id === 'outfit_merchant' || id === 'outfit_soldier') demand.transport += level * 0.35;
      }
    }
    const retainers = state.player.retainers || [];
    demand.provisions += retainers.length * 4;
    demand.wares += retainers.length * 0.65;
    demand.transport += retainers.length * 0.25;
    return demand;
  };

  FB.marketEnterpriseOutput = function (state, enterprise) {
    const out = { provisions:0, wares:0, materials:0, transport:0, luxuries:0 };
    if (!enterprise || !FB.enterpriseYield) return out;
    const amount = Math.max(0, Number(FB.enterpriseYield(state, enterprise)) || 0) *
      balance('marketStockScale', 12);
    if (!amount) return out;
    const worker = enterprise.workerId && state.chars[enterprise.workerId];
    const specialization = worker && FB.careerSpecialization ? FB.careerSpecialization(state, worker) : null;
    const career = FB.careerOf && worker ? FB.careerOf(state, worker) : null;
    const specId = specialization && (specialization.id || specialization.key) ||
      career && career.specialization;
    if (enterprise.type === 'field_strip' || enterprise.type === 'orchard_business' ||
        enterprise.type === 'fishing_boat_business') out.provisions = amount;
    else if (enterprise.type === 'press_business') {
      out.provisions = amount * 0.45;
      out.luxuries = amount * 0.55;
    } else if (enterprise.type === 'workshop_business') {
      if (specId === 'smith') out.materials = amount;
      else if (specId === 'cooper') out.transport = amount;
      else out.wares = amount;
    }
    return out;
  };

  FB.marketEnterpriseDistribution = function (state, enterprise) {
    const out = { local:0, overland:0, water:0 };
    if (!enterprise || !FB.enterpriseYield || FB.enterpriseYield(state,
        enterprise) <= 0) return out;
    if (enterprise.type === 'market_stall_business') out.local += 0.08;
    if (enterprise.type === 'trade_house_business') {
      out.local += 0.07;
      out.overland += 0.08;
      out.water += 0.08;
    }
    const worker = enterprise.workerId && state.chars[enterprise.workerId];
    const career = worker && FB.careerOf ? FB.careerOf(state, worker) : null;
    const specId = career && career.specialization;
    if (specId === 'broker') out.local += 0.08;
    if (specId === 'caravan_factor') out.overland += 0.12;
    if (specId === 'maritime_factor') out.water += 0.16;
    return out;
  };

  function merchantCapacity(state, pid, water) {
    let bonus = 0;
    const list = state.player && state.player.enterprises || [];
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.provinceId !== pid || !FB.enterpriseYield || FB.enterpriseYield(state, e) <= 0) continue;
      const distribution = FB.marketEnterpriseDistribution(state, e);
      bonus += distribution.local;
      bonus += water ? distribution.water : distribution.overland;
    }
    return bonus;
  }

  function shocksFor(state, pid, goodId) {
    const market = state.market;
    const out = { production:0, demand:0, flow:0, severe:false, records:[] };
    for (let i = 0; i < market.shocks.length; i++) {
      const shock = market.shocks[i];
      if (shock.provinceId && shock.provinceId !== pid) continue;
      if (shock.goodId && shock.goodId !== goodId) continue;
      out.production += shock.production || 0;
      out.demand += shock.demand || 0;
      out.flow += shock.flow || 0;
      out.severe = out.severe || shock.severe;
      out.records.push(shock);
    }
    return out;
  }

  function armyDemand(state, pid) {
    let men = 0;
    const armies = state.armies || [];
    for (let i = 0; i < armies.length; i++) {
      const army = armies[i];
      if ((army.provinceId || army.pid || army.at) !== pid) continue;
      men += Number(army.men || army.size || army.strength) || 0;
    }
    return men / 120;
  }

  function syncWarShocks(state) {
    const armies = state.armies || [];
    const affected = {};
    for (let i = 0; i < armies.length; i++) {
      const army = armies[i];
      const pid = army.provinceId || army.pid || army.at;
      if (!pid || !state.owner || !state.owner[pid]) continue;
      let realm = army.realm || army.realmId || army.owner;
      if (realm === 'player' && FB.playerRealmId) realm = FB.playerRealmId(state);
      const sovereign = realm && FB.topRealm ? FB.topRealm(state, realm) : realm;
      if (sovereign && sovereign !== state.owner[pid]) affected[pid] = 1;
    }
    for (const pid in affected) {
      FB.addMarketShock(state, {
        id:'war:' + pid, source:'war_disruption', provinceId:pid,
        production:-0.25, demand:0.12, flow:-0.35, severe:true, remaining:2
      });
    }
  }

  function countyProduction(state, pid, ids, demand, report) {
    const pr = FB.world.byId[pid];
    const base = countyBase(state, pid);
    const terrain = terrainOutput(pr.terrain);
    const endowment = FB.marketEndowments(state, pid);
    const owner = state.owner && state.owner[pid];
    const tech = FB.techBonus ? Math.max(0, Number(FB.techBonus(state, 'trade', owner)) || 0) : 0;
    const buildings = state.buildings && state.buildings[pid] || [];
    let building = 0;
    for (let i = 0; i < buildings.length; i++) {
      const entry = buildings[i];
      if (typeof entry === 'string') building += entry === 'walls' ? 0 : 0.012;
      else if (entry && !entry.ruined && entry.id !== 'walls') building += 0.012;
    }
    const out = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      let modifier = 1 + (endowment.production[id] || 0) + tech * 0.35 + building;
      if (FB.modBonus) {
        modifier += FB.modBonus(state, 'marketProduction', pid);
        if (id === 'provisions') {
          modifier += FB.modBonus(state, 'marketProvisions', pid);
        }
      }
      if (pr.coastal && id === 'provisions') modifier += 0.08;
      if (pr.coastal && id === 'transport') modifier += 0.05;
      const shock = shocksFor(state, pid, id);
      modifier *= Math.max(0, 1 + shock.production);
      const terrainAmount = terrain[id] === undefined ? 0.1 : terrain[id];
      out.push(Math.max(0, base.amount * terrainAmount *
        (0.86 + base.dev * 0.025) * modifier));
      report.severe[i] = shock.severe;
    }
    let playerOutput = 0;
    const enterprises = state.player && state.player.enterprises || [];
    for (let i = 0; i < enterprises.length; i++) {
      if (enterprises[i].provinceId !== pid) continue;
      const goods = FB.marketEnterpriseOutput(state, enterprises[i]);
      for (let g = 0; g < ids.length; g++) {
        const amount = Number(goods[ids[g]]) || 0;
        out[g] += amount;
        playerOutput += amount;
        report.enterprise[g] += amount;
      }
    }
    report.playerEnterprise = playerOutput;
    return out;
  }

  function stableEdgeList() {
    if (edgeWorld === FB.world) return stableEdges;
    edgeWorld = FB.world;
    stableEdges = [];
    const adj = FB.world && FB.world.adj || {};
    const ids = Object.keys(adj).sort();
    for (let i = 0; i < ids.length; i++) {
      const from = ids[i];
      const neighbors = Object.keys(adj[from] || {}).sort();
      for (let j = 0; j < neighbors.length; j++) {
        const to = neighbors[j];
        if (from < to && FB.world.byId[from] && FB.world.byId[to] &&
            !FB.world.byId[from].wasteland && !FB.world.byId[to].wasteland) {
          const crossing = FB.world.waterAdj && FB.world.waterAdj[from] &&
            FB.world.waterAdj[from][to];
          stableEdges.push({ from:from, to:to, kind:crossing || 'land' });
        }
      }
    }
    return stableEdges;
  }

  function edgeCapacity(state, edge, goodId) {
    const development = state.dev || {};
    const a = development[edge.from] || 1;
    const b = development[edge.to] || 1;
    let cap = balance('marketEdgeCapacity', 12) * (0.75 + Math.sqrt((a + b) / 2) * 0.2);
    const ea = FB.marketEndowments(state, edge.from);
    const eb = FB.marketEndowments(state, edge.to);
    cap *= 1 + ((ea.flow[goodId] || 0) + (eb.flow[goodId] || 0)) / 2;
    const water = edge.kind !== true && edge.kind !== 'land' && edge.kind !== 'border';
    cap *= 1 + merchantCapacity(state, edge.from, water) + merchantCapacity(state, edge.to, water);
    if (FB.techBonus) {
      cap *= 1 + (Math.max(0, FB.techBonus(state, 'trade',
        state.owner[edge.from])) + Math.max(0, FB.techBonus(state, 'trade',
        state.owner[edge.to]))) / 2;
    }
    if (FB.modBonus) {
      cap *= Math.max(0.05, 1 + (FB.modBonus(state, 'marketFlow', edge.from) +
        FB.modBonus(state, 'marketFlow', edge.to)) / 2);
    }
    const sa = shocksFor(state, edge.from, goodId);
    const sb = shocksFor(state, edge.to, goodId);
    const disruption = Math.min(0, sa.flow, sb.flow);
    const recovery = (Math.max(0, sa.flow) + Math.max(0, sb.flow)) / 2;
    cap *= Math.max(0.05, 1 + disruption + recovery);
    if (FB.marketCorridorCapacityBonus) cap *= 1 + FB.marketCorridorCapacityBonus(state, edge, goodId);
    return Math.max(0, cap);
  }

  function flowPass(state, ids, demands, reportByPid) {
    const market = state.market;
    const edges = stableEdgeList();
    for (let g = 0; g < ids.length; g++) {
      const proposals = [];
      const outgoing = {};
      for (let e = 0; e < edges.length; e++) {
        const edge = edges[e];
        const ai = market.counties[edge.from][0][g];
        const bi = market.counties[edge.to][0][g];
        const ar = Math.max(0.01, demands[edge.from][g] * balance('marketReserveSeasons', 2));
        const br = Math.max(0.01, demands[edge.to][g] * balance('marketReserveSeasons', 2));
        const aq = ai / ar;
        const bq = bi / br;
        if (Math.abs(aq - bq) < 0.02) continue;
        const from = aq > bq ? edge.from : edge.to;
        const to = aq > bq ? edge.to : edge.from;
        const stock = market.counties[from][0][g];
        const reserve = Math.max(0.01, demands[from][g] * balance('marketReserveSeasons', 2));
        const target = Math.max(0.01, demands[to][g] * balance('marketReserveSeasons', 2));
        const shortage = Math.max(0, target - market.counties[to][0][g]);
        const surplus = Math.max(0, stock - reserve);
        const amount = Math.min(surplus, shortage, edgeCapacity(state, edge, ids[g]));
        if (amount <= 0) continue;
        proposals.push({ from:from, to:to, amount:amount });
        outgoing[from] = (outgoing[from] || 0) + amount;
      }
      const scale = {};
      for (const pid in outgoing) {
        const reserve = Math.max(0.01, demands[pid][g] * balance('marketReserveSeasons', 2));
        const surplus = Math.max(0, market.counties[pid][0][g] - reserve);
        scale[pid] = outgoing[pid] > surplus && outgoing[pid] ? surplus / outgoing[pid] : 1;
      }
      const delta = {};
      for (let i = 0; i < proposals.length; i++) {
        const p = proposals[i];
        const amount = p.amount * scale[p.from];
        delta[p.from] = (delta[p.from] || 0) - amount;
        delta[p.to] = (delta[p.to] || 0) + amount;
        reportByPid[p.from].exports[g] += amount;
        reportByPid[p.to].imports[g] += amount;
      }
      for (const pid in delta) market.counties[pid][0][g] += delta[pid];
    }
  }

  FB.marketSeason = function (state) {
    const market = FB.ensureMarket(state);
    if (!market || market.lastTurn === state.turn) return false;
    syncWarShocks(state);
    const ids = market.goods;
    const pids = provinceIds();
    const demands = {};
    const production = {};
    const reportByPid = {};
    const household = FB.marketHouseholdDemand(state);
    const home = state.player.provinceId;
    for (let p = 0; p < pids.length; p++) {
      const pid = pids[p];
      const demand = baseDemand(state, pid, ids);
      const report = {
        production:emptyVector(ids, 0), demand:emptyVector(ids, 0),
        imports:emptyVector(ids, 0), exports:emptyVector(ids, 0),
        enterprise:emptyVector(ids, 0), household:emptyVector(ids, 0),
        severe:emptyVector(ids, 0), priorPrice:market.counties[pid][1].slice(),
        playerEnterprise:0
      };
      for (let g = 0; g < ids.length; g++) {
        const shock = shocksFor(state, pid, ids[g]);
        demand[g] *= Math.max(0.05, 1 + shock.demand);
        demand[g] += ids[g] === 'provisions' ? armyDemand(state, pid) : 0;
        if (pid === home) {
          const exact = Number(household[ids[g]]) || 0;
          demand[g] += exact;
          report.household[g] = exact;
        }
      }
      demands[pid] = demand;
      production[pid] = countyProduction(state, pid, ids, demand, report);
      report.production = production[pid].slice();
      report.demand = demand.slice();
      reportByPid[pid] = report;
      for (let g = 0; g < ids.length; g++) {
        market.counties[pid][0][g] = Math.max(0,
          market.counties[pid][0][g] + production[pid][g] - demand[g]);
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      flowPass(state, ids, demands, reportByPid);
    }
    for (let p = 0; p < pids.length; p++) {
      const pid = pids[p];
      const record = market.counties[pid];
      for (let g = 0; g < ids.length; g++) {
        const stock = Math.max(0, record[0][g]);
        const reserve = Math.max(0.01, demands[pid][g] * balance('marketReserveSeasons', 2));
        const ratio = stock / reserve;
        const crisis = ratio < 0.25 || reportByPid[pid].severe[g];
        const low = crisis ? balance('marketPriceCrisisMin', 0.5) : balance('marketPriceNormalMin', 0.75);
        const high = crisis ? balance('marketPriceCrisisMax', 2.5) : balance('marketPriceNormalMax', 1.5);
        const desired = Math.max(low, Math.min(high, 1 / Math.sqrt(Math.max(0.01, ratio))));
        const prior = Math.max(0.01, record[1][g] || 1);
        const smoothed = prior + (desired - prior) * 0.5;
        const move = balance('marketPriceSeasonMove', 0.2);
        record[0][g] = stockNumber(stock);
        record[1][g] = priceNumber(Math.max(prior * (1 - move), Math.min(prior * (1 + move), smoothed)));
        record[2][g] = Math.round((reportByPid[pid].imports[g] - reportByPid[pid].exports[g]) * 10) / 10;
      }
    }
    const remaining = [];
    for (let i = 0; i < market.shocks.length; i++) {
      market.shocks[i].remaining--;
      if (market.shocks[i].remaining > 0) remaining.push(market.shocks[i]);
    }
    market.shocks = remaining;
    market.lastTurn = state.turn;
    reportState = state;
    reports = reportByPid;
    return true;
  };

  FB.marketPrice = function (state, pid, goodId) {
    const market = FB.ensureMarket(state);
    if (!market || !market.counties[pid]) return 1;
    const at = market.goods.indexOf(goodId);
    return at < 0 ? 1 : priceNumber(market.counties[pid][1][at]);
  };

  FB.marketCostQuote = function (state, base, basket, pid, rounding) {
    const value = Math.max(0, Number(base) || 0);
    if (!basket || typeof basket !== 'object') return value;
    let total = 0;
    let weight = 0;
    for (const id in basket) {
      if (!DATA.marketGoods || !DATA.marketGoods[id]) continue;
      const part = Math.max(0, Number(basket[id]) || 0);
      if (!part) continue;
      total += part * FB.marketPrice(state, pid || state.player.provinceId, id);
      weight += part;
    }
    if (!weight) return value;
    const quote = value * total / weight;
    return rounding === 'up' || rounding === true ? Math.ceil(quote) : quote;
  };

  FB.marketCounty = function (state, pid) {
    const market = FB.ensureMarket(state);
    const record = market && market.counties[pid];
    if (!record) return null;
    const ids = market.goods;
    const report = reportState === state && reports[pid] ? reports[pid] : null;
    const goods = {};
    for (let i = 0; i < ids.length; i++) {
      goods[ids[i]] = {
        stock:record[0][i], price:record[1][i],
        trend:report ? record[1][i] - report.priorPrice[i] : 0,
        netFlow:record[2][i],
        production:report ? report.production[i] : null,
        demand:report ? report.demand[i] : null,
        imports:report ? report.imports[i] : null,
        exports:report ? report.exports[i] : null,
        household:report ? report.household[i] : null,
        enterprise:report ? report.enterprise[i] : null
      };
    }
    const shocks = [];
    for (let i = 0; i < market.shocks.length; i++) {
      if (!market.shocks[i].provinceId || market.shocks[i].provinceId === pid) shocks.push(market.shocks[i]);
    }
    return { pid:pid, goods:goods, endowments:FB.marketEndowments(state, pid), shocks:shocks };
  };

  FB.marketTakeStock = function (state, pid, goodId, quantity) {
    const market = FB.ensureMarket(state);
    const at = market && market.goods.indexOf(goodId);
    const record = market && market.counties[pid];
    const amount = Math.max(0, Number(quantity) || 0);
    if (at < 0 || !record || record[0][at] + 0.0001 < amount) return false;
    record[0][at] = stockNumber(record[0][at] - amount);
    return true;
  };

  FB.marketDeliverStock = function (state, pid, goodId, quantity) {
    const market = FB.ensureMarket(state);
    const at = market && market.goods.indexOf(goodId);
    const record = market && market.counties[pid];
    if (at < 0 || !record) return false;
    record[0][at] = stockNumber(record[0][at] + Math.max(0, Number(quantity) || 0));
    return true;
  };

  function routeWithOrigin(record) {
    const route = Array.isArray(record.route) ? record.route.slice() : [];
    if (record.originId && route[0] !== record.originId) route.unshift(record.originId);
    if (record.destinationId && route[route.length - 1] !== record.destinationId) route.push(record.destinationId);
    return route;
  }

  function sameRoute(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  FB.marketCorridorCapacityBonus = function (state, edge, goodId) {
    let bonus = 0;
    if (!FB.guildMonopolyActive) return bonus;
    const slots = ['incoming','outgoing'];
    for (let i = 0; i < slots.length; i++) {
      const record = FB.guildMonopolyActive(state, slots[i]);
      if (!record || record.mode !== 'corridor' || record.goodId !== goodId) continue;
      const route = routeWithOrigin(record);
      for (let r = 1; r < route.length; r++) {
        if ((route[r - 1] === edge.from && route[r] === edge.to) ||
            (route[r - 1] === edge.to && route[r] === edge.from)) {
          bonus += balance('marketCorridorCapacityBonus', 0.25);
          break;
        }
      }
    }
    return bonus;
  };

  FB.marketCharterReturnBonus = function (state, goodId, originId, destinationId, route) {
    if (!FB.guildMonopolyActive) return 0;
    const full = routeWithOrigin({ originId:originId, destinationId:destinationId, route:route });
    let bonus = 0;
    const slots = ['incoming','outgoing'];
    for (let i = 0; i < slots.length; i++) {
      const record = FB.guildMonopolyActive(state, slots[i]);
      if (!record || record.mode !== 'corridor' || record.goodId !== goodId) continue;
      if (record.originId === originId && record.destinationId === destinationId &&
          sameRoute(routeWithOrigin(record), full)) bonus += balance('marketCorridorReturnBonus', 0.1);
    }
    return bonus;
  };

  FB.marketRouteLines = function (state) {
    const lines = [];
    const ventures = FB.activeTradeVentures ? FB.activeTradeVentures(state) : [];
    for (let i = 0; i < ventures.length; i++) {
      const venture = ventures[i];
      if (venture && venture.goodId && Array.isArray(venture.route)) {
        lines.push({
          kind:'venture', goodId:venture.goodId, route:routeWithOrigin(venture)
        });
      }
    }
    if (FB.guildMonopolyActive) {
      const slots = ['incoming','outgoing'];
      for (let i = 0; i < slots.length; i++) {
        const record = FB.guildMonopolyActive(state, slots[i]);
        if (record && record.mode === 'corridor' && Array.isArray(record.route)) {
          lines.push({ kind:'charter', goodId:record.goodId, route:routeWithOrigin(record) });
        }
      }
    }
    return lines.slice(0, 4);
  };

  function marketPriceBand(price) {
    return price >= 1.08 ? 'dear' : price <= 0.95 ? 'cheap' : 'steady';
  }

  function marketPriceSymbol(price) {
    const band = marketPriceBand(price);
    return band === 'dear' ? '▲' : band === 'cheap' ? '▼' : '●';
  }

  function marketPriceColor(price) {
    const band = marketPriceBand(price);
    return band === 'dear' ? '#ff9676' :
      band === 'cheap' ? '#6ee5d3' : '#f0d170';
  }

  function marketOverlayColor(price) {
    if (price >= 1.25) return [179,49,56,194];
    if (price >= 1.08) return [205,92,60,178];
    if (price <= 0.82) return [32,105,159,194];
    if (price <= 0.95) return [37,139,143,178];
    return [171,139,54,158];
  }

  function marketOverlay(goodId) {
    const state = FB.state;
    const market = state && FB.ensureMarket(state);
    if (!market || market.goods.indexOf(goodId) < 0) return null;
    const key = String(market.lastTurn) + ':' + goodId + ':' +
      FB.world.W + 'x' + FB.world.H;
    if (overlayWorld === FB.world && overlayState === state &&
        overlayCache.key === key &&
        overlayCache.canvas) return overlayCache.canvas;
    const canvas = document.createElement('canvas');
    canvas.width = FB.world.W;
    canvas.height = FB.world.H;
    const context = canvas.getContext('2d');
    const image = context.createImageData(canvas.width, canvas.height);
    const data = image.data;
    const at = market.goods.indexOf(goodId);
    const countyColors = [];
    for (let i = 0; i < FB.world.provs.length; i++) {
      const pr = FB.world.provs[i];
      if (pr.wasteland || !market.counties[pr.id]) {
        countyColors.push([0,0,0,0]);
        continue;
      }
      const price = market.counties[pr.id][1][at];
      countyColors.push(marketOverlayColor(price));
    }
    for (let i = 0; i < FB.world.grid.length; i++) {
      const provinceIndex = FB.world.grid[i];
      if (!provinceIndex) continue;
      const color = countyColors[provinceIndex - 1];
      const offset = i * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
    context.putImageData(image, 0, 0);
    overlayWorld = FB.world;
    overlayState = state;
    overlayCache = { key:key, canvas:canvas };
    return canvas;
  }

  FB.renderMarketOverlay = function (ctx, goodId, sx, sy, zoom) {
    const overlay = marketOverlay(goodId);
    if (!overlay) return;
    ctx.save();
    ctx.imageSmoothingEnabled = zoom < 2;
    ctx.scale(zoom, zoom);
    ctx.translate(-sx, -sy);
    ctx.drawImage(overlay, 0, 0);
    ctx.restore();
  };

  FB.renderMarketRoutes = function (ctx, goodId, toScreen, zoom, dpr) {
    const state = FB.state;
    if (!state) return;
    const lines = FB.marketRouteLines(state);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.goodId !== goodId || line.route.length < 2) continue;
      ctx.beginPath();
      for (let r = 0; r < line.route.length; r++) {
        const pr = FB.world.byId[line.route[r]];
        if (!pr) continue;
        const point = toScreen(pr.cx, pr.cy);
        if (r === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      }
      ctx.setLineDash(line.kind === 'charter'
        ? [8 * dpr, 4 * dpr, 2 * dpr, 4 * dpr]
        : [5 * dpr, 5 * dpr]);
      ctx.strokeStyle = line.kind === 'charter' ? '#ffe28a' : '#f5f0e4';
      ctx.lineWidth = (line.kind === 'charter' ? 3 : 2) * dpr;
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (zoom >= 1.1) {
      const market = FB.ensureMarket(state);
      const at = market.goods.indexOf(goodId);
      if (at < 0) { ctx.restore(); return; }
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(14 * dpr) + 'px Georgia';
      for (let i = 0; i < FB.world.provs.length; i++) {
        const pr = FB.world.provs[i];
        if (pr.wasteland || !market.counties[pr.id]) continue;
        const point = toScreen(pr.cx, pr.cy);
        const price = market.counties[pr.id][1][at];
        const symbol = marketPriceSymbol(price);
        ctx.lineWidth = 4 * dpr;
        ctx.strokeStyle = 'rgba(8,9,10,.92)';
        ctx.fillStyle = marketPriceColor(price);
        ctx.strokeText(symbol, point[0], point[1] + 15 * dpr);
        ctx.fillText(symbol, point[0], point[1] + 15 * dpr);
      }
    }
    ctx.restore();
  };

  FB.marketMortalityPressure = function (state) {
    const hardship = state && state.player && state.player.marketHardship;
    const seasons = Math.max(0, Math.floor(Number(hardship && hardship.provisionSeasons) || 0));
    return Math.min(balance('marketHardshipMortalityCap', 0.02),
      seasons * balance('marketHardshipMortalityStep', 0.005));
  };

  FB.marketSettleHouseholdNecessities = function (state) {
    if (!state || !state.player || !FB.householdUpkeepParts) return 0;
    const p = state.player;
    const parts = FB.householdUpkeepParts(state);
    const due = Math.max(0, Number(parts.total) || 0);
    const paid = Math.min(Math.max(0, Number(p.gold) || 0), due);
    p.gold = Math.max(0, p.gold - paid);
    const funded = due <= 0 || paid + 0.0001 >= due;
    const provisionsDue = Math.max(0, Number(parts.provisionsDue) || 0);
    const provisionsFunded = provisionsDue <= 0 ||
      paid + 0.0001 >= provisionsDue;
    const prior = p.marketHardship && typeof p.marketHardship === 'object' ?
      p.marketHardship : { provisionSeasons:0, unpaidShare:0, active:false };
    if (funded) {
      if (prior.active) {
        FB.news(state, FB.msg('news.market.hardship_recovered',
          '🍞 The household table is fully supplied again; the season of want has ended.', {}));
      }
      p.marketHardship = {
        provisionSeasons:0, unpaidShare:0, active:false, lastTurn:state.turn
      };
      return paid;
    }
    const seasons = provisionsFunded ? 0 :
      Math.max(0, Math.floor(Number(prior.provisionSeasons) || 0)) + 1;
    const share = due ? Math.max(0, Math.min(1, 1 - paid / due)) : 0;
    p.marketHardship = {
      provisionSeasons:seasons, unpaidShare:share,
      active:true, lastTurn:state.turn
    };
    if (!prior.active) {
      FB.news(state, FB.msg('news.market.hardship_started',
        '🥣 The household cannot fully fund its necessities; rationing and makeshift economies begin.', {}));
      if (FB.ui && FB.ui.maybeTip) {
        FB.ui.maybeTip('hardship',
          '💡 Coin runs short. A steadier livelihood (Deeds tab) or a loan from the Coin & credit ledger can bridge a lean season.',
          '#sidetabs .tab[data-tab="actions"]');
      }
    } else if (!provisionsFunded && (seasons === 2 || seasons === 4)) {
      FB.news(state, FB.msg('news.market.hardship_escalated',
        '⚠ Household scarcity deepens after {seasons} short seasons; resident health is now at greater risk.', {
          seasons:seasons
        }));
    }
    return paid;
  };
})();
