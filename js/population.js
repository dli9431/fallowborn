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

  FB.countyBuildingAttraction = function (state, pid) {
    var attraction = countyBuildingBonus(state, pid, 'migrationAttraction');
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
  FB.countyOccupiedOrBesieged = countyOccupiedOrBesieged;

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

  function validCulture(cultureId) {
    return typeof cultureId === 'string' && !!FBDATA.cultures[cultureId];
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
    if (policy.culture && !validCulture(policy.culture)) return false;
    if (policy.religion && !validFaith(state, policy.religion)) return false;
    return true;
  }

  function policyMatches(community, policy) {
    return !policy ||
      (!policy.culture || community.culture === policy.culture) &&
      (!policy.religion || community.religion === policy.religion);
  }

  function applyCommunityDelta(state, communities, amount, options) {
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
      if (!source || !validCulture(source.culture) ||
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
    if (previous && aggregate.totals[previous] > 0) return previous;
    return best;
  }

  function repairCountyRecord(state, pr, rec, year) {
    var total = Math.max(populationFloor(), Math.round(Number(rec.count) || populationFloor()));
    rec.count = total;
    rec.natural = Math.round(Number(rec.natural) || 0);
    rec.migration = Math.round(Number(rec.migration) || 0);
    rec.losses = Math.round(Number(rec.losses) || 0);
    rec.communities = normalizedCountyCommunities(state, pr, rec, total);

    var identity = rec.identity && typeof rec.identity === 'object'
      ? rec.identity : {};
    var oldCulture = validCulture(identity.culture) ? identity.culture : pr.culture;
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
        if (!community || !validCulture(community.culture) ||
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
    }
    return faults;
  }

  FB.validatePopulationCommunities = function (state) {
    return populationCommunityFaults(state);
  };

  function assertPopulationCommunities(state, provinceIds, context) {
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
      if (!community || !validCulture(community.culture) ||
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

  FB.countyCulture = function (state, pid) {
    var rec = state && state.population && state.population.counties &&
      state.population.counties[pid];
    if (rec && rec.identity && validCulture(rec.identity.culture)) {
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

  FB.countyPopulation = function (state, pid) {
    if (!state) return 0;
    var pr = provinceDef(pid);
    if (!pr || pr.wasteland) return 0;
    FB.ensurePopulationState(state);
    var rec = state.population && state.population.counties && state.population.counties[pid];
    if (rec && isFinite(rec.count)) return Math.max(populationFloor(), rec.count);
    return FB.countyPopulationBaseline(state, pid);
  };

  /* Public population mutation helper. Ordinary changes are proportional;
     an explicit communityPolicy may target one culture, faith, or exact pair. */
  FB.changeCountyPopulation = function (state, pid, amount, cause, options) {
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
    if (delta < 0) delta = -Math.min(-delta, Math.max(0, before - floor));
    var result = applyCommunityDelta(state, rec.communities, delta, options);
    var applied = result.applied;
    if (applied === 0) return 0;

    rec.communities = result.communities;
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
     from the source; an array requests explicit pairs and counts. */
  FB.moveCommunityPopulation = function (state, fromPid, toPid, cohorts, cause) {
    var empty = { count:0, cohorts:[] };
    if (!state || fromPid === toPid) return empty;
    var fromPr = provinceDef(fromPid);
    var toPr = provinceDef(toPid);
    if (!fromPr || fromPr.wasteland || !toPr || toPr.wasteland) return empty;
    FB.ensurePopulationState(state);
    var fromRec = state.population.counties[fromPid];
    var toRec = state.population.counties[toPid];
    if (!fromRec || !toRec) return empty;
    var combinedBefore = fromRec.count + toRec.count;

    var requested;
    if (isFinite(Number(cohorts)) && !Array.isArray(cohorts)) {
      requested = allocatedCommunityCohorts(fromRec.communities,
        Math.max(0, Math.round(Number(cohorts))));
    } else if (Array.isArray(cohorts)) {
      var requestedByKey = {};
      var requestedOrder = [];
      for (var ci = 0; ci < cohorts.length; ci++) {
        var cohort = cohorts[ci];
        if (!cohort || !validCulture(cohort.culture) ||
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
      for (var ai = 0; ai < fromRec.communities.length; ai++) {
        var available = fromRec.communities[ai];
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

    fromRec.communities = mergeCohorts(fromRec.communities, requested, -1);
    toRec.communities = mergeCohorts(toRec.communities, requested, 1);
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

  /* Annual population tick */
  FB.populationYear = function (state) {
    if (!state) return;
    FB.ensurePopulationState(state);
    var currentYear = (state.date && isFinite(state.date.year) && state.date.year) ||
      (state.start && isFinite(state.start.year) && state.start.year) || 867;

    if (state.population.lastYear === currentYear) return;

    var provs = provinceList().filter(function (province) {
      return province && !province.wasteland;
    }).slice().sort(function (a, b) {
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
    var floor = populationFloor();
    var initialP = {};
    var naturalDeltas = {};
    var postNaturalCommunities = {};
    var postNaturalP = {};
    var attractions = {};
    var occupied = {};
    var ownerAtWar = {};
    var rGrowth = balance('populationGrowthRate', 0.020);

    /* Stage 1: Natural growth & capacity */
    for (var i = 0; i < provs.length; i++) {
      var pr = provs[i];
      var pid = pr.id;
      var populationRecord = state.population.counties[pid];
      var P = populationRecord.count;
      initialP[pid] = P;
      var K = FB.countyPopulationCapacity(state, pid);
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
      if (!own(ownerAtWar, owner)) ownerAtWar[owner] = realmIsAtWar(state, owner);
      occupied[pid] = countyOccupiedOrBesieged(state, pid);
      attractions[pid] = FB.countyMigrationAttraction(state, pid, {
        population:P,
        capacity:K,
        occupied:occupied[pid],
        ownerAtWar:ownerAtWar[owner],
        severeShock:countySevereMarketShock(state, pid)
      });
    }

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
          edgeFlows.push(edge);
          (outgoingEdges[sourceId] = outgoingEdges[sourceId] || []).push(edge);
          outflowProposed[sourceId] = (outflowProposed[sourceId] || 0) + flow;
        }
      }
    }

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
      rec.communities = finalCommunities;
      rec.count = communityTotal(finalCommunities);
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

    state.population.lastYear = currentYear;
    var migrationTotal = 0;
    for (var mt = 0; mt < provs.length; mt++) {
      migrationTotal += state.population.counties[provs[mt].id].migration;
    }
    if (migrationTotal !== 0) {
      throw new Error('Population migration invariant after annual pass: ' + migrationTotal);
    }
    assertPopulationCommunities(state, null, 'annual pass');
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
