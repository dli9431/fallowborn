/* A stable institution binds to a canonical religious office. No election,
   incumbent, treasury, property or genealogy is copied into this record. */
(function () {
  'use strict';
  var G = FB.governments, Q = FB.political, E = FB.ecclesiasticalGovernment = {};
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  E.active = function (s,rid) { var f = G.forRealm(s,rid); return !!(f && f.use.succession.officeBound); };
  E.row = function (s,rid) { var a = s && s.authority; return a && a.governments && a.governments[rid] && a.governments[rid].ecclesiastical || null; };
  E.profile = function (s,rid) { var r = E.row(s,rid); return r && FBDATA.ecclesiasticalProfiles[r.profileId] || null; };
  /* Profile office eligibility reads residence, and residence asks whether a
     character reigns here. While one realm's incumbent resolves, a nested
     read of that same realm sees no incumbent instead of recursing. */
  var resolving = {};
  E.incumbent = function (s,rid) {
    var r = E.row(s,rid);
    if (!r || !E.active(s,rid) || resolving[rid]) return null;
    resolving[rid] = true;
    try {
      var offices = FB.religiousOffices(s), office = offices[r.officeId], p = E.profile(s,rid);
      if (!office || !p) return null;
      if (p.source === 'papal_election') {
        var holder = FB.religiousOfficeSnapshot(s,r.officeId,offices);
        return holder && holder.id === rid ? FB.papalOfficeIncumbentSnapshot(s,r.officeId) : null;
      }
      return FB.religiousOfficeSnapshot(s,r.officeId,offices);
    } finally { delete resolving[rid]; }
  };
  E.controlled = function (s,rid,pid) {
    var r = E.row(s,rid), realm = s.realms[rid];
    return !!r && !!realm && realm.alive && (pid ? r.scope.indexOf(pid) >= 0 && s.holder[pid] === rid &&
      s.owner[pid] === FB.topRealm(s,rid) : r.scope.some(function (id) { return E.controlled(s,rid,id); }));
  };
  E.chapter = function (s,rid) {
    var r = E.row(s,rid), p = E.profile(s,rid);
    var def = r && FB.localInstitutionDefinitions(s)[r.institutionId];
    return !!p && (!p.chapter || !!(def && def.chapterId && FB.localInstitutionConsent(s,def.chapterId,{ kind:'realm',id:rid })));
  };
  E.recognized = function (s,rid) {
    var p = E.profile(s,rid), c = E.incumbent(s,rid), realm = s.realms[rid];
    if (!p || !c || c.captive || c.exiled || FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id)) return false;
    if (!p.layRecognition) return true;
    return !!realm.liege && Q.legitimacy(s,{ kind:'character',id:c.id },{ kind:'realm',id:rid },'imperial_commission').some(function (proof) {
      return proof.id === E.row(s,rid).temporalRecognitionId && proof.issuer.kind === 'realm' && proof.issuer.id === realm.liege;
    });
  };
  E.decision = function (s,rid,operation,scope) {
    var r = E.row(s,rid), p = E.profile(s,rid), c = E.incumbent(s,rid);
    var pid = scope && (scope.provinceId || scope.kind === 'county' && scope.id), reason = null;
    if (!r || !p) reason = 'missing_binding';
    else if (['household','revenue','peace','defence','levy','war','treaty','grant','extraordinary_tax','pledge'].indexOf(operation) < 0) reason = 'unsupported';
    else if (!E.controlled(s,rid,pid)) reason = 'occupied';
    else if (!E.recognized(s,rid) && p.interim.indexOf(operation) < 0 && operation !== 'household') reason = c ? 'recognition' : 'vacancy';
    else if (p.reserved.indexOf(operation) >= 0 && !E.chapter(s,rid)) reason = 'chapter';
    var def = r && FB.localInstitutionDefinitions(s)[r.institutionId];
    return { allowed:!reason,reason:reason,required:p && p.chapter && p.reserved.indexOf(operation) >= 0 && def ? [def.chapterId] : [],approvals:{} };
  };
  E.stamp = function (s,rid) {
    var r = E.row(s,rid), c = E.incumbent(s,rid), realm = s.realms[rid];
    return { turn:s.turn,binding:copy(r),profile:copy(E.profile(s,rid)),
      office:r ? copy(FB.religiousOffices(s)[r.officeId] || null) : null,
      incumbent:c ? copy(c) : null,realm:realm ? copy(realm) : null,
      superior:realm && realm.liege ? copy(s.realms[realm.liege] || null) : null,
      institutions:copy(s.localInstitutions || null),
      rights:copy(s.authority && s.authority.rights || []),recognitions:copy(s.authority && s.authority.recognitions || []),
      control:r ? r.scope.map(function (id) { return [id,s.owner[id],s.holder[id]]; }) : [],
      funds:FB.treasuryAvailable(s,rid) };
  };
  E.localRealm = function (s) {
    var rid = FB.realmIdForRulerCharacter(s,s.player.charId) || s.player.liege || s.holder[s.player.provinceId];
    return E.active(s,rid) && E.row(s,rid) ? rid : null;
  };
  E.review = function (s,rid,action,terms) {
    var r = E.row(s,rid), p = E.profile(s,rid), t = copy(terms || {}), c = E.incumbent(s,rid);
    if (!r || !p || !E.active(s,rid)) return null;
    var reason = !E.controlled(s,rid) ? 'occupied' : null, cost = 0, appointment = null, source = null;
    function institutionAppointment(operation) {
      var def = FB.localInstitutionDefinitions(s)[r.institutionId], profile = def && FBDATA.religiousInstitutionProfiles[def.profileId];
      if (!profile) return null;
      var actor = { kind:'character', id:s.player.charId };
      if (operation !== 'resign' && (operation === 'remove' || profile.selection.policy === 'patron') &&
          FB.realmIdForRulerCharacter(s, s.player.charId) === rid)
        actor = { kind:'realm', id:rid };
      if (Object.keys(t).length && operation !== 'appoint') return null;
      return FB.religiousInstitutionQuote(s, r.institutionId, actor,
        operation === 'appoint' ? 'appoint' : 'vacate', operation === 'appoint' ? t : {});
    }
    if (action === 'appoint') {
      if (p.source === 'institution_profile') appointment = institutionAppointment(action);
      else if (p.source !== 'local_office') reason = reason || 'canonical_election';
      else appointment = FB.localOfficeQuote(s,r.institutionId,'appoint',t);
      if (!appointment || !appointment.allowed) reason = reason || appointment && appointment.reason || 'qualification';
      cost = p.source === 'institution_profile' ? appointment && appointment.cost || 0 : p.appointmentCost;
    } else if (action === 'resign' || action === 'remove') {
      if (p.source === 'institution_profile') appointment = institutionAppointment(action);
      else if (p.source !== 'local_office') reason = reason || 'canonical_election';
      else appointment = FB.localOfficeQuote(s,r.institutionId,action,t);
      if (!appointment || !appointment.allowed) reason = reason || appointment && appointment.reason || 'qualification';
    } else if (action === 'recognize') {
      source = FB.governmentSelection.reviewSource(s,'religious_office_result',{ officeId:r.officeId,person:true });
      if (Object.keys(t).length || !c || !source.review.allowed) reason = reason || 'vacancy';
      if (!E.chapter(s,rid)) reason = reason || 'chapter';
      if (!p.layRecognition || E.recognized(s,rid)) reason = reason || 'already_recognized';
      var liege = s.realms[rid].liege;
      if (!liege || !s.realms[liege] || !s.realms[liege].alive ||
          !Q.consent(s,{ kind:'realm',id:liege },'treaty',{ kind:'realm',id:rid }).allowed) reason = reason || 'lay_refusal';
      cost = p.recognitionCost;
    } else reason = reason || 'unsupported';
    if (appointment && p.source === 'institution_profile') cost = appointment.cost;
    var payer = appointment && p.source === 'institution_profile' ? appointment.payer : rid;
    if (cost > 0 && (FB.treasuryAvailable(s,payer) - p.reserve < cost || payer !== 'player' &&
        (!s.treasuryAccounting || s.treasuryAccounting.mode !== 'active'))) reason = reason || 'funds';
    return { realmId:rid,action:action,terms:t,stamp:E.stamp(s,rid),appointment:appointment,source:source,
      cost:cost,allowed:!reason,reason:reason };
  };
  E.apply = function (s,reviewed) {
    var q = reviewed && E.review(s,reviewed.realmId,reviewed.action,reviewed.terms);
    if (!q || !q.allowed || !same(q,reviewed)) return false;
    var rid = q.realmId, c = E.incumbent(s,rid), success;
    if (q.action === 'recognize') {
      if (!FB.governmentSelection.commitSource(s,q.source)) return false;
      var row = E.row(s,rid), old = (s.authority.recognitions || []).filter(function (proof) { return proof.id === row.temporalRecognitionId; })[0];
      if (old) {
        old.subject = { kind:'character',id:c.id }; old.issuer = { kind:'realm',id:s.realms[rid].liege };
        old.issuerGeneration = FB.realmRulerGeneration(s,old.issuer.id); old.status = 'active'; old.startTurn = s.turn; old.endTurn = null;
        success = old;
      } else {
        success = FB.authorityRecognize(s,{ source:'imperial_commission',issuer:{ kind:'realm',id:s.realms[rid].liege },
          subject:{ kind:'character',id:c.id },scope:{ kind:'realm',id:rid } });
        if (success) row.temporalRecognitionId = success.id;
      }
    } else success = E.profile(s,rid).source === 'institution_profile' ?
      FB.religiousInstitutionApply(s,q.appointment) : FB.localOfficeApply(s,q.appointment);
    if (!success) return false;
    if (q.cost && q.action === 'recognize') FB.treasurySpend(s,rid,q.cost);
    E.sync(s,rid); return true;
  };
  E.sync = function (s,rid) {
    var r = E.row(s,rid), p = E.profile(s,rid), c = E.incumbent(s,rid), realm = s.realms[rid];
    if (!r || !p || !realm) return;
    // Papal succession already writes the public ruler and its generation.
    if (p.source === 'papal_election') return;
    var old = realm.ruler;
    if (old && old.officeHolderId === (c && c.id || null)) return;
    realm.ruler = { name:c ? c.name : '',sex:c ? c.sex : null,born:c ? c.born : s.date.year,
      age:c ? s.date.year - c.born : 0,culture:c ? c.culture : old && old.culture,
      mar:c ? FB.skillSnapshot(s,c,'mar') : 0,generation:FB.realmRulerGeneration(s,rid) + 1,officeHolderId:c ? c.id : null };
    G.invalidate(); if (FB.rebuildRulerIndex) FB.rebuildRulerIndex(s);
  };
  E.initialize = function (s,definitions) {
    definitions.forEach(function (d) {
      if (!E.active(s,d.id) || E.row(s,d.id)) return;
      var t = d.ecclesiastical;
      if (!t || E.definitionFaults(d,G.forRealm(s,d.id).id,FB.campaignBookmark(s)).length) throw new Error('Invalid ecclesiastical opening');
      if (t.institutionId) FB.ensureLocalInstitutions(s,null,{ fresh:true });
      s.authority.governments[d.id].ecclesiastical = { schema:1,profileId:t.profileId,officeId:t.officeId,
        institutionId:t.institutionId,scope:FB.realmHeldCounties(s,d.id).slice().sort(),originFormId:null,temporalRecognitionId:null };
      E.sync(s,d.id);
    });
    G.invalidate();
  };
  E.tick = function (s,rid) {
    if (!E.active(s,rid) || !E.row(s,rid) || !s.realms[rid].alive) return false;
    E.sync(s,rid);
    var r = E.row(s,rid), p = E.profile(s,rid), c = E.incumbent(s,rid);
    if (!c && p.source === 'local_office') {
      // Canonical local appointment, never a new person or a head election.
      var candidates = FB.localOfficeCandidates(s,r.institutionId);
      candidates.some(function (cid) { return cid !== s.player.charId && E.apply(s,E.review(s,rid,'appoint',{ candidateId:cid })); });
    }
    var proof = (s.authority.recognitions || []).filter(function (entry) { return entry.id === r.temporalRecognitionId; })[0];
    if (p.layRecognition && (!proof || proof.status === 'active') && E.incumbent(s,rid) && E.incumbent(s,rid).id !== s.player.charId && !E.recognized(s,rid))
      E.apply(s,E.review(s,rid,'recognize',{}));
    return true;
  };
  FB.governmentSelection.registerSource('ecclesiastical_temporal',{
    quote:function (s,t) { return E.review(s,t.realmId,t.action,t.terms); },
    apply:function (s,t,q) { return E.apply(s,q); }
  });
})();
