/* Named ecclesiastical discipline over existing canonical evidence. */
(function () {
  'use strict';
  var R = FB.religiousCases = {}, C = FB.episcopalClaims, MAX = 64;
  var ACTIVE = ['charged','offered','referred','accepted'];
  var CLOSED = ['dismissed','vindicated','settled','penance','imprisoned','confiscated','enforced','interrupted'];
  var ACTIONS = ['charge','dismiss','challenge','defend','settlement','accept','decline','refuse','arrest','submit',
    'penance','imprison','refer','accept_referral','reject_referral','confiscate','enforce','close_stale'];
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function rows(s) { return s.authority && s.authority.religiousCases || []; }
  function offense(s,id) { return (s.justice && s.justice.offenses || []).filter(function (o) { return o.id === id; })[0] || null; }
  function record(s,id) { return rows(s).filter(function (r) { return r.offenseId === id; })[0] || null; }
  function profile(id) { return (FBDATA.religiousCases || {})[id]; }
  function live(s,id) { return !!(s.chars[id] && !s.chars[id].dead); }
  function local(s,id) { return id === s.player.charId ? s.player.travel && s.player.travel.currentId || s.player.provinceId :
    s.chars[id] && FB.characterResidence(s,s.chars[id]); }
  function facts(o) {
    return o && { id:o.id, sourceId:o.sourceId, accusedId:o.accusedId, victimId:o.victimId, kind:o.kind,
      evidence:o.evidence, successful:o.successful, severity:o.severity, turn:o.turn, clericalVictim:o.clericalVictim || null };
  }
  function eligible(p,o) {
    return !!(o && ['abduction','assassination'].indexOf(o.kind) >= 0 && o.successful &&
      ['testimony','material','redhanded'].indexOf(o.evidence) >= 0 && o.clericalVictim &&
      o.clericalVictim.provinceId === p.provinceId && p.faiths.indexOf(o.clericalVictim.faithId) >= 0);
  }
  function context(s,p,o) {
    var x = C.courtContext(s,p), target = o && s.chars[o.accusedId];
    x.reason = !x.allowed ? 'jurisdiction' : !target || target.dead ? 'defendant' :
      target.id === x.bishopId || target.id === x.courtId ? 'principal' :
      !eligible(p,o) || p.faiths.indexOf(target.religion) < 0 ||
      !s.chars[x.bishopId] || p.faiths.indexOf(s.chars[x.bishopId].religion) < 0 ||
      target.religion !== s.chars[x.bishopId].religion || o.clericalVictim.faithId !== s.chars[x.bishopId].religion ? 'cause' :
      local(s,target.id) !== p.provinceId ? 'location' :
      !FB.justiceCivilRentJurisdiction(s,x.bishopId,x.realmId,p.provinceId) ? 'jurisdiction' : null;
    return x;
  }
  function principals(x) {
    return { bishopId:x.bishopId, realmId:x.realmId, bishopGeneration:x.bishopGeneration,
      courtId:x.courtId, courtRealmId:x.courtRealmId, courtGeneration:x.courtGeneration };
  }
  function stale(s,p,o,r,x) {
    return !!(r && (x.reason || !same(r.principals,principals(x)) || !same(r.accusation,facts(o)) ||
      r.definitionFingerprint !== FB.mods.fingerprint(p)));
  }
  function property(s,p,slot) {
    var county = s.settlementLordships && s.settlementLordships.counties[p.provinceId];
    return county && county.lordships && county.lordships[slot] || null;
  }
  function asset(s,p,o,slot,x) {
    var v = property(s,p,slot);
    return v && v.holderId === o.accusedId && Number.isInteger(slot) && slot > 0 && slot < 8 &&
      FB.settlementCountyHolder(s,p.provinceId) === x.courtRealmId ?
      { provinceId:p.provinceId, settlement:slot, grant:copy(v), recipientRealmId:x.courtRealmId } : null;
  }
  function payments(p,r,terms) {
    return [{ id:r.id + ':fee', amount:terms.fee, recipient:{kind:'realm',id:r.principals.realmId} },
      { id:r.id + ':settlement', amount:terms.amount, recipient:p.settlementRecipient === 'victim' ?
        {kind:'character',id:r.accusation.victimId} : {kind:'realm',id:r.principals.courtRealmId} }];
  }
  function relation(s,target,actor) {
    if (actor === s.player.charId) return FB.standingOf(s,{kind:'character',id:target});
    var t = s.chars[target], from = FB.realmIdForRulerCharacter(s,target), to = FB.realmIdForRulerCharacter(s,actor);
    return t && t.opinions && t.opinions[actor] !== undefined ? t.opinions[actor] :
      from && to ? FB.rulerRegard(s,from,to) : t && t.opinion || 0;
  }
  function fallout(s,r,amount) {
    var beforeSupport = FB.countySupportBase(s,profile(r.profileId).provinceId);
    FB.adjustCountySupport(s,profile(r.profileId).provinceId,amount);
    var targetRealm = FB.realmIdForRulerCharacter(s,r.accusation.accusedId);
    var beforeStanding = r.principals.bishopId === s.player.charId ? FB.standingOf(s,{kind:'character',id:r.accusation.accusedId}) :
      targetRealm ? FB.rulerRegard(s,targetRealm,r.principals.realmId) : 0;
    if (r.principals.bishopId === s.player.charId) FB.adjustStanding(s,{kind:'character',id:r.accusation.accusedId},amount * 2,'justice:discipline');
    else if (targetRealm && targetRealm !== r.principals.realmId)
      FB.adjustRulerRegard(s,targetRealm,r.principals.realmId,amount * 2,'justice:discipline');
    var afterStanding = r.principals.bishopId === s.player.charId ? FB.standingOf(s,{kind:'character',id:r.accusation.accusedId}) :
      targetRealm ? FB.rulerRegard(s,targetRealm,r.principals.realmId) : 0;
    return {support:FB.countySupportBase(s,profile(r.profileId).provinceId) - beforeSupport,
      standing:afterStanding - beforeStanding,realmId:targetRealm || null};
  }
  function clearRefusal(s,r) {
    var impact = r.refusalImpact;
    if (!impact) return;
    FB.adjustCountySupport(s,profile(r.profileId).provinceId,-impact.support);
    if (r.principals.bishopId === s.player.charId) FB.adjustStanding(s,{kind:'character',id:r.accusation.accusedId},-impact.standing,'justice:dismissal');
    else if (impact.realmId && impact.realmId !== r.principals.realmId)
      FB.adjustRulerRegard(s,impact.realmId,r.principals.realmId,-impact.standing,'justice:dismissal');
    r.refusalImpact = null;
  }
  function release(s,r) {
    var row = (s.intrigue && s.intrigue.captives || []).filter(function (v) {
      return v.captiveId === r.accusation.accusedId && v.source === 'judicial' && !v.sentenced && v.offenseId === r.offenseId;
    })[0];
    if (row) FB.justiceReleaseCustody(s,row);
  }
  function finish(s,r,status) {
    var o = offense(s,r.offenseId);
    if (o) { o.closed = true; o.settled = 'religious:' + status; }
    r.status = status; r.changedTurn = s.turn; r.offer = null;
  }
  var idSpec = {type:'string',pattern:'^[a-z][a-z0-9_]{0,79}$'};
  var definition = {type:'object',fields:{
    name:{type:'string',nonblank:true,maxLength:200}, desc:{type:'string',nonblank:true,maxLength:2000},
    cause:{value:'clerical_violence'}, bookmarkId:{type:'string',ref:{table:'bookmarks'}},
    provinceId:{type:'string',ref:{bookmark:'bookmarkId',inhabited:true,deferUnreviewed:true}}, realmId:idSpec,
    faiths:{type:'array',minItems:1,maxItems:8,unique:true,items:{type:'string',ref:{table:'religions'},test:function (id,c) {
      return c.data.religions[id].group === 'christian';
    }}},
    yearMin:{type:'integer',min:1139,max:10000}, yearMax:{type:'integer',min:function (c) { return c.root.yearMin; },max:10000},
    fee:{type:'number',min:0,max:100}, settlementShare:{type:'number',min:0,max:0.5}, settlementMax:{type:'number',min:0,max:1000},
    settlementRecipient:{enum:['victim','secular']}, offerDays:{type:'integer',min:1,max:90},
    penanceSentence:{type:'string',ref:{table:'justiceSentences'},test:function (id,c) { var d = c.data.justiceSentences[id]; return d.kind === 'penance' && d.closesCase !== false && !d.forgive; }},
    prisonSentence:{type:'string',ref:{table:'justiceSentences'},test:function (id,c) { var d = c.data.justiceSentences[id]; return d.kind === 'custody' && d.closesCase !== false && !d.forgive; }},
    secularSentence:{type:'string',ref:{table:'justiceSentences'},test:function (id,c) { var d = c.data.justiceSentences[id]; return d.kind === 'custody' && d.closesCase !== false && !d.forgive; }},
    allowFief:{type:'boolean'}, defendantPolicy:{enum:['challenge','settlement','submit','refuse']},
    bishopPolicy:{enum:['penance','imprison','refer','dismiss']}, enforcementPolicy:{enum:['accept','reject']}
  },test:function (p,c) {
    var bm = c.data.bookmarks[p.bookmarkId];
    if (FB.bookmarkSources && FB.bookmarkSources.unreviewedReference(bm)) return true;
    return FB.bookmarkRevisions(p.bookmarkId,bm).some(function (w) {
      return (w.realms || []).some(function (v) { return v.id === p.realmId && v.ecclesiastical; });
    });
  }};
  R.catalogFaults = function (data) {
    var faults = FB.schema.faults(data.religiousCases,{type:'object',maxProperties:32,keys:idSpec},'religiousCases',{data:data});
    if (faults.length) return faults;
    Object.keys(data.religiousCases).forEach(function (id) {
      faults = faults.concat(FB.schema.faults(data.religiousCases[id],definition,'religiousCases.' + id,{data:data}));
    });
    return faults;
  };
  R.recordForOffense = record;
  R.referencesOffense = function (s,id) { return !!record(s,id); };
  R.courtKind = function (s,id) {
    var r = record(s,id);
    return r && ACTIVE.indexOf(r.status) >= 0 ? r.status === 'accepted' ? 'secular' : 'religious' : null;
  };
  R.snapshot = function (s,pid,oid) {
    var p = profile(pid), o = offense(s,oid), r = record(s,oid);
    if (!p || !o) return null;
    var x = context(s,p,o), assets = [];
    for (var slot = 1; slot < 8; slot++) { var a = asset(s,p,o,slot,x); if (a) assets.push(a); }
    return { profileId:pid, offenseId:oid, defendantId:o.accusedId, victimId:o.victimId, principals:principals(x),
      record:copy(r), accusation:facts(o), stale:stale(s,p,o,r,x), reason:x.reason,
      account:C.privateAccount(s,o.accusedId), assets:assets };
  };
  R.list = function (s,cid) {
    var out = [];
    Object.keys(FBDATA.religiousCases || {}).sort().forEach(function (id) {
      var p = profile(id);
      if (!s.start || s.start.id !== p.bookmarkId) return;
      (s.justice && s.justice.offenses || []).forEach(function (o) {
        var r = record(s,o.id), x = context(s,p,o);
        if (r && r.profileId !== id || !r && (x.reason || o.closed || s.date.year < p.yearMin || s.date.year > p.yearMax)) return;
        if (!eligible(p,o) && !r) return;
        if ([o.accusedId,x.bishopId,x.courtId].indexOf(cid) < 0 &&
            !(r && [r.principals.bishopId,r.principals.courtId].indexOf(cid) >= 0)) return;
        out.push(R.snapshot(s,id,o.id));
      });
    });
    return out;
  };
  R.entry = function (s) {
    return R.list(s,s.player.charId).length > 0 || Object.keys(FBDATA.religiousCases || {}).some(function (id) {
      var p = profile(id), x = C.courtContext(s,p);
      return x.allowed && x.bishopId === s.player.charId;
    });
  };
  R.caseAvailable = function (s,o,actor) {
    var r = record(s,o.id);
    if (!r) return true;
    var p = profile(r.profileId), x = p && context(s,p,o);
    return !!(x && ACTIVE.indexOf(r.status) >= 0 && r.status !== 'referred' && !stale(s,p,o,r,x) &&
      actor === (r.status === 'accepted' ? x.courtId : x.bishopId));
  };
  R.sentenceAllowed = function (s,o,actor,sentence,courtKind) {
    var r = o && record(s,o.id);
    if (!r) return true;
    var p = profile(r.profileId), expected = R.courtKind(s,o.id), def = FBDATA.justiceSentences[sentence];
    if (!R.caseAvailable(s,o,actor) || courtKind !== expected || !def ||
        (r.status === 'accepted' ? sentence !== p.secularSentence :
          [p.penanceSentence,p.prisonSentence].indexOf(sentence) < 0)) return false;
    var law = FB.justiceTradition(s,actor,expected,{accusedId:o.accusedId,otherPartyId:o.victimId}).definition;
    var rule = law && law.justification.sentences && law.justification.sentences[sentence];
    return !!law && o.severity >= (rule && rule.level !== undefined ? rule.level : def.level) &&
      (def.kind !== 'penance' || o.severity <= law.procedures.penanceMaxSeverity);
  };
  R.arrestAdjustment = function (s,o,actor) {
    if (!o || !record(s,o.id)) return 0;
    return -Math.min(0.20,C.privateAccount(s,o.accusedId).gold / 2000) +
      FB.clamp(relation(s,o.accusedId,actor),-100,100) / 1000;
  };
  R.judged = function (s,o,sentence) {
    var r = record(s,o.id);
    if (!r) return [];
    var p = profile(r.profileId), status = r.status === 'accepted' ? 'enforced' : sentence === p.penanceSentence ? 'penance' : 'imprisoned';
    finish(s,r,status);
    r.lastSupport = fallout(s,r,-2).support;
    return r.lastSupport ? [{type:'commonVoice',pid:p.provinceId,amount:r.lastSupport}] : [];
  };
  R.quote = function (s,pid,oid,actor,action,slot) {
    var p = profile(pid), o = offense(s,oid), r = record(s,oid);
    if (!p || !o || ACTIONS.indexOf(action) < 0) return null;
    var x = context(s,p,o), bishop = actor === x.bishopId, defendant = actor === o.accusedId, judge = actor === x.courtId;
    var active = r && ACTIVE.indexOf(r.status) >= 0, isStale = stale(s,p,o,r,x), reason = x.reason;
    var chosen = slot ? asset(s,p,o,slot,x) : null, terms = null, projection = null;
    if (!reason && (!live(s,actor) || !bishop && !defendant && !judge)) reason = 'actor';
    if (action === 'charge') {
      if (!reason && (!bishop || o.closed || r || rows(s).some(function (v) { return v.accusation.sourceId === o.sourceId; }) || rows(s).length >= MAX || !eligible(p,o) ||
          s.date.year < p.yearMin || s.date.year > p.yearMax || slot && !chosen ||
          !FB.justiceOffenseFor(s,x.courtId,o.accusedId,o.id))) reason = 'cause';
      var initialLaw = FB.justiceTradition(s,x.bishopId,'religious').definition;
      if (!reason && (!initialLaw || initialLaw.justification.evidence.indexOf(o.evidence) < 0)) reason = 'cause';
    } else if (action === 'close_stale') {
      reason = r && active && isStale && live(s,actor) &&
        [o.accusedId,r.principals.bishopId,r.principals.courtId,x.bishopId,x.courtId].indexOf(actor) >= 0 ? null : 'stale';
    } else if (!reason) {
      if (!active || isStale || r.profileId !== pid || o.closed) reason = 'stale';
      else if (['dismiss','penance','imprison','refer'].indexOf(action) >= 0 && (!bishop || r.status === 'accepted')) reason = 'actor';
      else if (action === 'arrest' && actor !== (r.status === 'accepted' ? x.courtId : x.bishopId)) reason = 'actor';
      else if (['challenge','defend','refuse','submit'].indexOf(action) >= 0 && !defendant) reason = 'actor';
      else if (['challenge','defend'].indexOf(action) >= 0 && r.defended) reason = 'spent';
      else if (action === 'refuse' && r.refused) reason = 'spent';
      else if (['settlement','accept','decline'].indexOf(action) >= 0 && (!bishop && !defendant || r.status === 'accepted' || r.status === 'referred')) reason = 'actor';
      else if (action === 'accept' && (!r.offer || r.status !== 'offered' || r.offer.by === actor || s.turn > r.offer.turn + p.offerDays)) reason = 'offer';
      else if (action === 'decline' && (!r.offer || r.offer.by === actor)) reason = 'offer';
      else if (['accept_referral','reject_referral'].indexOf(action) >= 0 && (!judge || r.status !== 'referred')) reason = 'actor';
      else if (['confiscate','enforce'].indexOf(action) >= 0 && (!judge || r.status !== 'accepted')) reason = 'actor';
      if (!reason && action === 'refer' && r.referred) reason = 'spent';
      if (!reason && ['accept_referral','reject_referral','confiscate','enforce'].indexOf(action) >= 0 &&
          !FB.justiceCivilRentJurisdiction(s,actor,x.courtRealmId,p.provinceId)) reason = 'jurisdiction';
      if (!reason && ['arrest','submit'].indexOf(action) >= 0) {
        projection = FB.justiceArrestProjection(s,r.status === 'accepted' ? x.courtId : x.bishopId,o.accusedId,o.id,
          r.status === 'accepted' ? 'secular' : 'religious');
        if (!projection.ready) reason = projection.blocker;
      }
      if (!reason && ['penance','imprison','enforce'].indexOf(action) >= 0) {
        var sid = action === 'penance' ? p.penanceSentence : action === 'imprison' ? p.prisonSentence : p.secularSentence;
        projection = FB.justicePunishmentProjection(s,actor,o.accusedId,sid,o.id,action === 'enforce' ? 'secular' : 'religious');
        if (!projection.ready || !projection.justified) reason = projection.blocker || 'severity';
        var law = FB.justiceTradition(s,actor,'religious').definition;
        if (action === 'penance' && o.severity > law.procedures.penanceMaxSeverity) reason = 'severity';
      }
      if (!reason && action === 'confiscate') {
        var lawSecular = FB.justiceTradition(s,actor,'secular').definition, forfeits = lawSecular.sentences.filter(function (id) {
          var d = FBDATA.justiceSentences[id], rule = lawSecular.justification.sentences && lawSecular.justification.sentences[id];
          return d.kind === 'forfeiture' && o.severity >= (rule && rule.level !== undefined ? rule.level : d.level) &&
            (!rule || (!rule.offenseKinds || rule.offenseKinds.indexOf(o.kind) >= 0) &&
              (rule.successful === undefined || rule.successful === o.successful));
        });
        var held = FB.justiceCustodyOf(s,o.accusedId);
        if (!p.allowFief || !r.asset || !same(r.asset,asset(s,p,o,r.asset.settlement,x))) reason = 'asset';
        else if (!held || held.captorId !== actor) reason = 'custody';
        else if (!lawSecular.procedures.hearing || !forfeits.length) reason = 'severity';
      }
      if (!reason && ['settlement','accept'].indexOf(action) >= 0) {
        terms = action === 'accept' ? r.offer : { by:actor, turn:s.turn, fee:p.fee,
          basis:C.privateAccount(s,o.accusedId).gold,
          amount:Math.min(p.settlementMax,Math.floor(C.privateAccount(s,o.accusedId).gold * p.settlementShare)) };
        if (!C.paymentReady(s,o.accusedId,payments(p,r,terms))) reason = 'funds';
      }
    }
    var chance = FB.justiceDefenseChance(s,o.accusedId,o.evidence,action === 'defend');
    return {profileId:pid,offenseId:oid,actorId:actor,action:action,settlement:slot || null,allowed:!reason,reason:reason,
      terms:copy(terms),asset:copy(chosen),projection:copy(projection),chance:chance,
      stamp:{turn:s.turn,definition:copy(p),offense:copy(o),record:copy(r),context:copy(x),
        defendant:copy(s.chars[o.accusedId]),account:C.privateAccount(s,o.accusedId),
        custody:copy(FB.justiceCustodyOf(s,o.accusedId)),
        pending:copy(s.justice && s.justice.pending || null),
        asset:r && r.asset ? copy(property(s,p,r.asset.settlement)) : null,
        seeAccount:FB.treasuryPublicAccountSnapshot(s,x.realmId),courtAccount:FB.treasuryPublicAccountSnapshot(s,x.courtRealmId),
        victimAccount:live(s,o.victimId) ? C.privateAccount(s,o.victimId) : null,
        law:copy(FB.justiceTradition(s,actor,r && r.status === 'accepted' ? 'secular' : 'religious').definition || null),
        sentences:copy([FBDATA.justiceSentences[p.penanceSentence],FBDATA.justiceSentences[p.prisonSentence],FBDATA.justiceSentences[p.secularSentence]])} };
  };
  FB.msg('news.religious.case','The ecclesiastical proceeding concerning {defendant} records a decision. Popular support change in {place}: {support}. The accusation, custody and exact property remain separately recorded.');
  R.apply = function (s,reviewed) {
    var q = reviewed && R.quote(s,reviewed.profileId,reviewed.offenseId,reviewed.actorId,reviewed.action,reviewed.settlement);
    if (!q || !q.allowed || !same(q,reviewed)) return false;
    var p = profile(q.profileId), o = offense(s,q.offenseId), r = record(s,q.offenseId), a = q.action;
    var supportBefore = FB.countySupportBase(s,p.provinceId);
    if (a === 'charge') {
      r = {id:'religious:' + o.id,profileId:q.profileId,definitionFingerprint:FB.mods.fingerprint(p),offenseId:o.id,
        accusation:facts(o),principals:principals(q.stamp.context),asset:q.asset,status:'charged',
        openedTurn:s.turn,changedTurn:s.turn,lastSupport:0,defended:false,answered:false,refused:false,refusalImpact:null,referred:false,offer:null,paid:null};
      if (!s.authority.religiousCases) s.authority.religiousCases = [];
      s.authority.religiousCases.push(r);
      o.authority = r.principals.realmId; o.actorId = r.principals.bishopId;
    } else if (a === 'dismiss' || a === 'close_stale') { release(s,r); clearRefusal(s,r); finish(s,r,a === 'dismiss' ? 'dismissed' : 'interrupted'); }
    else if (a === 'challenge' || a === 'defend') {
      r.defended = true;
      if (FB.chance(q.chance)) { release(s,r); clearRefusal(s,r); finish(s,r,'vindicated'); }
    } else if (a === 'settlement') { r.offer = q.terms; r.status = 'offered'; }
    else if (a === 'decline') { r.offer = null; r.status = 'charged'; }
    else if (a === 'accept') {
      if (!C.payReceipts(s,o.accusedId,p.provinceId,payments(p,r,q.terms))) return false;
      r.paid = {fee:q.terms.fee,amount:q.terms.amount,basis:q.terms.basis,turn:s.turn};
      release(s,r); finish(s,r,'settled'); fallout(s,r,-1);
    } else if (a === 'refuse') { r.refused = true; r.refusalImpact = fallout(s,r,-3); }
    else if (a === 'arrest' || a === 'submit') {
      var ap = q.projection, result = a === 'submit' ? FB.justiceSubmitToCourt(s,ap.actorId,o.accusedId,o.id,ap.courtKind) :
        FB.justiceAttemptArrest(s,ap.actorId,o.accusedId,o.id,ap.courtKind);
      if (!result.ok) return false;
    } else if (['penance','imprison','enforce'].indexOf(a) >= 0) {
      var sp = q.projection, outcome = FB.justiceApplyPunishment(s,sp.actorId,o.accusedId,sp.sentence,o.id,null,sp.courtKind,
        FB.justiceSentenceReview(s,sp));
      if (!outcome.ok) return false;
    } else if (a === 'refer') {
      FB.justiceCancelCaseResponse(s,o.id);
      r.status = 'referred'; r.referred = true; r.offer = null;
    }
    else if (a === 'accept_referral') {
      if (r.principals.bishopId !== r.principals.courtId) release(s,r);
      r.status = 'accepted';
      o.authority = r.principals.courtRealmId; o.actorId = r.principals.courtId;
    } else if (a === 'reject_referral') {
      r.status = 'charged';
      FB.adjustRulerRegard(s,r.principals.realmId,r.principals.courtRealmId,-5,'justice:refused_referral');
      FB.adjustCountySupport(s,p.provinceId,-1);
    } else if (a === 'confiscate') {
      if (!FB.justiceConfiscateSettlement(s,q.actorId,o.accusedId,o.id,r.asset)) return false;
      release(s,r); finish(s,r,'confiscated'); fallout(s,r,-2);
    }
    r.changedTurn = s.turn;
    r.lastSupport = FB.countySupportBase(s,p.provinceId) - supportBefore;
    if (q.actorId === o.accusedId && a !== 'charge') r.answered = true;
    FB.news(s,FB.message('news.religious.case',{defendant:FB.fullName(s.chars[o.accusedId]),place:FB.world.byId[p.provinceId].name,support:r.lastSupport}),
      {outcomeImpacts:r.lastSupport ? [{type:'commonVoice',pid:p.provinceId,amount:r.lastSupport}] : []});
    return true;
  };
  /* Responses to a filed case only; no generated defendant, guilt or fortune. */
  R.respond = function (s,pid,oid) {
    var p = profile(pid), r = record(s,oid);
    if (!p || !r) return false;
    var actor, action;
    if (r.status === 'referred') { actor = r.principals.courtId; action = p.enforcementPolicy === 'accept' ? 'accept_referral' : 'reject_referral'; }
    else if (r.status === 'offered') { actor = r.offer.by === r.principals.bishopId ? r.accusation.accusedId : r.principals.bishopId; action = 'accept'; }
    else if (r.status === 'charged' && !r.defended && !r.refused) { actor = r.accusation.accusedId; action = p.defendantPolicy; }
    else return false;
    if (actor === s.player.charId) return false;
    return R.apply(s,R.quote(s,pid,oid,actor,action));
  };
  R.bishopDecision = function (s,pid,oid) {
    var p = profile(pid), r = record(s,oid);
    var actor = r && (r.status === 'accepted' ? r.principals.courtId : r.principals.bishopId);
    if (!p || !r || actor === s.player.charId) return false;
    var q = R.quote(s,pid,oid,actor,r.status === 'accepted' ? 'enforce' : p.bishopPolicy);
    if (q && !q.allowed && q.reason === 'severity' && p.bishopPolicy === 'penance' && !r.referred)
      q = R.quote(s,pid,oid,actor,'refer');
    return R.apply(s,q);
  };
  R.beforeArrest = function (s,o) {
    var r = record(s,o.id), p = r && profile(r.profileId);
    if (!r) return null;
    if (r.status === 'offered' && s.turn > r.offer.turn + p.offerDays) return null;
    if (r.status === 'offered' || r.status === 'referred') return {ok:R.respond(s,r.profileId,o.id)};
    if (r.status === 'charged' && !r.answered && o.accusedId !== s.player.charId) {
      var answer = R.respond(s,r.profileId,o.id), judged = answer && p.defendantPolicy === 'submit' && R.bishopDecision(s,r.profileId,o.id);
      return {ok:answer,actions:judged ? 2 : 1};
    }
    if (p && r.status === 'charged' && ['dismiss','refer'].indexOf(p.bishopPolicy) >= 0)
      return {ok:R.bishopDecision(s,r.profileId,o.id)};
    return null;
  };
  R.openForAI = function (s,o) {
    if (record(s,o.id) || o.closed) return false;
    return Object.keys(FBDATA.religiousCases || {}).sort().some(function (id) {
      var p = profile(id);
      if (!eligible(p,o) || !s.start || p.bookmarkId !== s.start.id) return false;
      var snap = R.snapshot(s,id,o.id), bishop = snap.principals.bishopId;
      if (bishop === s.player.charId) return false;
      var slot = p.allowFief && o.severity >= 3 && snap.assets.length ? snap.assets[0].settlement : null;
      return R.apply(s,R.quote(s,id,o.id,bishop,'charge',slot));
    });
  };
  R.preferredSentence = function (s,o,actor,target) {
    var r = o && record(s,o.id), p = r && profile(r.profileId);
    if (!r) return undefined;
    var id = r.status === 'accepted' ? p.secularSentence : p.bishopPolicy === 'penance' ? p.penanceSentence :
      p.bishopPolicy === 'imprison' ? p.prisonSentence : null;
    return id && FB.justicePunishmentProjection(s,actor,target,id,o.id,R.courtKind(s,o.id)).ready ? id : null;
  };
  R.validateState = function (s) {
    function fail() { throw new Error(FB.T('Invalid named religious proceeding or payment receipt in this save.')); }
    var list = rows(s), seen = {}, receipts = s.authority && s.authority.receipts || [];
    if (s.authority && s.authority.religiousCases !== undefined && !Array.isArray(s.authority.religiousCases)) fail();
    if (!Array.isArray(list) || list.length > MAX) fail();
    (s.justice && s.justice.offenses || []).forEach(function (o) {
      var v = o.clericalVictim;
      if (v !== undefined && (!v || !same(Object.keys(v).sort(),['faithId','provinceId']) ||
          !FBDATA.religions[v.faithId] || !FB.world.byId[v.provinceId] ||
          ['abduction','assassination'].indexOf(o.kind) < 0 || !o.successful || !s.chars[o.victimId])) fail();
    });
    list.forEach(function (r) {
      var p = r && profile(r.profileId), o = r && offense(s,r.offenseId);
      if (!p || !o || typeof o.sourceId !== 'string' || !o.sourceId || o.severity !== (o.kind === 'assassination' ? 3 : 2) ||
          r.id !== 'religious:' + o.id || seen[o.sourceId] || r.definitionFingerprint !== FB.mods.fingerprint(p) ||
          !eligible(p,o) || !same(r.accusation,facts(o)) || !s.start || s.start.id !== p.bookmarkId ||
          !same(Object.keys(r).sort(),['id','profileId','definitionFingerprint','offenseId','accusation','principals','asset','status','openedTurn','changedTurn','lastSupport','defended','answered','refused','refusalImpact','referred','offer','paid'].sort()) ||
          !Number.isFinite(r.lastSupport) || r.lastSupport < -3 || r.lastSupport > 3 ||
          ACTIVE.concat(CLOSED).indexOf(r.status) < 0 || typeof r.defended !== 'boolean' || typeof r.answered !== 'boolean' || typeof r.refused !== 'boolean' || typeof r.referred !== 'boolean' ||
          ['referred','accepted','confiscated','enforced'].indexOf(r.status) >= 0 && !r.referred ||
          !Number.isInteger(r.openedTurn) || r.openedTurn < o.turn || !Number.isInteger(r.changedTurn) || r.changedTurn < r.openedTurn || r.changedTurn > s.turn) fail();
      seen[o.sourceId] = true;
      var impact = r.refusalImpact;
      if (impact !== null && (!impact || !r.refused || !same(Object.keys(impact).sort(),['support','standing','realmId'].sort()) ||
          !Number.isFinite(impact.support) || impact.support < -3 || impact.support > 0 ||
          !Number.isFinite(impact.standing) || impact.standing < -6 || impact.standing > 0 ||
          impact.realmId !== null && !s.realms[impact.realmId])) fail();
      var x = r.principals;
      if (!x || !same(Object.keys(x).sort(),['bishopId','realmId','bishopGeneration','courtId','courtRealmId','courtGeneration'].sort()) ||
          !s.chars[x.bishopId] || !s.chars[x.courtId] || !s.chars[o.accusedId] || !s.chars[o.victimId] ||
          [p.realmId,'player'].indexOf(x.realmId) < 0 || !s.realms[x.realmId] || !s.realms[x.courtRealmId] ||
          !Number.isInteger(x.bishopGeneration) || x.bishopGeneration < 1 || !Number.isInteger(x.courtGeneration) || x.courtGeneration < 1 ||
          o.closed !== (CLOSED.indexOf(r.status) >= 0)) fail();
      var t = r.offer;
      if (r.status === 'offered' ? !t || !same(Object.keys(t).sort(),['by','turn','fee','amount','basis'].sort()) ||
          [x.bishopId,o.accusedId].indexOf(t.by) < 0 || !Number.isInteger(t.turn) || t.turn < r.openedTurn || t.turn > r.changedTurn ||
          t.fee !== p.fee || !Number.isFinite(t.basis) || t.basis < 0 ||
          t.amount !== Math.min(p.settlementMax,Math.floor(t.basis * p.settlementShare)) : t !== null) fail();
      if (r.asset && (!same(Object.keys(r.asset).sort(),['provinceId','settlement','grant','recipientRealmId'].sort()) ||
          !p.allowFief || r.asset.provinceId !== p.provinceId || r.asset.recipientRealmId !== x.courtRealmId ||
          !Number.isInteger(r.asset.settlement) || r.asset.settlement < 1 || r.asset.settlement > 7 ||
          !r.asset.grant || r.asset.grant.holderId !== o.accusedId || !Number.isInteger(r.asset.grant.grantedTurn) ||
          r.asset.grant.grantedTurn > r.openedTurn)) fail();
      if (r.status === 'confiscated' && !r.asset) fail();
      var expected = [];
      if (r.status === 'settled') {
        t = r.paid;
        if (!t || !same(Object.keys(t).sort(),['fee','amount','basis','turn'].sort()) || t.fee !== p.fee ||
            !Number.isFinite(t.basis) || t.basis < 0 || t.amount !== Math.min(p.settlementMax,Math.floor(t.basis * p.settlementShare)) || t.turn !== r.changedTurn) fail();
        expected = payments(p,r,t).filter(function (e) { return e.amount > 0; });
      } else if (r.paid !== null) fail();
      expected.forEach(function (e) {
        var matches = receipts.filter(function (v) { return v.obligationId === e.id; }), v = matches[0];
        if (matches.length !== 1 || !same(Object.keys(v).sort(),['id','obligationId','payerCharacterId','provinceId','amount','turn',
            e.recipient.kind === 'realm' ? 'beneficiaryRealmId' : 'beneficiaryCharacterId'].sort()) ||
            v.id !== e.id || v.payerCharacterId !== o.accusedId || v.amount !== e.amount ||
            v.provinceId !== p.provinceId || v.turn !== r.changedTurn ||
            v[e.recipient.kind === 'realm' ? 'beneficiaryRealmId' : 'beneficiaryCharacterId'] !== e.recipient.id) fail();
      });
      receipts.forEach(function (v) {
        if (v.obligationId.indexOf(r.id + ':') === 0 && !expected.some(function (e) { return e.id === v.obligationId; })) fail();
      });
    });
    receipts.forEach(function (v) {
      if (v.obligationId.indexOf('religious:') === 0 && !list.some(function (r) { return v.obligationId.indexOf(r.id + ':') === 0; })) fail();
    });
    return true;
  };
  var referenced = FB.publicAdministrationReferencesCharacter;
  FB.publicAdministrationReferencesCharacter = function (s,cid) {
    return referenced(s,cid) || (s.justice && s.justice.offenses || []).some(function (o) {
      return !!o.clericalVictim && o.victimId === cid;
    }) || rows(s).some(function (r) {
      return [r.accusation.accusedId,r.accusation.victimId,r.principals.bishopId,r.principals.courtId,
        r.asset && r.asset.grant.founderId].indexOf(cid) >= 0;
    });
  };
})();
