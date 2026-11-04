/* Pure bounded policy projections and explicit simulation choice adapters. */
(function () {
  'use strict';
  var P = FB.aiDecisions = {}, cache = new WeakMap(), investmentSnapshots = new WeakMap();
  var unit = [0,1], ratio = [0,10], count = [0,2048,true];
  var investmentBenefits = ['tax','dev','research','piety','levy','retinue','archers','defense','siege',
    'populationCapacity','populationFamineProtection','populationCrisisProtection','migrationAttraction',
    'communityFaithPressure','garrison','siegeDelay'];
  var tuning = {aiRaidTargetDevelopmentWeight:[0,100]};
  var families = {
    war:{key:'aiWarPolicy', metrics:[],
      parameters:{chance:unit,bellicoseChance:unit,minimumStrengthRatio:ratio,
        maximumCommitments:count,aggressionAppetite:ratio,bellicoseAppetite:ratio}},
    expansion:{key:'aiExpansionPolicy', metrics:['aggression','consolidationBand','core','remaining','contacts','development','defensiveStrength'],parameters:{}},
    tactics:{key:'aiTacticsPolicy', metrics:['attackPower','defensePower','distance','objective'],parameters:{engagementMargin:[0.5,4],objectiveFirst:[0,1,true]}},
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
        seaCoastalMultiplier:ratio,seaInlandMultiplier:ratio,priorityMultiplier:ratio,
        transportCoastalMultiplier:ratio,transportInlandMultiplier:ratio,slotUnlockMultiplier:ratio,
        economyUnlockMultiplier:ratio,unitUnlockMultiplier:ratio,ruleUnlockMultiplier:ratio,practiceUnlockMultiplier:ratio}},
    intrigue:{key:'aiIntriguePolicy', metrics:['score','hostility','motive','weight'],parameters:{baseWeight:ratio,chanceRate:unit,maximumChance:unit,minimumWeight:ratio}},
    diplomacy:{key:'aiDiplomacyPolicy', metrics:['score','distance','regard','strengthRatio','sharedFaith'],
      parameters:{allianceChance:unit,cultivationMultiplier:ratio,peerCultivationMultiplier:ratio,rebelSupportCap:[0,3,true],
        relationshipDivisor:[0.01,1000],relationshipCap:[0,100],courtAmbitionMultiplier:ratio,
        courtMartialCenter:[0,100],courtMartialCap:[0,100],courtAgeCenter:[0,100],courtAgeScale:[0.01,100],
        courtAgeCap:[0,100],courtEconomicCap:[0,100]}},
    religion:{key:'aiReligionPolicy', metrics:['score','strengthRatio','importance','distance','zeal'],
      parameters:{minimumTargetRatio:ratio,participantRankWeight:[0,1000],participationTraitWeight:ratio,
        guaranteedAttackers:[0,8,true],attackerJoinChance:unit,defenderJoinChance:unit,failureMemoryYears:[1,200],
        failureDefeatWeight:ratio,failureCollapseWeight:ratio,targetHolyWeight:ratio,targetRatioCap:ratio,targetFailureWeight:ratio,
        longVowChance:unit,shortVowChance:unit,landDesireChance:unit,duchyDesireChance:unit,
        papalInvestitureChance:unit,papalSanctionChance:unit,papalLegationChance:unit,investitureAcceptThreshold:[0,100],
        investitureUncertainty:[0,100],investitureCompromiseChance:unit,absolutionPetitionChance:unit,
        electionRelationshipWeight:ratio,electionLearningWeight:ratio,electionDiplomacyWeight:ratio,
        electionPietyDivisor:[0.01,10000],electionPrestigeDivisor:[0.01,10000],electionCultureBonus:[0,100],
        electionBlocBonus:[0,100],electionUncertainty:[0,100],electionLeaderWeight:ratio,electionCompromiseWeight:ratio,
        conversionShareWeight:[0,100],conversionBishopWeight:[0,100],conversionSpouseWeight:[0,100]}},
    government:{key:'aiGovernmentPolicy', metrics:['score','cost','support','regard','distance','martial','diplomacy','age'],
      parameters:{agreementWillingness:unit,serviceWillingness:unit,settlementWillingness:unit,officeWillingness:unit,
        negotiationWillingness:unit,recruitWillingness:unit,mobileTradeCount:[1,2048,true],mobileRecruitCount:[0,2048,true],
        mobileBuyDays:[0,360],mobileSellDays:[0,720],mobileShortageDays:[0,360],provincialConcession:unit,
        candidateDiplomacyWeight:ratio,candidateMartialWeight:ratio,civicReserveMultiplier:ratio,
        civicAidAmount:[0,100],civicAidDays:[1,360,true],civicPeaceSeasons:[0,32,true]}}
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
  function orderFaults(order, metrics, path, errors) {
    if (!Array.isArray(order) || !order.length || order.length > 16) {
      errors.push(path + ' needs one to 16 entries.'); return;
    }
    var seen = Object.create(null);
    order.forEach(function (row,i) {
      if (!fields(row,['metric','direction'],path + '.' + i,errors)) return;
      if (metrics.indexOf(row.metric) < 0 || seen[row.metric]) errors.push(path + ' has an unknown or duplicate metric.');
      seen[row.metric] = true;
      if (row.direction !== 'asc' && row.direction !== 'desc') errors.push(path + ' direction must be asc or desc.');
    });
  }
  function recordFaults(d, data, path) {
    var errors = [];
    if (!fields(d,['family','mode','parameters','order','weights','bias','tieBreak','adjustments','buildingRoleWeights','benefitWeights','domainWeights','schemeOrder','aimOrder','aimOrders'],path,errors)) return errors;
    if (!own(families,d.family)) return errors.concat(path + '.family is unregistered.');
    var f = families[d.family], names = Object.keys(f.parameters);
    if (own(d,'aimOrders')) {
      if (d.family !== 'expansion' || d.mode !== 'ordered') errors.push(path + '.aimOrders requires ordered expansion.');
      if (fields(d.aimOrders,Object.keys(data.agencyRules && data.agencyRules.aims || {}),path + '.aimOrders',errors))
        Object.keys(d.aimOrders).forEach(function (aim) {
          orderFaults(d.aimOrders[aim],f.metrics,path + '.aimOrders.' + aim,errors);
        });
    }
    if (own(d,'aimOrder') && (d.family !== 'diplomacy' || !Array.isArray(d.aimOrder) ||
        !d.aimOrder.length || d.aimOrder.length > 32 || d.aimOrder.some(function (aim,i) {
          return !own(data.agencyRules && data.agencyRules.aims,aim) || d.aimOrder.indexOf(aim) !== i;
        }))) errors.push(path + '.aimOrder needs unique known ruler aims.');
    if (own(d,'schemeOrder') && (d.family !== 'intrigue' || !Array.isArray(d.schemeOrder) ||
        !d.schemeOrder.length || d.schemeOrder.length > 16 || d.schemeOrder.some(function (scheme,i) {
          return !own(data.plots,scheme) || !data.plots[scheme].hostile || d.schemeOrder.indexOf(scheme) !== i;
        }))) errors.push(path + '.schemeOrder needs unique known hostile schemes.');
    if (own(d,'domainWeights')) {
      if (d.family !== 'research') errors.push(path + '.domainWeights requires research.');
      if (fields(d.domainWeights,Object.keys(data.techDomains || {}),path + '.domainWeights',errors))
        Object.keys(d.domainWeights).forEach(function (domain) {
          if (!finite(d.domainWeights[domain],0,4)) errors.push(path + '.domainWeights is out of range.');
        });
    }
    function investmentFaults(record, at) {
      ['buildingRoleWeights','benefitWeights'].forEach(function (key) {
        if (!own(record,key)) return;
        if (d.family !== 'investment') errors.push(at + '.' + key + ' requires investment.');
        var names = key === 'buildingRoleWeights' ? Object.keys(FB.BUILDING_ROLES || {}) : investmentBenefits;
        if (fields(record[key],names,at + '.' + key,errors)) Object.keys(record[key]).forEach(function (name) {
          if (!finite(record[key][name],-100,100)) errors.push(at + '.' + key + ' is out of range.');
        });
      });
    }
    investmentFaults(d,path);
    if (['first','ordered','weighted'].indexOf(d.mode) < 0) errors.push(path + '.mode is unregistered.');
    if (d.family === 'war' && d.mode !== 'first') errors.push(path + ' war uses parameter choices only.');
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
        if (!fields(a,['kind','id','multiply','buildingRoleWeights','benefitWeights'],p,errors)) return;
        var table = a.kind === 'trait' ? data.traits : a.kind === 'aim' ? data.agencyRules && data.agencyRules.aims : null;
        var selector = a.kind + ':' + a.id;
        if (!id(a.id) || !own(table,a.id) || selectors[selector]) errors.push(p + ' has an unknown or duplicate selector.');
        selectors[selector] = true;
        if (fields(a.multiply,names,p + '.multiply',errors)) {
          if (!Object.keys(a.multiply).length && !Object.keys(a.buildingRoleWeights || {}).length &&
              !Object.keys(a.benefitWeights || {}).length) errors.push(p + ' needs a nonempty preference.');
          Object.keys(a.multiply).forEach(function (k) {
            if (!finite(a.multiply[k],0,4)) errors.push(p + '.multiply.' + k + ' is out of range.');
          });
        }
        investmentFaults(a,p);
      });
    }
    if (!errors.length && d.family === 'research' && d.parameters.horizonFloor > 0) {
      // Any trait subset and at most one aim must be safe before publication.
      var horizonRatio = d.parameters.horizonFloor/d.parameters.horizonCap, aimRatio = 1;
      d.adjustments.forEach(function (a) {
        var floor = own(a.multiply,'horizonFloor') ? a.multiply.horizonFloor : 1;
        var cap = own(a.multiply,'horizonCap') ? a.multiply.horizonCap : 1;
        var ratio = floor ? floor/cap : 0;
        if (a.kind === 'aim') aimRatio = Math.max(aimRatio,ratio);
        else horizonRatio *= Math.max(1,ratio);
      });
      if (horizonRatio*aimRatio > 1) errors.push(path + ' research horizon adjustments can invert their bounds.');
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
  P.invalidate = function () { cache = new WeakMap(); investmentSnapshots = new WeakMap(); };
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
  P.protocol = function (family) {
    if (family === undefined) return copy(families);
    if (!own(families,family)) throw new Error('Unknown AI decision family.');
    return copy(families[family]);
  };
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
    if (!realm || !realm.alive) return {traits:[],aim:null};
    var player = realmId === 'player';
    var person = player ? state.player && state.chars && state.chars[state.player.charId] :
      FB.realmRulerCharacterSnapshot(state,realmId);
    // A character's empty list is authoritative; the compact summary may lag.
    // Legacy personality is a war compatibility switch, never a trait alias.
    var ruler = player ? person && !person.dead && person : person || realm.ruler;
    var aim = FB.rulerAimSnapshot(state,realmId);
    return {traits:FB.traitIds(ruler),aim:aim && aim.id || null};
  };
  P.parameters = function (state, realmId, family) {
    var policy = P.resolve(state,realmId,family);
    if (family === 'investment') {
      var projection = P.report(policy,[],P.inputs(state,realmId));
      // Profile choices reuse the same detached snapshot as their parameters.
      // No realm, character or state identity is cached by this weak key.
      investmentSnapshots.set(projection.parameters,projection);
      return projection.parameters;
    }
    if (!policy.definition.adjustments.length) return policy.definition.parameters;
    return P.report(policy,[],P.inputs(state,realmId)).parameters;
  };
  P.willing = function (state, realmId, family, key) {
    var value = P.parameters(state,realmId,family)[key];
    if (!finite(value,0,1)) throw new Error('AI willingness requires a declared probability.');
    return value === 1 || value > 0 && FB.chance(value);
  };
  P.diplomaticFacts = function (state, realmId, targetId) {
    var ownStrength = FB.realmStrength(state,realmId), defense = FB.realmStrength(state,targetId);
    var realm = state.realms[realmId], target = state.realms[targetId];
    var a = realm && FB.world.byId[realm.capital], b = target && FB.world.byId[target.capital];
    var dx = a && b ? a.cx-b.cx : 0, dy = a && b ? a.cy-b.cy : 0;
    return {score:0,distance:dx*dx+dy*dy,regard:FB.rulerRegard ? FB.rulerRegard(state,realmId,targetId) : 0,
      strengthRatio:ownStrength/Math.max(1,defense),
      sharedFaith:FB.realmReligionId(state,realmId) === FB.realmReligionId(state,targetId) ? 1 : 0};
  };
  P.governmentCandidates = function (state, realmId, candidates, project) {
    if (P.resolve(state,realmId,'government').definition.mode === 'first') return candidates;
    var ids = P.orderCandidates(state,realmId,'government',candidates.map(function (candidate,i) {
      return {id:String(i),eligible:true,facts:Object.assign({score:0,cost:0,support:0,regard:0,distance:0,
        martial:0,diplomacy:0,age:0},project(candidate))};
    }));
    return ids.map(function (id) { return candidates[Number(id)]; });
  };
  P.choose = function (state, realmId, family, candidates) {
    var policy = P.resolve(state,realmId,family);
    var report = P.report(policy,candidates,policy.definition.adjustments.length || policy.definition.aimOrders ? P.inputs(state,realmId) : undefined);
    return P.pick(report,report.mode === 'weighted' && report.totalWeight > 0 ? FB.rng() : undefined);
  };
  P.investmentDelta = function (state, realmId, definition, cost, policy, parameters, projection) {
    policy = policy || P.resolve(state,realmId,'investment');
    projection = projection || parameters && investmentSnapshots.get(parameters) || P.report(policy,[],P.inputs(state,realmId));
    var p = parameters || projection.parameters;
    var benefit = (definition.tax || 0)+(definition.dev || 0)+(definition.research || 0)+
      (definition.piety || 0)+(definition.levy || 0)+(definition.retinue || 0)+(definition.populationCapacity || 0);
    var weights = projection.investment, score = weights.buildingRoleWeights[definition.role] || 0;
    Object.keys(weights.benefitWeights).forEach(function (key) {
      score += (definition[key] || 0)*weights.benefitWeights[key];
    });
    return Math.max(-1000000000,Math.min(1000000000,
      score+benefit*p.benefitWeight-cost*p.costWeight-(definition.upkeep || 0)*p.upkeepWeight));
  };
  P.buildingPriorities = function (state, realmId, pid, entries) {
    var policy = P.resolve(state,realmId,'investment'), projection = P.report(policy,[],P.inputs(state,realmId));
    var p = projection.parameters;
    var definition = policy.definition, needsCost = p.costWeight || own(definition.weights,'cost') ||
      definition.order.some(function (row) { return row.metric === 'cost'; });
    var needsFrontier = own(definition.weights,'frontier') || definition.order.some(function (row) { return row.metric === 'frontier'; });
    var ownTop = needsFrontier && FB.topRealm(state,realmId);
    var rows = entries.map(function (entry,index) {
      var county = entry.pid || pid;
      var d = Object.assign({},FBDATA.buildings[entry.id],entry.profileId && FBDATA.buildingProfiles[entry.profileId].replace || {});
      var cost = needsCost ? FB.buildCost(state,county,entry.id,realmId,entry.profileId) : d.cost || 0;
      var frontier = needsFrontier && Object.keys(FB.world.adj[county] || {}).some(function (neighbor) {
        return state.owner[neighbor] && state.owner[neighbor] !== ownTop;
      });
      var score = Math.max(-1000000000,Math.min(1000000000,
        -entry.order*p.buildOrderWeight+P.investmentDelta(state,realmId,d,cost,policy,p,projection)));
      return {entry:entry,index:index,score:score,facts:{capitalPriority:county === state.realms[realmId].capital ? 0 : 1,
        development:state.dev[county] || 1,buildOrder:entry.order,cost:cost,upkeep:d.upkeep || 0,
        benefit:(d.tax || 0)+(d.dev || 0)+(d.research || 0),frontier:frontier ? 1 : 0,score:score}};
    });
    rows.sort(function (a,b) { return b.score-a.score || a.index-b.index; });
    if (policy.definition.mode !== 'first') {
      var ids = P.orderCandidates(state,realmId,'investment',rows.map(function (r) { return {id:String(r.index),eligible:true,facts:r.facts}; }));
      var byIndex = Object.create(null);
      rows.forEach(function (row) { byIndex[row.index] = row; });
      rows = ids.map(function (id) { return byIndex[id]; });
    }
    return rows.map(function (r) { return r.entry; });
  };
  P.orderCandidates = function (state, realmId, family, candidates) {
    var policy = P.resolve(state,realmId,family);
    var report = P.report(policy,candidates,policy.definition.adjustments.length || policy.definition.aimOrders ? P.inputs(state,realmId) : undefined);
    var ids = report.ranking.filter(function (row) { return report.mode !== 'weighted' || row.weight > 0; })
      .map(function (row) { return row.id; });
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
    var investment = {buildingRoleWeights:copy(d.buildingRoleWeights || {}),benefitWeights:copy(d.benefitWeights || {})};
    traits.forEach(function (t) { identity[t] = true; });
    d.adjustments.forEach(function (a) {
      if (a.kind === 'trait' ? !identity[a.id] : a.id !== inputs.aim) return;
      applied.push(a.kind + ':' + a.id);
      Object.keys(a.multiply).forEach(function (k) { parameters[k] *= a.multiply[k]; });
      ['buildingRoleWeights','benefitWeights'].forEach(function (key) {
        Object.keys(a[key] || {}).forEach(function (name) {
          investment[key][name] = (investment[key][name] || 0)+a[key][name];
        });
      });
    });
    ['buildingRoleWeights','benefitWeights'].forEach(function (key) {
      Object.keys(investment[key]).forEach(function (name) {
        investment[key][name] = Math.max(-100,Math.min(100,investment[key][name]));
      });
    });
    Object.keys(parameters).forEach(function (k) {
      var spec = f.parameters[k];
      parameters[k] = Math.max(spec[0],Math.min(spec[1],parameters[k]));
      if (spec[2]) parameters[k] = Math.round(parameters[k]);
    });
    // Cross-parameter bounds must still hold after adjustments.
    if (d.family === 'research' && parameters.horizonFloor > parameters.horizonCap)
      throw new Error('AI research horizonFloor exceeds horizonCap after adjustments.');
    var order = d.aimOrders && own(d.aimOrders,inputs.aim) ? d.aimOrders[inputs.aim] : d.order;
    var seen = Object.create(null), required = d.mode === 'ordered' ? order.map(function (r) { return r.metric; }) : Object.keys(d.weights);
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
      for (var i=0;i<order.length;i++) {
        var rule = order[i], delta = a.facts[rule.metric] - b.facts[rule.metric];
        if (delta) return rule.direction === 'asc' ? delta : -delta;
      }
      return d.tieBreak === 'id' ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.index - b.index;
    });
    var report = {policyId:policy.id,family:d.family,mode:d.mode,definition:copy(d),parameters:parameters,adjustments:applied,investment:investment,
      candidates:rows,ranking:ranking.map(function (r) { return {id:r.id,weight:r.score}; }),
      totalWeight:ranking.reduce(function (sum,r) { return sum + r.score; },0)};
    if (d.family === 'tactics') report.tactics = {neutralMargin:d.parameters.engagementMargin,
      reason:parameters.engagementMargin < d.parameters.engagementMargin ? 'risk_accepting' :
        parameters.engagementMargin > d.parameters.engagementMargin ? 'risk_guarded' : 'risk_neutral'};
    return report;
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
