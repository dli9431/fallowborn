/* Reviewed local appointments use the existing spiritual office ledger. */
(function () {
  'use strict';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function scope(s,id) {
    var d = FB.localInstitutionDefinitions(s)[id], r = s.localInstitutions && s.localInstitutions[id];
    return d && !d.profileId && r && d.officeId && FB.religiousOffices(s)[d.officeId] ? { def:d,row:r } : null;
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
  FB.localOfficeQuote = function (s,id,action,terms) {
    var at = scope(s,id); if (!at) return null;
    var t = copy(terms || {}), d = at.def, current = s.religiousHeads[d.officeId] || null;
    var rid = s.holder[d.provinceId], reason = null, c = s.chars[t.candidateId || current];
    if (!FB.systemEnabled(s,'episcopal_sees',{ faith:d.religion,realm:null }) || !s.realms[rid] || !s.realms[rid].alive ||
        s.owner[d.provinceId] !== FB.topRealm(s,rid)) reason = 'occupied';
    if (action === 'appoint') {
      if (Object.keys(t).length !== 1 || !Object.prototype.hasOwnProperty.call(t,'candidateId') ||
          FB.localOfficeCandidates(s,id).indexOf(t.candidateId) < 0) reason = reason || 'qualification';
      if (current) reason = reason || 'occupied_office';
      if (!d.chapterId || !FB.localInstitutionConsent(s,d.chapterId,{ kind:'realm',id:rid })) reason = reason || 'chapter';
    } else if (action === 'resign') {
      if (Object.keys(t).length !== 1 || t.characterId !== current || !current || !s.chars[current] || s.chars[current].dead)
        reason = reason || 'no_incumbent';
    } else if (action === 'remove') {
      if (Object.keys(t).length || !current || FB.religiousOfficeHolderEligible(s,d.officeId,current)) reason = reason || 'no_cause';
      if (!d.chapterId || !FB.localInstitutionConsent(s,d.chapterId,{ kind:'realm',id:rid })) reason = reason || 'chapter';
    } else reason = reason || 'unsupported';
    var E = FB.ecclesiasticalGovernment, binding = E && E.row(s,rid);
    var profile = binding && binding.institutionId === id && E.active(s,rid) ? E.profile(s,rid) : null;
    var cost = profile && action === 'appoint' ? profile.appointmentCost : 0;
    var funds = cost ? FB.treasuryAvailable(s,rid) : null;
    if (cost && (funds - profile.reserve < cost || !s.treasuryAccounting || s.treasuryAccounting.mode !== 'active')) reason = reason || 'funds';
    return { institutionId:id,action:action,terms:t,allowed:!reason,reason:reason,cost:cost,payer:rid,
      stamp:{ turn:s.turn,definition:copy(d),office:copy(FB.religiousOffices(s)[d.officeId]),row:copy(at.row),
        profile:profile ? copy(profile) : null,funds:funds,
        chapter:copy(s.localInstitutions[d.chapterId] || null),
        current:current,person:c ? copy(c) : null,holder:rid,owner:s.owner[d.provinceId],
        generation:s.realms[rid] ? FB.realmRulerGeneration(s,rid) : null } };
  };
  FB.localOfficeApply = function (s,reviewed) {
    var q = reviewed && FB.localOfficeQuote(s,reviewed.institutionId,reviewed.action,reviewed.terms);
    if (!q || !q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var at = scope(s,q.institutionId), id = at.def.officeId;
    if (q.cost && !FB.treasurySpend(s,q.payer,q.cost)) return false;
    if (q.action === 'appoint') {
      s.religiousHeads[id] = q.terms.candidateId;
      at.row.representativeId = q.terms.candidateId;
      if (s.religiousHeadVacancies) delete s.religiousHeadVacancies[id];
    } else {
      s.religiousHeadVacancies = s.religiousHeadVacancies || {};
      s.religiousHeadVacancies[id] = { turn:s.turn,formerHolder:s.religiousHeads[id] };
      s.religiousHeads[id] = null; at.row.representativeId = null;
    }
    return true;
  };
})();
