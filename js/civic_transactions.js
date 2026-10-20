/* Reviewed public acts and limited institution-owned rights. Each receipt
   is deducted from its canonical source before crediting the beneficiary. */
(function () {
  'use strict';
  var V = FB.civicGovernment, C = FB.governments.support, Q = FB.political;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function equal(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function keys(v,list) { return !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === list.length && list.every(function (k) { return Object.prototype.hasOwnProperty.call(v,k); }); }
  function serial(r,kind) { r.serial++; return r.institutionId + ':' + kind + ':' + r.serial; }
  var rightKinds = ['quarter','warehouse','jurisdiction','revenue_share','commercial'];
  V.rightEffective = function (s,rid,right) {
    return !!right && right.status === 'active' && (right.endTurn === null || right.endTurn > s.turn) &&
      !!s.realms[rid] && s.realms[rid].alive && !!s.realms[right.grantorRealmId] && s.realms[right.grantorRealmId].alive &&
      s.holder[right.provinceId] === right.grantorRealmId && s.owner[right.provinceId] === right.grantorRealmId &&
      !FB.ordinaryWarBetween(s,rid,right.grantorRealmId);
  };
  V.refreshRights = function (s,rid) {
    var r = V.row(s,rid); if (!r) return;
    r.rights.forEach(function (right) {
      if (right.status === 'suspended' && right.endTurn !== null && s.turn >= right.endTurn) { right.status = 'expired'; r.revision++; }
      if (right.status !== 'active') return;
      if (!V.rightEffective(s,rid,right)) {
        right.status = right.endTurn !== null && s.turn >= right.endTurn ? 'expired' : 'suspended'; r.revision++;
      }
    });
  };
  function addRight(s,rid,t) {
    var r = V.row(s,rid);
    r.rights = r.rights.filter(function (right) { return right.status === 'active' || right.status === 'suspended'; });
    r.rights.push({ id:serial(r,'right'), kind:t.kind, grantorRealmId:t.grantorRealmId,
      provinceId:t.provinceId, settlement:t.settlement, share:t.share, startTurn:s.turn,
      endTurn:t.duration === null ? null : s.turn + t.duration, status:'active', evidenceId:t.evidenceId || null });
    r.revision++;
  }
  V.seedRight = function (s,rid,t) {
    if (rightKinds.indexOf(t.kind) < 0 || !s.realms[t.grantorRealmId] || s.owner[t.provinceId] !== t.grantorRealmId ||
        s.holder[t.provinceId] !== t.grantorRealmId || !Number.isInteger(t.settlement) ||
        !FB.settlementsOf(s,t.provinceId)[t.settlement] || t.share !== 0 || t.duration !== null ||
        typeof t.evidenceId !== 'string' || !t.evidenceId) throw new Error('Invalid civic opening right');
    // Historical rights with no researched numeric receipt create no money.
    addRight(s,rid,t);
  };
  V.decision = function (s,rid,operation,terms) {
    var p = V.profile(s,rid), r = V.row(s,rid), cp = C.profile(s,rid), reason = null;
    if (!p || !r || !cp || !V.active(s,rid) || !s.realms[rid].alive) return { allowed:false, reason:'inactive_institution', ballots:[], executive:[] };
    terms = terms || {};
    var support = C.row(s,rid).scopes.reduce(function (n,pid) { return n + FB.countyPopularSupport(s,pid); },0) / C.row(s,rid).scopes.length;
    var burden = (terms.price || terms.amount || 0) / Math.max(1,cp.obligations.maxDues);
    var offices = r.offices.map(function (o) {
      var c = V.incumbent(s,rid,o.id), willing = c && 60 + support / 2 + FB.skillSnapshot(s,c,'dip') - Math.min(30,burden * 20) >= 50;
      return { officeId:o.id,characterId:c && c.id || null,assent:!!willing,
        eligibility:c ? V.eligible(s,rid,c.id,o.id) : null, diplomacy:c ? FB.skillSnapshot(s,c,'dip') : null };
    });
    var available = offices.filter(function (o) { return o.assent; }).length;
    var chief = V.chief(s,rid), threshold = p.consent[operation];
    if (!V.controlled(s,rid)) reason = 'occupied';
    else if (['defence','levy','jurisdiction'].indexOf(operation) < 0 &&
        (p.executive === 'chief' ? !offices[0].assent : p.executive === 'unanimous' ? available !== offices.length : available <= offices.length / 2)) reason = 'no_mandate';
    var vote = V.ballot(s,rid,chief && chief.id,threshold === undefined ? cp.selection.threshold : threshold);
    if (!reason && threshold !== undefined && !vote.allowed) reason = 'withheld';
    if (!reason && operation === 'war' && FB.treasuryAvailable(s,rid) < cp.obligations.reserve * 2) reason = 'reserve';
    return { allowed:!reason, reason:reason, ballots:vote.ballots, executive:offices };
  };
  function otherConsent(s,rid,operation,t) {
    var result = V.active(s,rid) ? V.decision(s,rid,operation,t) : Q.consent(s,{ kind:'realm',id:rid },operation,t);
    return Object.assign({},result,{ government:copy(Q.government(s,{ kind:'realm',id:rid })),
      civicStamp:V.active(s,rid) ? V.stamp(s,rid) : null });
  }
  function validRight(s,rid,t) {
    if (!keys(t,['kind','grantorRealmId','provinceId','settlement','share','duration','price']) ||
        rightKinds.indexOf(t.kind) < 0 || !s.realms[t.grantorRealmId] || !s.realms[t.grantorRealmId].alive ||
        t.grantorRealmId === rid || s.owner[t.provinceId] !== t.grantorRealmId || s.holder[t.provinceId] !== t.grantorRealmId ||
        !Number.isInteger(t.settlement) || t.settlement < 0 || !FB.settlementFiscalProjection(s,t.provinceId,t.settlement) ||
        !Number.isFinite(t.price) || t.price < 0 || t.price > 10000 ||
        !Number.isFinite(t.share) || t.share < 0 || t.share > 1 || (t.kind === 'revenue_share' ? !t.share : t.share !== 0) ||
        !Number.isInteger(t.duration) || t.duration < 90 || t.duration > 7200) return false;
    var source = FB.settlementHolder(s,t.provinceId,t.settlement);
    // Private enterprises and privately held settlement receipts cannot be
    // pledged by their county sovereign through this public contract.
    return source && source.kind === 'realm' && source.id === t.grantorRealmId;
  }
  V.proposalQuote = function (s,rid,operation,terms) {
    var r = V.row(s,rid), p = V.profile(s,rid), cp = C.profile(s,rid);
    if (!r || !p || !cp) return null;
    var t = copy(terms || {}), decision = V.decision(s,rid,operation === 'renew' || operation === 'revoke' ? 'treaty' : operation,t), reason = decision.reason;
    var charge = 0, counterpart = null, source = null, debt = null, right = null;
    if (operation === 'treaty') {
      if (!validRight(s,rid,t)) reason = reason || 'outside_scope';
      else {
        counterpart = { generation:FB.realmRulerGeneration(s,t.grantorRealmId), funds:FB.treasuryAvailable(s,t.grantorRealmId),
          consent:otherConsent(s,t.grantorRealmId,'treaty',t) };
        if (!counterpart.consent.allowed || !FB.treasuryCounterparty(s,t.grantorRealmId) ||
            FB.ordinaryWarBetween(s,rid,t.grantorRealmId)) reason = reason || 'partner_withheld';
        if (r.rights.filter(function (q) { return q.status === 'active' || q.status === 'suspended'; }).length >= 12) reason = reason || 'commitment_limit';
        var total = 0;
        Object.keys(s.authority.governments).forEach(function (other) {
          var owner = V.row(s,other);
          if (owner) owner.rights.forEach(function (q) {
            if (['active','suspended'].indexOf(q.status) >= 0 && (q.endTurn === null || q.endTurn > s.turn) && q.grantorRealmId === t.grantorRealmId &&
                q.provinceId === t.provinceId && q.settlement === t.settlement) total += q.share;
          });
        });
        if (total + t.share > 1 + 0.000001) reason = reason || 'source_assigned';
        source = { projection:copy(FB.settlementFiscalProjection(s,t.provinceId,t.settlement)), assigned:total };
        charge = t.price;
      }
    } else if (operation === 'extraordinary_tax') {
      if (!keys(t,['amount','duration']) || !Number.isFinite(t.amount) || t.amount <= 0 || t.amount > cp.obligations.maxDues ||
          !Number.isInteger(t.duration) || t.duration < 1 || t.duration > 360) reason = reason || 'outside_scope';
      if (r.dues && r.dues.endTurn > s.turn) reason = reason || 'existing_dues';
    } else if (operation === 'pledge') {
      if (!keys(t,['lenderRealmId','amount','interest','duration']) || !s.realms[t.lenderRealmId] || !s.realms[t.lenderRealmId].alive ||
          t.lenderRealmId === rid || !Number.isFinite(t.amount) || t.amount <= 0 || t.amount > cp.obligations.maxDues * 5 ||
          !Number.isFinite(t.interest) || t.interest < 0 || t.interest > 0.25 || !Number.isInteger(t.duration) || t.duration < 90 || t.duration > 1440)
        reason = reason || 'outside_scope';
      else {
        counterpart = { generation:FB.realmRulerGeneration(s,t.lenderRealmId), funds:FB.treasuryAvailable(s,t.lenderRealmId),
          consent:otherConsent(s,t.lenderRealmId,'treaty',t) };
        if (!counterpart.consent.allowed || counterpart.funds < t.amount || !FB.treasuryCounterparty(s,t.lenderRealmId) ||
            FB.ordinaryWarBetween(s,rid,t.lenderRealmId)) reason = reason || 'partner_withheld';
      }
      if (r.debts.filter(function (d) { return d.status === 'active'; }).length >= 8) reason = reason || 'commitment_limit';
    } else if (operation === 'repay') {
      debt = r.debts.filter(function (d) { return d.id === t.debtId; })[0];
      if (!keys(t,['debtId']) || !debt || debt.status !== 'active' || !FB.treasuryCounterparty(s,debt.lenderRealmId)) reason = reason || 'outside_scope';
      charge = debt ? debt.remaining : 0;
    } else if (operation === 'revoke' || operation === 'renew') {
      right = r.rights.filter(function (q) { return q.id === t.rightId; })[0];
      if (!keys(t,['rightId']) || !right || ['active','suspended'].indexOf(right.status) < 0 || operation === 'renew' && right.status !== 'suspended') reason = reason || 'outside_scope';
      if (operation === 'renew' && right) {
        var current = copy(right); current.status = 'active';
        counterpart = { generation:FB.realmRulerGeneration(s,right.grantorRealmId), consent:otherConsent(s,right.grantorRealmId,'treaty',right) };
        if (!V.rightEffective(s,rid,current) || !counterpart.consent.allowed) reason = reason || 'partner_withheld';
      }
    } else if (operation === 'grant') {
      if (!keys(t,['provinceId','recipientId']) || !s.realms[t.recipientId] || !s.realms[t.recipientId].alive || t.recipientId === rid ||
          C.row(s,rid).scopes.indexOf(t.provinceId) < 0 || C.row(s,rid).scopes.length < 2 || s.realms[rid].capital === t.provinceId ||
          s.owner[t.provinceId] !== rid || s.holder[t.provinceId] !== rid) reason = reason || 'outside_scope';
      else {
        counterpart = { generation:FB.realmRulerGeneration(s,t.recipientId), consent:otherConsent(s,t.recipientId,'treaty',t) };
        if (!counterpart.consent.allowed || V.profile(s,t.recipientId)) reason = reason || 'partner_withheld';
      }
    } else reason = reason || 'unsupported';
    if (!reason && charge && FB.treasuryAvailable(s,rid) < charge + cp.obligations.reserve) reason = 'reserve';
    return { realmId:rid, operation:operation, terms:t, stamp:V.stamp(s,rid),
      decision:decision, counterpart:counterpart, source:source, debt:debt ? copy(debt) : null,
      right:right ? copy(right) : null, charge:charge, allowed:!reason, reason:reason };
  };
  V.proposalApply = function (s,reviewed) {
    var q = reviewed && V.proposalQuote(s,reviewed.realmId,reviewed.operation,reviewed.terms);
    if (!q || !q.allowed || !equal(q,reviewed)) return false;
    var r = V.row(s,q.realmId), t = q.terms, rid = q.realmId;
    if (q.operation === 'treaty') {
      if (q.charge && !FB.treasuryTransfer(s,rid,t.grantorRealmId,q.charge)) return false;
      addRight(s,rid,t);
    } else if (q.operation === 'extraordinary_tax') r.dues = { id:serial(r,'dues'), amount:t.amount, startTurn:s.turn, endTurn:s.turn + t.duration };
    else if (q.operation === 'pledge') {
      if (!FB.treasuryTransfer(s,t.lenderRealmId,rid,t.amount)) return false;
      r.debts = r.debts.filter(function (d) { return d.status === 'active'; });
      r.debts.push({ id:serial(r,'debt'), lenderRealmId:t.lenderRealmId, principal:t.amount,
        remaining:t.amount * (1 + t.interest), interest:t.interest, startTurn:s.turn, dueTurn:s.turn + t.duration, status:'active' });
    } else if (q.operation === 'repay') {
      if (!FB.treasuryTransfer(s,rid,q.debt.lenderRealmId,q.charge)) return false;
      var debt = r.debts.filter(function (d) { return d.id === t.debtId; })[0]; debt.remaining = 0; debt.status = 'paid';
    } else if (q.operation === 'revoke' || q.operation === 'renew') r.rights.filter(function (right) { return right.id === t.rightId; })[0].status = q.operation === 'revoke' ? 'revoked' : 'active';
    else if (q.operation === 'grant') {
      // This is a lawful public grant, distinct from military occupation.
      s.owner[t.provinceId] = FB.topRealm(s,t.recipientId); s.holder[t.provinceId] = t.recipientId;
      var electorate = C.row(s,rid);
      electorate.scopes = electorate.scopes.filter(function (pid) { return pid !== t.provinceId; });
      electorate.members.forEach(function (m) {
        m.scope = m.scope.filter(function (pid) { return pid !== t.provinceId; });
        if (m.principal.kind === 'county' && m.principal.id === t.provinceId) m.principal.id = electorate.scopes[0];
      });
      electorate.revision++; FB.invalidateRealmCache();
    }
    r.revision++;
    return true;
  };
  var power = Q.power;
  Q.power = function (s,actor,powerId,context) {
    var pid = context && context.provinceId, host = context && context.hostId && (s.armies || []).filter(function (h) { return h.id === context.hostId; })[0];
    var rid = host ? host.realm : pid && s.holder[pid], r = V.row(s,rid), p = V.profile(s,rid);
    var result = power(s,actor,powerId,context);
    if (actor && pid && powerId === 'peace') {
      var foreign = Object.keys(s.authority && s.authority.governments || {}).filter(function (id) {
        var record = V.row(s,id), chief = V.chief(s,id);
        return record && (actor.kind === 'realm' && actor.id === id || actor.kind === 'character' && chief && actor.id === chief.id) && record.rights.some(function (right) {
          return right.kind === 'jurisdiction' && right.provinceId === pid && context.settlement === right.settlement && V.rightEffective(s,id,right);
        });
      })[0];
      if (foreign) return { allowed:true, reason:null, basis:[{ kind:'institutional_right',id:V.row(s,foreign).institutionId }], consents:[] };
    }
    if (p && V.active(s,rid)) {
      if (result.allowed && result.basis.some(function (basis) {
        if (basis.kind === 'custom') {
          var right = (s.authority.rights || []).filter(function (row) { return row.id === basis.id; })[0];
          return right && right.basis !== 'possession';
        }
        return ['appointment','federate_service','legacy_command','federate_pay'].indexOf(basis.kind) >= 0;
      })) return result;
      var incumbent = r.offices.some(function (o) { var c = V.incumbent(s,rid,o.id); return !!c && actor && actor.kind === 'character' && c.id === actor.id; });
      var allowed = V.controlled(s,rid) && C.profile(s,rid).powers.indexOf(powerId) >= 0 &&
        (actor && actor.kind === 'realm' && actor.id === rid || incumbent);
      return { allowed:!!allowed, reason:allowed ? null : 'no_mandate', basis:allowed ? [{ kind:'civic_office',id:r.institutionId }] : [], consents:[] };
    }
    return result;
  };
  var snapshot = FB.treasurySnapshot;
  FB.treasurySnapshot = function (s,context) {
    var out = snapshot(s,context), fiscalContext = context || {}, transfers = [];
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r = V.row(s,rid); if (!r || !out.rows[rid]) return;
      r.rights.forEach(function (right) {
        if (!right.share || !V.rightEffective(s,rid,right) || !out.rows[right.grantorRealmId]) return;
        var source = FB.settlementFiscalProjection(s,right.provinceId,right.settlement,fiscalContext);
        if (!source || source.holder.kind !== 'realm' || source.holder.id !== right.grantorRealmId) return;
        var amount = Math.max(0,source.amounts.tax + source.amounts.tolls + source.amounts.national) * right.share;
        transfers.push({ payer:right.grantorRealmId, recipient:rid, amount:amount });
      });
    });
    transfers.forEach(function (t) { out.rows[t.payer].duesOut += t.amount; out.rows[t.recipient].duesIn += t.amount; });
    return out;
  };
  var season = FB.treasurySeason;
  var officeBudget = FB.publicOfficeBudget;
  FB.publicOfficeBudget = function (s,rid,context) {
    var amount = officeBudget(s,rid,context), p = V.profile(s,rid);
    return amount + (p ? p.offices.reduce(function (n,o) { return n + (V.incumbent(s,rid,o.id) ? o.salary : 0); },0) : 0);
  };
  var officerIncome = FB.publicOfficerIncome;
  FB.publicOfficerIncome = function (s,cid) {
    var total = officerIncome(s,cid);
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r = V.row(s,rid), cp = C.profile(s,rid); if (!r || !cp) return;
      var funds = Math.max(0,FB.treasuryAvailable(s,rid) - cp.obligations.reserve);
      r.offices.forEach(function (o,i) { var c = V.incumbent(s,rid,o.id), amount = c ? Math.min(V.profile(s,rid).offices[i].salary,funds) : 0;
        if (c && c.id === cid) total += amount; funds -= amount;
      });
    });
    return total;
  };
  FB.treasurySeason = function (s) {
    var settled = season.apply(FB,arguments); if (!settled) return settled;
    var period = Math.floor(s.turn / 90);
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r = V.row(s,rid), cp = C.profile(s,rid); if (!r || !cp) return;
      r.offices.forEach(function (o) {
        if (o.lastSalaryPeriod >= period) return;
        var c = V.incumbent(s,rid,o.id), def = V.profile(s,rid).offices.filter(function (d) { return d.id === o.id; })[0];
        var amount = c ? Math.min(def.salary,Math.max(0,FB.treasuryAvailable(s,rid) - cp.obligations.reserve)) : 0;
        if (amount && (c.id === s.player.charId && FB.treasuryPreserved(s,'player')
            ? FB.treasuryPayPrivate(s,rid,amount) : FB.treasuryTransfer(s,rid,c.id === s.player.charId ? 'player' : null,amount))) {
          if (c.id !== s.player.charId) c.gold = (Number(c.gold) || 0) + amount;
        }
        o.lastSalaryPeriod = period;
      });
      var treasury = s.realms[rid] && s.realms[rid].treasury;
      if (treasury && treasury.lastSummary) treasury.lastSummary.closing = treasury.gold;
    });
    return settled;
  };
  var characterRealm = FB.treasuryCharacterRealm;
  FB.treasuryCharacterRealm = function (s,cid) { var rid = FB.realmIdForRulerCharacter(s,cid); return cid !== s.player.charId && V.profile(s,rid) ? null : characterRealm(s,cid); };
})();
