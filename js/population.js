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

  function countyBuildingBonus(state, pid, key) {
    if (FB.buildingBonusIn) return FB.buildingBonusIn(state, pid, key);
    var built = FB.builtIn ? FB.builtIn(state, pid) : [];
    var bonus = 0;
    for (var i = 0; i < built.length; i++) {
      var b = built[i];
      if (!b || b.ruined) continue;
      var def = FBDATA.buildings && FBDATA.buildings[b.id];
      if (def && def[key]) bonus += Number(def[key]) || 0;
    }
    return bonus;
  }

  FB.countyBuildingCapacityBonus = function (state, pid) {
    var bonus = countyBuildingBonus(state, pid, 'populationCapacity');
    var cap = balance('populationMaxBuildingCapacityBonus', 0.40);
    return FB.clamp(bonus, 0, cap);
  };

  FB.countyBuildingCrisisProtection = function (state, pid) {
    var bonus = countyBuildingBonus(state, pid, 'populationCrisisProtection');
    if (FB.enterpriseUpgradeEffect) {
      bonus += FB.enterpriseUpgradeEffect(state, 'populationCrisisProtection', pid);
    }
    return FB.clamp(bonus, 0, 0.20);
  };

  FB.countyBuildingFamineProtection = function (state, pid) {
    var bonus = countyBuildingBonus(state, pid, 'populationFamineProtection');
    if (FB.enterpriseUpgradeEffect) {
      bonus += FB.enterpriseUpgradeEffect(state, 'famineProtection', pid);
    }
    return FB.clamp(bonus, 0, balance('populationMaxFamineProtection', 0.60));
  };

  FB.countyBuildingAttraction = function (state, pid, enterpriseEffects) {
    var attraction = countyBuildingBonus(state, pid, 'migrationAttraction');
    if (enterpriseEffects) {
      attraction += enterpriseEffects.migrationAttraction || 0;
    } else if (FB.enterpriseUpgradeEffect) {
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

  FB.countyPopulationCapacity = function (state, pid, enterpriseEffects) {
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    var baseCap = countyBaseCapacity(state, pid);
    var bldgBonus = FB.countyBuildingCapacityBonus(state, pid);
    var enterpriseBonus = enterpriseEffects ? (enterpriseEffects.populationCapacity || 0) :
      (FB.enterpriseUpgradeEffect ? FB.enterpriseUpgradeEffect(state, 'populationCapacity', pid) : 0);
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
  FB.countyOccupiedOrBesieged = countyOccupiedOrBesieged;

  /* Build the occupied/sieged county set once for world-scale passes. The
     public single-county helper remains authoritative for isolated queries,
     while annual population and agency scans avoid walking every war once
     per province. */
  function countyConflictSnapshot(state) {
    var timing = populationTiming;
    if (!timing) return countyConflictSnapshotUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: conflict snapshot');
    try { return countyConflictSnapshotUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function countyConflictSnapshotUntimed(state) {
    var result = Object.create(null);
    if (!state) return result;
    function record(table) {
      if (!table || typeof table !== 'object') return;
      for (var pid in table) {
        var entry = table[pid];
        if (entry && (entry.occupied || Number(entry.progress) > 0)) {
          result[pid] = true;
        }
      }
    }
    record(state.occupations);
    record(state.greatHolyWar && state.greatHolyWar.occupations);
    var playerWar = state.player && state.player.war;
    if (playerWar && playerWar.enemyTarget &&
        Number(playerWar.enemySiege) > 0) {
      result[playerWar.enemyTarget] = true;
    }
    var wars = state.wars || {};
    for (var wid in wars) {
      var sieges = wars[wid] && wars[wid].fortSieges;
      if (!sieges || typeof sieges !== 'object') continue;
      for (var siegePid in sieges) {
        if (sieges[siegePid]) result[siegePid] = true;
      }
    }
    return result;
  }
  FB.countyConflictSnapshot = countyConflictSnapshot;

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

  FB.countyMigrationAttraction = function (state, pid, yearly) {
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    yearly = yearly || null;
    var pop = yearly && yearly.population !== undefined
      ? yearly.population : FB.countyPopulation(state, pid);
    var cap = yearly && yearly.capacity !== undefined
      ? yearly.capacity : FB.countyPopulationCapacity(state, pid);
    var bldgAttraction = FB.countyBuildingAttraction(state, pid, yearly && yearly.enterpriseEffects);
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
    if (yearly ? yearly.occupied : countyOccupiedOrBesieged(state, pid)) {
      attraction -= 3;
    }
    if (yearly ? yearly.ownerAtWar : realmIsAtWar(state, owner)) attraction -= 2;
    if (yearly ? yearly.severeShock : countySevereMarketShock(state, pid)) {
      attraction -= 2;
    }
    /* Royal settlement policy (js/institutions.js) shifts the draw of the
       player's own counties; the conserved migration itself is untouched. */
    if (owner === 'player' && FB.realmPolicySettlementAttraction) {
      attraction += FB.realmPolicySettlementAttraction(state);
    }
    if (FB.countyCommunityProjectMigrationPressure) {
      attraction += FB.countyCommunityProjectMigrationPressure(state, pid);
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

  function stateYear(state) {
    return (state.date && isFinite(state.date.year) && Math.round(state.date.year)) ||
      (state.start && isFinite(state.start.year) && Math.round(state.start.year)) || 867;
  }

  function validCulture(state, cultureId) {
    return typeof cultureId === 'string' && (FB.cultureExists
      ? FB.cultureExists(cultureId, state) : !!FBDATA.cultures[cultureId]);
  }

  function validFaith(state, faithId) {
    return typeof faithId === 'string' &&
      (!FB.faithExists || FB.faithExists(faithId, state)) &&
      (!FB.faithAssignable || FB.faithAssignable(faithId, state));
  }

  function communityKey(cultureId, faithId) {
    return cultureId + '|' + faithId;
  }

  /* Stable largest-remainder apportionment. Input order breaks exact
     fractional ties, and no RNG or source mutation is involved. */
  function apportionWeights(total, items, weightReader) {
    var allocated = [];
    var ranked = [];
    var used = 0;
    var weightTotal = 0;
    for (var wi = 0; wi < items.length; wi++) {
      weightTotal += Math.max(0, Number(weightReader(items[wi], wi)) || 0);
    }
    for (var i = 0; i < items.length; i++) {
      var weight = Math.max(0, Number(weightReader(items[i], i)) || 0);
      var exact = weightTotal > 0 ? total * weight / weightTotal : 0;
      var count = Math.floor(exact);
      allocated[i] = count;
      used += count;
      ranked.push({ index:i, remainder:exact - count });
    }
    ranked.sort(function (a, b) {
      return (b.remainder - a.remainder) || (a.index - b.index);
    });
    var remainder = total - used;
    for (var ri = 0; ri < remainder && ranked.length; ri++) {
      allocated[ranked[ri % ranked.length].index]++;
    }
    return allocated;
  }

  function apportionShares(total, communities) {
    var allocated = apportionWeights(total, communities, function (community) {
      return community.populationShare0;
    });
    var out = [];
    for (var ai = 0; ai < communities.length; ai++) {
      if (allocated[ai] <= 0) continue;
      out.push({
        culture:communities[ai].culture,
        religion:communities[ai].religion,
        count:allocated[ai]
      });
    }
    return out;
  }

  function copyCommunities(communities) {
    return communities.map(function (community) {
      return {
        culture:community.culture,
        religion:community.religion,
        count:community.count
      };
    });
  }

  function communityTotal(communities) {
    var total = 0;
    for (var i = 0; i < communities.length; i++) total += communities[i].count;
    return total;
  }

  function allocatedCommunityCohorts(communities, total, predicate, allowAboveAvailable) {
    var timing = populationTiming;
    if (!timing) return allocatedCommunityCohortsUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: allocate community cohorts');
    try { return allocatedCommunityCohortsUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function allocatedCommunityCohortsUntimed(communities, total, predicate, allowAboveAvailable) {
    var eligible = [];
    for (var i = 0; i < communities.length; i++) {
      if (!predicate || predicate(communities[i])) eligible.push(communities[i]);
    }
    var available = communityTotal(eligible);
    total = Math.max(0, Math.round(Number(total) || 0));
    if (!allowAboveAvailable) total = Math.min(available, total);
    if (!total || !eligible.length) return [];
    var counts = apportionWeights(total, eligible, function (community) {
      return community.count;
    });
    var out = [];
    for (var ci = 0; ci < eligible.length; ci++) {
      if (counts[ci] <= 0) continue;
      out.push({
        culture:eligible[ci].culture,
        religion:eligible[ci].religion,
        count:counts[ci]
      });
    }
    return out;
  }

  function mergeCohorts(communities, cohorts, direction) {
    var out = copyCommunities(communities);
    var byKey = {};
    for (var i = 0; i < out.length; i++) {
      byKey[communityKey(out[i].culture, out[i].religion)] = out[i];
    }
    for (var ci = 0; ci < cohorts.length; ci++) {
      var cohort = cohorts[ci];
      var key = communityKey(cohort.culture, cohort.religion);
      var target = byKey[key];
      if (!target && direction > 0) {
        target = { culture:cohort.culture, religion:cohort.religion, count:0 };
        byKey[key] = target;
        out.push(target);
      }
      if (target) target.count += direction * cohort.count;
    }
    return out.filter(function (community) { return community.count > 0; });
  }

  /* Meet exact community and edge totals as two ordered integer partitions.
     Each boundary advances once, so distribution is linear in cohorts + edges. */
  function distributeCohortsAcrossEdges(cohorts, edges) {
    var timing = populationTiming;
    if (!timing) return distributeCohortsAcrossEdgesUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: distribute migration cohorts');
    try { return distributeCohortsAcrossEdgesUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function distributeCohortsAcrossEdgesUntimed(cohorts, edges) {
    var distributed = [];
    var cohortIndex = 0;
    var cohortRemaining = cohorts.length ? cohorts[0].count : 0;
    for (var ei = 0; ei < edges.length; ei++) {
      var edgeRemaining = edges[ei].flow;
      var edgeCohorts = [];
      while (edgeRemaining > 0 && cohortIndex < cohorts.length) {
        var cohort = cohorts[cohortIndex];
        var moved = Math.min(edgeRemaining, cohortRemaining);
        if (moved > 0) {
          edgeCohorts.push({
            culture:cohort.culture, religion:cohort.religion, count:moved
          });
          edgeRemaining -= moved;
          cohortRemaining -= moved;
        }
        if (cohortRemaining === 0) {
          cohortIndex++;
          cohortRemaining = cohortIndex < cohorts.length
            ? cohorts[cohortIndex].count : 0;
        }
      }
      if (edgeRemaining !== 0) {
        throw new Error('Population cohort distribution exceeded its source total');
      }
      distributed.push(edgeCohorts);
    }
    if (cohortIndex < cohorts.length || cohortRemaining !== 0) {
      throw new Error('Population cohort distribution left an unassigned source total');
    }
    return distributed;
  }

  function communityPolicy(options) {
    var policy = options && options.communityPolicy;
    return policy && typeof policy === 'object' ? policy : null;
  }

  function policyIsValid(state, policy) {
    if (!policy) return true;
    if (!policy.culture && !policy.religion) return false;
    if (policy.culture && !validCulture(state, policy.culture)) return false;
    if (policy.religion && !validFaith(state, policy.religion)) return false;
    return true;
  }

  function policyMatches(community, policy) {
    return !policy ||
      (!policy.culture || community.culture === policy.culture) &&
      (!policy.religion || community.religion === policy.religion);
  }

  function applyCommunityDelta(state, communities, amount, options) {
    var timing = populationTiming;
    if (!timing) return applyCommunityDeltaUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: natural community allocation');
    try { return applyCommunityDeltaUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function applyCommunityDeltaUntimed(state, communities, amount, options) {
    var policy = communityPolicy(options);
    if (!policyIsValid(state, policy)) {
      return { communities:copyCommunities(communities), applied:0 };
    }
    var matching = [];
    for (var i = 0; i < communities.length; i++) {
      if (policyMatches(communities[i], policy)) matching.push(communities[i]);
    }
    if (amount > 0 && !matching.length) {
      if (!policy || !policy.culture || !policy.religion) {
        return { communities:copyCommunities(communities), applied:0 };
      }
      return {
        communities:mergeCohorts(communities, [{
          culture:policy.culture, religion:policy.religion, count:amount
        }], 1),
        applied:amount
      };
    }
    if (!matching.length) {
      return { communities:copyCommunities(communities), applied:0 };
    }
    var magnitude = amount < 0
      ? Math.min(-amount, communityTotal(matching)) : amount;
    var cohorts = allocatedCommunityCohorts(
      matching, magnitude, null, amount > 0);
    return {
      communities:mergeCohorts(communities, cohorts, amount < 0 ? -1 : 1),
      applied:amount < 0 ? -magnitude : magnitude
    };
  }

  function openingCountyCommunities(pr, total) {
    var source = FB.provinceCommunities ? FB.provinceCommunities(pr) : [
      { culture:pr.culture, religion:pr.religion }
    ];
    var weighted = source.length > 0;
    var shareTotal = 0;
    for (var i = 0; i < source.length; i++) {
      var share = Number(source[i].populationShare0);
      if (!isFinite(share) || Math.floor(share) !== share || share <= 0) {
        weighted = false;
        break;
      }
      shareTotal += share;
    }
    if (!weighted || shareTotal !== 10000) {
      source = [{
        culture:pr.culture,
        religion:pr.religion,
        populationShare0:10000
      }];
    }
    return apportionShares(total, source);
  }

  function stableCommunityOrder(pr, merged, savedOrder) {
    var order = [];
    var seen = {};
    function add(cultureId, faithId) {
      var key = communityKey(cultureId, faithId);
      if (!merged[key] || seen[key]) return;
      seen[key] = 1;
      order.push(key);
    }
    add(pr.culture, pr.religion);
    var authored = FB.provinceCommunities ? FB.provinceCommunities(pr) : [];
    for (var i = 0; i < authored.length; i++) {
      add(authored[i].culture, authored[i].religion);
    }
    for (var si = 0; si < savedOrder.length; si++) {
      var saved = merged[savedOrder[si]];
      if (saved) add(saved.culture, saved.religion);
    }
    return order;
  }

  /* A saved principal count is the reconciliation remainder. This preserves
     every valid non-principal cohort when possible; if corrupt cohorts alone
     exceed the county total, they are proportionally reduced with stable
     largest-remainder rounding before the principal is omitted. */
  function normalizedCountyCommunities(state, pr, rec, total) {
    if (!Array.isArray(rec.communities) || !rec.communities.length) {
      return openingCountyCommunities(pr, total);
    }
    var merged = {};
    var savedOrder = [];
    for (var i = 0; i < rec.communities.length; i++) {
      var source = rec.communities[i];
      if (!source || !validCulture(state, source.culture) ||
          !validFaith(state, source.religion)) continue;
      var count = Math.round(Number(source.count));
      if (!isFinite(count) || count <= 0) continue;
      var key = communityKey(source.culture, source.religion);
      if (!merged[key]) {
        merged[key] = {
          culture:source.culture, religion:source.religion, count:0
        };
        savedOrder.push(key);
      }
      merged[key].count += count;
    }
    if (!savedOrder.length) return openingCountyCommunities(pr, total);

    var principalKey = communityKey(pr.culture, pr.religion);
    var order = stableCommunityOrder(pr, merged, savedOrder);
    var others = [];
    var otherTotal = 0;
    for (var oi = 0; oi < order.length; oi++) {
      if (order[oi] === principalKey) continue;
      var other = merged[order[oi]];
      others.push(other);
      otherTotal += other.count;
    }
    if (otherTotal > total) {
      var weightedOthers = [];
      for (var wi = 0; wi < others.length; wi++) {
        weightedOthers.push({
          culture:others[wi].culture,
          religion:others[wi].religion,
          populationShare0:others[wi].count * 10000 / otherTotal
        });
      }
      return apportionShares(total, weightedOthers);
    }

    var out = [];
    var principalCount = total - otherTotal;
    if (principalCount > 0) {
      out.push({ culture:pr.culture, religion:pr.religion, count:principalCount });
    }
    for (var ci = 0; ci < others.length; ci++) {
      out.push({
        culture:others[ci].culture,
        religion:others[ci].religion,
        count:others[ci].count
      });
    }
    return out;
  }

  function settlementPopulationAllocation(state, pid, total) {
    total = Math.max(0, Math.round(Number(total) || 0));
    var setts = FB.settlementsOf ? FB.settlementsOf(state, pid) : [];
    if (!setts.length) return [total];
    var built = FB.builtIn ? FB.builtIn(state, pid) : [];
    var weights = [];
    var sumWeights = 0;
    for (var i = 0; i < setts.length; i++) {
      var st = setts[i];
      var weight = st.kind === 'city' ? 7 : (st.kind === 'town' ? 3 : 1);
      for (var bi = 0; bi < built.length; bi++) {
        var entry = built[bi];
        if (entry && entry.s === i && !entry.ruined &&
            (entry.id === 'mill' || entry.id === 'bridge' ||
             entry.id === 'market' || entry.id === 'harbor')) weight++;
      }
      weights.push(weight);
      sumWeights += weight;
    }
    var allocations = [];
    var allocated = 0;
    for (var wi = 0; wi < weights.length; wi++) {
      if (wi === weights.length - 1) {
        allocations.push(total - allocated);
      } else {
        var amount = Math.round(total * weights[wi] / sumWeights);
        allocations.push(amount);
        allocated += amount;
      }
    }
    return allocations;
  }

  function hasSettlementPartition(communities) {
    if (!Array.isArray(communities)) return false;
    for (var i = 0; i < communities.length; i++) {
      if (communities[i] && Array.isArray(communities[i].bySettlement)) {
        return true;
      }
    }
    return false;
  }

  function settlementPreviousColumns(communities, targetCommunities) {
    var byKey = {};
    for (var i = 0; i < (communities || []).length; i++) {
      var source = communities[i];
      if (!source || !Array.isArray(source.bySettlement)) continue;
      byKey[communityKey(source.culture, source.religion)] =
        source.bySettlement.slice();
    }
    return targetCommunities.map(function (community) {
      return byKey[communityKey(community.culture, community.religion)] || [];
    });
  }

  function applySettlementMatrix(communities, matrix) {
    for (var i = 0; i < communities.length; i++) {
      communities[i].bySettlement = (matrix[i] || []).slice();
    }
  }

  function settlementPartitionMatchesProjection(rec, rows, matrix) {
    if (rec.settlementCommunityProjects || !FB.settlement ||
        !FB.settlement.integerMatrix) return false;
    var projection = FB.settlement.integerMatrix(
      rec.communities.map(function (community) { return community.count; }),
      rows, null);
    if (projection.length !== matrix.length) return false;
    for (var ci = 0; ci < matrix.length; ci++) {
      for (var ri = 0; ri < rows.length; ri++) {
        if (projection[ci][ri] !== matrix[ci][ri]) return false;
      }
    }
    return true;
  }

  function reconcileSettlementRecord(state, pid, rec, previous,
    allowCompact) {
    var timing = populationTiming;
    if (!timing) return reconcileSettlementRecordUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: reconcile settlement records');
    try { return reconcileSettlementRecordUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function reconcileSettlementRecordUntimed(state, pid, rec, previous,
    allowCompact) {
    if (!rec || !Array.isArray(rec.communities) || !rec.communities.length ||
        !FB.settlement || !FB.settlement.integerMatrix) return false;
    var rows = settlementPopulationAllocation(state, pid, rec.count);
    var columns = rec.communities.map(function (community) {
      return community.count;
    });
    var actualPrevious = previous ||
      settlementPreviousColumns(rec.communities, rec.communities);
    if (actualPrevious) {
      actualPrevious = actualPrevious.map(function (column) {
        var sum = 0;
        for (var i = 0; i < column.length; i++) {
          sum += Math.max(0, Number(column[i]) || 0);
        }
        return sum > 0 ? column : rows;
      });
    }
    var matrix = FB.settlement.integerMatrix(columns, rows,
      actualPrevious);
    if (!matrix.length) return false;
    applySettlementMatrix(rec.communities, matrix);
    if (allowCompact && settlementPartitionMatchesProjection(rec, rows, matrix)) {
      for (var ci = 0; ci < rec.communities.length; ci++) {
        delete rec.communities[ci].bySettlement;
      }
    }
    return true;
  }

  function carrySettlementPartition(before, after) {
    if (!hasSettlementPartition(before)) return after;
    var previous = settlementPreviousColumns(before, after);
    for (var i = 0; i < after.length; i++) {
      after[i].bySettlement = previous[i];
    }
    return after;
  }

  function placeSettlementArrivals(state, pid, rec, cohorts, total,
    settlementIndex) {
    var timing = populationTiming;
    if (!timing) return placeSettlementArrivalsUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: place settlement arrivals');
    try { return placeSettlementArrivalsUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function placeSettlementArrivalsUntimed(state, pid, rec, cohorts, total,
    settlementIndex) {
    if (!rec || !hasSettlementPartition(rec.communities) ||
        !Array.isArray(cohorts) || !cohorts.length) return;
    var rows = settlementPopulationAllocation(state, pid, total);
    var explicit = typeof settlementIndex === 'number' &&
      isFinite(settlementIndex) &&
      Math.floor(settlementIndex) === settlementIndex &&
      settlementIndex >= 0 && settlementIndex < rows.length;
    for (var ci = 0; ci < cohorts.length; ci++) {
      var cohort = cohorts[ci];
      var destination = null;
      for (var ri = 0; ri < rec.communities.length; ri++) {
        var community = rec.communities[ri];
        if (community.culture === cohort.culture &&
            community.religion === cohort.religion) {
          destination = community;
          break;
        }
      }
      if (!destination) continue;
      if (!Array.isArray(destination.bySettlement)) {
        destination.bySettlement = [];
      }
      while (destination.bySettlement.length < rows.length) {
        destination.bySettlement.push(0);
      }
      var additions = explicit
        ? rows.map(function (_, index) {
          return index === settlementIndex ? cohort.count : 0;
        })
        : apportionWeights(cohort.count, rows, function (count) {
          return count;
        });
      for (var ai = 0; ai < additions.length; ai++) {
        destination.bySettlement[ai] += additions[ai];
      }
    }
  }

  function axisTotals(communities, field) {
    var totals = {};
    var order = [];
    var total = 0;
    for (var i = 0; i < communities.length; i++) {
      var id = communities[i][field];
      if (!own(totals, id)) {
        totals[id] = 0;
        order.push(id);
      }
      totals[id] += communities[i].count;
      total += communities[i].count;
    }
    return { totals:totals, order:order, total:total };
  }

  function dominantAxis(communities, field, previous) {
    var aggregate = axisTotals(communities, field);
    var best = aggregate.order[0] || null;
    for (var i = 1; i < aggregate.order.length; i++) {
      var candidate = aggregate.order[i];
      if (aggregate.totals[candidate] > aggregate.totals[best]) best = candidate;
    }
    if (!best) return previous || null;
    if (aggregate.totals[best] * 2 > aggregate.total) return best;
    if (previous && aggregate.totals[previous] > 0) {
      if (best === previous) return previous;
      var margin = FB.clamp(balance(
        'countyCommunityPluralityHysteresis', 0.03), 0, 0.25);
      if (aggregate.totals[best] - aggregate.totals[previous] <
          aggregate.total * margin) return previous;
    }
    return best;
  }

  function validProjectKind(kind) {
    return kind === 'faith' || kind === 'culture';
  }

  function projectTargetValid(state, kind, targetId) {
    return kind === 'faith'
      ? validFaith(state, targetId)
      : validCulture(state, targetId) && (!FB.cultureAssignable ||
        FB.cultureAssignable(targetId, state));
  }

  function projectPolicyDefinition(policyId) {
    var definitions = FBDATA.countyCommunityPolicies || {};
    var mechanics = FBDATA.balance &&
      FBDATA.balance.countyCommunityProjectPolicies || {};
    return definitions[policyId] && mechanics[policyId]
      ? definitions[policyId] : null;
  }

  function projectPolicyMechanics(policyId) {
    var policies = FBDATA.balance &&
      FBDATA.balance.countyCommunityProjectPolicies || {};
    return policies[policyId] || null;
  }

  function roundedProjectNumber(value) {
    value = Number(value);
    if (!isFinite(value)) return 0;
    return Math.round(Math.max(0, value) * 1000000) / 1000000;
  }

  function projectNonnegativeInteger(value) {
    value = Number(value);
    return isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }

  function repairedProjectMap(state, source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return null;
    }
    var repaired = {};
    for (var ki = 0; ki < 2; ki++) {
      var kind = ki ? 'culture' : 'faith';
      var project = source[kind];
      if (!project || typeof project !== 'object' ||
          !projectTargetValid(state, kind, project.target) ||
          !projectPolicyDefinition(project.policy) ||
          typeof project.sponsor !== 'string' || !project.sponsor) continue;
      var next = {
        target:project.target,
        sponsor:project.sponsor,
        startTurn:projectNonnegativeInteger(project.startTurn),
        policy:project.policy,
        progress:roundedProjectNumber(project.progress),
        converted:projectNonnegativeInteger(project.converted),
        resistance:FB.clamp(Number(project.resistance) || 0, 0, 1),
        lastTransfer:projectNonnegativeInteger(project.lastTransfer)
      };
      if (isFinite(Number(project.lastYear))) {
        next.lastYear = Math.round(Number(project.lastYear));
      }
      repaired[kind] = next;
    }
    return repaired.faith || repaired.culture ? repaired : null;
  }

  function repairCountyProjects(state, pid, rec) {
    var repaired = repairedProjectMap(state, rec.communityProjects);
    if (repaired) rec.communityProjects = repaired;
    else delete rec.communityProjects;

    var local = rec.settlementCommunityProjects;
    var repairedLocal = {};
    if (local && typeof local === 'object' && !Array.isArray(local)) {
      var rowCount = settlementPopulationAllocation(
        state, pid, rec.count).length;
      var keys = Object.keys(local).sort(function (a, b) {
        return Number(a) - Number(b);
      });
      for (var i = 0; i < keys.length; i++) {
        var idx = Number(keys[i]);
        if (!isFinite(idx) || Math.floor(idx) !== idx || idx < 0 ||
            idx >= rowCount) continue;
        var projectMap = repairedProjectMap(state, local[keys[i]]);
        if (projectMap) repairedLocal[idx] = projectMap;
      }
    }
    if (Object.keys(repairedLocal).length) {
      rec.settlementCommunityProjects = repairedLocal;
      if (!hasSettlementPartition(rec.communities)) {
        reconcileSettlementRecord(state, pid, rec, null);
      }
    } else {
      delete rec.settlementCommunityProjects;
    }
  }

  function repairCountyRecord(state, pr, rec, year) {
    var timing = populationTiming;
    if (!timing) return repairCountyRecordUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: repair county record');
    try { return repairCountyRecordUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function repairCountyRecordUntimed(state, pr, rec, year) {
    var savedCommunities = Array.isArray(rec.communities)
      ? rec.communities : [];
    var hadSettlementPartition = hasSettlementPartition(savedCommunities);
    var total = Math.max(populationFloor(), Math.round(Number(rec.count) || populationFloor()));
    rec.count = total;
    rec.natural = Math.round(Number(rec.natural) || 0);
    rec.migration = Math.round(Number(rec.migration) || 0);
    rec.losses = Math.round(Number(rec.losses) || 0);
    rec.communities = normalizedCountyCommunities(state, pr, rec, total);
    if (hadSettlementPartition) {
      reconcileSettlementRecord(state, pr.id, rec,
        settlementPreviousColumns(savedCommunities, rec.communities), true);
    }

    var identity = rec.identity && typeof rec.identity === 'object'
      ? rec.identity : {};
    var oldCulture = validCulture(state, identity.culture) ? identity.culture : pr.culture;
    var oldReligion = validFaith(state, identity.religion)
      ? identity.religion : pr.religion;
    var culture = dominantAxis(rec.communities, 'culture', oldCulture);
    var religion = dominantAxis(rec.communities, 'religion', oldReligion);
    rec.identity = {
      culture:culture,
      religion:religion,
      cultureSince:culture === oldCulture && isFinite(Number(identity.cultureSince))
        ? Math.round(Number(identity.cultureSince)) : year,
      religionSince:religion === oldReligion && isFinite(Number(identity.religionSince))
        ? Math.round(Number(identity.religionSince)) : year
    };
    var change = rec.communityChange && typeof rec.communityChange === 'object'
      ? rec.communityChange : {};
    rec.communityChange = {
      faithConverted:Math.round(Number(change.faithConverted) || 0),
      cultureAssimilated:Math.round(Number(change.cultureAssimilated) || 0)
    };
    repairCountyProjects(state, pr.id, rec);
    return rec;
  }

  function populationCommunityFaults(state, provinceIds) {
    var faults = [];
    if (!state || !state.population || !state.population.counties) {
      return ['population state is missing'];
    }
    var ids = provinceIds || provinceList().filter(function (province) {
      return province && !province.wasteland;
    }).map(function (province) { return province.id; }).sort();
    for (var pi = 0; pi < ids.length; pi++) {
      var pid = ids[pi];
      var pr = provinceDef(pid);
      var rec = state.population.counties[pid];
      if (!pr || pr.wasteland) continue;
      if (!rec) {
        faults.push(pid + ': county population is missing');
        continue;
      }
      if (!isFinite(Number(rec.count)) || Math.round(Number(rec.count)) !== rec.count ||
          rec.count < populationFloor()) {
        faults.push(pid + ': invalid county count');
        continue;
      }
      if (!Array.isArray(rec.communities) || !rec.communities.length) {
        faults.push(pid + ': communities are missing');
        continue;
      }
      var seen = {};
      var sum = 0;
      for (var ci = 0; ci < rec.communities.length; ci++) {
        var community = rec.communities[ci];
        var key = community && communityKey(community.culture, community.religion);
        if (!community || !validCulture(state, community.culture) ||
            !validFaith(state, community.religion)) {
          faults.push(pid + ': community ' + ci + ' has an invalid identity');
          continue;
        }
        if (seen[key]) faults.push(pid + ': repeated community ' + key);
        seen[key] = 1;
        if (!isFinite(Number(community.count)) ||
            Math.round(Number(community.count)) !== community.count || community.count <= 0) {
          faults.push(pid + ': community ' + key + ' has an invalid count');
          continue;
        }
        sum += community.count;
      }
      if (sum !== rec.count) {
        faults.push(pid + ': community total ' + sum + ' does not equal ' + rec.count);
      }
      var partitioned = hasSettlementPartition(rec.communities);
      if (partitioned) {
        var rowTargets = settlementPopulationAllocation(state, pid, rec.count);
        var rowSums = rowTargets.map(function () { return 0; });
        for (var pci = 0; pci < rec.communities.length; pci++) {
          var partition = rec.communities[pci].bySettlement;
          if (!Array.isArray(partition) || partition.length !== rowTargets.length) {
            faults.push(pid + ': incomplete settlement community partition');
            continue;
          }
          var columnSum = 0;
          for (var psi = 0; psi < partition.length; psi++) {
            var cell = partition[psi];
            if (!isFinite(Number(cell)) || Math.round(Number(cell)) !== cell ||
                cell < 0) {
              faults.push(pid + ': invalid settlement community cell');
              continue;
            }
            columnSum += cell;
            rowSums[psi] += cell;
          }
          if (columnSum !== rec.communities[pci].count) {
            faults.push(pid + ': settlement community column does not match county community');
          }
        }
        for (var pri = 0; pri < rowTargets.length; pri++) {
          if (rowSums[pri] !== rowTargets[pri]) {
            faults.push(pid + ': settlement population row does not match allocation');
          }
        }
      }
    }
    return faults;
  }

  FB.validatePopulationCommunities = function (state) {
    return populationCommunityFaults(state);
  };

  function assertPopulationCommunities(state, provinceIds, context) {
    var timing = populationTiming;
    if (!timing) return assertPopulationCommunitiesUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: community invariants');
    try { return assertPopulationCommunitiesUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function assertPopulationCommunitiesUntimed(state, provinceIds, context) {
    var faults = populationCommunityFaults(state, provinceIds);
    if (faults.length) {
      throw new Error('Population community invariant after ' + context + ': ' + faults.join('; '));
    }
  }

  /* Ensure schema-2 population state exists and every inhabited county has
     one exact community partition of its already-authoritative count. */
  FB.ensurePopulationState = function (state) {
    if (!state) return null;
    var floor = populationFloor();
    var table = devFallbackTable();
    var provs = provinceList();
    var currentYear = stateYear(state);

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
        repairCountyRecord(state, pr, counties[pid], currentYear);
      }
      state.population = {
        schema: 2,
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
      }
      repairCountyRecord(state, p, existingCounties[p.id], currentYear);
    }
    state.population.schema = 2;
    state.population.lastYear = isFinite(Number(state.population.lastYear))
      ? Math.round(Number(state.population.lastYear)) : currentYear;
    return state.population;
  };

  /* Targeted write-boundary repair. Full-world repair belongs at load,
     initialization, and annual simulation boundaries; a county mutation
     must not rebuild every other county's community arrays. */
  function ensureCountyPopulationRecord(state, pid) {
    if (!state) return null;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return null;
    var rec = state.population && state.population.counties &&
      state.population.counties[pid];
    if (!rec || typeof rec !== 'object') {
      FB.ensurePopulationState(state);
      rec = state.population && state.population.counties &&
        state.population.counties[pid];
    }
    if (!rec || typeof rec !== 'object') return null;
    return repairCountyRecord(state, pr, rec, stateYear(state));
  }

  FB.reconcileCountyCommunities = function (state, pid) {
    if (!state || !state.population || !state.population.counties) return [];
    var pr = provinceDef(pid);
    var rec = pr && !pr.wasteland && state.population.counties[pid];
    if (!rec || typeof rec !== 'object') return [];
    repairCountyRecord(state, pr, rec, stateYear(state));
    assertPopulationCommunities(state, [pid], 'county reconciliation');
    return rec.communities.map(function (community) {
      return {
        culture:community.culture,
        religion:community.religion,
        count:community.count
      };
    });
  };

  FB.materializeSettlementCommunities = function (state, pid) {
    if (!state) return [];
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return [];
    var rec = ensureCountyPopulationRecord(state, pid);
    if (!rec) return [];
    if (!hasSettlementPartition(rec.communities)) {
      reconcileSettlementRecord(state, pid, rec, null);
    }
    assertPopulationCommunities(state, [pid], 'settlement materialization');
    return rec.communities.map(function (community) {
      return {
        culture:community.culture,
        religion:community.religion,
        count:community.count,
        bySettlement:community.bySettlement.slice()
      };
    });
  };

  FB.reconcileSettlementCommunities = function (state, pid) {
    if (!state || !state.population || !state.population.counties) return [];
    var rec = state.population.counties[pid];
    if (!rec || !hasSettlementPartition(rec.communities)) return [];
    reconcileSettlementRecord(state, pid, rec, null, true);
    assertPopulationCommunities(state, [pid], 'settlement reconciliation');
    return rec.communities.map(function (community) {
      var copy = {
        culture:community.culture,
        religion:community.religion,
        count:community.count
      };
      if (Array.isArray(community.bySettlement)) {
        copy.bySettlement = community.bySettlement.slice();
      }
      return copy;
    });
  };

  FB.countyCommunities = function (state, pid) {
    var pr = provinceDef(pid);
    if (!state || !pr || pr.wasteland) return [];
    var rec = state.population && state.population.counties &&
      state.population.counties[pid];
    var total = rec && isFinite(Number(rec.count))
      ? Math.max(populationFloor(), Math.round(Number(rec.count)))
      : FB.countyPopulationBaseline(state, pid);
    var communities = rec && Array.isArray(rec.communities) && rec.communities.length
      ? rec.communities : openingCountyCommunities(pr, total);
    var out = [];
    for (var i = 0; i < communities.length; i++) {
      var community = communities[i];
      if (!community || !validCulture(state, community.culture) ||
          !validFaith(state, community.religion)) continue;
      var count = Math.round(Number(community.count));
      if (!isFinite(count) || count <= 0) continue;
      out.push({
        culture:community.culture,
        religion:community.religion,
        count:count
      });
    }
    return out;
  };

  FB.settlementCommunities = function (state, pid, settlementIndex) {
    var pr = provinceDef(pid);
    var idx = Number(settlementIndex);
    if (!state || !pr || pr.wasteland || !isFinite(idx) ||
        Math.floor(idx) !== idx || idx < 0) return [];
    var rec = state.population && state.population.counties &&
      state.population.counties[pid];
    var total = rec && isFinite(Number(rec.count))
      ? Math.max(populationFloor(), Math.round(Number(rec.count)))
      : FB.countyPopulationBaseline(state, pid);
    var rows = settlementPopulationAllocation(state, pid, total);
    if (idx >= rows.length) return [];
    var communities = FB.countyCommunities(state, pid);
    var previous = null;
    if (rec && hasSettlementPartition(rec.communities)) {
      previous = settlementPreviousColumns(rec.communities, communities);
    }
    var matrix = FB.settlement && FB.settlement.integerMatrix
      ? FB.settlement.integerMatrix(communities.map(function (community) {
        return community.count;
      }), rows, previous) : [];
    var out = [];
    for (var i = 0; i < communities.length; i++) {
      var count = matrix[i] && matrix[i][idx] || 0;
      if (count > 0) out.push({
        culture:communities[i].culture,
        religion:communities[i].religion,
        count:count
      });
    }
    return out;
  };

  FB.settlementCulture = function (state, pid, settlementIndex) {
    return dominantAxis(FB.settlementCommunities(
      state, pid, settlementIndex), 'culture', null);
  };

  FB.settlementReligion = function (state, pid, settlementIndex) {
    return dominantAxis(FB.settlementCommunities(
      state, pid, settlementIndex), 'religion', null);
  };

  FB.pickSettlementCommunity = function (state, pid, settlementIndex) {
    var communities = FB.settlementCommunities(state, pid, settlementIndex);
    var total = communityTotal(communities);
    if (!total) return null;
    var roll = Math.floor(FB.rng() * total);
    for (var i = 0; i < communities.length; i++) {
      if (roll < communities[i].count) return {
        culture:communities[i].culture,
        religion:communities[i].religion,
        count:communities[i].count
      };
      roll -= communities[i].count;
    }
    return communities[communities.length - 1];
  };

  /* The largest live combined pair, with saved community order breaking ties.
     Character generation must use a real pair rather than independently joining
     the county's dominant culture and dominant faith, which may not coexist. */
  FB.countyDominantCommunity = function (state, pid) {
    var communities = FB.countyCommunities(state, pid);
    var best = null;
    for (var i = 0; i < communities.length; i++) {
      if (!best || communities[i].count > best.count) best = communities[i];
    }
    return best ? {
      culture:best.culture,
      religion:best.religion,
      count:best.count
    } : null;
  };

  /* Explicitly random live-community selection for newly generated locals.
     This is not a read projection: callers choose when its one saved-RNG draw
     belongs in their generation flow (or inside FB.withSeed). */
  FB.pickCountyCommunity = function (state, pid) {
    var communities = FB.countyCommunities(state, pid);
    var total = communityTotal(communities);
    if (!total) return null;
    var roll = Math.floor(FB.rng() * total);
    for (var i = 0; i < communities.length; i++) {
      if (roll < communities[i].count) {
        return {
          culture:communities[i].culture,
          religion:communities[i].religion,
          count:communities[i].count
        };
      }
      roll -= communities[i].count;
    }
    return communities[communities.length - 1];
  };

  FB.countyCulture = function (state, pid) {
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    if (rec && rec.identity && validCulture(state, rec.identity.culture)) {
      return rec.identity.culture;
    }
    var communities = FB.countyCommunities(state, pid);
    return dominantAxis(communities, 'culture', null);
  };

  FB.countyReligion = function (state, pid) {
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    if (rec && rec.identity && validFaith(state, rec.identity.religion)) {
      return rec.identity.religion;
    }
    var communities = FB.countyCommunities(state, pid);
    return dominantAxis(communities, 'religion', null);
  };

  function countyAxisShare(state, pid, field, targetId) {
    var communities = FB.countyCommunities(state, pid);
    var matching = 0;
    var total = 0;
    for (var i = 0; i < communities.length; i++) {
      total += communities[i].count;
      if (communities[i][field] === targetId) matching += communities[i].count;
    }
    return total > 0 ? matching / total : 0;
  }

  FB.countyCultureShare = function (state, pid, cultureId) {
    return countyAxisShare(state, pid, 'culture', cultureId);
  };

  FB.countyReligionShare = function (state, pid, faithId) {
    return countyAxisShare(state, pid, 'religion', faithId);
  };

  function settlementAxisShare(state, pid, settlementIndex, field, targetId) {
    var communities = FB.settlementCommunities(state, pid, settlementIndex);
    var matching = 0;
    var total = 0;
    for (var i = 0; i < communities.length; i++) {
      total += communities[i].count;
      if (communities[i][field] === targetId) matching += communities[i].count;
    }
    return total > 0 ? matching / total : 0;
  }

  FB.settlementCultureShare = function (state, pid, settlementIndex, cultureId) {
    return settlementAxisShare(
      state, pid, settlementIndex, 'culture', cultureId);
  };

  FB.settlementReligionShare = function (state, pid, settlementIndex, faithId) {
    return settlementAxisShare(
      state, pid, settlementIndex, 'religion', faithId);
  };

  /* Campaign doctrine benefits use the followers who actually live under the
     ruler, not merely the ruler's personal identity. Barons draw from their
     exact home settlement; higher rulers draw from directly held counties.
     AI callers supply their realm id and use its whole territorial levy base. */
  FB.identityTerritoryShare = function (state, kind, identityId, realmId) {
    if (!state || (kind !== 'faith' && kind !== 'culture') || !identityId) {
      return 0;
    }
    var field = kind === 'faith' ? 'religion' : 'culture';
    if ((realmId === undefined || realmId === null || realmId === 'player') &&
        state.player && state.player.tier === 3) {
      var home = state.player.homeSettlement !== undefined
        ? state.player.homeSettlement
        : (state.player.settlement !== undefined ? state.player.settlement : 0);
      return settlementAxisShare(
        state, state.player.provinceId, Number(home) || 0, field, identityId);
    }
    var pids;
    if (realmId === undefined || realmId === null || realmId === 'player') {
      pids = state.player && Array.isArray(state.player.provs) &&
        state.player.provs.length
        ? state.player.provs.slice()
        : (state.player && state.player.provinceId
          ? [state.player.provinceId] : []);
    } else {
      pids = FB.realmProvinces ? FB.realmProvinces(state, realmId) : [];
    }
    var matching = 0;
    var total = 0;
    for (var pi = 0; pi < pids.length; pi++) {
      var communities = FB.countyCommunities(state, pids[pi]);
      for (var ci = 0; ci < communities.length; ci++) {
        total += communities[ci].count;
        if (communities[ci][field] === identityId) {
          matching += communities[ci].count;
        }
      }
    }
    return total > 0 ? matching / total : 0;
  };

  function copyProject(project) {
    if (!project) return null;
    var out = {
      target:project.target,
      sponsor:project.sponsor,
      startTurn:project.startTurn,
      policy:project.policy,
      progress:project.progress,
      converted:project.converted,
      resistance:project.resistance,
      lastTransfer:project.lastTransfer
    };
    if (project.lastYear !== undefined) out.lastYear = project.lastYear;
    return out;
  }

  FB.countyCommunityProject = function (state, pid, kind) {
    if (!validProjectKind(kind)) return null;
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    return copyProject(rec && rec.communityProjects &&
      rec.communityProjects[kind]);
  };

  function projectSponsorControls(state, pid, sponsor) {
    if (!state || !sponsor) return false;
    var owner = provinceOwner(state, pid);
    var holder = state.holder && state.holder[pid];
    if (sponsor === owner || sponsor === holder) return true;
    if (!FB.topRealm) return false;
    return !!((owner && FB.topRealm(state, owner) === sponsor) ||
      (holder && FB.topRealm(state, holder) === sponsor));
  }

  function settlementProjectSponsorControls(state, pid, settlementIndex,
    sponsor) {
    if (sponsor === 'player' && FB.playerControlsSettlementCommunity) {
      return FB.playerControlsSettlementCommunity(
        state, pid, settlementIndex);
    }
    return projectSponsorControls(state, pid, sponsor);
  }

  function sponsorIdentity(state, sponsor) {
    var realm = state && state.realms && state.realms[sponsor];
    var character = sponsor === 'player' && state && state.player &&
      state.chars && state.chars[state.player.charId];
    return {
      culture:character && character.culture ||
        realm && realm.ruler && realm.ruler.culture || null,
      religion:realm && FB.realmReligionId
        ? FB.realmReligionId(state, sponsor)
        : (character && character.religion || realm && realm.religion || null)
    };
  }

  function projectEligiblePopulation(communities, kind, targetId) {
    var field = kind === 'faith' ? 'religion' : 'culture';
    var total = 0;
    for (var i = 0; i < communities.length; i++) {
      if (communities[i][field] !== targetId) total += communities[i].count;
    }
    return total;
  }

  function relationResistance(state, communities, kind, targetId) {
    var eligible = 0;
    var weighted = 0;
    var field = kind === 'faith' ? 'religion' : 'culture';
    var table = kind === 'faith'
      ? FBDATA.balance.countyCommunityProjectFaithResistance
      : FBDATA.balance.countyCommunityProjectCultureResistance;
    table = table || {};
    for (var i = 0; i < communities.length; i++) {
      var community = communities[i];
      if (community[field] === targetId) continue;
      var relation;
      if (kind === 'faith') {
        relation = FB.faithRelation
          ? FB.faithRelation(state, community.religion, targetId) : 'foreign';
      } else {
        relation = FB.cultureRelation
          ? FB.cultureRelation(state, community.culture, targetId) : 'foreign';
      }
      weighted += community.count * Math.max(0,
        Number(table[relation]) || 0);
      eligible += community.count;
    }
    return eligible ? weighted / eligible : 0;
  }

  function projectInstitutionFactors(state, pid, kind, targetId, policyId,
    rulerMatches) {
    var pressure = 0;
    var resistance = 0;
    if (kind === 'faith' && rulerMatches) {
      pressure += Math.max(0, countyBuildingBonus(
        state, pid, 'communityFaithPressure'));
    }
    if (provinceOwner(state, pid) === 'player' &&
        kind === 'faith' && FB.realmPolicyLevelId) {
      var tolerance = FB.realmPolicyLevelId(state, 'religious_tolerance');
      if (tolerance === 'persecution' && policyId === 'coercive') {
        pressure += 0.15;
        resistance += 0.15;
      } else if (tolerance === 'protected_worship' &&
          policyId === 'coercive') {
        pressure -= 0.15;
        resistance += 0.10;
      } else if (tolerance === 'tolerated_minorities' &&
          policyId !== 'coercive') {
        resistance -= 0.05;
      }
    }
    return { pressure:pressure, resistance:resistance };
  }

  /* Pure, numeric explanation of one active or proposed project. Every
     factor is either supplied by the project/county or derived from current
     political, conflict, institution, and demographic state. */
  function countyCommunityProjectStatus(state, pid, kind, project,
    settlementIndex, context) {
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    var policy = project && projectPolicyMechanics(project.policy);
    if (!project || !rec || !policy) return null;
    var local = typeof settlementIndex === 'number';
    var communities = local
      ? FB.settlementCommunities(state, pid, settlementIndex)
      : FB.countyCommunities(state, pid);
    var population = communityTotal(communities);
    if (!population) return null;
    var eligible = projectEligiblePopulation(
      communities, kind, project.target);
    var targetShare = (population - eligible) / population;
    var control = local
      ? settlementProjectSponsorControls(
        state, pid, settlementIndex, project.sponsor)
      : projectSponsorControls(state, pid, project.sponsor);
    var sponsor = sponsorIdentity(state, project.sponsor);
    var rulerMatches = kind === 'faith'
      ? sponsor.religion === project.target : sponsor.culture === project.target;
    var pressure = Math.max(0, Number(policy.pressure) || 0);
    if (rulerMatches) {
      pressure += Math.max(0, balance(
        'countyCommunityProjectRulerPressure', 0.35));
    }
    pressure += targetShare * Math.max(0, balance(
      'countyCommunityProjectLocalSupportPressure', 0.25));
    var institution = projectInstitutionFactors(
      state, pid, kind, project.target, project.policy, rulerMatches);
    pressure = Math.max(0, pressure + institution.pressure);

    var resistance = relationResistance(
      state, communities, kind, project.target);
    var identity = rec.identity || {};
    var currentIdentity = local
      ? (kind === 'faith'
        ? FB.settlementReligion(state, pid, settlementIndex)
        : FB.settlementCulture(state, pid, settlementIndex))
      : (kind === 'faith' ? identity.religion : identity.culture);
    var since = kind === 'faith' ? identity.religionSince : identity.cultureSince;
    var yearsEntrenched = currentIdentity !== project.target &&
      isFinite(Number(since))
      ? Math.max(0, stateYear(state) - Number(since)) : 0;
    var entrenchmentYears = Math.max(1, balance(
      'countyCommunityProjectEntrenchmentYears', 40));
    var entrenchment = Math.min(1, yearsEntrenched / entrenchmentYears) *
      Math.max(0, balance('countyCommunityProjectEntrenchmentMax', 0.30));
    var unrest = FB.modBonus
      ? Math.max(0, Number(FB.modBonus(state, 'unrest', pid)) || 0) : 0;
    var unrestResistance = unrest * Math.max(0, balance(
      'countyCommunityProjectUnrestResistance', 0.35));
    resistance += entrenchment + unrestResistance +
      targetShare * Math.max(0, Number(policy.holdout) || 0) +
      institution.resistance;
    resistance *= Math.max(0, Number(policy.resistance) || 0);
    resistance = FB.clamp(resistance, 0, balance(
      'countyCommunityProjectResistanceCap', 0.85));

    var reference = Math.max(1, balance(
      'countyCommunityProjectPopulationReference', 24000));
    var populationScale = Math.sqrt(reference / Math.max(1, population));
    populationScale = FB.clamp(populationScale,
      balance('countyCommunityProjectPopulationScaleMin', 0.65),
      balance('countyCommunityProjectPopulationScaleMax', 1.35));
    var conflict = 1;
    var owner = provinceOwner(state, pid);
    var ownerAtWar = context && context.ownerAtWar !== undefined
      ? !!context.ownerAtWar : realmIsAtWar(state, owner);
    var occupied = context && context.occupied !== undefined
      ? !!context.occupied : countyOccupiedOrBesieged(state, pid);
    if (ownerAtWar) conflict *= FB.clamp(balance(
      'countyCommunityProjectWarMultiplier', 0.50), 0, 1);
    if (occupied) conflict *= FB.clamp(balance(
      'countyCommunityProjectOccupationMultiplier', 0.15), 0, 1);

    var rate = control ? Math.max(0, balance(
      'countyCommunityProjectBaseRate', 0.012)) * pressure *
      populationScale * (1 - resistance) * conflict : 0;
    var rateCap = Math.min(Math.max(0, balance(
      'countyCommunityProjectMaxRate', 0.015)),
      Math.max(0, Number(policy.maxRate) || 0));
    rate = FB.clamp(rate, 0, rateCap);
    return {
      active:true,
      kind:kind,
      target:project.target,
      sponsor:project.sponsor,
      policy:project.policy,
      control:control,
      rulerMatches:rulerMatches,
      population:population,
      settlement:local ? settlementIndex : null,
      eligible:eligible,
      targetShare:targetShare,
      pressure:pressure,
      resistance:resistance,
      populationScale:populationScale,
      conflict:conflict,
      rate:rate,
      potential:eligible * rate,
      minimum:Math.max(1, Math.round(balance(
        'countyCommunityProjectMinTransfer', 25)))
    };
  }

  FB.countyCommunityProjectStatus = function (state, pid, kind) {
    return countyCommunityProjectStatus(
      state, pid, kind, FB.countyCommunityProject(state, pid, kind));
  };

  /* Pure preview for Land controls. It evaluates a proposed target and policy
     against the same current conditions as an active project without writing
     a temporary project into campaign state. */
  FB.countyCommunityProjectPreview = function (state, pid, request, context) {
    if (!state || !request || !validProjectKind(request.kind) ||
        !projectTargetValid(state, request.kind, request.target) ||
        !projectPolicyDefinition(request.policy)) return null;
    return countyCommunityProjectStatus(state, pid, request.kind, {
      target:request.target,
      sponsor:typeof request.sponsor === 'string' && request.sponsor
        ? request.sponsor : 'player',
      policy:request.policy
    }, undefined, context);
  };

  FB.settlementCommunityProject = function (state, pid, settlementIndex, kind) {
    if (!validProjectKind(kind)) return null;
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    var projects = rec && rec.settlementCommunityProjects &&
      rec.settlementCommunityProjects[settlementIndex];
    return copyProject(projects && projects[kind]);
  };

  FB.settlementCommunityProjectStatus = function (state, pid,
    settlementIndex, kind) {
    return countyCommunityProjectStatus(state, pid, kind,
      FB.settlementCommunityProject(state, pid, settlementIndex, kind),
      settlementIndex);
  };

  FB.settlementCommunityProjectPreview = function (state, pid,
    settlementIndex, request) {
    if (!state || !request || !validProjectKind(request.kind) ||
        !projectTargetValid(state, request.kind, request.target) ||
        !projectPolicyDefinition(request.policy)) return null;
    return countyCommunityProjectStatus(state, pid, request.kind, {
      target:request.target,
      sponsor:typeof request.sponsor === 'string' && request.sponsor
        ? request.sponsor : 'player',
      policy:request.policy
    }, settlementIndex);
  };

  function convertedCohorts(communities, kind, targetId, sourceId, amount) {
    var field = kind === 'faith' ? 'religion' : 'culture';
    var eligible = communities.filter(function (community) {
      return community[field] !== targetId &&
        (!sourceId || community[field] === sourceId);
    });
    var selected = allocatedCommunityCohorts(eligible, amount);
    var incoming = [];
    var detail = [];
    for (var i = 0; i < selected.length; i++) {
      var source = selected[i];
      var target = {
        culture:kind === 'culture' ? targetId : source.culture,
        religion:kind === 'faith' ? targetId : source.religion,
        count:source.count
      };
      incoming.push(target);
      detail.push({
        fromCulture:source.culture,
        fromReligion:source.religion,
        toCulture:target.culture,
        toReligion:target.religion,
        count:source.count
      });
    }
    return { outgoing:selected, incoming:incoming, detail:detail };
  }

  function convertCountyCommunity(state, pid, request, skipEnsure) {
    var empty = { count:0, cohorts:[] };
    if (!state || !request || !validProjectKind(request.kind) ||
        !projectTargetValid(state, request.kind, request.target)) return empty;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return empty;
    var rec = skipEnsure
      ? state.population && state.population.counties &&
        state.population.counties[pid]
      : ensureCountyPopulationRecord(state, pid);
    if (!rec) return empty;
    var field = request.kind === 'faith' ? 'religion' : 'culture';
    var eligible = rec.communities.filter(function (community) {
      return community[field] !== request.target &&
        (!request.source || community[field] === request.source);
    });
    var available = communityTotal(eligible);
    var amount = request.amount;
    if (amount === undefined && request.rate !== undefined) {
      var rate = FB.clamp(Number(request.rate) || 0, 0, 1);
      amount = Math.round(available * rate);
    }
    amount = Number(amount);
    if (!isFinite(amount)) return empty;
    amount = Math.min(available, Math.max(0, Math.round(amount)));
    if (!amount) return empty;
    var before = rec.count;
    var beforeCommunities = rec.communities;
    var cohorts = convertedCohorts(rec.communities, request.kind,
      request.target, request.source || null, amount);
    var applied = communityTotal(cohorts.outgoing);
    if (!applied) return empty;
    rec.communities = mergeCohorts(rec.communities, cohorts.outgoing, -1);
    rec.communities = mergeCohorts(rec.communities, cohorts.incoming, 1);
    carrySettlementPartition(beforeCommunities, rec.communities);
    var change = rec.communityChange || {
      faithConverted:0, cultureAssimilated:0
    };
    if (request.kind === 'faith') change.faithConverted += applied;
    else change.cultureAssimilated += applied;
    rec.communityChange = change;
    repairCountyRecord(state, pr, rec, stateYear(state));
    if (rec.count !== before || communityTotal(rec.communities) !== before) {
      throw new Error('Population total invariant after county community conversion');
    }
    assertPopulationCommunities(state, [pid],
      request.cause || 'county community conversion');
    return { count:applied, cohorts:cohorts.detail };
  }

  FB.convertCountyCommunity = function (state, pid, request) {
    return convertCountyCommunity(state, pid, request, false);
  };

  function convertSettlementCommunity(state, pid, settlementIndex,
    request, skipEnsure) {
    var empty = { count:0, cohorts:[] };
    var idx = Number(settlementIndex);
    if (!state || !request || !validProjectKind(request.kind) ||
        !projectTargetValid(state, request.kind, request.target) ||
        !isFinite(idx) || Math.floor(idx) !== idx || idx < 0) return empty;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return empty;
    var rec = skipEnsure
      ? state.population && state.population.counties &&
        state.population.counties[pid]
      : ensureCountyPopulationRecord(state, pid);
    if (!rec) return empty;
    var rows = settlementPopulationAllocation(state, pid, rec.count);
    if (idx >= rows.length) return empty;
    if (!hasSettlementPartition(rec.communities)) {
      reconcileSettlementRecord(state, pid, rec, null);
    }
    var local = FB.settlementCommunities(state, pid, idx);
    var field = request.kind === 'faith' ? 'religion' : 'culture';
    var eligible = local.filter(function (community) {
      return community[field] !== request.target &&
        (!request.source || community[field] === request.source);
    });
    var available = communityTotal(eligible);
    var amount = request.amount;
    if (amount === undefined && request.rate !== undefined) {
      amount = Math.round(available * FB.clamp(
        Number(request.rate) || 0, 0, 1));
    }
    amount = Number(amount);
    if (!isFinite(amount)) return empty;
    amount = Math.min(available, Math.max(0, Math.round(amount)));
    if (!amount) return empty;
    var cohorts = convertedCohorts(local, request.kind, request.target,
      request.source || null, amount);
    var applied = communityTotal(cohorts.outgoing);
    if (!applied) return empty;

    function recordFor(cultureId, religionId, create) {
      for (var i = 0; i < rec.communities.length; i++) {
        var existing = rec.communities[i];
        if (existing.culture === cultureId &&
            existing.religion === religionId) return existing;
      }
      if (!create) return null;
      var added = {
        culture:cultureId, religion:religionId, count:0,
        bySettlement:rows.map(function () { return 0; })
      };
      rec.communities.push(added);
      return added;
    }

    for (var ci = 0; ci < cohorts.detail.length; ci++) {
      var move = cohorts.detail[ci];
      var source = recordFor(move.fromCulture, move.fromReligion, false);
      var target = recordFor(move.toCulture, move.toReligion, true);
      if (!source || !source.bySettlement ||
          source.bySettlement[idx] < move.count) {
        throw new Error('Settlement conversion exceeded its source community');
      }
      source.count -= move.count;
      source.bySettlement[idx] -= move.count;
      target.count += move.count;
      target.bySettlement[idx] += move.count;
    }
    rec.communities = rec.communities.filter(function (community) {
      return community.count > 0;
    });
    var change = rec.communityChange || {
      faithConverted:0, cultureAssimilated:0
    };
    if (request.kind === 'faith') change.faithConverted += applied;
    else change.cultureAssimilated += applied;
    rec.communityChange = change;
    var before = rec.count;
    repairCountyRecord(state, pr, rec, stateYear(state));
    if (rec.count !== before || communityTotal(rec.communities) !== before ||
        communityTotal(FB.settlementCommunities(state, pid, idx)) !== rows[idx]) {
      throw new Error('Population total invariant after settlement community conversion');
    }
    assertPopulationCommunities(state, [pid],
      request.cause || 'settlement community conversion');
    return { count:applied, cohorts:cohorts.detail };
  }

  FB.convertSettlementCommunity = function (state, pid, settlementIndex,
    request) {
    return convertSettlementCommunity(
      state, pid, settlementIndex, request, false);
  };

  FB.startCountyCommunityProject = function (state, pid, request) {
    if (!state || !request || !validProjectKind(request.kind) ||
        !projectTargetValid(state, request.kind, request.target) ||
        !projectPolicyDefinition(request.policy)) return null;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return null;
    var rec = ensureCountyPopulationRecord(state, pid);
    if (!rec) return null;
    var sponsor = typeof request.sponsor === 'string' && request.sponsor
      ? request.sponsor : provinceOwner(state, pid);
    if (!sponsor || countyAxisShare(state, pid,
        request.kind === 'faith' ? 'religion' : 'culture',
        request.target) >= 1) return null;
    rec.communityProjects = rec.communityProjects || {};
    rec.communityProjects[request.kind] = {
      target:request.target,
      sponsor:sponsor,
      startTurn:projectNonnegativeInteger(state.turn),
      policy:request.policy,
      progress:0,
      converted:0,
      resistance:0,
      lastTransfer:0,
      lastYear:stateYear(state)
    };
    var definition = projectPolicyDefinition(request.policy);
    if (definition.modifier && FB.addModifier &&
        projectSponsorControls(state, pid, sponsor)) {
      FB.addModifier(state, definition.modifier, pid, { silent:true });
    }
    return copyProject(rec.communityProjects[request.kind]);
  };

  FB.stopCountyCommunityProject = function (state, pid, kind) {
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    if (!validProjectKind(kind) || !rec || !rec.communityProjects ||
        !rec.communityProjects[kind]) return false;
    delete rec.communityProjects[kind];
    if (!rec.communityProjects.faith && !rec.communityProjects.culture) {
      delete rec.communityProjects;
    }
    return true;
  };

  FB.startSettlementCommunityProject = function (state, pid,
    settlementIndex, request) {
    var idx = Number(settlementIndex);
    if (!state || !request || !validProjectKind(request.kind) ||
        !projectTargetValid(state, request.kind, request.target) ||
        !projectPolicyDefinition(request.policy) || !isFinite(idx) ||
        Math.floor(idx) !== idx || idx < 0) return null;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return null;
    var rec = ensureCountyPopulationRecord(state, pid);
    if (!rec) return null;
    var communities = FB.settlementCommunities(state, pid, idx);
    if (!communities.length) return null;
    if (projectEligiblePopulation(communities, request.kind,
        request.target) <= 0) return null;
    var sponsor = typeof request.sponsor === 'string' && request.sponsor
      ? request.sponsor : provinceOwner(state, pid);
    if (!sponsor) return null;
    if (!hasSettlementPartition(rec.communities)) {
      reconcileSettlementRecord(state, pid, rec, null);
    }
    rec.settlementCommunityProjects = rec.settlementCommunityProjects || {};
    var projects = rec.settlementCommunityProjects[idx] || {};
    projects[request.kind] = {
      target:request.target,
      sponsor:sponsor,
      startTurn:projectNonnegativeInteger(state.turn),
      policy:request.policy,
      progress:0,
      converted:0,
      resistance:0,
      lastTransfer:0,
      lastYear:stateYear(state)
    };
    rec.settlementCommunityProjects[idx] = projects;
    return copyProject(projects[request.kind]);
  };

  FB.stopSettlementCommunityProject = function (state, pid,
    settlementIndex, kind) {
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    var all = rec && rec.settlementCommunityProjects;
    var projects = all && all[settlementIndex];
    if (!validProjectKind(kind) || !projects || !projects[kind]) return false;
    delete projects[kind];
    if (!projects.faith && !projects.culture) delete all[settlementIndex];
    if (!Object.keys(all).length) delete rec.settlementCommunityProjects;
    reconcileSettlementRecord(state, pid, rec, null, true);
    return true;
  };

  FB.countyCommunityProjectMigrationPressure = function (state, pid) {
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    var projects = rec && rec.communityProjects;
    if (!projects) return 0;
    var total = 0;
    for (var ki = 0; ki < 2; ki++) {
      var kind = ki ? 'culture' : 'faith';
      var project = projects[kind];
      var policy = project && projectPolicyMechanics(project.policy);
      if (!project || !policy ||
          !projectSponsorControls(state, pid, project.sponsor)) continue;
      var share = countyAxisShare(state, pid,
        kind === 'faith' ? 'religion' : 'culture', project.target);
      total += (Number(policy.migration) || 0) * (1 - share);
    }
    var localProjects = rec && rec.settlementCommunityProjects;
    if (localProjects) {
      var settlementKeys = Object.keys(localProjects).sort(function (a, b) {
        return Number(a) - Number(b);
      });
      for (var si = 0; si < settlementKeys.length; si++) {
        var settlementIndex = Number(settlementKeys[si]);
        var settlementCommunities = FB.settlementCommunities(
          state, pid, settlementIndex);
        var settlementTotal = communityTotal(settlementCommunities);
        var localMap = localProjects[settlementKeys[si]];
        for (var lki = 0; lki < 2; lki++) {
          var localKind = lki ? 'culture' : 'faith';
          var localProject = localMap && localMap[localKind];
          var localPolicy = localProject &&
            projectPolicyMechanics(localProject.policy);
          var localControl = localProject &&
            settlementProjectSponsorControls(
              state, pid, settlementIndex, localProject.sponsor);
          if (!localProject || !localPolicy || !settlementTotal ||
              !localControl) continue;
          var localEligible = projectEligiblePopulation(settlementCommunities,
            localKind, localProject.target);
          total += (Number(localPolicy.migration) || 0) *
            (localEligible / Math.max(1, rec.count));
        }
      }
    }
    return Math.max(-3, Math.min(0, total));
  };

  /* County systems have no separate settlement tax, levy, unrest, or market
     ledgers. A local policy therefore contributes to those county aggregates
     only in proportion to its settlement's population share. The same
     modifier is counted once per slot even when both identity axes use it. */
  FB.settlementCommunityProjectModifierBonus = function (state, pid, key) {
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    var all = rec && rec.settlementCommunityProjects;
    if (!all || !rec.count || !FBDATA.modifiers) return 0;
    var total = 0;
    var slots = Object.keys(all).sort(function (a, b) {
      return Number(a) - Number(b);
    });
    for (var si = 0; si < slots.length; si++) {
      var idx = Number(slots[si]);
      var projects = all[slots[si]];
      var seen = {};
      for (var ki = 0; ki < 2; ki++) {
        var kind = ki ? 'culture' : 'faith';
        var project = projects && projects[kind];
        var policy = project && projectPolicyDefinition(project.policy);
        var modifierId = policy && policy.modifier;
        var modifier = modifierId && FBDATA.modifiers[modifierId];
        if (!modifier || seen[modifierId] ||
            !settlementProjectSponsorControls(
              state, pid, idx, project.sponsor)) continue;
        seen[modifierId] = 1;
        if (modifier.fx && typeof modifier.fx[key] === 'number') {
          total += modifier.fx[key] *
            (FB.settlementPopulation(state, pid, idx) / rec.count);
        }
      }
    }
    return total;
  };

  FB.countyPopulation = function (state, pid) {
    if (!state) return 0;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    var rec = state.population && state.population.counties && state.population.counties[pid];
    var count = rec && Number(rec.count);
    if (isFinite(count) && Math.round(count) === count &&
        count >= populationFloor()) return count;
    rec = ensureCountyPopulationRecord(state, pid);
    if (rec && isFinite(Number(rec.count))) return rec.count;
    return FB.countyPopulationBaseline(state, pid);
  };

  /* Public population mutation helper. Ordinary changes are proportional;
     an explicit communityPolicy may target one culture, faith, or exact pair. */
  FB.changeCountyPopulation = function (state, pid, amount, cause, options) {
    if (!state) return 0;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    var delta = Math.round(Number(amount));
    if (!isFinite(delta) || delta === 0) return 0;

    var rec = ensureCountyPopulationRecord(state, pid);
    if (!rec) return 0;
    var floor = populationFloor();
    var before = rec.count;
    if (delta < 0) delta = -Math.min(-delta, Math.max(0, before - floor));
    var result = applyCommunityDelta(state, rec.communities, delta, options);
    var applied = result.applied;
    if (applied === 0) return 0;

    rec.communities = carrySettlementPartition(
      rec.communities, result.communities);
    rec.count = before + applied;
    repairCountyRecord(state, pr, rec, stateYear(state));
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
    assertPopulationCommunities(state, [pid], cause || 'population change');
    return applied;
  };

  FB.changeCountyPopulationRate = function (state, pid, rate, cause, options) {
    if (!state) return 0;
    var r = Number(rate);
    if (!isFinite(r) || r === 0) return 0;
    var current = FB.countyPopulation(state, pid);
    var delta = Math.round(current * r);
    return FB.changeCountyPopulation(state, pid, delta, cause, options);
  };

  FB.damageCountyPopulation = function (state, pid, cause, options) {
    if (!state) return 0;
    var fortProtection = FB.countyFortSiegeProtection(state, pid);
    var baseRate = balance('populationHostileCaptureLossRate', 0.02);
    var actualRate = -baseRate * (1 - fortProtection);
    return FB.changeCountyPopulationRate(state, pid, actualRate,
      cause || 'capture', options);
  };

  /* Move exact people between counties without changing their culture-faith
     pair. A numeric cohorts argument requests that many proportional cohorts
     from the source; an array requests explicit pairs and counts. Optional
     fromSettlement/toSettlement slots retain a named local route. */
  FB.moveCommunityPopulation = function (state, fromPid, toPid, cohorts, cause,
    options) {
    var empty = { count:0, cohorts:[] };
    if (!state || fromPid === toPid) return empty;
    var fromPr = provinceDef(fromPid);
    var toPr = provinceDef(toPid);
    if (!fromPr || fromPr.wasteland || !toPr || toPr.wasteland) return empty;
    var fromRec = ensureCountyPopulationRecord(state, fromPid);
    var toRec = ensureCountyPopulationRecord(state, toPid);
    if (!fromRec || !toRec) return empty;
    options = options && typeof options === 'object' ? options : {};
    var fromSettlement = Number(options.fromSettlement);
    var toSettlement = Number(options.toSettlement);
    var explicitFrom = options.fromSettlement !== undefined &&
      options.fromSettlement !== null && isFinite(fromSettlement) &&
      Math.floor(fromSettlement) === fromSettlement && fromSettlement >= 0;
    var explicitTo = options.toSettlement !== undefined &&
      options.toSettlement !== null && isFinite(toSettlement) &&
      Math.floor(toSettlement) === toSettlement && toSettlement >= 0;
    if (explicitFrom && !FB.settlementCommunities(
        state, fromPid, fromSettlement).length) return empty;
    if (explicitTo && !FB.settlementCommunities(
        state, toPid, toSettlement).length) return empty;
    if (explicitFrom && !hasSettlementPartition(fromRec.communities)) {
      reconcileSettlementRecord(state, fromPid, fromRec, null);
    }
    if (explicitTo && !hasSettlementPartition(toRec.communities)) {
      reconcileSettlementRecord(state, toPid, toRec, null);
    }
    var combinedBefore = fromRec.count + toRec.count;
    var availableCommunities = explicitFrom
      ? FB.settlementCommunities(state, fromPid, fromSettlement)
      : fromRec.communities;

    var requested;
    if (isFinite(Number(cohorts)) && !Array.isArray(cohorts)) {
      requested = allocatedCommunityCohorts(availableCommunities,
        Math.max(0, Math.round(Number(cohorts))));
    } else if (Array.isArray(cohorts)) {
      var requestedByKey = {};
      var requestedOrder = [];
      for (var ci = 0; ci < cohorts.length; ci++) {
        var cohort = cohorts[ci];
        if (!cohort || !validCulture(state, cohort.culture) ||
            !validFaith(state, cohort.religion)) continue;
        var requestedCount = Math.max(0, Math.round(Number(cohort.count) || 0));
        if (!requestedCount) continue;
        var requestedKey = communityKey(cohort.culture, cohort.religion);
        if (!requestedByKey[requestedKey]) {
          requestedByKey[requestedKey] = {
            culture:cohort.culture, religion:cohort.religion, count:0
          };
          requestedOrder.push(requestedKey);
        }
        requestedByKey[requestedKey].count += requestedCount;
      }
      var availableByKey = {};
      for (var ai = 0; ai < availableCommunities.length; ai++) {
        var available = availableCommunities[ai];
        availableByKey[communityKey(available.culture, available.religion)] =
          available.count;
      }
      requested = [];
      for (var ri = 0; ri < requestedOrder.length; ri++) {
        var key = requestedOrder[ri];
        var request = requestedByKey[key];
        request.count = Math.min(request.count, availableByKey[key] || 0);
        if (request.count > 0) requested.push(request);
      }
    } else {
      return empty;
    }

    var maxMove = Math.max(0, fromRec.count - populationFloor());
    var requestedTotal = communityTotal(requested);
    if (requestedTotal > maxMove) {
      requested = allocatedCommunityCohorts(requested, maxMove);
    }
    var moved = communityTotal(requested);
    if (!moved) return empty;

    var beforeFromCommunities = fromRec.communities;
    var beforeToCommunities = toRec.communities;
    fromRec.communities = mergeCohorts(fromRec.communities, requested, -1);
    toRec.communities = mergeCohorts(toRec.communities, requested, 1);
    carrySettlementPartition(beforeFromCommunities, fromRec.communities);
    carrySettlementPartition(beforeToCommunities, toRec.communities);
    if (explicitFrom) {
      for (var sfi = 0; sfi < requested.length; sfi++) {
        var leaving = requested[sfi];
        for (var sfj = 0; sfj < fromRec.communities.length; sfj++) {
          var sourceCommunity = fromRec.communities[sfj];
          if (sourceCommunity.culture === leaving.culture &&
              sourceCommunity.religion === leaving.religion) {
            sourceCommunity.bySettlement[fromSettlement] -= leaving.count;
            break;
          }
        }
      }
    }
    placeSettlementArrivals(state, toPid, toRec, requested,
      toRec.count + moved, explicitTo ? toSettlement : null);
    fromRec.count -= moved;
    toRec.count += moved;
    fromRec.migration = (fromRec.migration || 0) - moved;
    toRec.migration = (toRec.migration || 0) + moved;
    repairCountyRecord(state, fromPr, fromRec, stateYear(state));
    repairCountyRecord(state, toPr, toRec, stateYear(state));
    if (fromRec.count + toRec.count !== combinedBefore) {
      throw new Error('Population transfer invariant after ' +
        (cause || 'community move'));
    }
    assertPopulationCommunities(state, [fromPid, toPid], cause || 'community move');
    return { count:moved, cohorts:copyCommunities(requested) };
  };

  /* Declarative events name an amount or share plus an optional culture-faith
     filter; they never assemble mutable cohort rows themselves. Keep that
     selection at the population boundary so migration, resettlement, and
     expulsion all inherit the same floor, settlement, and conservation rules. */
  FB.moveCommunityPopulationByPolicy = function (state, fromPid, toPid,
    request) {
    var empty = { count:0, cohorts:[] };
    if (!state || !request || typeof request !== 'object') return empty;
    var options = {};
    if (request.fromSettlement !== undefined) {
      options.fromSettlement = request.fromSettlement;
    }
    if (request.toSettlement !== undefined) {
      options.toSettlement = request.toSettlement;
    }
    var source = options.fromSettlement !== undefined
      ? FB.settlementCommunities(state, fromPid, options.fromSettlement)
      : FB.countyCommunities(state, fromPid);
    var filter = request.community || {};
    source = source.filter(function (community) {
      return (!filter.culture || community.culture === filter.culture) &&
        (!filter.religion || community.religion === filter.religion);
    });
    var available = communityTotal(source);
    if (!available) return empty;
    var amount = request.amount;
    if (amount === undefined && request.rate !== undefined) {
      amount = Math.round(available * FB.clamp(
        Number(request.rate) || 0, 0, 1));
    }
    amount = Math.max(0, Math.round(Number(amount) || 0));
    if (!amount) return empty;
    var selected = allocatedCommunityCohorts(source,
      Math.min(available, amount));
    return FB.moveCommunityPopulation(state, fromPid, toPid, selected,
      request.cause || 'event community movement', options);
  };

  function resolveCountyCommunityProjects(state, pid, year) {
    var timing = populationTiming;
    if (!timing) return resolveCountyCommunityProjectsUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: county community projects');
    try { return resolveCountyCommunityProjectsUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function resolveCountyCommunityProjectsUntimed(state, pid, year) {
    var rec = state.population && state.population.counties[pid];
    if (!rec || !rec.communityProjects) return [];
    var results = [];
    for (var ki = 0; ki < 2; ki++) {
      var kind = ki ? 'culture' : 'faith';
      var project = rec.communityProjects && rec.communityProjects[kind];
      if (!project || project.lastYear === year) continue;
      var status = FB.countyCommunityProjectStatus(state, pid, kind);
      if (!status) continue;
      project.lastYear = year;
      project.resistance = roundedProjectNumber(status.resistance);
      project.lastTransfer = 0;
      if (status.eligible <= 0) {
        FB.stopCountyCommunityProject(state, pid, kind);
        results.push({ kind:kind, target:status.target, count:0,
          completed:true });
        continue;
      }

      project.progress = roundedProjectNumber(
        project.progress + status.potential);
      var desired = Math.min(status.eligible, Math.floor(project.progress));
      if (desired < status.minimum && desired < status.eligible) desired = 0;
      var result = desired > 0 ? convertCountyCommunity(state, pid, {
        kind:kind,
        target:project.target,
        amount:desired,
        cause:'county community project'
      }, true) : { count:0, cohorts:[] };
      project = rec.communityProjects && rec.communityProjects[kind];
      if (!project) continue;
      project.progress = roundedProjectNumber(
        Math.max(0, project.progress - result.count));
      project.converted += result.count;
      project.lastTransfer = result.count;
      project.lastYear = year;
      project.resistance = roundedProjectNumber(status.resistance);
      var definition = projectPolicyDefinition(project.policy);
      if (status.control && definition && definition.modifier && FB.addModifier) {
        FB.addModifier(state, definition.modifier, pid, { silent:true });
      }
      var remaining = projectEligiblePopulation(
        rec.communities, kind, project.target);
      var completed = remaining <= 0;
      results.push({
        kind:kind,
        target:project.target,
        count:result.count,
        cohorts:result.cohorts,
        completed:completed
      });
      if (completed) FB.stopCountyCommunityProject(state, pid, kind);
    }
    return results;
  }

  FB.resolveCountyCommunityProjects = function (state, pid, year) {
    if (!state) return [];
    if (!ensureCountyPopulationRecord(state, pid)) return [];
    var targetYear = isFinite(Number(year))
      ? Math.round(Number(year)) : stateYear(state);
    return resolveCountyCommunityProjects(state, pid, targetYear);
  };

  function resolveSettlementCommunityProjects(state, pid, year) {
    var timing = populationTiming;
    if (!timing) return resolveSettlementCommunityProjectsUntimed.apply(this, arguments);
    var entry = timing.enter('Population annual operation: settlement community projects');
    try { return resolveSettlementCommunityProjectsUntimed.apply(this, arguments); }
    finally { timing.leave(entry); }
  }
  function resolveSettlementCommunityProjectsUntimed(state, pid, year) {
    var rec = state.population && state.population.counties[pid];
    var all = rec && rec.settlementCommunityProjects;
    if (!all) return [];
    var results = [];
    var slots = Object.keys(all).sort(function (a, b) {
      return Number(a) - Number(b);
    });
    for (var si = 0; si < slots.length; si++) {
      var idx = Number(slots[si]);
      for (var ki = 0; ki < 2; ki++) {
        var kind = ki ? 'culture' : 'faith';
        var project = rec.settlementCommunityProjects &&
          rec.settlementCommunityProjects[idx] &&
          rec.settlementCommunityProjects[idx][kind];
        if (!project || project.lastYear === year) continue;
        var status = FB.settlementCommunityProjectStatus(
          state, pid, idx, kind);
        if (!status) continue;
        project.lastYear = year;
        project.resistance = roundedProjectNumber(status.resistance);
        project.lastTransfer = 0;
        if (status.eligible <= 0) {
          FB.stopSettlementCommunityProject(state, pid, idx, kind);
          results.push({ settlement:idx, kind:kind,
            target:status.target, count:0, completed:true });
          continue;
        }
        project.progress = roundedProjectNumber(
          project.progress + status.potential);
        var desired = Math.min(status.eligible, Math.floor(project.progress));
        if (desired < status.minimum && desired < status.eligible) desired = 0;
        var result = desired > 0 ? convertSettlementCommunity(
          state, pid, idx, {
            kind:kind, target:project.target, amount:desired,
            cause:'settlement community project'
          }, true) : { count:0, cohorts:[] };
        project = rec.settlementCommunityProjects &&
          rec.settlementCommunityProjects[idx] &&
          rec.settlementCommunityProjects[idx][kind];
        if (!project) continue;
        project.progress = roundedProjectNumber(
          Math.max(0, project.progress - result.count));
        project.converted += result.count;
        project.lastTransfer = result.count;
        project.lastYear = year;
        project.resistance = roundedProjectNumber(status.resistance);
        var remaining = projectEligiblePopulation(
          FB.settlementCommunities(state, pid, idx), kind, project.target);
        var completed = remaining <= 0;
        results.push({
          settlement:idx, kind:kind, target:project.target,
          count:result.count, cohorts:result.cohorts, completed:completed
        });
        if (completed) FB.stopSettlementCommunityProject(
          state, pid, idx, kind);
      }
    }
    return results;
  }

  FB.resolveSettlementCommunityProjects = function (state, pid, year) {
    if (!state) return [];
    if (!ensureCountyPopulationRecord(state, pid)) return [];
    var targetYear = isFinite(Number(year))
      ? Math.round(Number(year)) : stateYear(state);
    return resolveSettlementCommunityProjects(state, pid, targetYear);
  };

  /* Developer-facing, read-only calibration. It clones the serializable
     campaign, then resolves only the named project so 25/50/100-year rate
     reviews use the real changing shares, resistance, and minimum-transfer
     carry without advancing wars, births, RNG, or the source campaign. */
  FB.observeCommunityProject = function (state, pid, request, horizons,
    settlementIndex) {
    if (!state || !request) return null;
    var years = Array.isArray(horizons) && horizons.length
      ? horizons.slice() : [25, 50, 100];
    years = years.map(function (year) {
      return Math.max(0, Math.round(Number(year) || 0));
    }).sort(function (a, b) { return a - b; });
    var clone = JSON.parse(JSON.stringify(state));
    FB.ensurePopulationState(clone);
    var local = typeof settlementIndex === 'number';
    var project = local
      ? FB.startSettlementCommunityProject(
        clone, pid, settlementIndex, request)
      : FB.startCountyCommunityProject(clone, pid, request);
    if (!project) return null;
    function share() {
      var communities = local
        ? FB.settlementCommunities(clone, pid, settlementIndex)
        : FB.countyCommunities(clone, pid);
      var field = request.kind === 'faith' ? 'religion' : 'culture';
      var total = communityTotal(communities);
      var matching = 0;
      for (var i = 0; i < communities.length; i++) {
        if (communities[i][field] === request.target) {
          matching += communities[i].count;
        }
      }
      return total ? matching / total : 0;
    }
    var result = {
      pid:pid, settlement:local ? settlementIndex : null,
      kind:request.kind, target:request.target, policy:request.policy,
      initialShare:share(), observations:[]
    };
    var next = 0;
    while (next < years.length && years[next] === 0) {
      result.observations.push({ years:0, share:share() });
      next++;
    }
    var maximum = years.length ? years[years.length - 1] : 0;
    for (var elapsed = 1; elapsed <= maximum; elapsed++) {
      clone.date.year++;
      if (local) {
        resolveSettlementCommunityProjects(clone, pid, clone.date.year);
      } else {
        resolveCountyCommunityProjects(clone, pid, clone.date.year);
      }
      while (next < years.length && years[next] === elapsed) {
        result.observations.push({ years:elapsed, share:share() });
        next++;
      }
    }
    while (next < years.length) {
      result.observations.push({ years:years[next], share:share() });
      next++;
    }
    return result;
  };

  FB.populationSaveDiagnostics = function (state) {
    if (!state || !state.population) return {
      bytes:0, counties:0, materializedCounties:0,
      materializedCohorts:0, settlementCells:0,
      communityRecords:0, maxCountyCommunities:0, projectCount:0
    };
    var result = {
      bytes:JSON.stringify(state.population).length,
      counties:0, materializedCounties:0,
      materializedCohorts:0, settlementCells:0,
      communityRecords:0, maxCountyCommunities:0, projectCount:0
    };
    var counties = state.population.counties || {};
    for (var pid in counties) {
      var rec = counties[pid];
      if (!rec) continue;
      result.counties++;
      var materialized = false;
      var communities = rec.communities || [];
      result.communityRecords += communities.length;
      result.maxCountyCommunities = Math.max(
        result.maxCountyCommunities, communities.length);
      for (var i = 0; i < communities.length; i++) {
        if (Array.isArray(communities[i].bySettlement)) {
          materialized = true;
          result.materializedCohorts++;
          result.settlementCells += communities[i].bySettlement.length;
        }
      }
      if (materialized) result.materializedCounties++;
      for (var kind of ['faith','culture']) {
        if (rec.communityProjects && rec.communityProjects[kind]) {
          result.projectCount++;
        }
      }
      var local = rec.settlementCommunityProjects || {};
      for (var slot in local) {
        for (var localKind of ['faith','culture']) {
          if (local[slot] && local[slot][localKind]) result.projectCount++;
        }
      }
    }
    return result;
  };

  var populationTiming = null;

  /* Annual population tick */
  FB.populationYear = function (state) {
    if (!state) return;
    var previousTiming = populationTiming;
    var timing = FB.game && FB.game._fastForwardTiming;
    populationTiming = timing;
    var phase = timing && timing.enter('Population annual phase: normalization');
    try {
      FB.ensurePopulationState(state);
      var currentYear = (state.date && isFinite(state.date.year) && state.date.year) ||
        (state.start && isFinite(state.start.year) && state.start.year) || 867;

      if (state.population.lastYear === currentYear) return;

      if (timing) { timing.leave(phase); phase = timing.enter('Population annual phase: setup and conflict snapshots'); }
      var provs = provinceList().filter(function (province) {
        return province && !province.wasteland;
      }).slice().sort(function (a, b) {
        return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
      });
      if (timing) timing.count('Population annual: counties', provs.length);
      var floor = populationFloor();
      var initialP = {};
      var naturalDeltas = {};
      var postNaturalCommunities = {};
      var postNaturalP = {};
      var attractions = {};
      var occupied = {};
      var ownerAtWar = {};
      var conflictSnapshot = countyConflictSnapshot(state);
      var warSnapshot = FB.realmWarSnapshot
        ? FB.realmWarSnapshot(state) : null;
      var rGrowth = balance('populationGrowthRate', 0.020);

      if (timing) { timing.leave(phase); phase = timing.enter('Population annual phase: enterprise upgrade snapshot'); }
      var enterpriseEffectsByCounty = FB.enterpriseUpgradeEffectsByCounty
        ? FB.enterpriseUpgradeEffectsByCounty(state) : null;
      var noEnterpriseEffects = {};
      if (timing) { timing.leave(phase); phase = timing.enter('Population annual phase: growth capacity and attraction'); }
      /* Stage 1: Natural growth & capacity */
      for (var i = 0; i < provs.length; i++) {
        var pr = provs[i];
        var pid = pr.id;
        var populationRecord = state.population.counties[pid];
        var P = populationRecord.count;
        initialP[pid] = P;
        var countyEnterpriseEffects = enterpriseEffectsByCounty ? (enterpriseEffectsByCounty[pid] || noEnterpriseEffects) : null;
        var K = FB.countyPopulationCapacity(state, pid, countyEnterpriseEffects);
        var pressure = FB.clamp(1 - (P / Math.max(1, K)), -0.50, 1.00);
        var natural = Math.round(P * rGrowth * pressure);
        natural = FB.clamp(natural, -Math.round(P * 0.01), Math.round(P * 0.02));
        if (natural < 0) natural = -Math.min(-natural, Math.max(0, P - floor));
        var naturalResult = applyCommunityDelta(
          state, populationRecord.communities, natural, null);
        naturalDeltas[pid] = naturalResult.applied;
        postNaturalCommunities[pid] = naturalResult.communities;
        postNaturalP[pid] = P + naturalResult.applied;
        var owner = provinceOwner(state, pid);
        if (!own(ownerAtWar, owner)) {
          ownerAtWar[owner] = warSnapshot
            ? warSnapshot.has(owner) : realmIsAtWar(state, owner);
        }
        occupied[pid] = !!conflictSnapshot[pid];
        attractions[pid] = FB.countyMigrationAttraction(state, pid, {
          enterpriseEffects:countyEnterpriseEffects,
          population:P,
          capacity:K,
          occupied:occupied[pid],
          ownerAtWar:ownerAtWar[owner],
          severeShock:countySevereMarketShock(state, pid)
        });
      }

      if (timing) { timing.leave(phase); phase = timing.enter('Population annual phase: migration edge proposals'); }
      /* Stage 2: Conserved Adjacency Migration */
      var migRate = balance('populationMigrationRate', 0.002);
      var maxOutflowRate = balance('populationMigrationMaxOutflow', 0.01);
      var edgeFlows = [];
      var outgoingEdges = {};
      var outflowProposed = {};

      for (var j = 0; j < provs.length; j++) {
        var u = provs[j];
        var uId = u.id;
        var adj = (FB.world && FB.world.adj && FB.world.adj[uId]) || {};
        var adjacentIds = Object.keys(adj).sort();
        for (var avi = 0; avi < adjacentIds.length; avi++) {
          var vId = adjacentIds[avi];
          if (timing) timing.count('Population annual: adjacency entries');
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
          if (occupied[uId] || occupied[vId]) {
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
            var edge = { from: sourceId, to: targetId, flow: flow };
            if (timing) timing.count('Population annual: proposed migration edges');
            edgeFlows.push(edge);
            (outgoingEdges[sourceId] = outgoingEdges[sourceId] || []).push(edge);
            outflowProposed[sourceId] = (outflowProposed[sourceId] || 0) + flow;
          }
        }
      }

      if (timing) { timing.leave(phase); phase = timing.enter('Population annual phase: migration sorting and outflow limits'); }
      edgeFlows.sort(function (a, b) {
        if (a.from !== b.from) return a.from < b.from ? -1 : 1;
        return a.to < b.to ? -1 : (a.to > b.to ? 1 : 0);
      });
      for (var outgoingId in outgoingEdges) {
        if (!own(outgoingEdges, outgoingId)) continue;
        outgoingEdges[outgoingId].sort(function (a, b) {
          return a.to < b.to ? -1 : (a.to > b.to ? 1 : 0);
        });
      }

      // Scale down any county exceeding its max allowed outflow
      var migrationDeltas = {};
      for (var k = 0; k < provs.length; k++) {
        migrationDeltas[provs[k].id] = 0;
      }

      var sourceIds = Object.keys(outflowProposed).sort();
      for (var sourceIndex = 0; sourceIndex < sourceIds.length; sourceIndex++) {
        var source = sourceIds[sourceIndex];
        var proposed = outflowProposed[source];
        var maxAllowed = Math.min(
          Math.round(initialP[source] * maxOutflowRate),
          Math.max(0, postNaturalP[source] - floor)
        );
        if (proposed > maxAllowed && proposed > 0) {
          var outgoing = outgoingEdges[source] || [];
          var scaled = apportionWeights(maxAllowed, outgoing, function (edge) {
            return edge.flow;
          });
          for (var o = 0; o < outgoing.length; o++) {
            outgoing[o].flow = Math.max(0, Math.min(outgoing[o].flow, scaled[o]));
          }
        }
      }

      if (timing) { timing.leave(phase); phase = timing.enter('Population annual phase: migration cohort distribution'); }
      /* Allocate every source's total outflow once. Edge distribution then
         divides those exact cohorts in canonical destination order. */
      var outgoingCohorts = {};
      var incomingCohorts = {};
      for (var si = 0; si < sourceIds.length; si++) {
        var cohortSourceId = sourceIds[si];
        var sourceEdges = outgoingEdges[cohortSourceId] || [];
        var sourceOutflow = 0;
        for (var sei = 0; sei < sourceEdges.length; sei++) {
          sourceOutflow += sourceEdges[sei].flow;
        }
        var sourceCohorts = allocatedCommunityCohorts(
          postNaturalCommunities[cohortSourceId], sourceOutflow);
        outgoingCohorts[cohortSourceId] = sourceCohorts;
        var distributedCohorts = distributeCohortsAcrossEdges(
          sourceCohorts, sourceEdges);
        for (var di = 0; di < sourceEdges.length; di++) {
          var sourceEdge = sourceEdges[di];
          incomingCohorts[sourceEdge.to] = mergeCohorts(
            incomingCohorts[sourceEdge.to] || [], distributedCohorts[di], 1);
        }
      }

      for (var ef = 0; ef < edgeFlows.length; ef++) {
        var edge = edgeFlows[ef];
        migrationDeltas[edge.from] -= edge.flow;
        migrationDeltas[edge.to] += edge.flow;
      }

      if (timing) { timing.leave(phase); phase = timing.enter('Population annual phase: apply population and settlement changes'); }
      /* Stage 3: Apply & Record */
      for (var m = 0; m < provs.length; m++) {
        var pDef = provs[m];
        var cId = pDef.id;
        var rec = state.population.counties[cId];
        if (!rec) continue;
        var natDelta = naturalDeltas[cId] || 0;
        var migDelta = migrationDeltas[cId] || 0;
        var finalCommunities = mergeCohorts(postNaturalCommunities[cId],
          outgoingCohorts[cId] || [], -1);
        finalCommunities = mergeCohorts(finalCommunities,
          incomingCohorts[cId] || [], 1);
        rec.communities = carrySettlementPartition(
          rec.communities, finalCommunities);
        var finalCount = communityTotal(finalCommunities);
        placeSettlementArrivals(state, cId, rec,
          incomingCohorts[cId] || [], finalCount, null);
        rec.count = finalCount;
        var expectedCount = initialP[cId] + natDelta + migDelta;
        if (rec.count !== expectedCount) {
          throw new Error('Population total invariant after annual pass in ' + cId);
        }
        rec.natural = natDelta;
        rec.migration = migDelta;
        rec.losses = 0;
        rec.communityChange = { faithConverted:0, cultureAssimilated:0 };
        repairCountyRecord(state, pDef, rec, currentYear);
      }

      if (timing) { timing.leave(phase); phase = timing.enter('Population annual phase: faith and culture projects'); }
      /* Stage 4: deterministic county faith and culture projects. Projects are
         explicit saved commitments; ownership and realm conversion never create
         one as a side effect. */
      for (var projectIndex = 0; projectIndex < provs.length; projectIndex++) {
        resolveCountyCommunityProjects(
          state, provs[projectIndex].id, currentYear);
        resolveSettlementCommunityProjects(
          state, provs[projectIndex].id, currentYear);
      }

      if (timing) { timing.leave(phase); phase = timing.enter('Population annual phase: final invariants'); }
      state.population.lastYear = currentYear;
      var migrationTotal = 0;
      for (var mt = 0; mt < provs.length; mt++) {
        migrationTotal += state.population.counties[provs[mt].id].migration;
      }
      if (migrationTotal !== 0) {
        throw new Error('Population migration invariant after annual pass: ' + migrationTotal);
      }
      assertPopulationCommunities(state, null, 'annual pass');
    } finally {
      if (timing) timing.leave(phase);
      populationTiming = previousTiming;
    }
  };

  /* Display-only on-demand settlement allocation. It deliberately reads the
     current record without invoking population repair, so opening a remote
     settlement sheet cannot mutate a save. */
  FB.settlementPopulations = function (state, pid) {
    var pr = provinceDef(pid);
    if (!state || !pr || pr.wasteland) return [];
    var rec = state.population && state.population.counties &&
      state.population.counties[pid];
    var total = rec && isFinite(Number(rec.count))
      ? Math.max(populationFloor(), Math.round(Number(rec.count)))
      : FB.countyPopulationBaseline(state, pid);
    return settlementPopulationAllocation(state, pid, total);
  };

  FB.settlementPopulation = function (state, pid, settlementIndex) {
    var alloc = FB.settlementPopulations(state, pid);
    var idx = settlementIndex | 0;
    return alloc[idx] !== undefined ? alloc[idx] : 0;
  };

})();
