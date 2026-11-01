/* Trusted bounded policy protocol; never issues actions or draws randomness. */
(function () {
  'use strict';
  var P = FB.aiDecisions = {}, cache = new WeakMap();
  var unit = [0,1], ratio = [0,10], count = [0,2048,true];
  var tuning = {aiRaidTargetDevelopmentWeight:[0,100]};
  var families = {
    war:{key:'aiWarPolicy', metrics:['strengthRatio','support','burden','score'],
      parameters:{chance:unit,bellicoseChance:unit,minimumStrengthRatio:ratio,
        maximumCommitments:count,aggressionAppetite:ratio,bellicoseAppetite:ratio}},
    expansion:{key:'aiExpansionPolicy', metrics:['aggression','consolidationBand','core','remaining','contacts','development','defensiveStrength','score'],parameters:{}},
    tactics:{key:'aiTacticsPolicy', metrics:['attackPower','defensePower','distance','objective','score'],parameters:{engagementMargin:[0.5,4],objectiveFirst:[0,1,true]}},
    investment:{key:'aiInvestmentPolicy', metrics:['capitalPriority','development','buildOrder','cost','upkeep','benefit','frontier','score'],
      parameters:{capitalPriority:ratio,frontierPriority:ratio,interiorPriority:ratio,
        developmentWeight:[-100,100],fortDevelopmentWeight:[-100,100],buildOrderWeight:[-100,100],
        benefitWeight:[-100,100],costWeight:[-100,100],upkeepWeight:[-100,100],profileScoreWeight:ratio,
        baronPreference:[0,1,true],operationSpending:[0,1,true]}},
    research:{key:'aiResearchPolicy', metrics:['score','cost','exposed','historicalMultiplier','warfare','governance','commerce','seafaring','learning','agriculture','crafts'],
      parameters:{baseScore:[0,100],exposureMultiplier:ratio,historicalBase:ratio,historicalSlope:ratio,
        historicalFloor:ratio,horizonFloor:ratio,horizonCap:ratio,horizonMultiplier:ratio,
        futureThreshold:ratio,futureMultiplier:ratio,timelyMultiplier:ratio,aggressionMultiplier:ratio,
        wartimeMultiplier:ratio,rankMultiplier:ratio,commerceCoastalMultiplier:ratio,
        seaCoastalMultiplier:ratio,seaInlandMultiplier:ratio,priorityMultiplier:ratio}},
    intrigue:{key:'aiIntriguePolicy', metrics:['score','hostility','motive','weight','schemePriority'],parameters:{baseWeight:ratio,chanceRate:unit,maximumChance:unit}},
    diplomacy:{key:'aiDiplomacyPolicy', metrics:['score','distance','regard','strengthRatio','sharedFaith'],parameters:{allianceChance:unit}},
    religion:{key:'aiReligionPolicy', metrics:['score','strengthRatio','importance','distance','zeal'],parameters:{minimumTargetRatio:ratio}},
    government:{key:'aiGovernmentPolicy', metrics:['score','cost','support','regard','distance'],parameters:{}}
  };
  function own(o,k) { return !!o && Object.prototype.hasOwnProperty.call(o,k); }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o) &&
    (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null); }
  function finite(n,lo,hi) { return typeof n === 'number' && isFinite(n) && n >= lo && n <= hi; }
  function id(n) { return typeof n === 'string' && n.length <= 128 && /^[a-z][a-z0-9_]*$/.test(n); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function freeze(o) {
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') freeze(o[k]); });
    return Object.freeze(o);
  }
  function fields(o, allowed, path, errors) {
    if (!plain(o)) { errors.push(path + ' must be an object.'); return false; }
    Object.keys(o).forEach(function (k) {
      if (allowed.indexOf(k) < 0) errors.push(path + '.' + k + ' is unsupported.');
    });
    return true;
  }
  function recordFaults(d, data, path) {
    var errors = [];
    if (!fields(d,['family','mode','parameters','order','weights','bias','tieBreak','adjustments','buildingRoleWeights'],path,errors)) return errors;
    if (!own(families,d.family)) return errors.concat(path + '.family is unregistered.');
    var f = families[d.family], names = Object.keys(f.parameters);
    if (own(d,'buildingRoleWeights')) {
      if (d.family !== 'investment') errors.push(path + '.buildingRoleWeights requires investment.');
      if (fields(d.buildingRoleWeights,Object.keys(FB.BUILDING_ROLES || {}),path + '.buildingRoleWeights',errors))
        Object.keys(d.buildingRoleWeights).forEach(function (role) {
          if (!finite(d.buildingRoleWeights[role],-100,100)) errors.push(path + '.buildingRoleWeights is out of range.');
        });
    }
    if (['first','ordered','weighted'].indexOf(d.mode) < 0) errors.push(path + '.mode is unregistered.');
    if (fields(d.parameters,names,path + '.parameters',errors)) {
      names.forEach(function (k) {
        var spec = f.parameters[k], value = d.parameters[k];
        if (!finite(value,spec[0],spec[1]) || spec[2] && Math.floor(value) !== value)
          errors.push(path + '.parameters.' + k + ' is missing or out of range.');
      });
      if (d.family === 'research' && d.parameters.horizonFloor > d.parameters.horizonCap)
        errors.push(path + '.parameters horizonFloor exceeds horizonCap.');
    }
    if (!Array.isArray(d.order) || d.order.length > 16) errors.push(path + '.order needs at most 16 entries.');
    else {
      var seen = Object.create(null);
      d.order.forEach(function (row,i) {
        if (!fields(row,['metric','direction'],path + '.order.' + i,errors)) return;
        if (f.metrics.indexOf(row.metric) < 0 || seen[row.metric]) errors.push(path + '.order has an unknown or duplicate metric.');
        seen[row.metric] = true;
        if (row.direction !== 'asc' && row.direction !== 'desc') errors.push(path + '.order direction must be asc or desc.');
      });
    }
    if (fields(d.weights,f.metrics,path + '.weights',errors)) Object.keys(d.weights).forEach(function (k) {
      if (!finite(d.weights[k],-100,100)) errors.push(path + '.weights.' + k + ' is out of range.');
    });
    if (!finite(d.bias,0,1000000)) errors.push(path + '.bias is out of range.');
    if (d.tieBreak !== 'input' && d.tieBreak !== 'id') errors.push(path + '.tieBreak must be input or id.');
    if (Array.isArray(d.order) && plain(d.weights)) {
      if (d.mode === 'first' && (d.order.length || Object.keys(d.weights).length || d.bias !== 0 || d.tieBreak !== 'input'))
        errors.push(path + ' first mode requires input order and no scoring.');
      if (d.mode === 'ordered' && (!d.order.length || Object.keys(d.weights).length || d.bias !== 0))
        errors.push(path + ' ordered mode requires only ordering metrics.');
      if (d.mode === 'weighted' && (d.order.length || (!Object.keys(d.weights).length && !(d.bias > 0)) || d.tieBreak !== 'input'))
        errors.push(path + ' weighted mode requires input sampling order and scoring.');
    }
    if (!Array.isArray(d.adjustments) || d.adjustments.length > 32) errors.push(path + '.adjustments needs at most 32 entries.');
    else {
      var selectors = Object.create(null);
      d.adjustments.forEach(function (a,i) {
        var p = path + '.adjustments.' + i;
        if (!fields(a,['kind','id','multiply'],p,errors)) return;
        var table = a.kind === 'trait' ? data.traits : a.kind === 'aim' ? data.agencyRules && data.agencyRules.aims : null;
        var selector = a.kind + ':' + a.id;
        if (!id(a.id) || !own(table,a.id) || selectors[selector]) errors.push(p + ' has an unknown or duplicate selector.');
        selectors[selector] = true;
        if (fields(a.multiply,names,p + '.multiply',errors)) {
          if (!Object.keys(a.multiply).length) errors.push(p + '.multiply must not be empty.');
          Object.keys(a.multiply).forEach(function (k) {
            if (!finite(a.multiply[k],0,4)) errors.push(p + '.multiply.' + k + ' is out of range.');
          });
        }
      });
    }
    return errors;
  }
  P.catalogFaults = function (data, extraBalance, options) {
    var errors = [], table = data && data.aiDecisionPolicies;
    if (!plain(table) || Object.keys(table).length > 512) return ['aiDecisionPolicies needs at most 512 policy records.'];
    Object.keys(table).forEach(function (key) {
      if (!id(key)) errors.push('aiDecisionPolicies has an invalid id.');
      errors = errors.concat(recordFaults(table[key],data,'aiDecisionPolicies.' + key));
    });
    function selections(balance,path,required) {
      errors = errors.concat(P.balanceFaults(balance).map(function (key) { return path + '.' + key + ' is out of range.'; }));
      Object.keys(families).forEach(function (family) {
        var key = families[family].key;
        if (!required && !own(balance,key)) return;
        var selected = balance && balance[key];
        if (!id(selected) || !own(table,selected) || !table[selected] || table[selected].family !== family)
          errors.push(path + '.' + key + ' must name a policy of family ' + family + '.');
      });
    }
    selections(data.balance,'balance',true);
    selections(extraBalance,'mod.balance',false);
    ['eras','governmentForms'].forEach(function (root) {
      Object.keys(data[root] || {}).forEach(function (key) { selections(data[root][key] && data[root][key].balance,root + '.' + key + '.balance',false); });
    });
    // Inspect declared balance only, never resolve unrelated worlds at boot.
    // Canonical bookmark validation owns revision shape and selected-world faults.
    if (!options || options.worlds !== false) Object.keys(data.bookmarks || {}).forEach(function (key) {
      var world = data.bookmarks[key];
      selections(world && world.balance,'bookmarks.' + key + '.balance',false);
      Object.keys(world && world.revisions || {}).forEach(function (revision) {
        var row = world.revisions[revision];
        selections(row && row.balance,'bookmarks.' + key + '.revisions.' + revision + '.balance',false);
      });
    });
    return errors;
  };
  P.invalidate = function () { cache = new WeakMap(); };
  P.balanceFaults = function (balance) {
    return Object.keys(tuning).filter(function (key) {
      return own(balance,key) && !finite(balance[key],tuning[key][0],tuning[key][1]);
    });
  };
  P.selectionFaults = function (balance, data) {
    var faults = [], table = data.aiDecisionPolicies;
    Object.keys(families).forEach(function (family) {
      var key = families[family].key, selected = balance && balance[key];
      if (own(balance,key) && (!id(selected) || !own(table,selected) || !table[selected] || table[selected].family !== family))
        faults.push(key);
    });
    return faults;
  };
  P.protocol = function () { return copy(families); };
  P.compile = function (policyId, data) {
    data = data || FBDATA;
    var table = data.aiDecisionPolicies, definition = own(table,policyId) && table[policyId];
    if (!id(policyId) || !definition) throw new Error('Unknown AI decision policy.');
    var entries = cache.get(table);
    if (!entries) { entries = Object.create(null); cache.set(table,entries); }
    if (own(entries,policyId) && entries[policyId].source === definition &&
        entries[policyId].traits === data.traits && entries[policyId].aims === (data.agencyRules && data.agencyRules.aims)) return entries[policyId].policy;
    var errors = recordFaults(definition,data,'aiDecisionPolicies.' + policyId);
    if (errors.length) throw new Error(errors.join(' '));
    var policy = freeze({id:policyId,definition:copy(definition)});
    entries[policyId] = {source:definition,traits:data.traits,aims:data.agencyRules && data.agencyRules.aims,policy:policy};
    return policy;
  };
  P.resolve = function (state, realmId, family) {
    if (!own(families,family)) throw new Error('Unknown AI decision family.');
    var policy = P.compile(FB.balanceFor(state,realmId,families[family].key));
    if (policy.definition.family !== family) throw new Error('AI decision policy family mismatch.');
    return policy;
  };
  // Snapshot existing identity owners; never materialize a ruler or persist a policy.
  P.inputs = function (state, realmId) {
    var realm = state && state.realms && state.realms[realmId];
    var person = realm && FB.realmRulerCharacterSnapshot && FB.realmRulerCharacterSnapshot(state,realmId);
    var aim = state && state.agency && state.agency.rulerAims && state.agency.rulerAims[realmId];
    return {traits:person && person.traits ? person.traits.slice() : realm && realm.ruler && realm.ruler.trait ? [realm.ruler.trait] : [],
      aim:aim && aim.id || null};
  };
  P.parameters = function (state, realmId, family) {
    var policy = P.resolve(state,realmId,family);
    if (!policy.definition.adjustments.length) return policy.definition.parameters;
    return P.report(policy,[],P.inputs(state,realmId)).parameters;
  };
  P.choose = function (state, realmId, family, candidates) {
    var report = P.report(P.resolve(state,realmId,family),candidates,P.inputs(state,realmId));
    return P.pick(report,report.mode === 'weighted' && report.totalWeight > 0 ? FB.rng() : undefined);
  };
  P.investmentDelta = function (state, realmId, definition, cost, policy) {
    policy = policy || P.resolve(state,realmId,'investment');
    var p = policy.definition.adjustments.length ? P.parameters(state,realmId,'investment') : policy.definition.parameters;
    var benefit = (definition.tax || 0)+(definition.dev || 0)+(definition.research || 0)+
      (definition.piety || 0)+(definition.levy || 0)+(definition.retinue || 0)+(definition.populationCapacity || 0);
    var roles = policy.definition.buildingRoleWeights || {};
    return (roles[definition.role] || 0)+benefit*p.benefitWeight-cost*p.costWeight-(definition.upkeep || 0)*p.upkeepWeight;
  };
  P.buildingPriorities = function (state, realmId, pid, entries) {
    var policy = P.resolve(state,realmId,'investment'), p = P.parameters(state,realmId,'investment');
    var rows = entries.map(function (entry,index) {
      var county = entry.pid || pid;
      var d = Object.assign({},FBDATA.buildings[entry.id],entry.profileId && FBDATA.buildingProfiles[entry.profileId].replace || {});
      var cost = p.costWeight ? FB.buildCost(state,county,entry.id,realmId,entry.profileId) : d.cost || 0;
      var score = -entry.order*p.buildOrderWeight+P.investmentDelta(state,realmId,d,cost,policy);
      return {entry:entry,index:index,score:score,facts:{capitalPriority:county === state.realms[realmId].capital ? 0 : 1,
        development:state.dev[county] || 1,buildOrder:entry.order,cost:cost,upkeep:d.upkeep || 0,
        benefit:(d.tax || 0)+(d.dev || 0)+(d.research || 0),frontier:0,score:score}};
    });
    rows.sort(function (a,b) { return b.score-a.score || a.index-b.index; });
    if (policy.definition.mode !== 'first') {
      var ids = P.orderCandidates(state,realmId,'investment',rows.map(function (r) { return {id:String(r.index),eligible:true,facts:r.facts}; }));
      rows.sort(function (a,b) { return ids.indexOf(String(a.index))-ids.indexOf(String(b.index)); });
    }
    return rows.map(function (r) { return r.entry; });
  };
  P.orderCandidates = function (state, realmId, family, candidates) {
    var report = P.report(P.resolve(state,realmId,family),candidates,P.inputs(state,realmId));
    var ids = report.ranking.map(function (row) { return row.id; });
    if (report.mode === 'weighted' && report.totalWeight > 0) {
      var first = P.pick(report,FB.rng());
      ids = [first].concat(ids.filter(function (id) { return id !== first; }));
    }
    return ids;
  };
  P.report = function (policy, candidates, inputs) {
    var d = policy.definition, f = families[d.family], errors = [];
    inputs = inputs === undefined ? {} : inputs;
    if (!fields(inputs,['traits','aim'],'inputs',errors)) throw new Error(errors.join(' '));
    var traits = inputs.traits === undefined ? [] : inputs.traits;
    if (errors.length || !Array.isArray(traits) || traits.length > 128 || traits.some(function (t) { return !id(t); }) ||
        inputs.aim !== undefined && inputs.aim !== null && !id(inputs.aim)) throw new Error('Invalid AI preference inputs.');
    if (!Array.isArray(candidates) || candidates.length > 2048) throw new Error('AI decisions accept at most 2048 candidates.');
    var parameters = copy(d.parameters), applied = [], identity = Object.create(null);
    traits.forEach(function (t) { identity[t] = true; });
    d.adjustments.forEach(function (a) {
      if (a.kind === 'trait' ? !identity[a.id] : a.id !== inputs.aim) return;
      applied.push(a.kind + ':' + a.id);
      Object.keys(a.multiply).forEach(function (k) { parameters[k] *= a.multiply[k]; });
    });
    Object.keys(parameters).forEach(function (k) {
      var spec = f.parameters[k];
      parameters[k] = Math.max(spec[0],Math.min(spec[1],parameters[k]));
      if (spec[2]) parameters[k] = Math.round(parameters[k]);
    });
    // Cross-parameter bounds must still hold after adjustments.
    if (d.family === 'research' && parameters.horizonFloor > parameters.horizonCap)
      throw new Error('AI research horizonFloor exceeds horizonCap after adjustments.');
    var seen = Object.create(null), required = d.mode === 'ordered' ? d.order.map(function (r) { return r.metric; }) : Object.keys(d.weights);
    var rows = candidates.map(function (candidate,index) {
      var p = 'candidates.' + index;
      if (!fields(candidate,['id','eligible','facts'],p,errors)) return null;
      if (typeof candidate.id !== 'string' || !candidate.id.length || candidate.id.length > 128 || own(seen,candidate.id) || typeof candidate.eligible !== 'boolean') {
        errors.push(p + ' needs a unique id and explicit eligibility.'); return null;
      }
      seen[candidate.id] = true;
      if (!fields(candidate.facts,f.metrics,p + '.facts',errors)) return null;
      Object.keys(candidate.facts).forEach(function (k) {
        if (!finite(candidate.facts[k],-1000000000,1000000000)) errors.push(p + '.facts.' + k + ' is out of range.');
      });
      if (candidate.eligible) required.forEach(function (k) {
        if (!own(candidate.facts,k)) errors.push(p + '.facts.' + k + ' is required.');
      });
      var parts = {}, score = 0;
      if (candidate.eligible && d.mode === 'weighted') {
        score = d.bias;
        required.forEach(function (k) { parts[k] = candidate.facts[k] * d.weights[k]; score += parts[k]; });
        score = Math.max(0,score);
      }
      return {id:candidate.id,eligible:candidate.eligible,facts:copy(candidate.facts),components:parts,score:score,index:index};
    });
    if (errors.length) throw new Error(errors.join(' '));
    var ranking = rows.filter(function (r) { return r.eligible; });
    if (d.mode === 'ordered') ranking.sort(function (a,b) {
      for (var i=0;i<d.order.length;i++) {
        var order = d.order[i], delta = a.facts[order.metric] - b.facts[order.metric];
        if (delta) return order.direction === 'asc' ? delta : -delta;
      }
      return d.tieBreak === 'id' ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.index - b.index;
    });
    return {policyId:policy.id,family:d.family,mode:d.mode,definition:copy(d),parameters:parameters,adjustments:applied,
      candidates:rows,ranking:ranking.map(function (r) { return {id:r.id,weight:r.score}; }),
      totalWeight:ranking.reduce(function (sum,r) { return sum + r.score; },0)};
  };
  P.pick = function (report, roll) {
    if (report.mode !== 'weighted') return report.ranking.length ? report.ranking[0].id : null;
    if (!report.ranking.length || !(report.totalWeight > 0)) return null;
    if (!finite(roll,0,1) || roll === 1) throw new Error('Weighted AI choice requires an explicit roll in [0,1).');
    var target = roll * report.totalWeight, cumulative = 0;
    for (var i=0;i<report.ranking.length;i++) {
      cumulative += report.ranking[i].weight;
      if (target < cumulative) return report.ranking[i].id;
    }
    return report.ranking[report.ranking.length-1].id;
  };
})();
