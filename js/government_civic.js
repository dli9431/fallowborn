/* Civic offices use the shared constituency and review boundary. The polity
   owns its treasury, sites and rights; no magistrate owns the city. */
(function () {
  'use strict';
  var G = FB.governments, C = G.support, Q = FB.political, V = FB.civicGovernment = {};
  var rulerIndexes = new WeakMap();
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function equal(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v, fields) { return plain(v) && Object.keys(v).length === fields.length && fields.every(function (k) { return Object.prototype.hasOwnProperty.call(v,k); }); }
  function person(s,id) { var c = s.chars && s.chars[id]; return c && !c.dead ? c : null; }
  function form(s,rid) { var f = G.forRealm(s,rid); return !!(f && f.use.succession.civicLeadership); }
  V.active = form;
  function saved(s,rid) { return s.authority && s.authority.governments && s.authority.governments[rid]; }
  V.row = function (s,rid) { var row = saved(s,rid); return row && row.civic || null; };
  V.profile = function (s,rid) { var r = V.row(s,rid); return r && FBDATA.civicProfiles[r.profileId] || null; };
  V.localRealm = function (s) {
    var rid = s.player.liege || s.holder && s.holder[s.player.provinceId];
    return form(s,rid) && V.row(s,rid) ? rid : null;
  };
  function seat(s,rid,id) { var r = V.row(s,rid); return r && r.offices.filter(function (o) { return o.id === id; })[0] || null; }
  function policy(s,rid,id) { var p = V.profile(s,rid); return p && p.offices.filter(function (o) { return o.id === id; })[0] || null; }
  function controlled(s,rid) { var r = C.row(s,rid); return !!r && r.scopes.every(function (pid) { return s.owner[pid] === rid && s.holder[pid] === rid; }); }
  function serial(r,kind) { r.serial++; return r.institutionId + ':' + kind + ':' + r.serial; }
  function history(r,entry) { r.history.push(entry); if (r.history.length > 12) r.history.shift(); }
  V.eligible = function (s,rid,cid,officeId) {
    var p = V.profile(s,rid), r = V.row(s,rid), c = person(s,cid), base = C.eligible(s,rid,cid);
    var reason = !p || !r || !c ? 'missing_person' : base.reason;
    if (!reason && (c.captive || c.exiled || FB.justiceCustodyOf && FB.justiceCustodyOf(s,cid))) reason = 'unavailable';
    if (!reason && p.eligibility.sex !== 'any' && c.sex !== p.eligibility.sex) reason = 'qualification';
    if (!reason && p.eligibility.membership && r.citizens.indexOf(cid) < 0) reason = 'membership';
    if (!reason && r.offices.some(function (o) { return o.id !== officeId && o.incumbentId === cid; })) reason = 'already_holds_office';
    return { allowed:!reason, reason:reason, facts:base.facts, sex:c && c.sex,
      custody:c ? [!!c.captive,!!c.exiled,FB.justiceCustodyOf ? FB.justiceCustodyOf(s,cid) : null] : null };
  };
  V.incumbent = function (s,rid,id) {
    var o = seat(s,rid,id);
    return form(s,rid) && o && o.incumbentId && (o.endTurn === null || s.turn < o.endTurn) &&
      V.eligible(s,rid,o.incumbentId,id).allowed ? person(s,o.incumbentId) : null;
  };
  V.chief = function (s,rid) { var p = V.profile(s,rid); return p ? V.incumbent(s,rid,p.offices[0].id) : null; };
  V.candidates = function (s,rid,id) {
    return Object.keys(s.chars || {}).filter(function (cid) { return V.eligible(s,rid,cid,id).allowed; }).sort().slice(0,16);
  };
  function stamp(s,rid) {
    var r = V.row(s,rid), members = C.row(s,rid);
    return { turn:s.turn, civic:copy(r), electorate:members ? copy(members) : null,
      profile:copy(V.profile(s,rid)), constituency:copy(C.profile(s,rid)),
      generation:FB.realmRulerGeneration(s,rid), alive:!!s.realms[rid].alive,
      members:C.members(s,rid), territory:members ? members.scopes.map(function (pid) {
        return [pid,s.owner[pid],s.holder[pid],FB.countyPopularSupport(s,pid)];
      }) : [], funds:FB.treasuryAvailable(s,rid) };
  }
  V.stamp = stamp;
  V.controlled = controlled;
  V.ballot = function (s,rid,cid,threshold) { return ballot(s,rid,cid,threshold); };
  function ballot(s,rid,cid,threshold) {
    var cp = C.profile(s,rid), c = person(s,cid);
    var ballots = C.members(s,rid).map(function (m) {
      var def = cp.members.filter(function (d) { return d.id === m.id; })[0];
      var support = m.scope.reduce(function (n,pid) { return n + FB.countyPopularSupport(s,pid); },0) / m.scope.length;
      var dip = c ? FB.skillSnapshot(s,c,'dip') : 0;
      return { memberId:m.id, weight:m.weight, assent:!!def && def.support + support / 2 + Math.max(-10,Math.min(10,dip - 4)) >= 50 };
    });
    var total = ballots.reduce(function (n,b) { return n + b.weight; },0);
    return { ballots:ballots, allowed:total > 0 && C.members(s,rid).length === C.row(s,rid).members.length &&
      ballots.reduce(function (n,b) { return n + (b.assent ? b.weight : 0); },0) >= threshold * total };
  }
  V.openVacancy = function (s,rid,id,cause) {
    var r = V.row(s,rid), o = seat(s,rid,id);
    if (!form(s,rid) || !o || ['opening','death','resign','term_end','remove','ineligible'].indexOf(cause) < 0 ||
        o.vacancy && o.vacancy.status === 'open') return false;
    if (o.incumbentId) history(r,{ id:o.mandateId, officeId:id, characterId:o.incumbentId, cause:cause, turn:s.turn });
    o.incumbentId = null; o.startTurn = null; o.endTurn = null; o.mandateId = null;
    o.vacancy = { id:serial(r,'selection'), cause:cause, generation:o.generation,
      nominations:[], votes:{}, status:'open', resolvedId:null };
    r.revision++;
    rulerIndexes = new WeakMap();
    return true;
  };
  V.officeQuote = function (s,rid,id,action,terms) {
    var r = V.row(s,rid), p = V.profile(s,rid), o = seat(s,rid,id), cp = C.profile(s,rid);
    if (!r || !p || !o || !form(s,rid)) return null;
    var t = copy(terms || {}), reason = !s.realms[rid].alive ? 'inactive_institution' : !controlled(s,rid) ? 'occupied' : null;
    var members = C.members(s,rid), v = o.vacancy, cost = 0, winner = null, ballots = [], candidates = [];
    if (members.length !== C.row(s,rid).members.length) reason = reason || 'constituency_unresolved';
    if (action === 'nominate') {
      if (!keys(t,['candidateId']) || !v || v.status !== 'open') reason = reason || 'no_vacancy';
      else if (v.nominations.indexOf(t.candidateId) >= 0 || v.nominations.length >= 16) reason = reason || 'already_nominated';
      reason = reason || V.eligible(s,rid,t.candidateId,id).reason;
      cost = cp.selection.nominationCost;
      var funds = t.candidateId === s.player.charId ? s.player.gold : FB.treasuryAvailable(s,rid) - cp.obligations.reserve;
      if (funds < cost) reason = reason || 'funds';
    } else if (action === 'support') {
      if (!keys(t,['memberId','candidateId']) || !v || v.status !== 'open' || !members.some(function (m) { return m.id === t.memberId; }) ||
          t.candidateId !== null && (v.nominations.indexOf(t.candidateId) < 0 || !V.eligible(s,rid,t.candidateId,id).allowed)) reason = reason || 'invalid_vote';
    } else if (action === 'select' || action === 'recognize') {
      if (!keys(t,[]) || !v || v.status !== 'open') reason = reason || 'no_vacancy';
      else {
        candidates = v.nominations.map(function (cid) { return { id:cid, eligibility:V.eligible(s,rid,cid,id),
          support:ballot(s,rid,cid,cp.selection.threshold), diplomacy:person(s,cid) ? FB.skillSnapshot(s,s.chars[cid],'dip') : 0 }; });
        var scored = candidates.filter(function (c) { return c.eligibility.allowed; }).map(function (c) {
          var weight = members.reduce(function (n,m) { return n + (v.votes[m.id] === c.id ? m.weight : 0); },0);
          return { id:c.id, weight:weight, diplomacy:c.diplomacy, support:c.support };
        }).sort(function (a,b) { return action === 'recognize' ? b.diplomacy - a.diplomacy || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) :
          b.weight - a.weight || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
        var total = members.reduce(function (n,m) { return n + m.weight; },0), best = scored[0];
        if (best && (action === 'recognize' ? best.support.allowed : best.weight >= total * cp.selection.threshold)) {
          winner = best.id; ballots = action === 'recognize' ? best.support.ballots : [];
        } else reason = reason || 'withheld';
      }
    } else if (action === 'resign') {
      if (!keys(t,['characterId']) || !V.incumbent(s,rid,id) || t.characterId !== o.incumbentId) reason = reason || 'no_mandate';
    } else if (action === 'remove') {
      if (!keys(t,['reason']) || !o.incumbentId || cp.recall.reasons.indexOf(t.reason) < 0 ||
          t.reason === 'ineligible' && V.eligible(s,rid,o.incumbentId,id).allowed ||
          t.reason === 'overreach' && !r.overreach || t.reason === 'neglect' && !C.row(s,rid).scopes.some(function (pid) { return FB.countyPopularSupport(s,pid) < -35; })) reason = reason || 'unjustified';
      var recall = ballot(s,rid,V.chief(s,rid) && V.chief(s,rid).id,cp.recall.threshold);
      ballots = recall.ballots;
      if (!recall.allowed) reason = reason || 'withheld';
    } else if (action === 'admit') {
      var c = person(s,t.candidateId), eligible = C.eligible(s,rid,t.candidateId);
      if (!keys(t,['candidateId']) || !c || !eligible.allowed || r.citizens.indexOf(t.candidateId) >= 0 ||
          r.citizens.filter(function (cid) { return !!person(s,cid); }).length >= 32) reason = reason || eligible.reason || 'membership';
      var admission = ballot(s,rid,t.candidateId,cp.selection.threshold);
      ballots = admission.ballots;
      if (!admission.allowed) reason = reason || 'withheld';
    } else reason = reason || 'unsupported';
    return { realmId:rid, officeId:id, action:action, terms:t, stamp:stamp(s,rid),
      eligibility:t.candidateId ? V.eligible(s,rid,t.candidateId,id) : null,
      personalFunds:t.candidateId === s.player.charId ? s.player.gold : null,
      candidates:candidates, ballots:ballots, selectedId:winner, cost:cost, allowed:!reason, reason:reason };
  };
  function install(s,rid,o,cid,opening) {
    var r = V.row(s,rid), p = policy(s,rid,o.id), c = s.chars[cid];
    o.generation++; o.incumbentId = cid; o.startTurn = s.turn;
    o.endTurn = p.termDays === null ? null : s.turn + p.termDays;
    o.mandateId = serial(r,'mandate'); o.lastSalaryPeriod = Math.floor(s.turn / 90);
    o.vacancy.status = 'resolved'; o.vacancy.resolvedId = o.mandateId;
    if (o.id === V.profile(s,rid).offices[0].id) {
      var generation = FB.realmRulerGeneration(s,rid) + (opening ? 0 : 1);
      s.realms[rid].ruler = { name:c.name, sex:c.sex, born:c.born, age:s.date.year - c.born,
        culture:c.culture, mar:Number(c.skills.mar) || 0, generation:generation };
    }
    r.revision++; r.overreach = false; rulerIndexes = new WeakMap();
    G.invalidate(); if (FB.rebuildRulerIndex) FB.rebuildRulerIndex(s);
  }
  V.establish = function (s,rid,profileId,incumbents,originFormId) {
    var p = FBDATA.civicProfiles[profileId];
    var r = saved(s,rid).civic = { schema:1,institutionId:rid,profileId:profileId,originFormId:originFormId,
      serial:0,revision:0,offices:[],citizens:incumbents.slice(),history:[],rights:[],debts:[],dues:null,overreach:false };
    p.offices.forEach(function (def,i) {
      var o = { id:def.id,generation:i === 0 ? FB.realmRulerGeneration(s,rid) : 0,incumbentId:null,
        mandateId:null,startTurn:null,endTurn:null,vacancy:null,lastSalaryPeriod:Math.floor(s.turn / 90) };
      r.offices.push(o); V.openVacancy(s,rid,o.id,'opening'); o.vacancy.nominations.push(incumbents[i]);
      C.members(s,rid).forEach(function (m) { o.vacancy.votes[m.id] = incumbents[i]; });
      install(s,rid,o,incumbents[i],false);
    });
    return r;
  };
  V.officeApply = function (s,reviewed) {
    var q = reviewed && V.officeQuote(s,reviewed.realmId,reviewed.officeId,reviewed.action,reviewed.terms);
    if (!q || !q.allowed || !equal(q,reviewed)) return false;
    var r = V.row(s,q.realmId), o = seat(s,q.realmId,q.officeId), t = q.terms;
    if (q.action === 'nominate') {
      if (q.cost && (t.candidateId === s.player.charId ? !FB.treasuryTransferPersonal(s,'player',null,q.cost) : !FB.treasurySpend(s,q.realmId,q.cost))) return false;
      o.vacancy.nominations.push(t.candidateId);
    } else if (q.action === 'support') o.vacancy.votes[t.memberId] = t.candidateId;
    else if (q.action === 'select' || q.action === 'recognize') {
      if (q.action === 'recognize') q.ballots.forEach(function (b) { o.vacancy.votes[b.memberId] = b.assent ? q.selectedId : null; });
      install(s,q.realmId,o,q.selectedId,false);
      FB.news(s,FB.msg('news.civic.office','{name} receives a civic office in {realm}.',{ name:s.chars[q.selectedId].name, realm:FB.realmNameParam(s,q.realmId) }));
      return true;
    } else if (q.action === 'resign' || q.action === 'remove') return V.openVacancy(s,q.realmId,o.id,q.action);
    else if (q.action === 'admit') { r.citizens = r.citizens.filter(function (cid) { return !!person(s,cid); }); r.citizens.push(t.candidateId); }
    r.revision++;
    return true;
  };
  FB.governmentSelection.registerSource('civic_magistracy', {
    quote:function (s,request) { return V.officeQuote(s,request.realmId,request.officeId,request.action,request.terms); },
    apply:function (s,request,review) { return V.officeApply(s,review); }
  });
  V.initialize = function (s,definitions) {
    definitions.forEach(function (d) {
      if (!form(s,d.id) || V.row(s,d.id)) return;
      var formId = G.forRealm(s,d.id).id, id = d.civicProfileId || FBDATA.governmentForms[formId].civicProfileId;
      var p = FBDATA.civicProfiles[id], cp = p && FBDATA.constituencyProfiles[p.constituency];
      if (!p || !cp || d.constituency !== p.constituency) throw new Error('Invalid civic opening');
      var scopes = FB.realmHeldCounties(s,d.id).slice(), cap = FB.world.byId[s.realms[d.id].capital];
      if (!scopes.length) throw new Error('Civic opening needs jurisdiction');
      if (!s.governmentSupport) s.governmentSupport = { schema:1, polities:{} };
      if (!C.row(s,d.id)) s.governmentSupport.polities[d.id] = { id:d.id, profileId:p.constituency, scopes:scopes,
        serial:0, revision:0, mandate:null, selection:null, decisions:[], history:[], overreach:false, dues:null,
        members:cp.members.map(function (m) { return { id:m.id, principal:{ kind:'county',id:scopes[0] }, scope:scopes.slice(),
          basis:m.basis, weight:m.weight, continuity:m.continuity }; }), agreements:[] };
      else {
        var shared = C.row(s,d.id);
        if (shared.profileId !== p.constituency || shared.selection && shared.selection.status === 'open' ||
            shared.decisions.some(function (decision) { return decision.status === 'approved'; }) ||
            shared.agreements.some(function (a) { return a.endTurn > s.turn; }) || shared.dues && shared.dues.endTurn > s.turn)
          throw new Error('Civic electorate requires compatible settled public commitments');
        if (shared.mandate) shared.mandate.status = 'ended';
      }
      var r = saved(s,d.id).civic = { schema:1, institutionId:d.id, profileId:id, originFormId:null, serial:C.row(s,d.id).serial, revision:0,
        offices:p.offices.map(function (o,i) { return { id:o.id, generation:i === 0 ? FB.realmRulerGeneration(s,d.id) - 1 : 0, incumbentId:null, mandateId:null,
          startTurn:null, endTurn:null, vacancy:null, lastSalaryPeriod:Math.floor(s.turn / 90) }; }),
        citizens:[], history:[], rights:[], debts:[], dues:null, overreach:false };
      var people = [];
      for (var i = 0; i < p.offices.length + 3; i++) {
        var seed = i === 0 ? d.ruler || d.representative || {} : {};
        var c = FB.makeCharacter(s,{ name:seed.name, sex:seed.sex || (p.eligibility.sex === 'any' && i % 2 ? 'f' : 'm'),
          born:seed.born || s.date.year - cp.eligibility.minAge - 12 - i, culture:cap.culture, religion:s.realms[d.id].religion || cap.religion,
          station:1, quality:1, traitsN:1 });
        c.homeProvinceId = scopes[0]; c.gold = 0;
        if (seed.trait && FBDATA.traits[seed.trait]) c.traits = [seed.trait];
        FB.careerOf(s,c).experience = cp.eligibility.minServiceYears;
        Object.keys(cp.eligibility.skills).forEach(function (k) { c.skills[k] += Math.max(0,cp.eligibility.skills[k] - FB.skillSnapshot(s,c,k)); });
        if (seed.mar) c.skills.mar = seed.mar;
        people.push(c.id); r.citizens.push(c.id);
      }
      r.offices.forEach(function (o,i) {
        V.openVacancy(s,d.id,o.id,'opening'); o.vacancy.nominations.push(people[i]);
        C.members(s,d.id).forEach(function (m) { o.vacancy.votes[m.id] = people[i]; });
        install(s,d.id,o,people[i],true);
      });
      (d.civicRights || []).forEach(function (right) { V.seedRight(s,d.id,right); });
    });
  };
  var initialize = C.initialize, delegated = C.isDelegated, delegate = C.delegate, tick = C.tick, day = C.day, referenced = C.referencesCharacter;
  C.initialize = function (s,definitions) { initialize(s,definitions.filter(function (d) { return !form(s,d.id); })); V.initialize(s,definitions); };
  C.isDelegated = function (s,rid) { return !form(s,rid) && delegated(s,rid); };
  C.delegate = function (s,rid) { return form(s,rid) ? V.chief(s,rid) : delegate(s,rid); };
  C.tick = function (s,rid) { return form(s,rid) ? V.tick(s,rid) : tick(s,rid); };
  C.day = function (s) { day(s); Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
    var r = V.row(s,rid); if (form(s,rid) && r) {
      r.offices.forEach(function (o) {
        if (o.incumbentId && !V.incumbent(s,rid,o.id)) V.openVacancy(s,rid,o.id,!person(s,o.incumbentId) ? 'death' :
          o.endTurn !== null && s.turn >= o.endTurn ? 'term_end' : 'ineligible');
      }); V.refreshRights(s,rid);
    }
  }); };
  C.referencesCharacter = function (s,cid) {
    return referenced(s,cid) || Object.keys(s.authority && s.authority.governments || {}).some(function (rid) {
      var r = V.row(s,rid); return !!r && (r.citizens.indexOf(cid) >= 0 || r.offices.some(function (o) {
        return o.incumbentId === cid || o.vacancy && o.vacancy.nominations.indexOf(cid) >= 0;
      }));
    });
  };
  var died = FB.royalCharDied, advance = FB.advanceRealmSuccession, snapshot = FB.realmRulerCharacterSnapshot, rulerRealm = FB.realmIdForRulerCharacter;
  FB.royalCharDied = function (s,c,rid) {
    var found = false;
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (id) {
      var r = V.row(s,id); if (!form(s,id) || !r || !c) return;
      r.offices.forEach(function (o) { if (o.incumbentId === c.id) { V.openVacancy(s,id,o.id,'death'); found = true; } });
    });
    var line = c && c.royalLine, family = line && s.realms[line.realmId] && s.realms[line.realmId].succession;
    if (line && form(s,line.realmId) && family && family.members[line.memberId]) {
      family.members[line.memberId].alive = false;
      family.members[line.memberId].died = s.date.year;
      if (FB.syncLinkedRoyalCourts) FB.syncLinkedRoyalCourts(s,line.realmId);
      return;
    }
    if (found || rid && form(s,rid)) return;
    return died(s,c,rid);
  };
  FB.advanceRealmSuccession = function (s,rid,opts) {
    if (!form(s,rid)) return advance(s,rid,opts);
    var p = V.profile(s,rid), c = V.chief(s,rid);
    if (!p) return null;
    if ((!opts || !opts.repair && (opts.cause === 'death' || !opts.cause)) && c) FB.killChar(s,c);
    V.tick(s,rid); return V.chief(s,rid);
  };
  FB.realmRulerCharacterSnapshot = function (s,rid) { return form(s,rid) ? V.chief(s,rid) : snapshot(s,rid); };
  FB.realmIdForRulerCharacter = function (s,value) {
    var cid = typeof value === 'string' ? value : value && value.id;
    var index = s && rulerIndexes.get(s);
    if (!index && s) {
      index = Object.create(null);
      Object.keys(s.authority && s.authority.governments || {}).forEach(function (id) { var c = V.chief(s,id); if (c) index[c.id] = id; });
      rulerIndexes.set(s,index);
    }
    var rid = index && index[cid], current = rid && V.chief(s,rid);
    if (current && current.id === cid) return rid;
    var inherited = rulerRealm(s,value);
    return inherited && form(s,inherited) ? null : inherited;
  };
  var materializeRuler = FB.materializeRealmRuler;
  FB.materializeRealmRuler = function (s,rid) { return form(s,rid) ? V.chief(s,rid) : materializeRuler.apply(FB,arguments); };
  var absorb = FB.absorbRealm;
  FB.absorbRealm = function (s,rid) { return form(s,rid) ? false : absorb.apply(FB,arguments); };
  V.tick = function (s,rid) {
    var r = V.row(s,rid); if (!r || !form(s,rid) || !s.realms[rid].alive) return false;
    r.offices.forEach(function (o) {
      if (o.incumbentId && !V.incumbent(s,rid,o.id)) V.openVacancy(s,rid,o.id,!person(s,o.incumbentId) ? 'death' :
        o.endTurn !== null && s.turn >= o.endTurn ? 'term_end' : 'ineligible');
      if (!o.vacancy || o.vacancy.status !== 'open' || !controlled(s,rid)) return;
      if (V.profile(s,rid).eligibility.membership && !V.candidates(s,rid,o.id).length) Object.keys(s.chars).filter(function (cid) {
        return cid !== s.player.charId && V.eligible(s,rid,cid,o.id).reason === 'membership';
      }).sort().slice(0,16).forEach(function (cid) {
        V.officeApply(s,V.officeQuote(s,rid,o.id,'admit',{ candidateId:cid }));
      });
      V.candidates(s,rid,o.id).forEach(function (cid) {
        if (cid !== s.player.charId && o.vacancy.nominations.indexOf(cid) < 0) V.officeApply(s,V.officeQuote(s,rid,o.id,'nominate',{ candidateId:cid }));
      });
      // A protagonist nominee requires an explicit selection review.
      if (o.vacancy.nominations.indexOf(s.player.charId) < 0) V.officeApply(s,V.officeQuote(s,rid,o.id,'recognize',{}));
    });
    V.refreshRights(s,rid);
    var chief = V.chief(s,rid), cp = C.profile(s,rid);
    if (chief && chief.id !== s.player.charId && FB.treasuryAvailable(s,rid) < cp.obligations.reserve * 2 && !(r.dues && r.dues.endTurn > s.turn))
      V.proposalApply(s,V.proposalQuote(s,rid,'extraordinary_tax',{ amount:Math.min(5,cp.obligations.maxDues),duration:90 }));
    if (chief && chief.id !== s.player.charId) r.rights.filter(function (right) { return right.status === 'suspended'; }).forEach(function (right) {
      V.proposalApply(s,V.proposalQuote(s,rid,'renew',{ rightId:right.id }));
    });
    if (chief && chief.id !== s.player.charId) FB.realmWars(s,rid).filter(function (w) { return w.seasons >= 4; }).forEach(function (w) {
      V.makePeace(s,V.peaceQuote(s,rid,{ warId:w.id }));
    });
    r.debts.filter(function (d) { return d.status === 'active' && d.dueTurn <= s.turn; }).forEach(function (d) {
      V.proposalApply(s,V.proposalQuote(s,rid,'repay',{ debtId:d.id }));
    });
    return true;
  };
  V.attemptOverreach = function (s,rid,operation,terms) {
    var r = V.row(s,rid), p = V.profile(s,rid);
    if (!r || !p || !V.chief(s,rid) || p.consent[operation] === undefined || V.decision(s,rid,operation,terms).allowed) return false;
    r.overreach = true; r.revision++; return true;
  };
})();
