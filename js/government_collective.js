/* Typed collective consent. Decisions bind exact terms, local rights and
   the current mandate; fresh decisions never acquire household property. */
(function () {
  'use strict';
  var C = FB.governments.support, Q = FB.political;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v, allowed) { return plain(v) && Object.keys(v).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  var converting = false;
  function active(s, rid) { return C.row(s, rid) && C.isDelegated(s, rid); }
  function memberPolicy(s, rid, id) {
    return C.profile(s, rid).members.filter(function (m) { return m.id === id; })[0];
  }
  C.terms = function (operation, scope) {
    scope = scope || {};
    var out = {};
    if (operation === 'war') {
      out.causes = (scope.causes || []).map(function (c) {
        return { type:c.type, enemy:c.enemy, target:c.target, titleKind:c.titleKind || null,
          titleId:c.titleId || null, rightId:c.rightId || null, basis:c.basis || null };
      });
    } else {
      ['provinceId','settlement','recipientId','warId','amount','duration','externalRealmId','kind','formId','custom','levy','power','occupationSettlement'].forEach(function (k) {
        if (scope[k] !== undefined) out[k] = copy(scope[k]);
      });
    }
    return out;
  };
  function signature(s, rid) {
    var r = C.row(s, rid);
    return { turn:s.turn, revision:r.revision, generation:FB.realmRulerGeneration(s, rid),
      mandateId:r.mandate && r.mandate.status === 'active' ? r.mandate.id : null,
      members:C.members(s, rid), profile:copy(C.profile(s, rid)),
      territory:r.scopes.map(function (pid) { return { id:pid, owner:s.owner[pid], holder:s.holder[pid] }; }) };
  }
  function validTerms(s, rid, operation, t) {
    var r = C.row(s, rid), p = C.profile(s, rid);
    var fields = { war:['causes'], extraordinary_tax:['amount','duration'], conversion:['formId','externalRealmId'],
      treaty:t.warId !== undefined ? ['warId','kind'] : ['kind','externalRealmId','amount','duration','levy','power','occupationSettlement'] };
    if (!fields[operation] || !keys(t, fields[operation])) return false;
    if (operation === 'war') return Array.isArray(t.causes) && t.causes.length > 0 && t.causes.length <= 8 && t.causes.every(function (c) {
      return c && typeof c.type === 'string' && s.realms[c.enemy] && s.realms[c.enemy].alive && c.enemy !== rid &&
        ['aggression','customary','fabricated','dejure'].indexOf(c.type) >= 0 &&
        typeof c.target === 'string' && !!FB.world.byId[c.target] && FB.warTargetDefender(s, rid, c.target) === c.enemy;
    });
    if (operation === 'extraordinary_tax') return Number.isFinite(t.amount) && t.amount > 0 && t.amount <= p.obligations.maxDues &&
      Number.isInteger(t.duration) && t.duration > 0 && t.duration <= 360;
    if (operation === 'grant' || operation === 'pledge') return false;
    if (operation === 'conversion') return FBDATA.governmentForms[t.formId] && t.formId !== FB.governments.forRealm(s, rid).id &&
      typeof t.externalRealmId === 'string' && t.externalRealmId !== rid && s.realms[t.externalRealmId] && s.realms[t.externalRealmId].alive &&
      r.scopes.every(function (pid) { return s.owner[pid] === rid || s.owner[pid] === t.externalRealmId; });
    if (operation === 'treaty') return t.warId !== undefined
      ? !!FB.ordinaryWarById(s, t.warId) && [FB.ordinaryWarById(s, t.warId).attacker, FB.ordinaryWarById(s, t.warId).defender].indexOf(rid) >= 0 && t.kind === 'white_peace'
      : ['tribute','protection','service','delegated_authority'].indexOf(t.kind) >= 0 &&
        s.realms[t.externalRealmId] && s.realms[t.externalRealmId].alive && t.externalRealmId !== rid &&
        Number.isFinite(t.amount) && t.amount >= 0 && t.amount <= p.obligations.maxDues &&
        Number.isInteger(t.duration) && t.duration > 0 && t.duration <= 1440 &&
        (t.occupationSettlement === undefined || t.occupationSettlement === true &&
          ['tribute','protection'].indexOf(t.kind) >= 0 && r.scopes.some(function (pid) { return s.owner[pid] === t.externalRealmId; }) &&
          r.scopes.every(function (pid) { return s.owner[pid] === rid || s.owner[pid] === t.externalRealmId; })) &&
        (t.kind === 'service' || t.kind === 'protection' ? Number.isInteger(t.levy) && t.levy > 0 && t.levy <= p.obligations.maxLevy : t.levy === undefined) &&
        (t.kind !== 'service' || t.levy <= Math.floor(FB.aiBaseHost(s, rid) * 0.75)) &&
        (t.kind === 'delegated_authority' ? ['ban','peace','revenue'].indexOf(t.power) >= 0 : t.power === undefined);
    return false;
  }
  C.assentQuote = function (s, rid, operation, terms) {
    var r = C.row(s, rid), p = C.profile(s, rid);
    if (!r || !p) return null;
    var t = C.terms(operation, terms), members = C.members(s, rid), delegate = C.delegate(s, rid);
    var funds = FB.treasuryAvailable(s, rid), charge = operation === 'treaty' && !t.warId ? t.amount : 0;
    var reason = !C.isDelegated(s, rid) ? 'inactive_institution' :
      !members.length || members.length !== r.members.length ? 'constituency_unresolved' :
      !validTerms(s, rid, operation, t) ? 'outside_scope' :
      !delegate && operation !== 'conversion' ? 'no_mandate' :
      r.scopes.some(function (pid) { return s.owner[pid] !== rid; }) && operation !== 'conversion' && !t.occupationSettlement ? 'occupied' :
      charge > 0 && funds < charge + p.obligations.reserve ? 'reserve' : null;
    var ballots = members.map(function (m) {
      var policy = memberPolicy(s, rid, m.id), support = policy ? policy.support : 0;
      var local = m.scope.reduce(function (n, pid) { return n + FB.countyPopularSupport(s, pid); }, 0) / m.scope.length;
      var burden = t.amount || 0;
      var proposer = delegate ? Math.max(-10, Math.min(10, (Number(delegate.skills.dip) || 0) - 4)) : 0;
      var refused = support + local / 2 + proposer < 50 || burden > p.obligations.maxDues ||
        operation === 'war' && funds < p.obligations.reserve * 2;
      return { memberId:m.id, weight:m.weight, assent:!refused, reason:refused ? 'withheld' : null };
    });
    var weight = ballots.reduce(function (n, b) { return n + (b.assent ? b.weight : 0); }, 0);
    var total = ballots.reduce(function (n, b) { return n + b.weight; }, 0);
    if (!reason && weight < total * p.selection.threshold) reason = 'withheld';
    return { realmId:rid, operation:operation, terms:t, stamp:signature(s, rid),
      ballots:ballots, funds:funds, charge:charge, allowed:!reason, reason:reason };
  };
  C.assent = function (s, reviewed) {
    if (!reviewed) return false;
    var fresh = C.assentQuote(s, reviewed.realmId, reviewed.operation, reviewed.terms);
    if (!fresh || !equal(fresh, reviewed)) return false;
    var r = C.row(s, fresh.realmId);
    // A refusal is recorded once as a durable local decision without payment.
    if (fresh.reason && fresh.reason !== 'withheld') return false;
    if (r.decisions.some(function (d) { return d.generation === fresh.stamp.generation && d.status !== 'executed' &&
      d.operation === fresh.operation && equal(d.terms, fresh.terms) && equal(d.members, fresh.stamp.members) &&
      equal(d.ballots, fresh.ballots) && d.threshold === C.profile(s, fresh.realmId).selection.threshold; })) return false;
    r.serial++;
    r.decisions.push({ id:r.id + ':decision:' + r.serial, operation:fresh.operation, terms:copy(fresh.terms),
      mandateId:fresh.stamp.mandateId, generation:fresh.stamp.generation, members:copy(fresh.stamp.members),
      ballots:copy(fresh.ballots), threshold:C.profile(s, fresh.realmId).selection.threshold,
      status:fresh.allowed ? 'approved' : 'refused', turn:s.turn, executedTurn:null });
    if (r.decisions.length > 12) r.decisions.shift();
    return fresh.allowed;
  };
  C.authorization = function (s, rid, operation, scope) {
    var r = C.row(s, rid), t = C.terms(operation, scope);
    if (!r || !C.delegate(s, rid)) return null;
    var found = r.decisions.filter(function (d) {
      return d.status === 'approved' && d.operation === operation && equal(d.terms, t) &&
        d.mandateId === r.mandate.id && d.generation === FB.realmRulerGeneration(s, rid) &&
        equal(d.members, C.members(s, rid)) && C.assentQuote(s, rid, operation, t).allowed;
    })[0] || null;
    return found ? copy(found) : null;
  };
  C.consume = function (s, rid, operation, scope) {
    var d = C.authorization(s, rid, operation, scope);
    if (!d) return false;
    var saved = C.row(s, rid).decisions.filter(function (row) { return row.id === d.id; })[0];
    saved.status = 'executed'; saved.executedTurn = s.turn;
    return true;
  };
  C.consent = function (s, rid, actor, operation, scope) {
    var r = C.row(s, rid), p = C.profile(s, rid), delegate = C.delegate(s, rid);
    var local = actor && (actor.kind === 'realm' && actor.id === rid || actor.kind === 'character' && s.chars[actor.id] && !s.chars[actor.id].dead &&
      r && r.scopes.indexOf(actor.id === s.player.charId ? s.player.provinceId : s.chars[actor.id].homeProvinceId) >= 0);
    if (r && p && local && ['household','defence','levy'].indexOf(operation) >= 0 &&
        (!scope || !scope.provinceId || r.scopes.indexOf(scope.provinceId) >= 0) &&
        (operation === 'household' || r.scopes.every(function (pid) { return s.owner[pid] === rid; })))
      return { allowed:true, reason:null, required:[], approvals:{} };
    var valid = actor && (actor.kind === 'realm' && actor.id === rid || actor.kind === 'character' && delegate && actor.id === delegate.id);
    var reason = !r || !p ? 'constituency_unresolved' : !valid ? 'not_delegate' :
      !delegate ? 'no_mandate' : r.scopes.some(function (pid) { return s.owner[pid] !== rid || s.holder[pid] !== rid; }) ? 'occupied' : null;
    var reserved = p && p.reserved.indexOf(operation) >= 0;
    if (!reason && reserved && !C.authorization(s, rid, operation, scope)) reason = 'collective_consent';
    if (!reason && !reserved && ['levy','defence','arbitration','household'].indexOf(operation) < 0) reason = 'unsupported_operation';
    return { allowed:!reason, reason:reason, required:reserved ? C.members(s, rid).map(function (m) { return m.id; }) : [], approvals:{} };
  };
  C.agreementQuote = function (s, rid, terms) {
    var q = C.assentQuote(s, rid, 'treaty', terms);
    if (!q) return null;
    var partner = terms.externalRealmId, validPartner = !!(s.realms[partner] && s.realms[partner].alive && FB.treasuryCounterparty(s, partner));
    var capacity = C.row(s, rid).agreements.filter(function (a) { return a.endTurn > s.turn; }).length < 12;
    var counterpart = validPartner && !C.isDelegated(s, partner) && Q.consent(s, { kind:'realm', id:partner }, 'treaty',
      { externalRealmId:rid, kind:terms.kind }).allowed &&
      (terms.kind !== 'protection' || FB.treasuryAvailable(s, partner) >= C.profile(s, rid).obligations.reserve && !FB.isRealmAtWar(s, partner));
    return Object.assign({}, q, { authorized:!!C.authorization(s, rid, 'treaty', terms), partnerConsent:!!counterpart,
      partnerGeneration:validPartner ? FB.realmRulerGeneration(s, partner) : null,
      partnerFunds:validPartner ? FB.treasuryAvailable(s, partner) : null,
      allowed:q.allowed && counterpart && capacity, reason:q.reason || (!counterpart ? 'partner_withheld' : !capacity ? 'commitment_limit' : null) });
  };
  C.agree = function (s, reviewed) {
    if (!reviewed) return false;
    var fresh = C.agreementQuote(s, reviewed.realmId, reviewed.terms);
    if (!fresh || !fresh.allowed || !equal(fresh, reviewed)) return false;
    var rid = fresh.realmId, r = C.row(s, rid), t = fresh.terms;
    if (r.agreements.filter(function (a) { return a.endTurn > s.turn; }).length >= 12 ||
        !FB.treasuryCounterparty(s, t.externalRealmId)) return false;
    var oldDecisions = copy(r.decisions), oldSerial = r.serial;
    if (!fresh.authorized && !C.assent(s, C.assentQuote(s, rid, 'treaty', t))) return false;
    if (!C.consume(s, rid, 'treaty', t) || fresh.charge && !FB.treasuryTransfer(s, rid, t.externalRealmId, fresh.charge)) {
      r.decisions = oldDecisions; r.serial = oldSerial;
      return false;
    }
    r.serial++;
    r.agreements = r.agreements.filter(function (a) { return a.endTurn > s.turn; });
    r.agreements.push({ id:r.id + ':agreement:' + r.serial, kind:t.kind, externalRealmId:t.externalRealmId,
      amount:t.amount, levy:t.levy || 0, power:t.power || null,
      startTurn:s.turn, endTurn:s.turn + t.duration, paidTurn:s.turn, scope:r.scopes.slice() });
    if (t.occupationSettlement) {
      r.scopes.forEach(function (pid) { s.owner[pid] = rid; });
      FB.invalidateRealmCache();
    }
    r.revision++;
    return true;
  };
  C.duesQuote = function (s, rid, terms) {
    var q = C.assentQuote(s, rid, 'extraordinary_tax', terms), r = C.row(s, rid);
    if (!q) return null;
    return Object.assign({}, q, { existing:copy(r.dues), allowed:q.allowed && !(r.dues && r.dues.endTurn > s.turn),
      reason:q.reason || (r.dues && r.dues.endTurn > s.turn ? 'existing_dues' : null) });
  };
  C.imposeDues = function (s, reviewed) {
    var fresh = reviewed && C.duesQuote(s, reviewed.realmId, reviewed.terms);
    if (!fresh || !fresh.allowed || !equal(fresh, reviewed)) return false;
    var r = C.row(s, fresh.realmId);
    if (!C.authorization(s, r.id, 'extraordinary_tax', fresh.terms) && !C.assent(s, C.assentQuote(s, r.id, 'extraordinary_tax', fresh.terms))) return false;
    if (!C.consume(s, r.id, 'extraordinary_tax', fresh.terms)) return false;
    r.serial++;
    r.dues = { id:r.id + ':dues:' + r.serial, amount:fresh.terms.amount, startTurn:s.turn,
      endTurn:s.turn + fresh.terms.duration, mandateId:r.mandate.id };
    r.revision++;
    return true;
  };
  C.conversionQuote = function (s, rid, terms) {
    var q = C.assentQuote(s, rid, 'conversion', terms), r = C.row(s, rid);
    if (!q) return null;
    var partner = s.realms[terms.externalRealmId], partnerConsent = !!partner && partner.alive &&
      !C.isDelegated(s, terms.externalRealmId) && Q.consent(s, { kind:'realm', id:terms.externalRealmId }, 'treaty', { externalRealmId:rid }).allowed;
    var committed = r.dues && r.dues.endTurn > s.turn || r.agreements.some(function (a) { return a.endTurn > s.turn; });
    return Object.assign({}, q, { partnerGeneration:partner ? FB.realmRulerGeneration(s, terms.externalRealmId) : null,
      allowed:q.allowed && partnerConsent && !committed, reason:q.reason || (!partnerConsent ? 'partner_withheld' : committed ? 'existing_obligations' : null), authorized:r.decisions.some(function (d) {
      return d.status === 'approved' && d.operation === 'conversion' && equal(d.terms, q.terms) &&
        equal(d.members, q.stamp.members) && d.generation === q.stamp.generation;
    }) });
  };
  var settleWar = FB.settleOrdinaryWar;
  FB.settleOrdinaryWar = function (s, id, result) {
    var w = FB.ordinaryWarById(s, id), needed = [];
    if (w && result === 'white_peace') {
      needed = [w.attacker, w.defender].filter(function (rid) { return C.isDelegated(s, rid); });
      if (needed.length && w.status !== 'active') return false;
      if (needed.some(function (rid) { return !C.authorization(s, rid, 'treaty', { warId:id, kind:'white_peace' }); })) return false;
    }
    var applied = settleWar.apply(FB, arguments);
    if (applied) needed.forEach(function (rid) { C.consume(s, rid, 'treaty', { warId:id, kind:'white_peace' }); });
    return applied;
  };
  C.peaceQuote = function (s, rid, terms) {
    var q = C.assentQuote(s, rid, 'treaty', terms), w = FB.ordinaryWarById(s, terms.warId);
    if (!q || !w || w.status !== 'active' || [w.attacker, w.defender].indexOf(rid) < 0) return null;
    var other = w.attacker === rid ? w.defender : w.attacker;
    var counterpart = C.isDelegated(s, other) ? C.assentQuote(s, other, 'treaty', terms) :
      Q.consent(s, { kind:'realm', id:other }, 'treaty', terms);
    var strength = { local:FB.realmStrength(s, rid), partner:FB.realmStrength(s, other) };
    var willing = w.seasons >= 4 || strength.partner <= strength.local * 1.5;
    return Object.assign({}, q, { campaign:copy(w), counterpart:copy(counterpart), partnerId:other, strength:strength,
      allowed:q.allowed && counterpart.allowed && willing, reason:q.reason || (!counterpart.allowed || !willing ? 'partner_withheld' : null) });
  };
  C.makePeace = function (s, reviewed) {
    var fresh = reviewed && C.peaceQuote(s, reviewed.realmId, reviewed.terms);
    if (!fresh || !fresh.allowed || !equal(fresh, reviewed)) return false;
    var participants = [fresh.realmId, fresh.partnerId].filter(function (rid) { return C.isDelegated(s, rid); });
    var prior = participants.map(function (rid) { var r = C.row(s, rid); return { rid:rid, serial:r.serial, decisions:copy(r.decisions) }; });
    participants.forEach(function (rid) {
      if (!C.authorization(s, rid, 'treaty', fresh.terms)) C.assent(s, C.assentQuote(s, rid, 'treaty', fresh.terms));
    });
    if (FB.settleOrdinaryWar(s, fresh.terms.warId, 'white_peace')) return true;
    prior.forEach(function (row) { C.row(s, row.rid).serial = row.serial; C.row(s, row.rid).decisions = row.decisions; });
    return false;
  };
  C.convert = function (s, reviewed) {
    if (!reviewed) return false;
    var fresh = C.conversionQuote(s, reviewed.realmId, reviewed.terms);
    if (!fresh || !fresh.allowed || !fresh.authorized || !equal(fresh, reviewed)) return false;
    var r = C.row(s, fresh.realmId), t = fresh.terms;
    var applied;
    converting = true;
    try { applied = FB.authoritySetGovernment(s, fresh.realmId, t.formId); }
    finally { converting = false; }
    if (!applied) return false;
    if (r.mandate) r.mandate.status = 'ended';
    r.decisions.forEach(function (d) { if (d.operation === 'conversion' && d.status === 'approved') { d.status = 'executed'; d.executedTurn = s.turn; } });
    r.decisions = r.decisions.filter(function (d) { return d.status !== 'approved'; });
    r.scopes.forEach(function (pid) { if (s.owner[pid] === t.externalRealmId) { s.owner[pid] = fresh.realmId; s.holder[pid] = fresh.realmId; } });
    FB.invalidateRealmCache();
    FB.governments.invalidate();
    return true;
  };
  C.acceptConversion = function (s, reviewed) {
    var fresh = reviewed && C.conversionQuote(s, reviewed.realmId, reviewed.terms);
    if (!fresh || !fresh.allowed || !equal(fresh, reviewed)) return false;
    var r = C.row(s, fresh.realmId), old = copy(r.decisions), serial = r.serial;
    if (!fresh.authorized && !C.assent(s, C.assentQuote(s, r.id, 'conversion', fresh.terms))) return false;
    if (C.convert(s, C.conversionQuote(s, r.id, fresh.terms))) return true;
    r.decisions = old; r.serial = serial;
    return false;
  };
  C.validateDecisions = function (s, rid, fault) {
    var r = C.row(s, rid), ids = {}, p = C.profile(s, rid);
    function duration(t, maximum) { return Number.isInteger(t.duration) && t.duration > 0 && t.duration <= maximum; }
    function amount(t) { return Number.isFinite(t.amount) && t.amount >= 0 && t.amount <= p.obligations.maxDues; }
    function outside(t) { return typeof t.externalRealmId === 'string' && t.externalRealmId !== rid && !!s.realms[t.externalRealmId]; }
    function savedTerms(operation, t) {
      if (!plain(t)) return false;
      if (operation === 'war') return keys(t, ['causes']) && Array.isArray(t.causes) && t.causes.length > 0 && t.causes.length <= 8 &&
        t.causes.every(function (c) { return keys(c, ['type','enemy','target','titleKind','titleId','rightId','basis']) &&
          ['aggression','customary','fabricated','dejure'].indexOf(c.type) >= 0 && !!s.realms[c.enemy] && c.enemy !== rid &&
          (FB.campaignBookmark(s).provinces || []).some(function (q) { return q.id === c.target; }) &&
          ['titleKind','titleId','rightId','basis'].every(function (key) { return c[key] === null || typeof c[key] === 'string'; }); });
      if (operation === 'extraordinary_tax') return keys(t, ['amount','duration']) && amount(t) && t.amount > 0 && duration(t, 360);
      if (operation === 'conversion') return keys(t, ['formId','externalRealmId']) && !!FBDATA.governmentForms[t.formId] && outside(t);
      if (operation !== 'treaty') return false;
      if (t.warId !== undefined) return keys(t, ['warId','kind']) && typeof t.warId === 'string' && !!t.warId && t.kind === 'white_peace';
      return keys(t, ['kind','externalRealmId','amount','duration','levy','power','occupationSettlement']) &&
        ['tribute','protection','service','delegated_authority'].indexOf(t.kind) >= 0 && outside(t) && amount(t) && duration(t, 1440) &&
        (t.occupationSettlement === undefined || t.occupationSettlement === true && ['tribute','protection'].indexOf(t.kind) >= 0) &&
        (t.kind === 'service' || t.kind === 'protection' ? Number.isInteger(t.levy) && t.levy > 0 && t.levy <= p.obligations.maxLevy : t.levy === undefined) &&
        (t.kind === 'delegated_authority' ? ['ban','peace','revenue'].indexOf(t.power) >= 0 : t.power === undefined);
    }
    r.decisions.forEach(function (d) {
      if (!keys(d, ['id','operation','terms','mandateId','generation','members','ballots','threshold','status','turn','executedTurn']) || !C.validRecordId(r, d.id, 'decision') || ids[d.id] || !plain(d.terms) ||
          !savedTerms(d.operation, d.terms) || !equal(C.terms(d.operation, d.terms), d.terms) || p.reserved.indexOf(d.operation) < 0 || !Number.isSafeInteger(d.generation) || d.generation < 1 ||
          (!C.validRecordId(r, d.mandateId, 'mandate') && !(d.operation === 'conversion' && d.mandateId === null)) || !Array.isArray(d.members) || !d.members.length || d.members.length > 16 ||
          new Set(d.members.map(function (m) { return m && m.id; })).size !== d.members.length ||
          d.members.some(function (m) { return !keys(m, ['id','principal','scope','basis','weight','continuity']) || !p.members.some(function (q) { return q.id === m.id; }) ||
            !keys(m.principal, ['kind','id']) || ['county','character'].indexOf(m.principal.kind) < 0 || typeof m.principal.id !== 'string' ||
            m.principal.kind === 'county' && r.scopes.indexOf(m.principal.id) < 0 ||
            !Array.isArray(m.scope) || !m.scope.length || new Set(m.scope).size !== m.scope.length || m.scope.some(function (pid) { return r.scopes.indexOf(pid) < 0; }) ||
            !Number.isInteger(m.weight) || m.weight < 1 || m.weight > 10 || ['custom','service'].indexOf(m.basis) < 0 || ['institution','person'].indexOf(m.continuity) < 0; }) ||
          !Array.isArray(d.ballots) || d.ballots.length !== d.members.length ||
          !Number.isFinite(d.threshold) || d.threshold <= 0 || d.threshold > 1 ||
          ['approved','refused','executed'].indexOf(d.status) < 0 || !Number.isInteger(d.turn) || d.turn < 0 || d.turn > s.turn ||
          d.status === 'executed' && (!Number.isInteger(d.executedTurn) || d.executedTurn < d.turn || d.executedTurn > s.turn) ||
          d.status !== 'executed' && d.executedTurn !== null ||
          d.ballots.some(function (b, i) { return !keys(b, ['memberId','weight','assent','reason']) || b.memberId !== d.members[i].id || b.weight !== d.members[i].weight ||
            typeof b.assent !== 'boolean' || b.reason !== (b.assent ? null : 'withheld'); })) fault();
      var assented = d.ballots.reduce(function (n, b) { return n + (b.assent ? b.weight : 0); }, 0);
      var total = d.ballots.reduce(function (n, b) { return n + b.weight; }, 0);
      if ((d.status === 'refused') !== (assented < total * d.threshold)) fault();
      if (d.status === 'approved' && (d.generation !== FB.realmRulerGeneration(s, rid) || d.mandateId !== (r.mandate && r.mandate.id || null))) fault();
      ids[d.id] = true;
    });
    r.agreements.forEach(function (a) {
      if (!keys(a, ['id','kind','externalRealmId','amount','levy','power','startTurn','endTurn','paidTurn','scope']) || !C.validRecordId(r, a.id, 'agreement') || ids[a.id] ||
          ['tribute','protection','service','delegated_authority'].indexOf(a.kind) < 0 || !s.realms[a.externalRealmId] ||
          !Number.isFinite(a.amount) || a.amount < 0 || a.amount > p.obligations.maxDues || !Number.isInteger(a.levy) || a.levy < 0 || a.levy > p.obligations.maxLevy ||
          ['service','protection'].indexOf(a.kind) >= 0 && a.levy === 0 || a.kind === 'delegated_authority' && a.power === null ||
          (a.power !== null && ['ban','peace','revenue'].indexOf(a.power) < 0) ||
          !Number.isInteger(a.startTurn) || a.startTurn < 0 || a.startTurn > s.turn ||
          !Number.isInteger(a.endTurn) || a.endTurn <= a.startTurn || a.endTurn - a.startTurn > 1440 || a.paidTurn !== a.startTurn ||
          !Array.isArray(a.scope) || !a.scope.length || new Set(a.scope).size !== a.scope.length || a.scope.some(function (pid) { return r.scopes.indexOf(pid) < 0; })) fault();
      ids[a.id] = true;
    });
    var historyIds = {};
    r.history.forEach(function (h) {
      if (!keys(h, ['id','result','delegateId','mandateId','turn']) || !C.validRecordId(r, h.id, h.result === 'selected' ? 'selection' : 'replacement') ||
          historyIds[h.id] || !Number.isInteger(h.turn) || h.turn < 0 || h.turn > s.turn ||
          h.result === 'selected' && !C.validRecordId(r, h.mandateId, 'mandate') ||
          ['selected','recall','resign'].indexOf(h.result) < 0 || typeof h.delegateId !== 'string' || !h.delegateId) fault();
      historyIds[h.id] = true;
    });
  };
  var originalPower = Q.power;
  Q.power = function (s, actor, power, context) {
    var result = originalPower(s, actor, power, context), pid = context && context.provinceId;
    var host = context && context.hostId && (s.armies || []).filter(function (h) { return h.id === context.hostId; })[0];
    var rid = host ? host.realm : pid && s.holder[pid];
    if (!active(s, rid) || !actor || result.basis.some(function (b) { return ['appointment','custom','federate_pay','federate_service'].indexOf(b.kind) >= 0; })) return result;
    var delegate = C.delegate(s, rid), profile = C.profile(s, rid);
    var delegated = C.row(s, rid).agreements.filter(function (a) {
      return a.kind === 'delegated_authority' && a.externalRealmId === actor.id && actor.kind === 'realm' &&
        a.endTurn > s.turn && a.scope.indexOf(pid || host && host.at) >= 0 && a.power === power;
    })[0];
    if (delegated) return { allowed:true, reason:null, basis:[{ kind:'agreement', id:delegated.id }], consents:[] };
    var allowed = !!delegate && profile.powers.indexOf(power) >= 0 &&
      (actor.kind === 'realm' && actor.id === rid || actor.kind === 'character' && actor.id === delegate.id);
    return { allowed:allowed, reason:allowed ? null : 'no_mandate', basis:allowed ? [{ kind:'mandate', id:C.row(s, rid).mandate.id }] : [], consents:[] };
  };
  C.attemptOverreach = function (s, rid, operation, scope) {
    var r = C.row(s, rid);
    if (!r || !C.isDelegated(s, rid) || !C.delegate(s, rid) || C.profile(s, rid).reserved.indexOf(operation) < 0 ||
        C.consent(s, rid, { kind:'realm', id:rid }, operation, scope).allowed) return false;
    r.overreach = true;
    return true;
  };
  var setForm = FB.authoritySetGovernment;
  FB.authoritySetGovernment = function (s, rid, formId, options) {
    if (active(s, rid) && !converting) return false;
    return setForm(s, rid, formId, options);
  };
  var renderQuote = Q.renderQuote;
  Q.renderQuote = function (s, actor, terms) {
    // Declared community dues settle through the public fiscal account. A
    // caller-created obligation id must never become a new household charge.
    if (terms && active(s, s.holder[terms.provinceId])) return null;
    return renderQuote(s, actor, terms);
  };
})();
