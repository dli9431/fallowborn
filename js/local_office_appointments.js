/* Reviewed local appointments use the existing spiritual office ledger. */
(function () {
  'use strict';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function own(o,key) { return Object.prototype.hasOwnProperty.call(o || {},key); }
  function scope(s,id) {
    var defs = FB.localInstitutionDefinitions(s), d = defs[id], r = s.localInstitutions && s.localInstitutions[id];
    var office = d && !d.profileId && r && d.officeId && FB.religiousOffices(s)[d.officeId];
    return office ? { def:d,row:r,office:office,chapter:defs[d.chapterId] } : null;
  }
  function petitionChapter(s,d,c) {
    return d && !d.profileId && d.officeId && d.kind === 'see' && d.provinceId &&
      c && !c.profileId && !c.officeId && c.kind === 'congregation' &&
      c.provinceId === d.provinceId && c.religion === d.religion && s.localInstitutions[d.chapterId] || null;
  }
  function petitionScope(s,at) {
    return at && at.office.head.local && at.office.head.holderKind === 'character' &&
      at.office.head.succession === 'appointment' && petitionChapter(s,at.def,at.chapter);
  }
  function binding(s,id,rid) {
    var E = FB.ecclesiasticalGovernment, b = E && E.row(s,rid);
    return b && b.institutionId === id && E.active(s,rid) ? E.profile(s,rid) : null;
  }
  function controlled(s,at,rid,profile) {
    var pid = at.def.provinceId;
    return !!(FB.localInstitutionEnabled(s,at.def) && s.realms[rid] && s.realms[rid].alive &&
      s.owner[pid] === FB.topRealm(s,rid) && (!profile || FB.ecclesiasticalGovernment.controlled(s,rid,pid)));
  }
  function independentAppointer(s,rid,cid) {
    var actor = FB.political.actor(s,{ kind:'realm',id:rid });
    return !!(actor && rid !== 'player' && actor.characterId !== cid &&
      actor.characterId !== s.player.charId && FB.realmIdForRulerCharacter(s,cid) !== rid);
  }
  FB.localOfficeCandidates = function (s,id) {
    var at = scope(s,id); if (!at) return [];
    return Object.keys(s.chars).filter(function (cid) {
      var c = s.chars[cid];
      return (cid === s.player.charId ? s.player.provinceId : c.homeProvinceId) === at.def.provinceId &&
        FB.religiousOfficeHolderEligible(s,at.def.officeId,cid) && !c.captive && !c.exiled &&
        !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,cid));
    }).sort(function (a,b) { return s.chars[a].born - s.chars[b].born || (a < b ? -1 : 1); }).slice(0,32);
  };
  function officeQuote(s,id,action,terms,fromPetition) {
    var at = scope(s,id); if (!at) return null;
    var t = copy(terms || {}), d = at.def, current = s.religiousHeads[d.officeId] || null;
    var rid = s.holder[d.provinceId], reason = null, c = s.chars[t.candidateId || current];
    if (!FB.localInstitutionEnabled(s,d) || d.provinceId !== null && (!s.realms[rid] || !s.realms[rid].alive ||
        s.owner[d.provinceId] !== FB.topRealm(s,rid))) reason = 'occupied';
    if (action === 'appoint') {
      if (Object.keys(t).length !== 1 || !Object.prototype.hasOwnProperty.call(t,'candidateId') ||
          FB.localOfficeCandidates(s,id).indexOf(t.candidateId) < 0) reason = reason || 'qualification';
      if (current) reason = reason || 'occupied_office';
      if (!fromPetition && t.candidateId === s.player.charId && petitionScope(s,at)) reason = reason || 'petition_required';
      if (!d.chapterId || !FB.localInstitutionConsent(s,d.chapterId,{ kind:'realm',id:rid })) reason = reason || 'chapter';
    } else if (action === 'resign') {
      if (Object.keys(t).length !== 1 || t.characterId !== current || !current || !s.chars[current] || s.chars[current].dead)
        reason = reason || 'no_incumbent';
    } else if (action === 'remove') {
      if (Object.keys(t).length || !current || FB.religiousOfficeHolderEligible(s,d.officeId,current)) reason = reason || 'no_cause';
      if (!d.chapterId || !FB.localInstitutionConsent(s,d.chapterId,{ kind:'realm',id:rid })) reason = reason || 'chapter';
    } else reason = reason || 'unsupported';
    var profile = binding(s,id,rid);
    var cost = profile && action === 'appoint' ? profile.appointmentCost : 0;
    var funds = cost ? FB.treasuryAvailable(s,rid) : null;
    if (cost && (funds - profile.reserve < cost || !s.treasuryAccounting || s.treasuryAccounting.mode !== 'active')) reason = reason || 'funds';
    return { institutionId:id,action:action,terms:t,allowed:!reason,reason:reason,cost:cost,payer:rid,
      stamp:{ turn:s.turn,definition:copy(d),office:copy(at.office),row:copy(at.row),
        profile:profile ? copy(profile) : null,funds:funds,
        chapter:copy(s.localInstitutions[d.chapterId] || null),
        current:current,person:c ? copy(c) : null,holder:rid,owner:s.owner[d.provinceId],
        generation:s.realms[rid] ? FB.realmRulerGeneration(s,rid) : null } };
  }
  FB.localOfficeQuote = function (s,id,action,terms) { return officeQuote(s,id,action,terms,false); };
  function officeApply(s,reviewed,fromPetition) {
    var q = reviewed && officeQuote(s,reviewed.institutionId,reviewed.action,reviewed.terms,fromPetition);
    if (!q || !q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var at = scope(s,q.institutionId), id = at.def.officeId;
    var formerHolder = s.religiousHeads[id];
    if (q.cost && !FB.treasurySpend(s,q.payer,q.cost)) return false;
    if (q.action === 'appoint') {
      s.religiousHeads[id] = q.terms.candidateId;
      at.row.representativeId = q.terms.candidateId;
      if (s.religiousHeadVacancies) delete s.religiousHeadVacancies[id];
      if (!fromPetition && at.row.officePetition && at.row.officePetition.status === 'pending')
        closePetition(at.row.officePetition,s.turn,'refused','vacancy_changed');
    } else {
      s.religiousHeadVacancies = s.religiousHeadVacancies || {};
      s.religiousHeadVacancies[id] = { turn:s.turn,formerHolder:s.religiousHeads[id] };
      s.religiousHeads[id] = null; at.row.representativeId = null;
    }
    if (formerHolder) FB.religiousOfficeMoment(s,id,formerHolder,'office_lost');
    if (q.action === 'appoint') FB.religiousOfficeMoment(s,id,q.terms.candidateId,'office_appointed');
    return true;
  }
  FB.localOfficeApply = function (s,reviewed) { return officeApply(s,reviewed,false); };

  function chapterRepresentative(s,chapter) {
    var c = s.chars[chapter.representativeId];
    return c && !c.dead ? c.id : null;
  }
  function vacancy(s,def) {
    return s.religiousHeads[def.officeId] === null && s.religiousHeadVacancies &&
      s.religiousHeadVacancies[def.officeId] || null;
  }
  function hearingTurn(p) { return (Math.floor(p.filedTurn / 90) + 1) * 90; }
  FB.localOfficePetitionQuote = function (s,id,action) {
    var d = FB.localInstitutionDefinitions(s)[id], row = s.localInstitutions && s.localInstitutions[id];
    var previous = row && row.officePetition, cid = s.player.charId;
    var personal = previous && previous.candidateId === cid ? previous : null;
    if (!d || !d.chapterId || !row || !personal && s.player.provinceId !== d.provinceId) return null;
    var at = scope(s,id), chapter = petitionScope(s,at);
    if (!chapter) return null;
    var pending = previous && previous.status === 'pending', rid = s.holder[d.provinceId];
    var profile = binding(s,id,rid), v = vacancy(s,d), representative = chapterRepresentative(s,chapter);
    var reason = null;
    if (action === 'withdraw') {
      if (!personal || !pending) reason = 'no_petition';
    } else if (action !== 'file') reason = 'unsupported';
    else if (!controlled(s,at,rid,profile)) reason = 'occupied';
    else if (!v) reason = 'occupied_office';
    else if (pending) reason = 'pending';
    else if (!FB.localInstitutionEnabled(s,at.chapter) || !representative || representative === cid) reason = 'chapter_unavailable';
    else if (FB.localOfficeCandidates(s,id).indexOf(cid) < 0) reason = 'qualification';
    else if (!independentAppointer(s,rid,cid)) reason = 'authority';
    var record = !reason && action === 'file' ? {
      serial:previous ? previous.serial + 1 : 1,
      candidateId:cid, officeId:d.officeId, chapterId:d.chapterId, chapterRepresentativeId:representative,
      realmId:rid, generation:FB.realmRulerGeneration(s,rid), vacancyTurn:v.turn, formerHolderId:v.formerHolder,
      filedTurn:s.turn, status:'pending', decidedTurn:null, reason:null
    } : null;
    return { institutionId:id,action:action,allowed:!reason,reason:reason,turn:s.turn,
      petition:personal ? copy(personal) : null,record:record,hearingTurn:hearingTurn(personal && pending ? personal : {filedTurn:s.turn}),
      realmId:personal && pending ? personal.realmId : rid,
      chapterId:d.chapterId,appointmentCost:profile && (!personal || !pending || personal.realmId === rid) ? profile.appointmentCost : 0 };
  };
  function closePetition(p,turn,status,reason) {
    p.status = status; p.decidedTurn = turn; p.reason = reason;
  }
  FB.localOfficePetitionApply = function (s,reviewed) {
    var q = reviewed && FB.localOfficePetitionQuote(s,reviewed.institutionId,reviewed.action);
    if (!q || !q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var row = s.localInstitutions[q.institutionId];
    if (q.action === 'file') row.officePetition = q.record;
    else closePetition(row.officePetition,s.turn,'withdrawn',null);
    return true;
  };
  FB.localOfficePetitionSeason = function (s,id) {
    var row = s.localInstitutions[id], p = row.officePetition;
    if (!p || p.status !== 'pending' || s.turn < hearingTurn(p)) return;
    var at = scope(s,id), chapter = petitionScope(s,at);
    var v = at && vacancy(s,at.def), rid = p.realmId, cid = p.candidateId, profile = binding(s,id,rid);
    var reason = null;
    if (!v || v.turn !== p.vacancyTurn || v.formerHolder !== p.formerHolderId) reason = 'vacancy_changed';
    else if (s.holder[at.def.provinceId] !== rid || FB.realmRulerGeneration(s,rid) !== p.generation) reason = 'authority_changed';
    else if (!controlled(s,at,rid,profile)) reason = 'occupied';
    else if (!chapter || chapterRepresentative(s,chapter) !== p.chapterRepresentativeId || cid === p.chapterRepresentativeId)
      reason = 'chapter_changed';
    else if (cid !== s.player.charId || FB.localOfficeCandidates(s,id).indexOf(cid) < 0) reason = 'qualification';
    else if (!independentAppointer(s,rid,cid)) reason = 'authority';
    else {
      var q = officeQuote(s,id,'appoint',{ candidateId:cid },true);
      if (!q.allowed) reason = q.reason;
      else if (!FB.aiDecisions.willing(s,rid,'government','officeWillingness')) reason = 'authority_refused';
      else if (!officeApply(s,q,true)) reason = 'terms_changed';
    }
    closePetition(p,s.turn,reason ? 'refused' : 'appointed',reason);
    if (!reason && profile) FB.ecclesiasticalGovernment.sync(s,rid);
  };

  FB.validateLocalOfficePetition = function (s,id) {
    var p = s.localInstitutions[id].officePetition;
    if (p === undefined) return true;
    var defs = FB.localInstitutionDefinitions(s), def = defs[id];
    var fields = ['serial','candidateId','officeId','chapterId','chapterRepresentativeId','realmId','generation',
      'vacancyTurn','formerHolderId','filedTurn','status','decidedTurn','reason'];
    function turn(n) { return Number.isSafeInteger(n) && n >= 0 && n <= s.turn; }
    return !!(p && typeof p === 'object' && !Array.isArray(p) &&
      Object.keys(p).length === fields.length && fields.every(function (k) { return own(p,k); }) &&
      Number.isSafeInteger(p.serial) && p.serial > 0 &&
      def && petitionChapter(s,def,defs[def.chapterId]) && p.officeId === def.officeId && p.chapterId === def.chapterId &&
      typeof p.candidateId === 'string' && own(s.chars,p.candidateId) &&
      typeof p.chapterRepresentativeId === 'string' && own(s.chars,p.chapterRepresentativeId) &&
      p.candidateId !== p.chapterRepresentativeId && typeof p.realmId === 'string' && p.realmId !== 'player' &&
      own(s.realms,p.realmId) && Number.isSafeInteger(p.generation) && p.generation >= 0 &&
      (p.formerHolderId === null || typeof p.formerHolderId === 'string' && own(s.chars,p.formerHolderId)) &&
      turn(p.vacancyTurn) && turn(p.filedTurn) && p.vacancyTurn <= p.filedTurn &&
      (p.status === 'pending' ? p.decidedTurn === null && p.reason === null :
        turn(p.decidedTurn) && p.decidedTurn >= p.filedTurn &&
        (p.status === 'withdrawn' ? p.reason === null : (p.decidedTurn >= hearingTurn(p) || p.reason === 'vacancy_changed') &&
          (p.status === 'appointed' ? p.reason === null : p.status === 'refused' &&
            ['vacancy_changed','authority_changed','occupied','chapter_changed','qualification','authority','chapter',
              'funds','authority_refused','terms_changed'].indexOf(p.reason) >= 0))));
  };
})();
