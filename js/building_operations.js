/* Conserved water service. Resource transactions are staged before publication. */
(function () {
  'use strict';
  var O = FB.buildingOperations = {}, R = FB.siteResources;
  var effects = ['tax','piety','research','populationCapacity','populationFamineProtection',
    'populationCrisisProtection','migrationAttraction'];
  function own(o,k) { return Object.prototype.hasOwnProperty.call(o || {},k); }
  function object(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function keys(o,list) { return object(o) && Object.keys(o).length === list.length && list.every(function (k) { return own(o,k); }); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function equal(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function id(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v) && ['constructor','prototype','__proto__'].indexOf(v) < 0; }
  function integer(v,lo,hi) { return Number.isSafeInteger(v) && v >= lo && v <= hi; }
  function money(v,max) { return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= (max || 1000000); }
  function actorValid(a) { return keys(a,['kind','id']) && ['realm','character'].indexOf(a.kind) >= 0 && typeof a.id === 'string'; }
  function profile(r) { return r && r.waterOperation && FBDATA.buildingOperationProfiles[r.waterOperation.profileId]; }
  function effectKeys(p) { return p && p.mode === 'use' ? [].concat(p.effect) : []; }
  O.catalogFaults = function (c) {
    var out = [], table = c.buildingOperationProfiles;
    if (!object(table) || Object.keys(table).length > 128) return ['buildingOperationProfiles must be a table of at most 128 policies.'];
    Object.keys(table).forEach(function (key) {
      var p = table[key];
      if (!id(key) || !object(p) || !['mode','amount','periodDays','workCost','effect'].every(function (k) { return own(p,k); }) ||
          Object.keys(p).some(function (k) { return ['mode','amount','periodDays','workCost','effect','sourceRequirements'].indexOf(k) < 0; }) ||
          ['store','use'].indexOf(p.mode) < 0 || !integer(p.amount,1,1000000) ||
          !integer(p.periodDays,1,90) || !money(p.workCost) || p.workCost <= 0 ||
          (p.mode === 'store' ? p.effect !== null : !effectKeys(p).length || effectKeys(p).length > effects.length ||
            effectKeys(p).some(function (k,i,a) { return effects.indexOf(k) < 0 || a.indexOf(k) !== i; })))
        out.push('buildingOperationProfiles.' + key + ': invalid water service terms.');
      var r = p && p.sourceRequirements;
      if (r !== undefined && (!keys(r,['originKind','originSuitability','minStores']) ||
          ['flow','storage'].indexOf(r.originKind) < 0 || !integer(r.minStores,0,8) ||
          !Array.isArray(r.originSuitability) || r.originSuitability.length > 4 ||
          r.originSuitability.some(function (k,i) { return ['source','catchment','gradient','groundwater'].indexOf(k) < 0 || r.originSuitability.indexOf(k) !== i; })))
        out.push('buildingOperationProfiles.' + key + ': invalid physical source requirements.');
    });
    Object.keys(c.buildings || {}).forEach(function (key) {
      var d = c.buildings[key], p = d && table[d.operationProfile];
      if (!d || d.operationProfile === undefined) return;
      if (!id(d.operationProfile) || !p || d.fort || d.dev || d.pop || d.prestige || d.levy || d.retinue || d.archers ||
          d.defense || d.siege || d.communityFaithPressure || d.upkeep !== undefined && !money(d.upkeep) ||
          effects.some(function (k) { return d[k] !== undefined && (!money(d[k]) || (d[k] !== 0 && effectKeys(p).indexOf(k) < 0)); }) ||
          p.mode === 'use' && effectKeys(p).some(function (k) { return !(d[k] > 0); })) out.push('Building ' + key + ': invalid operationProfile or unsupported effect.');
    });
    return out;
  };
  O.compilePrepared = function (bm) {
    var out = {assignments:[],errors:O.catalogFaults(FBDATA)}, rows = bm && bm.buildingOperationAssignments;
    if (rows === undefined || out.errors.length) return out;
    function fault() { out.errors.push('buildingOperationAssignments: invalid asset, route, source or demand.'); }
    if (!Array.isArray(rows) || rows.length > 256) { fault(); return out; }
    var sources = R.compilePrepared(bm), seen = {}, occupied = {}, demands = {}, demandSites = {};
    out.errors = out.errors.concat(sources.errors);
    rows.forEach(function (a) {
      if (!keys(a,['id','profileId','buildingId','countyId','siteId','sourceId','stores','demandId']) || !id(a.id) || seen[a.id] ||
          !id(a.profileId) || !id(a.buildingId) || !id(a.countyId) || !id(a.siteId) || !id(a.sourceId) || !id(a.demandId) ||
          !Array.isArray(a.stores) || a.stores.length > 8 || a.stores.some(function (v,i) { return !id(v) || a.stores.indexOf(v) !== i || v === a.sourceId; })) { fault(); return; }
      seen[a.id] = true;
      var p = FBDATA.buildingOperationProfiles[a.profileId], d = FBDATA.buildings[a.buildingId];
      var pr = (bm.provinces || []).find(function (v) { return v.id === a.countyId && !v.wasteland; });
      var slot = pr && (pr.settlements || []).findIndex(function (v) { return v.site === a.siteId; });
      var route = [a.sourceId].concat(a.stores).map(function (key) { return sources.sources.find(function (v) { return v.id === key; }); });
      var last = route[route.length - 1], asset = JSON.stringify([a.countyId,a.siteId,a.buildingId]);
      var demandSite = JSON.stringify([a.countyId,a.siteId,p && (Array.isArray(p.effect) ? p.effect.slice().sort() : p.effect)]);
      var demandKeys = effectKeys(p).map(function (k) { return JSON.stringify([a.countyId,a.siteId,k]); });
      var requirements = p && p.sourceRequirements, origin = route[0];
      var suitable = !requirements || origin && origin.profile.kind === requirements.originKind &&
        a.stores.length >= requirements.minStores && requirements.originSuitability.every(function (k) { return origin.suitability[k] === true; });
      if (!suitable || !p || !d || !(d.operationProfile === a.profileId || FB.buildingProfiles.ids(a.buildingId).some(function (id) { return FB.buildingProfiles.definition(a.buildingId,id).operationProfile === a.profileId; })) || !pr || slot === undefined || slot < 0 || occupied[asset] ||
          route.some(function (v,i) { return !v || v.profile.unit !== 'water' || i > 0 && (v.profile.kind !== 'storage' || v.connectedSourceId !== route[i-1].id); }) ||
          !last || last.countyId !== a.countyId || last.siteId !== a.siteId ||
          p.mode === 'store' && !a.stores.length || route[0] && route[0].profile.kind === 'access' ||
          p.mode === 'use' && (demands[a.demandId] && demands[a.demandId] !== demandSite || demandKeys.some(function (k) { return demandSites[k] && demandSites[k] !== a.demandId; }))) { fault(); return; }
      occupied[asset] = true;
      if (p.mode === 'use') { demands[a.demandId] = demandSite; demandKeys.forEach(function (k) { demandSites[k] = a.demandId; }); }
      out.assignments.push(Object.assign(copy(a),{slot:slot,profile:copy(p)}));
    });
    if (out.errors.length) out.assignments = [];
    return out;
  };
  O.compile = function (bm) { return FB.compileBuildingOperations(bm); };
  var cache = null;
  function plan(s) {
    var bm = FB.campaignBookmark(s), raw = bm && FBDATA.bookmarks[bm.id], sig = FB.mods.sig();
    if (!cache || cache.raw !== raw || cache.revision !== bm.revision || cache.sig !== sig)
      cache = {raw:raw,revision:bm.revision,sig:sig,value:O.compile(bm)};
    return cache.value;
  }
  function definition(s) {
    var p = plan(s);
    if (cache.definition) return cache.definition;
    cache.definition = FB.mods.fingerprint(p.assignments.map(function (a) {
      var d = FBDATA.buildings[a.buildingId], v = copy(a); delete v.slot;
      v.effectValue = Array.isArray(a.profile.effect) ? effectKeys(a.profile).map(function (k) { return d[k] || 0; }) : a.profile.effect ? d[a.profile.effect] : 0; v.upkeep = d.upkeep || 0; return v;
    }));
    return cache.definition;
  }
  function assignment(s,pid,slot,buildingId,operationProfile) {
    return plan(s).assignments.find(function (a) { return a.countyId === pid && a.slot === slot && a.buildingId === buildingId && (!operationProfile || a.profileId === operationProfile); });
  }
  function record(s,pid,slot,buildingId) {
    return (s.buildings && s.buildings[pid] || []).find(function (r) { return r && r.s === slot && r.id === buildingId; });
  }
  function identity(s,a,pid,slot) {
    var who = actorValid(a) && FB.political.actor(s,a), c = who && s.chars[who.characterId];
    if (!c || c.dead || c.captive || c.unfree || c.imprisoned || c.prisonerOf || c.exiled || FB.ageOf(c,s.date.year) < 16 ||
        FB.justiceCustodyOf(s,c.id) || a.kind === 'character' && a.id === s.player.charId && s.player.flags.in_prison ||
        !FB.settlementConstructionAuthority(s,pid,slot,a).direct ||
        FB.recruitmentCountyBlocked(s,s.holder[pid] || s.owner[pid],pid) ||
        a.kind === 'realm' && !FB.homeAuthority.quote(s,a.id,'spend',{provinceId:pid}).allowed) return null;
    return {characterId:c.id,generation:a.kind === 'realm' ? who.rulerGeneration : null,
      holder:FB.settlementHolder(s,pid,slot),owner:s.owner[pid]};
  }
  function receipt(s,r) { return r && r.waterOperation && s.buildingOperations && s.buildingOperations.receipts[r.waterOperation.id]; }
  function sourcesCurrent(s,used,a) {
    var rows = R.snapshot(s,null,null,a);
    return used.every(function (u) {
      var row = rows.find(function (v) { return v.id === u.id; });
      return row && row.allowed && row.period === u.period && row.profileId === u.profileId && s.siteResources.sources[u.id];
    });
  }
  function active(s,pid,r) {
    var v = receipt(s,r), p = profile(r);
    return !!v && !!p && !!s.siteResources && s.siteResources.revision >= v.resourceRevision &&
      s.buildingOperations.definition === definition(s) && v.revision === r.waterOperation.revision &&
      p.mode === 'use' && !r.ruined && s.turn >= v.turn && s.turn < v.untilTurn &&
      equal(identity(s,v.actor,pid,r.s),v.authority) && sourcesCurrent(s,v.sources,v.actor) &&
      (!r.institutionBinding || FB.buildingInstitutionOperating(s,pid,r));
  }
  /* Only this projection supplies ongoing values for an opted-in record. */
  O.effects = function (s,pid,r) {
    var d = FB.buildingProfiles.assetDefinition(r) || {};
    if (r.buildingProfile && !FB.buildingProfiles.operationReady(s,pid,r) ||
        FB.buildingInstitutionRequiresBinding(d) && !FB.buildingInstitutionOperating(s,pid,r)) {
      var dormant = Object.assign({},d);
      ['tax','dev','pop','prestige','piety','research','levy','retinue','archers','defense','siege',
        'populationCapacity','populationFamineProtection','populationCrisisProtection','migrationAttraction','communityFaithPressure','upkeep'].forEach(function (k) { dormant[k] = 0; });
      return dormant;
    }
    if (!r.waterOperation) return FB.buildingSeasons.effects(s,pid,r,d);
    var out = Object.assign({},d), p = profile(r), on = active(s,pid,r);
    effects.forEach(function (key) { out[key] = on && effectKeys(p).indexOf(key) >= 0 ? d[key] || 0 : 0; });
    out.upkeep = 0; // The reviewed operation prepaid its exact finite term.
    return FB.buildingSeasons.effects(s,pid,r,out);
  };
  O.countyKey = function (s,pid,rows) {
    var seasonal = FB.buildingSeasons.hasCounty(s,pid);
    return rows.map(function (r) {
      if (!r || !r.waterOperation && !seasonal) return null;
      var current = O.effects(s,pid,r);
      return JSON.stringify([r.waterOperation || null,receipt(s,r) || null,effects.map(function(k){return current[k] || 0;})]);
    }).join(',');
  };
  O.bind = function (s,pid,r) {
    var d = FB.buildingProfiles.assetDefinition(r), a = d && d.operationProfile && assignment(s,pid,r.s,r.id,d.operationProfile);
    if (a) r.waterOperation = {v:1,id:FB.uid(),profileId:a.profileId,assignmentId:a.id,revision:0};
    FB.production.bindConstruction(s,pid,r);
  };
  function publicPayer(s,a) { return a.kind === 'realm' && (a.id !== 'player' || FB.electiveCrown(s,a.id)); }
  function funds(s,a) {
    return a.kind === 'realm' ? FB.treasuryAvailable(s,a.id) :
      a.id === s.player.charId ? s.player.gold : FB.baronyAccount(s,a.id).gold;
  }
  function reserveFloor(s,a) {
    if (publicPayer(s,a)) return (FB.treasuryConstructionReserves(s,
      a.id === 'player' ? FB.treasurySnapshot(s,{openingPlayer:true}) : undefined) || {})[a.id];
    if (a.kind === 'character' && a.id !== s.player.charId) return Math.max(0,funds(s,a) - FB.baronyConstructionFunds(s,a.id));
    return 0;
  }
  function stage(s,a,who) {
    var shadow = Object.assign({},s), steps = [], before = R.snapshot(s), used = [];
    if (s.siteResources !== undefined) shadow.siteResources = copy(s.siteResources);
    var route = [a.sourceId].concat(a.stores);
    for (var i = 0; i < route.length; i++) {
      var row = before.find(function (v) { return v.id === route[i]; });
      if (!row) return null;
      used.push({id:row.id,profileId:row.profileId,period:row.period});
      var request = {operation:'reserve',sourceId:row.id,actor:who,amount:a.profile.amount};
      var q = R.quote(shadow,request), claim = R.commit(shadow,q);
      if (!claim) return null;
      steps.push(q.signature);
      if (i + 1 < route.length) request = {operation:'transfer',sourceId:row.id,actor:who,reservationId:claim,destinationId:route[i+1]};
      else if (a.profile.mode === 'use') request = {operation:'consume',sourceId:row.id,actor:who,reservationId:claim};
      else { // A store ends with received stock, not a fresh reservation.
        request = {operation:'release',sourceId:row.id,actor:who,reservationId:claim};
      }
      q = R.quote(shadow,request);
      if (!R.commit(shadow,q)) return null;
      steps.push(q.signature);
    }
    return {resources:shadow.siteResources,sources:used,steps:steps};
  }
  O.quote = function (s,request) {
    var q = {allowed:false,reason:'asset',request:object(request) ? copy(request) : null};
    if (!keys(request,['countyId','settlement','buildingId','actor']) || !actorValid(request.actor) ||
        !integer(request.settlement,0,2047)) return q;
    var a = assignment(s,request.countyId,request.settlement,request.buildingId), r = record(s,request.countyId,request.settlement,request.buildingId);
    if (!a || !r || r.ruined || !r.waterOperation || plan(s).errors.length) return q;
    O.validate(s);
    FB.buildingSeasons.validate(s);
    var who = identity(s,request.actor,request.countyId,request.settlement), old = receipt(s,r), p = a.profile;
    q.reason = 'authority';
    if (!who || r.buildingProfile && !FB.buildingProfiles.operationReady(s,request.countyId,r) ||
        r.institutionBinding && !FB.buildingInstitutionOperating(s,request.countyId,r)) return q;
    q.reason = 'season';
    if (!FB.buildingSeasons.ready(s,'operationId',a.id,request.actor)) return q;
    q.reason = 'period';
    var period = Math.floor(s.turn / p.periodDays);
    if (old && old.period >= period) return q;
    var root = s.buildingOperations;
    if (root && root.revision >= Number.MAX_SAFE_INTEGER) return q;
    if (root && !root.receipts[r.waterOperation.id] && Object.keys(root.receipts).length >= 2048) return q;
    if (root && Object.keys(root.receipts).some(function (key) {
      var v = root.receipts[key]; return key !== r.waterOperation.id && v.demandId === a.demandId && s.turn < v.untilTurn;
    })) return q;
    q.reason = 'water';
    var staged = stage(s,a,request.actor);
    if (!staged) return q;
    var until = Math.min((period + 1) * p.periodDays,FB.buildingSeasons.until(s,'operationId',a.id)), rows = R.snapshot(s);
    staged.sources.forEach(function (v) {
      var row = rows.find(function (r) { return r.id === v.id; });
      if (row.periodDays) until = Math.min(until,(v.period + 1) * row.periodDays);
    });
    // Paid local service has a finite quantity and term. It awards no wages or household workday.
    q.reason = 'work';
    if (!((s.population && s.population.counties[request.countyId] || {}).count > 0)) return q;
    var d = FB.buildingProfiles.assetDefinition(r), cost = p.workCost + (d.upkeep || 0) * (until - s.turn) / 90;
    var balance = funds(s,request.actor), floor = reserveFloor(s,request.actor);
    q.reason = 'funds';
    if (!money(cost,2000000) || !Number.isFinite(balance) || !Number.isFinite(floor) || balance < cost + floor) return q;
    q.allowed = true; q.reason = null; q.cost = cost; q.workCost = p.workCost; q.untilTurn = until; q.mode = p.mode;
    q.period = period; q.amount = p.amount; q.authority = who; q.sources = staged.sources;
    q.signature = JSON.stringify([s.turn,definition(s),r,s.buildingOperations || null,s.siteResources || null,staged.steps,balance,floor,q]);
    return q;
  };
  O.commit = function (s,review) {
    if (!review || !review.allowed) return false;
    var q = O.quote(s,review.request);
    if (!q.allowed || !equal(q,review)) return false;
    var request = q.request, a = assignment(s,request.countyId,request.settlement,request.buildingId);
    var staged = stage(s,a,request.actor), r = record(s,request.countyId,request.settlement,request.buildingId);
    if (!staged) return false;
    var next = s.buildingOperations ? copy(s.buildingOperations) : {version:1,definition:definition(s),revision:0,receipts:{}};
    next.revision++;
    var paid = publicPayer(s,request.actor)
      ? FB.treasurySpendOptional(s,request.actor.id,q.cost,reserveFloor(s,request.actor)) :
      request.actor.kind === 'character' && request.actor.id !== s.player.charId
        ? FB.spendBaronyConstruction(s,request.actor.id,q.cost,0) : s.player.gold >= q.cost;
    if (!paid) return false;
    if (!publicPayer(s,request.actor) && (request.actor.id === 'player' || request.actor.kind === 'character' && request.actor.id === s.player.charId)) s.player.gold -= q.cost;
    next.receipts[r.waterOperation.id] = {assignmentId:a.id,assetId:r.waterOperation.id,revision:next.revision,
      actor:copy(request.actor),authority:q.authority,turn:s.turn,untilTurn:q.untilTurn,period:q.period,
      amount:q.amount,paid:q.cost,sources:q.sources,demandId:a.demandId,resourceRevision:staged.resources.revision};
    if (r.buildingProfile) next.receipts[r.waterOperation.id].buildingProfile = FB.buildingProfiles.stamp(r.id,r.buildingProfile.id);
    s.siteResources = staged.resources; s.buildingOperations = next; r.waterOperation.revision = next.revision;
    FB.invalidateBuildingIndex(s,request.countyId);
    return true;
  };
  O.constructionReady = function (s,pid,slot,buildingId,who,profileId) {
    var d = FB.buildingProfiles.definition(buildingId,profileId);
    if (!FB.buildingSeasons.constructionReady(s,pid,slot,buildingId,who,d)) return false;
    if (!d || !d.operationProfile) return true;
    var a = assignment(s,pid,slot,buildingId,d.operationProfile);
    if (a && !FB.buildingSeasons.prospective(s,a.id)) return false;
    if (!a || plan(s).errors.length || !identity(s,who,pid,slot) || !stage(s,a,who)) return false;
    if (s.buildingOperations && Object.keys(s.buildingOperations.receipts).length >= 2048) return false;
    var prospective = a.profile.workCost + (d.upkeep || 0) * a.profile.periodDays / 90;
    var floor = reserveFloor(s,who);
    var realmId = who.kind === 'realm' && who.id !== 'player' ? who.id :
      who.kind === 'character' && who.id !== s.player.charId ? FB.settlementCountyHolder(s,pid) : undefined;
    return Number.isFinite(floor) && funds(s,who) >= FB.buildCost(s,pid,buildingId,realmId,profileId) + prospective + floor;
  };
  O.runAI = function (s,seasonalOnly) {
    var count = 0;
    plan(s).assignments.forEach(function (a) {
      if (count >= 32) return;
      if (seasonalOnly && !FB.buildingSeasons.hasOperation(s,a.id)) return;
      var holder = FB.settlementHolder(s,a.countyId,a.slot);
      if (!holder || holder.id === 'player' || holder.kind === 'character' && holder.id === s.player.charId) return;
      if (O.commit(s,O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:holder}))) count++;
    });
    return count;
  };
  O.reason = function (q) {
    if (q.allowed && q.mode === 'store') return FB.T('Store {amount} actual water units and pay {money:cost} for work and upkeep through day {day}. Storage grants no operating benefit.',{amount:q.amount,cost:q.cost,day:q.untilTurn});
    if (q.allowed) return FB.T('Use {amount} water units and pay {money:cost} for work and upkeep through day {day}. The declared service benefits are available only for this funded term.',{amount:q.amount,cost:q.cost,day:q.untilTurn});
    if (q.reason === 'season') return FB.T('Review the local seasonal operating term before funding this service.');
    if (q.reason === 'water') return FB.T('The lawful connected route needs enough unreserved water and storage room.');
    if (q.reason === 'funds') return FB.T('Work and upkeep must be funded while retaining existing reserves.');
    if (q.reason === 'period') return FB.T('This service or its shared demand was already funded for the current period.');
    if (q.reason === 'work') return FB.T('Local residents are required for paid water service.');
    return FB.T('A standing bound facility and its living lawful payer are required.');
  };
  O.validate = function (s) {
    function fail() { throw new Error(FB.T('Invalid saved water operation.')); }
    var root = s.buildingOperations, assets = {}, p = plan(s);
    Object.keys(s.buildings || {}).forEach(function (pid) {
      (s.buildings[pid] || []).forEach(function (r) {
        if (!r || !own(r,'waterOperation')) return;
        var b = r.waterOperation, a = assignment(s,pid,r.s,r.id);
        if (!keys(b,['v','id','profileId','assignmentId','revision']) || b.v !== 1 || !id(b.id) ||
            assets[b.id] || !a || !FB.buildingProfiles.assetDefinition(r) || FB.buildingProfiles.assetDefinition(r).operationProfile !== b.profileId || a.id !== b.assignmentId || a.profileId !== b.profileId || !integer(b.revision,0,Number.MAX_SAFE_INTEGER)) fail();
        assets[b.id] = {record:r,assignment:a};
        if (b.revision && (!root || !root.receipts || !root.receipts[b.id] || root.receipts[b.id].revision !== b.revision)) fail();
      });
    });
    if (root === undefined) return true;
    if (p.errors.length || !keys(root,['version','definition','revision','receipts']) || root.version !== 1 || root.definition !== definition(s) ||
        !integer(root.revision,1,Number.MAX_SAFE_INTEGER) || !object(root.receipts) || !Object.keys(root.receipts).length ||
        Object.keys(root.receipts).length > 2048 || !s.siteResources) fail();
    R.validate(s);
    var revisions = {}, demands = {}, consumed = {};
    Object.keys(root.receipts).forEach(function (key) {
      var v = root.receipts[key], a = v && p.assignments.find(function (x) { return x.id === v.assignmentId; });
      var receiptFields = ['assignmentId','assetId','revision','actor','authority','turn','untilTurn','period','amount','paid','sources','demandId','resourceRevision'];
      var receiptDef = a && FBDATA.buildings[a.buildingId];
      if (own(v,'buildingProfile')) {
        receiptFields.push('buildingProfile');
        if (!a || !equal(v.buildingProfile,FB.buildingProfiles.stamp(a.buildingId,v.buildingProfile && v.buildingProfile.id))) fail();
        receiptDef = FB.buildingProfiles.definition(a.buildingId,v.buildingProfile.id);
        if (!receiptDef || receiptDef.operationProfile !== a.profileId || assets[key] && !equal(
            FB.buildingProfiles.stamp(a.buildingId,assets[key].record.buildingProfile && assets[key].record.buildingProfile.id),v.buildingProfile)) fail();
      } else if (assets[key] && assets[key].record.buildingProfile) fail();
      if (!keys(v,receiptFields) ||
          !a || !id(key) || v.assetId !== key || !integer(v.revision,1,root.revision) || revisions[v.revision] || !actorValid(v.actor) ||
          !integer(v.turn,0,s.turn) || !integer(v.untilTurn,v.turn+1,v.turn+90) ||
          !integer(v.period,0,Math.floor(s.turn/a.profile.periodDays)) || v.period !== Math.floor(v.turn/a.profile.periodDays) ||
          v.untilTurn > (v.period+1)*a.profile.periodDays || v.amount !== a.profile.amount || !money(v.paid,2000000) ||
          v.paid !== a.profile.workCost + (receiptDef.upkeep || 0) * (v.untilTurn-v.turn) / 90 ||
          v.demandId !== a.demandId || !integer(v.resourceRevision,1,s.siteResources.revision) ||
          !keys(v.authority,['characterId','generation','holder','owner']) || !own(s.chars,v.authority.characterId) ||
          (v.actor.kind === 'character' ? v.actor.id !== v.authority.characterId || v.authority.generation !== null :
            !own(s.realms,v.actor.id) || !integer(v.authority.generation,0,FB.realmRulerGeneration(s,v.actor.id))) ||
          !actorValid(v.authority.holder) || !own(s.realms,v.authority.owner) ||
          !Array.isArray(v.sources) || v.sources.length !== a.stores.length+1 ||
          assets[key] && (assets[key].assignment.id !== a.id || assets[key].record.waterOperation.revision !== v.revision)) fail();
      var sourcePlan = R.compile(FB.campaignBookmark(s));
      v.sources.forEach(function (u,i) {
        var d = sourcePlan.sources.find(function (x) { return x.id === u.id; });
        if (!keys(u,['id','profileId','period']) || u.id !== [a.sourceId].concat(a.stores)[i] || !d || u.profileId !== d.profileId ||
            (d.profile.kind === 'storage' ? u.period !== null : u.period !== Math.floor(v.turn/d.profile.periodDays) || v.untilTurn > (u.period+1)*d.profile.periodDays)) fail();
        var saved = s.siteResources.sources[u.id];
        if (!saved || d.profile.kind !== 'storage' && saved.period < u.period) fail();
        if (d.profile.kind === 'flow' && saved.period === u.period) consumed[u.id] = (consumed[u.id] || 0) + v.amount;
      });
      if (s.turn < v.untilTurn && a.profile.mode === 'use') { if (demands[v.demandId]) fail(); demands[v.demandId] = true; }
      revisions[v.revision] = true;
    });
    if (!revisions[root.revision]) fail();
    Object.keys(consumed).forEach(function (key) { if (s.siteResources.sources[key].consumed < consumed[key]) fail(); });
    return true;
  };
})();
