/* =========================================================================
   Fallowborn — county population and lightweight demographics simulation
   =========================================================================
   Zero-RNG annual demographic pass and on-demand settlement projections.
   ========================================================================= */
window.FB = window.FB || {};

(function () {
  'use strict';

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function balance(key, fallback) {
    var raw = FBDATA.balance && FBDATA.balance[key];
    var value = Number(raw);
    return isFinite(value) ? value : fallback;
  }

  function populationFloor() {
    return Math.max(1, Math.round(balance('populationFloor', 1000)));
  }

  function devFallbackTable() {
    var table = FBDATA.balance && FBDATA.balance.populationByDevelopment;
    if (Array.isArray(table) && table.length >= 10) return table;
    return [6000, 10000, 16000, 24000, 35000, 49000, 67000, 90000, 120000, 155000];
  }

  function terrainFactor(terrain) {
    var factors = FBDATA.balance && FBDATA.balance.populationTerrainFactors;
    if (factors && factors[terrain] !== undefined) {
      var val = Number(factors[terrain]);
      if (isFinite(val) && val > 0) return val;
    }
    return 1.00;
  }

  function provinceDef(pid) {
    return (FB.world && FB.world.byId && FB.world.byId[pid]) || null;
  }

  function provinceList() {
    return (FB.world && FB.world.provs) || (FBDATA.provinces) || [];
  }

  function provinceOwner(state, pid) {
    if (state && state.owner && state.owner[pid]) return state.owner[pid];
    var pr = provinceDef(pid);
    return (pr && pr.realm) || null;
  }

  /* Baseline opening population from authored province0 or deterministic fallback */
  FB.countyPopulationBaseline = function (state, pid) {
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    if (pr.population0 !== undefined && isFinite(Number(pr.population0)) && Number(pr.population0) > 0) {
      return Math.max(populationFloor(), Math.round(Number(pr.population0)));
    }
    var dev0 = pr.dev0 || pr.dev || 1;
    var table = devFallbackTable();
    var baseByDev = table[Math.max(0, Math.min(table.length - 1, dev0 - 1))] || 6000;
    var factor = terrainFactor(pr.terrain);
    var calculated = Math.round((baseByDev * factor) / 100) * 100;
    return Math.max(populationFloor(), calculated);
  };

  /* Baseline capacity before building and tech bonuses */
  function countyBaseCapacity(state, pid) {
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    var pop0 = FB.countyPopulationBaseline(state, pid);
    if (pr.populationCapacity0 !== undefined && isFinite(Number(pr.populationCapacity0)) && Number(pr.populationCapacity0) > 0) {
      return Math.max(pop0, Math.round(Number(pr.populationCapacity0)));
    }
    var ratio = balance('populationCapacityBaselineRatio', 0.85);
    if (ratio <= 0) ratio = 0.85;
    var calculated = Math.round((pop0 / ratio) / 100) * 100;
    return Math.max(pop0, calculated);
  }

  FB.countyBuildingCapacityBonus = function (state, pid) {
    var built = FB.builtIn ? FB.builtIn(state, pid) : [];
    var bonus = 0;
    for (var i = 0; i < built.length; i++) {
      var b = built[i];
      if (!b || b.ruined) continue;
      var def = FBDATA.buildings && FBDATA.buildings[b.id];
      if (def && def.populationCapacity) {
        bonus += Number(def.populationCapacity) || 0;
      }
    }
    var cap = balance('populationMaxBuildingCapacityBonus', 0.40);
    return FB.clamp(bonus, 0, cap);
  };

  FB.countyBuildingCrisisProtection = function (state, pid) {
    var built = FB.builtIn ? FB.builtIn(state, pid) : [];
    var bonus = 0;
    for (var i = 0; i < built.length; i++) {
      var b = built[i];
      if (!b || b.ruined) continue;
      var def = FBDATA.buildings && FBDATA.buildings[b.id];
      if (def && def.populationCrisisProtection) {
        bonus += Number(def.populationCrisisProtection) || 0;
      }
    }
    if (FB.enterpriseUpgradeEffect) {
      bonus += FB.enterpriseUpgradeEffect(state, 'populationCrisisProtection', pid);
    }
    return FB.clamp(bonus, 0, 0.20);
  };

  FB.countyBuildingFamineProtection = function (state, pid) {
    var built = FB.builtIn ? FB.builtIn(state, pid) : [];
    var bonus = 0;
    for (var i = 0; i < built.length; i++) {
      var b = built[i];
      if (!b || b.ruined) continue;
      var def = FBDATA.buildings && FBDATA.buildings[b.id];
      if (def && def.populationFamineProtection) {
        bonus += Number(def.populationFamineProtection) || 0;
      }
    }
    if (FB.enterpriseUpgradeEffect) {
      bonus += FB.enterpriseUpgradeEffect(state, 'famineProtection', pid);
    }
    return FB.clamp(bonus, 0, balance('populationMaxFamineProtection', 0.60));
  };

  FB.countyBuildingAttraction = function (state, pid) {
    var built = FB.builtIn ? FB.builtIn(state, pid) : [];
    var attraction = 0;
    for (var i = 0; i < built.length; i++) {
      var b = built[i];
      if (!b || b.ruined) continue;
      var def = FBDATA.buildings && FBDATA.buildings[b.id];
      if (def && def.migrationAttraction) {
        attraction += Number(def.migrationAttraction) || 0;
      }
    }
    if (FB.enterpriseUpgradeEffect) {
      attraction += FB.enterpriseUpgradeEffect(state, 'migrationAttraction', pid);
    }
    return Math.max(0, attraction);
  };

  FB.countyFortSiegeProtection = function (state, pid) {
    var fort = FB.fortAt ? FB.fortAt(state, pid) : null;
    var fortLevel = fort && !fort.ruined ? (Number(fort.level) || 0) : 0;
    var schedule = FBDATA.balance && FBDATA.balance.populationSiegeProtectionByFortTier;
    if (Array.isArray(schedule) && schedule[fortLevel] !== undefined) {
      return Number(schedule[fortLevel]) || 0;
    }
    var fallbackSchedule = [0, 0.10, 0.20, 0.35, 0.50];
    return fallbackSchedule[fortLevel] || 0;
  };

  FB.countyPopulationCapacity = function (state, pid) {
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    var baseCap = countyBaseCapacity(state, pid);
    var bldgBonus = FB.countyBuildingCapacityBonus(state, pid);
    var enterpriseBonus = FB.enterpriseUpgradeEffect
      ? FB.enterpriseUpgradeEffect(state, 'populationCapacity', pid) : 0;
    var owner = provinceOwner(state, pid);
    var techBonus = FB.techBonus ? FB.techBonus(state, 'populationCapacity', owner) : 0;
    var maxTech = balance('populationMaxTechCapacityBonus', 0.35);
    techBonus = FB.clamp(techBonus, 0, maxTech);
    var mult = 1 + bldgBonus + enterpriseBonus + techBonus;
    return Math.max(populationFloor(), Math.round(baseCap * mult));
  };

  /* Helper to check if county is currently occupied or under active siege */
  function countyOccupiedOrBesieged(state, pid) {
    if (!state) return false;
    if (state.occupations && state.occupations[pid] &&
        (state.occupations[pid].occupied || state.occupations[pid].progress > 0)) {
      return true;
    }
    if (state.greatHolyWar && state.greatHolyWar.occupations &&
        state.greatHolyWar.occupations[pid] &&
        (state.greatHolyWar.occupations[pid].occupied || state.greatHolyWar.occupations[pid].progress > 0)) {
      return true;
    }
    if (state.player && state.player.war &&
        state.player.war.enemyTarget === pid && (state.player.war.enemySiege || 0) > 0) {
      return true;
    }
    if (state.wars) {
      for (var wid in state.wars) {
        var war = state.wars[wid];
        if (war && war.fortSieges && war.fortSieges[pid]) return true;
      }
    }
    return false;
  }

  function realmIsAtWar(state, rid) {
    if (!state || !rid) return false;
    if (rid === 'player' || (FB.playerRealmId && FB.playerRealmId(state) === rid)) {
      return !!(state.player && state.player.war);
    }
    if (state.wars) {
      for (var wid in state.wars) {
        var w = state.wars[wid];
        if (w && (w.attacker === rid || w.defender === rid)) return true;
      }
    }
    if (state.greatHolyWar && state.greatHolyWar.active) {
      if (state.greatHolyWar.attackerRealm === rid || state.greatHolyWar.defenderRealm === rid) return true;
    }
    return false;
  }

  function countySevereMarketShock(state, pid) {
    if (!state || !state.market || !Array.isArray(state.market.shocks)) return false;
    var shocks = state.market.shocks;
    for (var i = 0; i < shocks.length; i++) {
      var s = shocks[i];
      if (!s) continue;
      var shockPid = s.provinceId || s.pid;
      if (shockPid === pid && s.severe) {
        var rem = s.remaining === undefined ? s.seasons : s.remaining;
        if (rem > 0) return true;
      }
    }
    return false;
  }

  FB.countyMigrationAttraction = function (state, pid) {
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    var pop = FB.countyPopulation(state, pid);
    var cap = FB.countyPopulationCapacity(state, pid);
    var bldgAttraction = FB.countyBuildingAttraction(state, pid);
    var owner = provinceOwner(state, pid);
    var techAttraction = FB.techBonus ? FB.techBonus(state, 'migrationAttraction', owner) : 0;
    var maxTechAttraction = balance('populationMaxTechAttraction', 3);
    techAttraction = FB.clamp(techAttraction, 0, maxTechAttraction);

    var attraction = bldgAttraction + techAttraction;
    if (pop < 0.80 * cap) {
      attraction += 2;
    } else if (pop < 0.95 * cap) {
      attraction += 1;
    }
    if (countyOccupiedOrBesieged(state, pid)) attraction -= 3;
    if (realmIsAtWar(state, owner)) attraction -= 2;
    if (countySevereMarketShock(state, pid)) attraction -= 2;
    /* Royal settlement policy (js/institutions.js) shifts the draw of the
       player's own counties; the conserved migration itself is untouched. */
    if (owner === 'player' && FB.realmPolicySettlementAttraction) {
      attraction += FB.realmPolicySettlementAttraction(state);
    }

    return attraction;
  };

  /* Transitional square-root population factor: clamp(sqrt(P / P0), 0.50, 1.50) */
  FB.countyPopulationFactor = function (state, pid) {
    var pop = FB.countyPopulation(state, pid);
    var base = FB.countyPopulationBaseline(state, pid);
    if (!base || base <= 0) return 1.0;
    var raw = Math.sqrt(pop / base);
    var min = balance('populationFactorMin', 0.50);
    var max = balance('populationFactorMax', 1.50);
    return FB.clamp(raw, min, max);
  };

  /* Ensure state.population exists and all inhabited counties are recorded */
  FB.ensurePopulationState = function (state) {
    if (!state) return null;
    var floor = populationFloor();
    var table = devFallbackTable();
    var provs = provinceList();
    var currentYear = (state.date && isFinite(state.date.year) && state.date.year) ||
      (state.start && isFinite(state.start.year) && state.start.year) || 867;

    if (!state.population || typeof state.population !== 'object' || !state.population.counties) {
      /* Lazy migration for older saves or fresh game initialization */
      var counties = {};
      for (var i = 0; i < provs.length; i++) {
        var pr = provs[i];
        if (!pr || pr.wasteland) continue;
        var pid = pr.id;
        var pop0 = FB.countyPopulationBaseline(state, pid);
        var curDev = (state.dev && state.dev[pid]) || pr.dev0 || pr.dev || 1;
        var bmDev = pr.dev0 || pr.dev || 1;
        var baseCur = table[Math.max(0, Math.min(table.length - 1, curDev - 1))] || 6000;
        var baseBm = table[Math.max(0, Math.min(table.length - 1, bmDev - 1))] || 6000;
        var devRatio = baseBm > 0 ? (baseCur / baseBm) : 1;
        var scaled = pop0 * devRatio;

        var bldgCapBonus = FB.countyBuildingCapacityBonus(state, pid);
        var halfwayMult = Math.sqrt(1 + bldgCapBonus);
        var migrated = scaled * halfwayMult;

        var cap = FB.countyPopulationCapacity(state, pid);
        var clamped = Math.max(Math.round(cap * 0.50), Math.min(cap, Math.round(migrated)));
        var finalCount = Math.max(floor, Math.round(clamped / 100) * 100);

        counties[pid] = {
          count: finalCount,
          natural: 0,
          migration: 0,
          losses: 0
        };
      }
      state.population = {
        schema: 1,
        lastYear: currentYear,
        counties: counties
      };
      return state.population;
    }

    /* Verify all inhabited provinces are present in an existing population record */
    var existingCounties = state.population.counties;
    for (var j = 0; j < provs.length; j++) {
      var p = provs[j];
      if (!p || p.wasteland) continue;
      if (!existingCounties[p.id] || typeof existingCounties[p.id] !== 'object') {
        var fallbackPop = FB.countyPopulationBaseline(state, p.id);
        existingCounties[p.id] = {
          count: fallbackPop,
          natural: 0,
          migration: 0,
          losses: 0
        };
      } else {
        var rec = existingCounties[p.id];
        rec.count = Math.max(floor, Math.round(Number(rec.count) || floor));
        rec.natural = Math.round(Number(rec.natural) || 0);
        rec.migration = Math.round(Number(rec.migration) || 0);
        rec.losses = Math.round(Number(rec.losses) || 0);
      }
    }
    return state.population;
  };

  FB.countyPopulation = function (state, pid) {
    if (!state) return 0;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    FB.ensurePopulationState(state);
    var rec = state.population && state.population.counties && state.population.counties[pid];
    if (rec && isFinite(rec.count)) return Math.max(populationFloor(), rec.count);
    return FB.countyPopulationBaseline(state, pid);
  };

  /* Public population mutation helper */
  FB.changeCountyPopulation = function (state, pid, amount, cause) {
    if (!state) return 0;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    FB.ensurePopulationState(state);
    var delta = Math.round(Number(amount));
    if (!isFinite(delta) || delta === 0) return 0;

    var rec = state.population.counties[pid];
    if (!rec) return 0;
    var floor = populationFloor();
    var before = rec.count;
    var after = Math.max(floor, before + delta);
    var applied = after - before;
    if (applied === 0) return 0;

    rec.count = after;
    if (applied < 0) {
      rec.losses = (rec.losses || 0) + applied;
      var lossRatio = Math.abs(applied) / Math.max(1, before);
      var threshold = balance('populationChronicleLossThreshold', 0.02);
      if (lossRatio >= threshold) {
        var isPlayerHeld = (FB.playerDirectlyHoldsCounty && FB.playerDirectlyHoldsCounty(state, pid)) ||
          (state.player && (state.player.provinceId === pid || (state.player.provs && state.player.provs.indexOf(pid) >= 0)));
        if (isPlayerHeld && FB.news) {
          var pct = Math.round(lossRatio * 1000) / 10;
          FB.news(state, FB.msg('news.population.severe_losses',
            '🏚 Heavy civilian losses in {province} (−{losses} people, {percent}%).', {
              province: pr.name || pid,
              losses: Math.abs(applied),
              percent: pct
            }));
        }
      }
    }
    return applied;
  };

  FB.changeCountyPopulationRate = function (state, pid, rate, cause) {
    if (!state) return 0;
    var r = Number(rate);
    if (!isFinite(r) || r === 0) return 0;
    var current = FB.countyPopulation(state, pid);
    var delta = Math.round(current * r);
    return FB.changeCountyPopulation(state, pid, delta, cause);
  };

  FB.damageCountyPopulation = function (state, pid, cause) {
    if (!state) return 0;
    var fortProtection = FB.countyFortSiegeProtection(state, pid);
    var baseRate = balance('populationHostileCaptureLossRate', 0.02);
    var actualRate = -baseRate * (1 - fortProtection);
    return FB.changeCountyPopulationRate(state, pid, actualRate, cause || 'capture');
  };

  /* Annual population tick */
  FB.populationYear = function (state) {
    if (!state) return;
    FB.ensurePopulationState(state);
    var currentYear = (state.date && isFinite(state.date.year) && state.date.year) ||
      (state.start && isFinite(state.start.year) && state.start.year) || 867;

    if (state.population.lastYear === currentYear) return;

    var provs = provinceList();
    var floor = populationFloor();
    var initialP = {};
    var naturalDeltas = {};
    var attractions = {};
    var rGrowth = balance('populationGrowthRate', 0.020);

    /* Stage 1: Natural growth & capacity */
    for (var i = 0; i < provs.length; i++) {
      var pr = provs[i];
      if (!pr || pr.wasteland) continue;
      var pid = pr.id;
      var P = FB.countyPopulation(state, pid);
      initialP[pid] = P;
      var K = FB.countyPopulationCapacity(state, pid);
      var pressure = FB.clamp(1 - (P / Math.max(1, K)), -0.50, 1.00);
      var natural = Math.round(P * rGrowth * pressure);
      natural = FB.clamp(natural, -Math.round(P * 0.01), Math.round(P * 0.02));
      naturalDeltas[pid] = natural;
      attractions[pid] = FB.countyMigrationAttraction(state, pid);
    }

    /* Stage 2: Conserved Adjacency Migration */
    var migRate = balance('populationMigrationRate', 0.002);
    var maxOutflowRate = balance('populationMigrationMaxOutflow', 0.01);
    var edgeFlows = [];
    var outflowProposed = {};

    for (var j = 0; j < provs.length; j++) {
      var u = provs[j];
      if (!u || u.wasteland) continue;
      var uId = u.id;
      var adj = (FB.world && FB.world.adj && FB.world.adj[uId]) || {};
      for (var vId in adj) {
        if (!own(adj, vId)) continue;
        if (uId >= vId) continue; // process each undirected edge once
        var v = provinceDef(vId);
        if (!v || v.wasteland) continue;

        // Block hostile or besieged borders
        var uOwner = provinceOwner(state, uId);
        var vOwner = provinceOwner(state, vId);
        var hostile = false;
        if (uOwner && vOwner && uOwner !== vOwner && FB.realmsAreHostile && FB.realmsAreHostile(state, uOwner, vOwner)) {
          hostile = true;
        }
        if (countyOccupiedOrBesieged(state, uId) || countyOccupiedOrBesieged(state, vId)) {
          hostile = true;
        }
        if (hostile) continue;

        var diff = (attractions[vId] || 0) - (attractions[uId] || 0);
        if (Math.abs(diff) < 2) continue;

        var sourceId = diff > 0 ? uId : vId;
        var targetId = diff > 0 ? vId : uId;
        var mag = Math.abs(diff);
        var flow = Math.round(initialP[sourceId] * migRate * Math.min(3, mag - 1));
        if (flow > 0) {
          edgeFlows.push({ from: sourceId, to: targetId, flow: flow });
          outflowProposed[sourceId] = (outflowProposed[sourceId] || 0) + flow;
        }
      }
    }

    // Scale down any county exceeding its max allowed outflow
    var migrationDeltas = {};
    for (var k = 0; k < provs.length; k++) {
      if (!provs[k] || provs[k].wasteland) continue;
      migrationDeltas[provs[k].id] = 0;
    }

    for (var source in outflowProposed) {
      if (!own(outflowProposed, source)) continue;
      var proposed = outflowProposed[source];
      var maxAllowed = Math.min(
        Math.round(initialP[source] * maxOutflowRate),
        Math.max(0, initialP[source] - floor)
      );
      if (proposed > maxAllowed && proposed > 0) {
        var mult = maxAllowed / proposed;
        var allocated = 0;
        var outgoing = [];
        for (var e = 0; e < edgeFlows.length; e++) {
          if (edgeFlows[e].from === source) outgoing.push(edgeFlows[e]);
        }
        for (var o = 0; o < outgoing.length; o++) {
          var scaledFlow = (o === outgoing.length - 1)
            ? (maxAllowed - allocated)
            : Math.round(outgoing[o].flow * mult);
          scaledFlow = Math.max(0, Math.min(outgoing[o].flow, scaledFlow));
          outgoing[o].flow = scaledFlow;
          allocated += scaledFlow;
        }
      }
    }

    for (var ef = 0; ef < edgeFlows.length; ef++) {
      var edge = edgeFlows[ef];
      migrationDeltas[edge.from] -= edge.flow;
      migrationDeltas[edge.to] += edge.flow;
    }

    /* Stage 3: Apply & Record */
    for (var m = 0; m < provs.length; m++) {
      var pDef = provs[m];
      if (!pDef || pDef.wasteland) continue;
      var cId = pDef.id;
      var rec = state.population.counties[cId];
      if (!rec) continue;
      var curPop = initialP[cId];
      var natDelta = naturalDeltas[cId] || 0;
      var migDelta = migrationDeltas[cId] || 0;
      var targetPop = Math.max(floor, curPop + natDelta + migDelta);

      rec.count = targetPop;
      rec.natural = natDelta;
      rec.migration = migDelta;
      rec.losses = 0;
    }

    state.population.lastYear = currentYear;
  };

  /* Display-only on-demand settlement allocation */
  FB.settlementPopulations = function (state, pid) {
    var total = FB.countyPopulation(state, pid);
    var setts = FB.settlementsOf ? FB.settlementsOf(state, pid) : [];
    if (!setts.length) return [total];

    var built = FB.builtIn ? FB.builtIn(state, pid) : [];
    var weights = [];
    var sumWeights = 0;

    for (var i = 0; i < setts.length; i++) {
      var st = setts[i];
      var w = st.kind === 'city' ? 7 : (st.kind === 'town' ? 3 : 1);
      for (var b = 0; b < built.length; b++) {
        var entry = built[b];
        if (entry && entry.s === i && !entry.ruined) {
          if (entry.id === 'mill' || entry.id === 'bridge' ||
              entry.id === 'market' || entry.id === 'harbor') {
            w += 1;
          }
        }
      }
      weights.push(w);
      sumWeights += w;
    }

    var allocations = [];
    var allocatedSoFar = 0;
    for (var j = 0; j < weights.length; j++) {
      if (j === weights.length - 1) {
        allocations.push(total - allocatedSoFar);
      } else {
        var alloc = Math.round(total * (weights[j] / sumWeights));
        allocations.push(alloc);
        allocatedSoFar += alloc;
      }
    }
    return allocations;
  };

  FB.settlementPopulation = function (state, pid, settlementIndex) {
    var alloc = FB.settlementPopulations(state, pid);
    var idx = settlementIndex | 0;
    return alloc[idx] !== undefined ? alloc[idx] : 0;
  };

})();
