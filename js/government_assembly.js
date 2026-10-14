/* Collective forms compose the shared dispatch slots and one canonical
   constituency owner. Public wealth and private household wealth stay apart. */
(function () {
  'use strict';
  var G = FB.governments, C = G.support;
  function compose(slot, baseline, patch) { return Object.assign({}, G.strategy(slot, baseline), patch); }
  function bounded(s, rid, key, amount) {
    var p = C.profile(s, rid);
    return p ? Math.max(0, Math.min(amount, p.obligations[key])) : 0;
  }
  function occupied(s, rid) {
    var r = C.row(s, rid);
    return !r || r.scopes.some(function (pid) { return s.owner[pid] !== rid || s.holder[pid] !== rid; });
  }
  G.register('holders', 'community_holders', compose('holders', 'direct', {
    conquest:function () { return null; },
    vacancy:function (s, rid) { return rid; }
  }));
  G.register('succession', 'delegated_leadership', {
    delegatedLeadership:true,
    eligible:function () { return false; }, order:function () { return []; }, candidates:function () { return []; },
    vacancy:function (s, rid, c) { return { allowed:false, cause:c.cause, rulerGeneration:FB.realmRulerGeneration(s, rid) }; },
    accession:function () { return null; }, refresh:function () { return false; }
  });
  G.register('territory', 'community_territory', compose('territory', 'fixed', {
    profile:function () { return { movingCourt:false, holdsCounties:true, allowsTitleGrowth:false }; },
    defeat:function () { return { dissolve:false }; }
  }));
  G.register('consent', 'reserved_consent', {
    local:function () { return false; },
    decision:function (s, rid, c) { return C.consent(s, rid, c.actor, c.operation, c.scope); },
    constituency:function (s, rid, c) {
      return { kind:'represented_interests', realmId:rid, operation:c.operation,
        members:(c.decision.required || []).slice() };
    }
  });
  var levy = G.strategy('levy', 'feudal_levy');
  function promised(s, rid) {
    var r = C.row(s, rid);
    return r ? r.agreements.filter(function (a) { return a.kind === 'service' && a.endTurn > s.turn; })
      .reduce(function (n, a) { return n + a.levy; }, 0) : 0;
  }
  G.register('levy', 'community_levy', compose('levy', 'feudal_levy', {
    countyBase:function (s, rid, c) {
      return occupied(s, rid) ? 0 : bounded(s, rid, 'maxLevy', levy.countyBase(s, rid, c) * C.profile(s, rid).obligations.levyRate);
    },
    settlementBase:function (s, rid, c) {
      return occupied(s, rid) ? 0 : bounded(s, rid, 'maxLevy', levy.settlementBase(s, rid, c) * C.profile(s, rid).obligations.levyRate);
    },
    fieldHost:function (s, rid, c) { return occupied(s, rid) ? 0 : Math.max(0,
      bounded(s, rid, 'maxLevy', levy.fieldHost(s, rid, c)) - promised(s, rid)); },
    mayCall:function (s, rid) { return !occupied(s, rid); },
    subjectRate:function () { return 0; }, subjectContribution:function () { return 0; },
    service:function (s, rid, c) { return bounded(s, rid, 'maxLevy', c.amount * Math.min(c.share, C.profile(s, rid).obligations.levyRate)); }
  }));
  var revenue = G.strategy('revenue', 'demesne_revenue');
  G.register('revenue', 'community_dues', compose('revenue', 'demesne_revenue', {
    countyBase:function (s, rid, c) { return occupied(s, rid) ? 0 : bounded(s, rid, 'maxDues',
      revenue.countyBase(s, rid, c) * C.profile(s, rid).obligations.revenueRate); },
    settlementBase:function (s, rid, c) { return occupied(s, rid) ? 0 : bounded(s, rid, 'maxDues',
      revenue.settlementBase(s, rid, c) * C.profile(s, rid).obligations.revenueRate); },
    realmIncome:function (s, rid, c) {
      var r = C.row(s, rid), dues = r && r.dues && r.dues.endTurn > s.turn ? r.dues.amount : 0;
      return occupied(s, rid) ? 0 : bounded(s, rid, 'maxDues', revenue.realmIncome(s, rid, c) + dues);
    },
    subjectContribution:function () { return 0; }, remittance:function () { return 0; },
    loanAssignment:function () { return 0; }, fiscalAssignment:function () { return 0; }
  }));
  G.register('council', 'represented_interests', {
    seats:function () { return []; }, eligible:function () { return false; }, vacancy:function () { return null; }
  });
  G.register('diplomacy', 'community_relations', compose('diplomacy', 'territorial_diplomacy', {
    subjectRelation:function () { return { kind:'community', liegeId:null }; },
    goalAllowed:function (s, rid, c) {
      var r = C.row(s, rid), term = C.terms('war', { causes:[c.cause] }).causes[0];
      return !!r && r.decisions.some(function (d) { return d.operation === 'war' &&
        C.authorization(s, rid, 'war', d.terms) && d.terms.causes.some(function (goal) { return JSON.stringify(goal) === JSON.stringify(term); }); });
    }
  }));
  G.register('ai', 'community_decisions', compose('ai', 'realm_decisions', {
    goals:function () { return { warChance:0, allianceChance:0 }; },
    campaign:function (s, rid) { C.tick(s, rid); return false; },
    raid:function () { return false; }, breakawayChance:function () { return 0; },
    canNegotiate:function () { return false; }, offices:function () { return false; }
  }));
  var bands = {};
  for (var i = 0; i < FB.station.bandCount; i++) bands[i] = {
    succession:'personal', promotion:null, maySeekCounty:false, sitsInEstates:false,
    mayHoldCouncil:false, rulesRealm:false, holdsCounty:false, isRoyal:false, isImperial:false,
    isBaron:false, isCount:false, isDuke:false, isKing:false, isEmperor:false, isLanded:false,
    mayArrangeDynasticMarriage:false, mayCommand:false, mayAdministerJustice:false
  };
  bands[0].promotion = { route:'freedom', next:1 };
  bands[1].promotion = { route:'standing', next:2, cost:{ gold:0, prestige:0, piety:0 },
    paths:[{ roles:['civic','arms','craft','labor'], years:2, prestige:10 }], countyGrant:false };
  G.register('ladder', 'local_service', { bands:bands, ranks:{
    1:{ tier:1 }, 2:{ tier:1, isRoyal:false, isImperial:false },
    3:{ tier:1, isRoyal:false, isImperial:false }, 4:{ tier:1, isRoyal:false, isImperial:false }
  } });

  C.recognition = function (s, rid) {
    var r = C.row(s, rid), p = C.profile(s, rid);
    if (!r || !r.selection || r.selection.status !== 'open') return false;
    var candidates = r.selection.nominations.filter(function (id) { return C.eligible(s, rid, id).allowed; });
    candidates.sort(function (a, b) {
      var ac = s.chars[a], bc = s.chars[b];
      return (Number(bc.skills.dip) || 0) - (Number(ac.skills.dip) || 0) || (a < b ? -1 : a > b ? 1 : 0);
    });
    C.members(s, rid).forEach(function (m) {
      var policy = p.members.filter(function (q) { return q.id === m.id; })[0];
      var local = m.scope.reduce(function (n, pid) { return n + FB.countyPopularSupport(s, pid); }, 0) / m.scope.length;
      var proposer = candidates.length ? Math.max(-10, Math.min(10, (Number(s.chars[candidates[0]].skills.dip) || 0) - 4)) : 0;
      var candidate = policy && policy.support + local / 2 + proposer >= 50 && candidates.length ? candidates[0] : null;
      C.apply(s, C.quote(s, rid, 'recognize', { memberId:m.id, candidateId:candidate }));
    });
    return C.apply(s, C.quote(s, rid, 'select', {}));
  };
  C.recognitionQuote = function (s, rid) {
    var q = C.quote(s, rid, 'select', {}), r = C.row(s, rid);
    if (!q || !r.selection || r.selection.status !== 'open') return null;
    q.allowed = r.selection.nominations.some(function (id) { return C.eligible(s, rid, id).allowed; }) &&
      !occupied(s, rid) && C.members(s, rid).length === r.members.length;
    q.reason = q.allowed ? null : 'no_candidates';
    q.support = C.members(s, rid).map(function (m) { return [m.id, m.scope.map(function (pid) { return FB.countyPopularSupport(s, pid); })]; });
    q.proposers = r.selection.nominations.map(function (id) { return [id, Number(s.chars[id] && s.chars[id].skills.dip) || 0]; });
    return q;
  };
  C.applyRecognition = function (s, reviewed) {
    var fresh = reviewed && C.recognitionQuote(s, reviewed.realmId);
    if (!fresh || !fresh.allowed || JSON.stringify(fresh) !== JSON.stringify(reviewed)) return false;
    C.recognition(s, fresh.realmId);
    return true;
  };
  C.tick = function (s, rid) {
    var r = C.row(s, rid);
    if (!r || !C.isDelegated(s, rid)) return;
    if (r.mandate && r.mandate.status === 'active' && (!C.eligible(s, rid, r.mandate.delegateId).allowed ||
        r.mandate.endTurn !== null && s.turn >= r.mandate.endTurn)) {
      C.openVacancy(s, rid, !s.chars[r.mandate.delegateId] || s.chars[r.mandate.delegateId].dead ? 'death' :
        r.mandate.endTurn !== null && s.turn >= r.mandate.endTurn ? 'term_end' : 'ineligible');
    }
    if (r.selection && r.selection.status === 'open' && !occupied(s, rid)) {
      C.candidates(s, rid).forEach(function (id) {
        if (id !== s.player.charId && r.selection.nominations.indexOf(id) < 0) C.apply(s, C.quote(s, rid, 'nominate', { candidateId:id }));
      });
      C.recognition(s, rid);
    }
    var delegate = C.delegate(s, rid), p = C.profile(s, rid);
    if (!delegate || delegate.id === s.player.charId || occupied(s, rid)) return;
    if (FB.treasuryAvailable(s, rid) < p.obligations.reserve * 2 && !(r.dues && r.dues.endTurn > s.turn))
      C.imposeDues(s, C.duesQuote(s, rid, { amount:Math.min(5, p.obligations.maxDues), duration:90 }));
    FB.realmWars(s, rid).forEach(function (w) {
      if (s.turn - w.startedTurn >= 90) C.makePeace(s, C.peaceQuote(s, rid, { warId:w.id, kind:'white_peace' }));
    });
  };
  var advance = FB.advanceRealmSuccession;
  FB.advanceRealmSuccession = function (s, rid, opts) {
    if (!C.isDelegated(s, rid)) return advance(s, rid, opts);
    var r = C.row(s, rid);
    if (!r) return null;
    var prior = C.delegate(s, rid);
    if (prior && (!opts || opts.cause === undefined || opts.cause === 'death')) {
      if (FB.killChar && !prior.dead) FB.killChar(s, prior);
      return C.delegate(s, rid);
    }
    C.openVacancy(s, rid, opts && opts.cause || 'death');
    C.tick(s, rid);
    return C.delegate(s, rid);
  };
  var died = FB.royalCharDied;
  FB.royalCharDied = function (s, c, rid) {
    // The protagonist's death path marks the character dead before notifying
    // succession, so it cannot resolve through the living-delegate query.
    if (!rid && c) rid = Object.keys(s.governmentSupport && s.governmentSupport.polities || {}).filter(function (id) {
      var r = C.row(s, id);
      return C.isDelegated(s, id) && r.mandate && r.mandate.status === 'active' && r.mandate.delegateId === c.id;
    })[0];
    if (rid && C.isDelegated(s, rid)) { C.openVacancy(s, rid, 'death'); C.tick(s, rid); return; }
    return died(s, c, rid);
  };
  var snapshot = FB.realmRulerCharacterSnapshot, rulerRealm = FB.realmIdForRulerCharacter;
  FB.realmRulerCharacterSnapshot = function (s, rid) { return C.isDelegated(s, rid) ? C.delegate(s, rid) : snapshot(s, rid); };
  FB.realmIdForRulerCharacter = function (s, value) {
    var id = typeof value === 'string' ? value : value && value.id;
    // A delegated realm's ruler is always its active mandate holder, so
    // compare that id before the full delegate check copies the members.
    var found = Object.keys(s && s.governmentSupport && s.governmentSupport.polities || {}).filter(function (rid) {
      var r = C.row(s, rid);
      if (!r || !r.mandate || r.mandate.delegateId !== id) return false;
      var c = C.delegate(s, rid); return C.isDelegated(s, rid) && c && c.id === id;
    })[0];
    return found || rulerRealm(s, value);
  };
  var transfer = FB.transferProvince;
  FB.transferProvince = function (s, pid, toRealm) {
    var rid = s.holder && s.holder[pid];
    if (C.isDelegated(s, rid) && C.row(s, rid) && C.row(s, rid).scopes.indexOf(pid) >= 0) {
      if (!s.realms[toRealm] || !s.realms[toRealm].alive) return;
      if (s.owner[pid] === toRealm) return;
      s.owner[pid] = toRealm;
      // Military control changes; the community's jurisdiction and household
      // obligations await a separately reviewed political settlement.
      FB.invalidateRealmCache();
      C.row(s, rid).revision++;
      return;
    }
    return transfer(s, pid, toRealm);
  };
  var registerWar = FB.registerOrdinaryWar;
  FB.registerOrdinaryWar = function (s, rid, war) {
    if (!war || !war.enemy || rid === war.enemy) return null;
    if (war.id && s.wars && s.wars[war.id] === war) return registerWar(s, rid, war);
    var decision = null;
    var attacker = rid === 'player' && war && war.defending ? war.enemy : rid;
    var existing = FB.ordinaryWarBetween(s, attacker, attacker === rid ? war.enemy : rid);
    if (existing) return existing;
    if (C.isDelegated(s, attacker)) {
      var causes = war.objectives || [war.casus || { type:'aggression', target:war.target, enemy:war.enemy }];
      var enemy = attacker === rid ? war.enemy : rid;
      causes = causes.map(function (c) { return Object.assign({}, c, { enemy:c.enemy || enemy }); });
      decision = C.authorization(s, attacker, 'war', { causes:causes });
      if (!decision) { C.attemptOverreach(s, attacker, 'war', { causes:causes }); return null; }
    }
    var result = registerWar(s, rid, war);
    if (result && decision && !existing) C.consume(s, attacker, 'war', { causes:causes });
    return result;
  };
  C.warQuote = function (s, rid, terms) {
    var q = C.assentQuote(s, rid, 'war', terms);
    if (!q) return null;
    if (!C.authorization(s, rid, 'war', terms)) return Object.assign({}, q, { allowed:false, reason:'collective_consent' });
    var preview = FB.warDeclarationPreview(s, rid, terms.causes);
    return Object.assign({}, q, { allowed:q.allowed && preview.valid && !preview.unlawful,
      blocker:preview.valid ? null : preview.reason, declaration:preview });
  };
  C.launchWar = function (s, reviewed) {
    var fresh = reviewed && C.warQuote(s, reviewed.realmId, reviewed.terms);
    if (!fresh || !fresh.allowed || JSON.stringify(fresh) !== JSON.stringify(reviewed)) return false;
    var causes = fresh.terms.causes, rid = fresh.realmId;
    var w = FB.registerOrdinaryWar(s, rid, { enemy:causes[0].enemy, target:causes[0].target,
      casus:causes[0], objectives:causes, legacy:false });
    if (!w) return false;
    FB.recordWarDeclaration(s, w, fresh.declaration);
    return true;
  };
  C.frontierCauses = function (s, rid) {
    var r = C.row(s, rid), seen = {}, out = [];
    if (!r) return out;
    r.scopes.forEach(function (pid) {
      Object.keys(FB.world.adj[pid] || {}).sort().forEach(function (target) {
        var enemy = FB.warTargetDefender(s, rid, target);
        if (!seen[target] && enemy && s.realms[enemy] && s.realms[enemy].alive && !FB.ordinaryWarBetween(s, rid, enemy)) {
          out.push({ type:'aggression', enemy:enemy, target:target }); seen[target] = true;
        }
      });
    });
    return out;
  };
  var demand = FB.demandTaxes;
  FB.demandTaxes = function (s) { return C.isDelegated(s, 'player') ? false : demand(s); };
  ['grantCounty','grantDuchy','sellFiscalLand'].forEach(function (name) {
    var original = FB[name];
    FB[name] = function (s) { return C.isDelegated(s, 'player') ? false : original.apply(FB, arguments); };
  });
  var loan = FB.takeFinanceLoan;
  FB.takeFinanceLoan = function (s, kind, collateral) {
    if (C.isDelegated(s, 'player') && collateral && ['county','income'].indexOf(collateral.kind) >= 0) return false;
    return loan.apply(FB, arguments);
  };
  var controls = FB.playerControlsHost;
  FB.playerControlsHost = function (s, host) {
    if (host && C.isDelegated(s, host.realm)) return FB.political.power(s,
      { kind:'character', id:s.player.charId }, 'ban', { hostId:host.id }).allowed;
    return controls(s, host);
  };
  var fieldHost = FB.aiBaseHost;
  FB.aiBaseHost = function (s, rid) {
    var base = fieldHost.apply(FB, arguments), bonus = 0;
    function protectionTotal(partner) {
      var total = 0;
      Object.keys(s.governmentSupport && s.governmentSupport.polities || {}).forEach(function (id) {
        var r = C.row(s, id);
        if (!C.isDelegated(s, id) || occupied(s, id) || !FB.isRealmAtWar(s, id)) return;
        r.agreements.forEach(function (a) { if (a.kind === 'protection' && a.externalRealmId === partner && a.endTurn > s.turn) total += a.levy; });
      });
      return total;
    }
    var protectedAmount = protectionTotal(rid);
    base -= Math.min(protectedAmount, Math.floor(base / 4));
    Object.keys(s.governmentSupport && s.governmentSupport.polities || {}).forEach(function (id) {
      var r = C.row(s, id);
      if (!C.isDelegated(s, id) || occupied(s, id)) return;
      r.agreements.forEach(function (a) {
        if (a.endTurn <= s.turn || !s.realms[a.externalRealmId] || !s.realms[a.externalRealmId].alive) return;
        if (a.kind === 'service' && a.externalRealmId === rid)
          bonus += Math.floor(a.levy * Math.min(1, bounded(s, id, 'maxLevy', levy.fieldHost(s, id, { realmId:id })) / Math.max(1, promised(s, id))));
        if (a.kind === 'protection' && id === rid && FB.isRealmAtWar(s, rid))
          bonus += Math.floor(a.levy * Math.min(1, Math.floor(fieldHost(s, a.externalRealmId) / 4) / Math.max(1, protectionTotal(a.externalRealmId))));
      });
    });
    return base + bonus;
  };
  C.day = function (s) {
    Object.keys(s.governmentSupport && s.governmentSupport.polities || {}).forEach(function (rid) {
      var r = C.row(s, rid);
      if (C.isDelegated(s, rid) && r.mandate && r.mandate.status === 'active' && !C.delegate(s, rid)) C.tick(s, rid);
    });
  };
})();
