/* Bounded civil rent compositions. Spiritual office never supplies lay justice. */
(function () {
  'use strict';
  var C = FB.episcopalClaims = {}, MAX = 32;
  FB.msg('news.episcopal.rent', 'The civil rent review at {place} records a decision. Institutional receipts and household property retain their separate owners.');
  FB.msg('news.episcopal.settled', 'The rent composition at {place} transfers {money:amount} to the institutional see and sets future seasonal rent at {share}% for {seasons} seasons, beginning next season.');
  var STATES = ['demanded','contested','proposed','enforcement','settled','abandoned','declined','rejected'];
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function plain(v) { return !!v && Object.prototype.toString.call(v) === '[object Object]'; }
  function exact(v, names) { return plain(v) && Object.keys(v).length === names.length && names.every(function (k) { return Object.prototype.hasOwnProperty.call(v,k); }); }
  function integer(v, lo, hi) { return Number.isSafeInteger(v) && v >= lo && v <= hi; }
  function number(v, lo, hi) { return Number.isFinite(v) && v >= lo && v <= hi; }
  function ident(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v); }
  function season(s) { return Math.floor(s.turn / 90); }
  function rows(s) { return s.authority && s.authority.episcopalClaims || []; }
  function profile(id) { return (FBDATA.episcopalClaims || {})[id]; }
  function claimId(id, slot) { return 'episcopal:' + id + ':' + slot; }
  function row(s,id,slot) { return rows(s).filter(function (r) { return r.id === claimId(id,slot); })[0] || null; }
  function property(s,p,slot) {
    var c = p && s.settlementLordships && s.settlementLordships.counties[p.provinceId];
    return c && c.lordships && c.lordships[slot] || null;
  }
  function source(r) { return r ? { founderId:r.founderId, grantedTurn:r.grantedTurn, charterId:r.obligations && r.obligations.charterId || 'customary_service' } : null; }
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function live(s,c) { return !!c && !c.dead && !c.captive && !c.exiled && !FB.justiceCustodyOf(s,c.id); }
  function realmId(s,p) {
    return s.start && s.start.rulerRealmId === p.realmId && s.realms.player &&
      FB.ecclesiasticalGovernment.active(s,'player') ? 'player' : p.realmId;
  }
  function context(s,id,slot) {
    var p = profile(id), r = property(s,p,slot), rid = p && realmId(s,p);
    var E = FB.ecclesiasticalGovernment, binding = rid && E.row(s,rid);
    var bishop = binding && E.incumbent(s,rid), courtRealm = rid && FB.topRealm(s,rid);
    var judge = courtRealm && FB.realmRulerCharacterSnapshot(s,courtRealm);
    var charter = r && FB.feudalCharterDef(source(r).charterId);
    var holder = r && s.chars[r.holderId], place = p && FB.world.byId[p.provinceId];
    var controlled = !!(p && binding && E.active(s,rid) && E.controlled(s,rid,p.provinceId) &&
      FB.settlementCountyHolder(s,p.provinceId) === rid);
    var reason = !p || !s.start || s.start.id !== p.bookmarkId || !place ||
      !integer(slot,1,7) || !r || !charter || !(charter.taxShare > 0) ||
      !holder || !FB.settlementHolder(s,p.provinceId,slot) ||
      FB.settlementHolder(s,p.provinceId,slot).kind !== 'character' ? 'property' : null;
    if (!reason && (!controlled || !live(s,bishop) || !E.recognized(s,rid) ||
        !E.decision(s,rid,'treaty',{ provinceId:p.provinceId }).allowed ||
        !E.decision(s,rid,'revenue',{ provinceId:p.provinceId }).allowed)) reason = 'jurisdiction';
    if (!reason && (!live(s,holder) || r.holderId === bishop.id)) reason = 'principal';
    var principals = { bishopId:bishop && bishop.id || null, possessorId:r && r.holderId || null,
      courtId:judge && judge.id || null, courtRealmId:courtRealm || null,
      bishopGeneration:rid ? FB.realmRulerGeneration(s,rid) : null,
      courtGeneration:courtRealm ? FB.realmRulerGeneration(s,courtRealm) : null };
    return { profile:p, property:r, realmId:rid, bishop:bishop, judge:judge, holder:holder,
      charter:charter, controlled:controlled, reason:reason, principals:principals };
  }
  C.catalogFaults = function (catalog) {
    var table = catalog.episcopalClaims, faults = [], used = {};
    if (!plain(table) || Object.keys(table).length > MAX) return ['episcopalClaims must be a bounded table.'];
    Object.keys(table).forEach(function (id) {
      var p = table[id], names = ['name','desc','bookmarkId','provinceId','realmId','yearMin','yearMax','recurringShare','compensation','termSeasons','offerDays','possessorPolicy','enforcementPolicy'];
      if (!ident(id) || !exact(p,names) || typeof p.name !== 'string' || !p.name.trim() ||
          typeof p.desc !== 'string' || !p.desc.trim() || !ident(p.realmId) || !ident(p.provinceId) ||
          typeof p.bookmarkId !== 'string' || !catalog.bookmarks[p.bookmarkId] ||
          !integer(p.yearMin,-10000,10000) || !integer(p.yearMax,p.yearMin,10000) ||
          !number(p.recurringShare,0,1) || !number(p.compensation,1,1000) ||
          !integer(p.termSeasons,1,8) || !integer(p.offerDays,1,90) ||
          ['accept','contest','decline'].indexOf(p.possessorPolicy) < 0 ||
          ['compose','reject'].indexOf(p.enforcementPolicy) < 0) { faults.push('Invalid episcopal claim ' + id + '.'); return; }
      var key = p.bookmarkId + ':' + p.provinceId;
      var worlds = FB.bookmarkRevisions(p.bookmarkId,catalog.bookmarks[p.bookmarkId]);
      if (used[key] || !worlds.some(function (bm) {
        return (bm.provinces || []).some(function (v) { return v.id === p.provinceId && !v.wasteland; }) &&
          (bm.realms || []).some(function (v) { return v.id === p.realmId && v.ecclesiastical; });
      })) faults.push('Episcopal claim ' + id + ' requires a distinct existing temporal see and county.');
      used[key] = true;
    });
    return faults;
  };
  C.snapshot = function (s,id,slot) {
    var x = context(s,id,slot), r = row(s,id,slot), p = x.profile;
    if (!p) return null;
    var matching = !!(r && x.property && same(r.source,source(x.property)));
    var effective = !!(r && r.status === 'settled' && matching && x.controlled &&
      season(s) >= r.terms.startSeason && season(s) < r.terms.endSeason);
    var stale = !!(r && (!matching || !same(r.principals,x.principals)) && r.status !== 'settled');
    return { profileId:id, settlement:slot, realmId:x.realmId, provinceId:p.provinceId,
      bishopId:x.principals.bishopId, possessorId:x.principals.possessorId, courtId:x.principals.courtId,
      courtRealmId:x.principals.courtRealmId, source:source(x.property), record:copy(r),
      reason:x.reason, stale:stale, effective:effective,
      baselineShare:x.charter && x.charter.taxShare || 0,
      offeredShare:x.charter ? Math.min(x.charter.taxShare,p.recurringShare) : 0,
      funds:x.property ? C.funds(s,x.property.holderId) : 0 };
  };
  C.funds = function (s,cid) {
    return Math.max(0,cid === s.player.charId ? s.player.gold : FB.baronyAccount(s,cid).gold);
  };
  C.list = function (s,cid) {
    var out = []; if (!s || !s.player) return out;
    Object.keys(FBDATA.episcopalClaims || {}).sort().forEach(function (id) {
      var p = profile(id); if (!s.start || s.start.id !== p.bookmarkId) return;
      for (var slot = 1; slot < 8; slot++) {
        var r = row(s,id,slot);
        if (!property(s,p,slot) && !r) continue;
        var x = context(s,id,slot);
        if ([x.principals.bishopId,x.principals.possessorId,x.principals.courtId].indexOf(cid) < 0 &&
            !(r && [r.principals.bishopId,r.principals.possessorId,r.principals.courtId].indexOf(cid) >= 0)) continue;
        if (!r && (x.reason || s.date.year < p.yearMin || s.date.year > p.yearMax)) continue;
        out.push(C.snapshot(s,id,slot));
      }
    });
    return out;
  };
  C.entry = function (s,id) {
    return ['bishopric','visit_diocese','ecclesiastical_court'].indexOf(id) >= 0 && C.list(s,s.player.charId).length > 0;
  };
  C.quote = function (s,id,slot,actorId,action) {
    var x = context(s,id,slot), p = x.profile, r = row(s,id,slot), snap = p && C.snapshot(s,id,slot);
    if (!p || ['demand','contest','recurring','compensation','accept','decline','abandon','request_enforcement','adjudicate','reject_enforcement'].indexOf(action) < 0) return null;
    var bishop = actorId === x.principals.bishopId, possessor = actorId === x.principals.possessorId;
    var judge = actorId === x.principals.courtId, reason = x.reason, cost = 0;
    var party = bishop || possessor, pending = r && ['demanded','contested','proposed','enforcement'].indexOf(r.status) >= 0;
    if (!reason && (!party && !judge || !s.chars[actorId] || !live(s,s.chars[actorId]))) reason = 'actor';
    if (!reason && action === 'demand') {
      if (!party || r && (!pending || !snap.stale) || !r && rows(s).length >= MAX ||
          s.date.year < p.yearMin || s.date.year > p.yearMax) reason = 'closed';
    } else if (!reason) {
      if (!pending || snap.stale) reason = 'stale';
      else if (action === 'contest' && (!possessor || r.disputed)) reason = 'actor';
      else if (['recurring','compensation'].indexOf(action) >= 0 && (!party || r.status === 'enforcement')) reason = 'actor';
      else if (action === 'accept' && (r.status !== 'proposed' || !party || r.terms.offeredBy === actorId ||
          s.turn > r.terms.offeredTurn + p.offerDays)) reason = 'stale';
      else if (action === 'decline' && !possessor || action === 'abandon' && !bishop ||
          action === 'request_enforcement' && (!party || r.status === 'enforcement')) reason = 'actor';
      else if (['adjudicate','reject_enforcement'].indexOf(action) >= 0) {
        if (!judge || r.status !== 'enforcement') reason = 'actor';
        else if (!FB.justiceCivilRentJurisdiction(s,actorId,x.principals.courtRealmId,p.provinceId)) reason = 'jurisdiction';
      }
    }
    if (action === 'compensation') cost = p.compensation;
    if (action === 'accept' && r && r.terms) cost = r.terms.cost;
    if (!reason && cost > C.funds(s,x.property.holderId)) reason = 'funds';
    return { profileId:id, settlement:slot, actorId:actorId, action:action, allowed:!reason, reason:reason,
      cost:cost, payerId:x.property && x.property.holderId || null, payeeRealmId:x.realmId,
      share:action === 'compensation' ? 0 : action === 'accept' && r && r.terms ? r.terms.share : snap.offeredShare, termSeasons:p.termSeasons,
      stamp:{ turn:s.turn, definition:copy(p), record:copy(r), source:source(x.property),
        principals:copy(x.principals), funds:snap.funds,
        treasury:FB.treasuryAvailable(s,x.realmId),
        government:copy(s.authority && s.authority.governments || {}),
        recognitions:copy(s.authority && s.authority.recognitions || []),
        owner:s.owner[p.provinceId], holder:s.holder[p.provinceId] } };
  };
  function terms(q,mode) {
    return { mode:mode, offeredBy:q.actorId, offeredTurn:q.stamp.turn,
      cost:mode === 'compensation' ? q.cost : 0, share:mode === 'compensation' ? 0 : q.share,
      startSeason:null, endSeason:null };
  }
  function settle(s,r,t,court) {
    r.status = 'settled'; r.terms = t; r.adjudicated = !!court;
    t.startSeason = season(s) + 1; t.endSeason = t.startSeason + profile(r.profileId).termSeasons;
  }
  C.apply = function (s,reviewed) {
    var q = reviewed && C.quote(s,reviewed.profileId,reviewed.settlement,reviewed.actorId,reviewed.action);
    if (!q || !q.allowed || !same(q,reviewed)) return false;
    var id = q.profileId, slot = q.settlement, x = context(s,id,slot), r = row(s,id,slot);
    var a = q.action, receipt = claimId(id,slot) + ':compensation';
    if (a === 'accept' && q.cost) {
      if ((s.authority.receipts || []).some(function (v) { return v.obligationId === receipt; }) ||
          !s.treasuryAccounting || s.treasuryAccounting.mode !== 'active' ||
          !FB.treasuryCounterparty(s,x.realmId) || !FB.treasuryTransfer(s,null,x.realmId,q.cost)) return false;
      if (q.payerId === s.player.charId) s.player.gold -= q.cost;
      else s.settlementLordships.accounts[q.payerId].gold -= q.cost;
      s.authority.receipts.push({ id:receipt, obligationId:receipt, payerCharacterId:q.payerId,
        beneficiaryRealmId:x.realmId, provinceId:x.profile.provinceId, amount:q.cost, turn:s.turn });
    }
    if (a === 'demand') {
      if (!r) {
        r = { id:claimId(id,slot), profileId:id, definitionFingerprint:FB.mods.fingerprint(x.profile), provinceId:x.profile.provinceId, settlement:slot,
          realmId:x.realmId, source:source(x.property), status:'demanded', revision:0,
          createdTurn:s.turn, changedTurn:s.turn, principals:copy(x.principals),
          disputed:false, adjudicated:false, terms:null };
        if (!s.authority.episcopalClaims) s.authority.episcopalClaims = [];
        s.authority.episcopalClaims.push(r);
      }
      r.source = source(x.property); r.realmId = x.realmId; r.principals = copy(x.principals);
      r.status = 'demanded'; r.disputed = false; r.terms = null;
    } else if (a === 'contest') { r.status = 'contested'; r.disputed = true; r.terms = null; }
    else if (a === 'recurring' || a === 'compensation') { r.status = 'proposed'; r.terms = terms(q,a); }
    else if (a === 'accept') settle(s,r,copy(r.terms),false);
    else if (a === 'adjudicate') settle(s,r,terms(q,'recurring'),true);
    else {
      r.status = { decline:'declined', abandon:'abandoned', request_enforcement:'enforcement', reject_enforcement:'rejected' }[a];
      r.terms = null;
    }
    r.revision++; r.changedTurn = s.turn;
    FB.invalidateSettlementLordships(s,x.profile.provinceId);
    FB.news(s,r.status === 'settled' ? FB.message('news.episcopal.settled', {
      place:FB.world.byId[x.profile.provinceId].name, amount:r.terms.cost,
      share:r.terms.share * 100, seasons:x.profile.termSeasons }) :
      FB.message('news.episcopal.rent',{ place:FB.world.byId[x.profile.provinceId].name }));
    return true;
  };
  /* NPCs answer actual pending proposals through the same fresh quote/apply. */
  C.respond = function (s,id,slot) {
    var x = context(s,id,slot), r = row(s,id,slot), action = null, actor = null;
    if (!r || x.reason) return false;
    if (r.status === 'proposed') {
      actor = r.terms.offeredBy === x.principals.bishopId ? x.principals.possessorId : x.principals.bishopId;
      action = actor === x.principals.possessorId ?
        { accept:'accept', contest:'contest', decline:'decline' }[x.profile.possessorPolicy] : 'accept';
    } else if (r.status === 'enforcement') {
      actor = x.principals.courtId;
      action = x.profile.enforcementPolicy === 'compose' ? 'adjudicate' : 'reject_enforcement';
    }
    if (!actor || actor === s.player.charId || !action) return false;
    return C.apply(s,C.quote(s,id,slot,actor,action));
  };
  /* This replaces the same ordinary remittance on both sides. It pays nothing. */
  C.dues = function (s,pid,slot,gross,ordinary) {
    var found = rows(s).filter(function (r) { return r.provinceId === pid && r.settlement === slot && r.status === 'settled'; })[0];
    if (!found) return ordinary;
    var p = profile(found.profileId), r = property(s,p,slot);
    if (!p || !r || !same(found.source,source(r)) || FB.settlementCountyHolder(s,pid) !== found.realmId ||
        s.owner[pid] !== FB.topRealm(s,found.realmId) || season(s) < found.terms.startSeason || season(s) >= found.terms.endSeason)
      return ordinary;
    return Math.min(ordinary,Math.max(0,gross * found.terms.share));
  };
  C.validateState = function (s) {
    function fail() { throw new Error(FB.T('Invalid episcopal rent claim or compensation receipt in this save.')); }
    if (!s.authority) return true;
    if (s.authority.episcopalClaims === undefined) {
      if ((s.authority.receipts || []).some(function (r) { return r.obligationId.indexOf('episcopal:') === 0; })) fail();
      return true;
    }
    var seen = {}, used = {}, list = s.authority.episcopalClaims;
    if (!Array.isArray(list) || list.length > MAX) fail();
    list.forEach(function (r) {
      var p = r && profile(r.profileId);
      if (!exact(r,['id','profileId','definitionFingerprint','provinceId','settlement','realmId','source','status','revision','createdTurn','changedTurn','principals','disputed','adjudicated','terms']) ||
          !p || s.start.id !== p.bookmarkId || r.provinceId !== p.provinceId || !integer(r.settlement,1,7) ||
          r.definitionFingerprint !== FB.mods.fingerprint(p) ||
          r.id !== claimId(r.profileId,r.settlement) || seen[r.id] || used[r.provinceId + ':' + r.settlement] ||
          [p.realmId,'player'].indexOf(r.realmId) < 0 || r.realmId === 'player' && s.start.rulerRealmId !== p.realmId ||
          !integer(r.revision,1,Number.MAX_SAFE_INTEGER) || !integer(r.createdTurn,0,s.turn) || !integer(r.changedTurn,r.createdTurn,s.turn) ||
          STATES.indexOf(r.status) < 0 || typeof r.disputed !== 'boolean' || typeof r.adjudicated !== 'boolean' ||
          !exact(r.source,['founderId','grantedTurn','charterId']) || typeof r.source.founderId !== 'string' || !s.chars[r.source.founderId] ||
          !integer(r.source.grantedTurn,0,r.changedTurn) || !FBDATA.feudalServiceCharters[r.source.charterId] ||
          !exact(r.principals,['bishopId','possessorId','courtId','courtRealmId','bishopGeneration','courtGeneration']) ||
          ['bishopId','possessorId','courtId','courtRealmId'].some(function (k) { return typeof r.principals[k] !== 'string'; }) ||
          !s.chars[r.principals.bishopId] || !s.chars[r.principals.possessorId] || !s.realms[r.principals.courtRealmId] ||
          !integer(r.principals.bishopGeneration,1,Number.MAX_SAFE_INTEGER) || !integer(r.principals.courtGeneration,1,Number.MAX_SAFE_INTEGER)) fail();
      seen[r.id] = true; used[r.provinceId + ':' + r.settlement] = true;
      var t = r.terms, settled = r.status === 'settled', proposed = r.status === 'proposed';
      if (!settled && !proposed) { if (t !== null || r.adjudicated) fail(); return; }
      if (!exact(t,['mode','offeredBy','offeredTurn','cost','share','startSeason','endSeason']) ||
          ['recurring','compensation'].indexOf(t.mode) < 0 || !integer(t.offeredTurn,r.createdTurn,r.changedTurn) ||
          [r.principals.bishopId,r.principals.possessorId,r.adjudicated ? r.principals.courtId : null].indexOf(t.offeredBy) < 0 ||
          t.share !== (t.mode === 'compensation' ? 0 : Math.min(p.recurringShare,FBDATA.feudalServiceCharters[r.source.charterId].taxShare)) ||
          t.cost !== (t.mode === 'compensation' ? p.compensation : 0) ||
          r.adjudicated && (!settled || t.mode !== 'recurring') ||
          (settled ? t.startSeason !== Math.floor(r.changedTurn / 90) + 1 || t.endSeason !== t.startSeason + p.termSeasons : t.startSeason !== null || t.endSeason !== null)) fail();
      var receipts = s.authority.receipts.filter(function (v) { return v.obligationId === r.id + ':compensation'; });
      if (settled && t.mode === 'compensation') {
        var receipt = receipts[0];
        if (receipts.length !== 1 || !exact(receipt,['id','obligationId','payerCharacterId','beneficiaryRealmId','provinceId','amount','turn']) ||
            receipt.id !== r.id + ':compensation' || receipt.payerCharacterId !== r.principals.possessorId || receipt.beneficiaryRealmId !== r.realmId ||
            receipt.provinceId !== r.provinceId || receipt.amount !== t.cost || receipt.turn !== r.changedTurn) fail();
      } else if (receipts.length) fail();
    });
    s.authority.receipts.forEach(function (r) {
      if (r.obligationId.indexOf('episcopal:') === 0 && !list.some(function (v) { return r.obligationId === v.id + ':compensation' && v.status === 'settled' && v.terms.mode === 'compensation'; })) fail();
    });
    return true;
  };
})();
