/* Shared, reviewed public recognition. People, offices and the compact
   succession tree remain canonical; this stores only bounded support. */
(function () {
  'use strict';
  var R = FB.governmentRecognition = {};
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function record(s, rid) { return s.authority && s.authority.governments && s.authority.governments[rid]; }
  function votes(s, rid) { var row = record(s, rid); return row && row.recognition || {}; }
  function validActor(s, actor) { return !!actor && !!FB.political.actor(s, actor); }
  function same(a, b) { return !!a && !!b && a.kind === b.kind && a.id === b.id; }
  // Later forms extend this same transaction with declared ancestry and terms.
  R.policy = function (s, rid) {
    var form = FB.governments.forRealm(s, rid);
    return form && form.use.succession.recognitionPolicy || null;
  };
  R.candidateMember = function (s,rid,id) {
    var tree = s.realms[rid] && s.realms[rid].succession;
    return rid === 'player' ? s.chars[id] : tree && tree.members && tree.members[id];
  };
  function slate(s,rid) {
    var tree = s.realms[rid] && s.realms[rid].succession;
    return (tree && tree.publicCandidateIds || []).filter(function (id) {
      var m = R.candidateMember(s,rid,id), c = rid === 'player' ? m : m && m.charId && s.chars[m.charId];
      return c && !c.dead && id !== tree.rulerMemberId && FB.publicOfficeRows(s,rid).some(function (row) {
        return row.effective && row.holder.id === c.id;
      });
    });
  }
  R.members = function (s, rid) {
    var policy = R.policy(s, rid);
    if (policy) return policy.members(s, rid);
    var profile = FB.administrationProfile(s, rid), realm = s.realms[rid];
    if (!profile || !realm || !realm.alive) return [];
    var out = [{ id:'court', principal:{ kind:'realm', id:rid },
      scope:{ kind:'realm', id:rid }, basis:'designation', weight:1 }];
    var offices = FB.publicOfficeRows(s, rid);
    profile.accession.interests.forEach(function (interest) {
      offices.filter(function (office) {
        return office.effective && office.role === interest.role;
      }).forEach(function (office) {
        out.push({ id:interest.id + ':' + office.id, principal:copy(office.holder),
          scope:copy(office.scope), basis:interest.role, weight:interest.weight });
      });
    });
    return out;
  };
  R.candidates = function (s, rid) {
    var policy = R.policy(s, rid);
    if (policy) return policy.candidates(s, rid);
    var profile = FB.administrationProfile(s, rid), tree = s.realms[rid] && s.realms[rid].succession;
    if (!profile || !tree) return [];
    if (rid === 'player') {
      var ids = FB.heirsOf(s).map(function (c) { return c.id; });
      if (profile.accession.officeCandidates) slate(s,rid).forEach(function (id) {
        if (ids.indexOf(id) < 0) ids.push(id);
      });
      return ids.filter(function (id) {
        var c = s.chars[id];
        return c && id !== s.player.charId && !c.dead && !c.unfree && !FB.justiceCustodyOf(s,id) &&
          (profile.accession.allowMinor || s.date.year - c.born >= profile.accession.minimumAge);
      }).map(function (id) {
        var c = s.chars[id];
        return {id:id,charId:id,born:c.born,civil:FB.skillSnapshot(s,c,'ste'),
          military:FB.skillSnapshot(s,c,'mar'),minor:s.date.year - c.born < profile.accession.minimumAge};
      });
    }
    return (tree.order || []).filter(function (id) {
      var member = tree.members[id], c = member && member.charId && s.chars[member.charId];
      return member && member.alive !== false && (!member.charId || c && !c.dead && !c.unfree &&
        !FB.justiceCustodyOf(s, c.id)) && (profile.accession.allowMinor ||
        s.date.year - member.born >= profile.accession.minimumAge) &&
        (member.role !== 'public_candidate' || profile.accession.officeCandidates && c &&
          FB.publicOfficeRows(s,rid).some(function (office) { return office.effective && office.holder.id === c.id; }));
    }).map(function (id) {
      var m = tree.members[id];
      var c = m.charId && s.chars[m.charId];
      return { id:id, charId:m.charId || null, born:m.born,
        civil:c ? FB.skillSnapshot(s,c,'ste') : 0, military:c ? FB.skillSnapshot(s,c,'mar') : m.mar || 0,
        minor:s.date.year - m.born < profile.accession.minimumAge };
    });
  };
  R.nominationQuote = function (s, actor, rid, cid) {
    var profile = FB.administrationProfile(s,rid), tree = s.realms[rid] && s.realms[rid].succession;
    var c = s.chars[cid], ruler = FB.realmRulerCharacterSnapshot(s,rid), currentSlate = slate(s,rid);
    var offices = FB.publicOfficeRows(s,rid).filter(function (row) { return row.effective && row.holder.id === cid; });
    var existing = rid === 'player' ? cid : tree && Object.keys(tree.members || {}).filter(function (id) { return tree.members[id].charId === cid; })[0];
    var allowed = profile && tree && profile.accession.officeCandidates && c && !c.dead && !c.unfree &&
      s.date.year - c.born >= profile.accession.minimumAge && !FB.justiceCustodyOf(s,cid) && offices.length &&
      (!c.royalLine || c.royalLine.realmId === rid) && currentSlate.length < 8 && currentSlate.indexOf(existing) < 0 &&
      cid !== (ruler && ruler.id) && validActor(s,actor) && (actor.kind === 'realm' && actor.id === rid ||
        actor.kind === 'character' && ruler && actor.id === ruler.id);
    var q = { operation:'nominate', actor:copy(actor || null), realmId:rid, characterId:cid,
      memberId:existing || 'royal_' + rid + '_public_' + cid, cost:0, allowed:!!allowed,
      reason:allowed ? null : FB.T('The court may admit a free adult public officer to an available recognition slate.') };
    q.stamp = JSON.stringify([FB.realmRulerGeneration(s,rid), profile, tree && tree.publicCandidateIds,
      tree && tree.order, existing, c && [c.id,c.name,c.dead,c.unfree,c.born,c.royalLine], offices, actor,
      ruler && [ruler.id,ruler.dead]]);
    return q;
  };
  R.nominate = function (s,reviewed) {
    if (!reviewed) return false;
    var q = R.nominationQuote(s,reviewed.actor,reviewed.realmId,reviewed.characterId);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var tree = s.realms[q.realmId].succession, c = s.chars[q.characterId];
    if (q.realmId !== 'player' && !tree.members[q.memberId]) {
      tree.members[q.memberId] = { id:q.memberId, name:c.name, sex:c.sex, born:c.born,
        culture:c.culture, religion:c.religion, alive:true, role:'public_candidate', charId:c.id, childIds:[] };
      c.royalLine = { realmId:q.realmId, memberId:q.memberId };
    }
    tree.publicCandidateIds = slate(s,q.realmId);
    if (tree.publicCandidateIds.indexOf(q.memberId) < 0) tree.publicCandidateIds.push(q.memberId);
    if (q.realmId !== 'player') FB.refreshRealmSuccession(s,q.realmId);
    return true;
  };
  R.supportQuote = function (s, actor, rid, seatId, candidateId, terms) {
    var policy = R.policy(s, rid);
    var members = R.members(s, rid), candidates = R.candidates(s, rid);
    var seat = members.filter(function (row) { return row.id === seatId; })[0];
    var candidate = candidates.filter(function (row) { return row.id === candidateId; })[0];
    var principal = seat && seat.principal, ruler = rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s, rid);
    var allowed = validActor(s, actor) && (candidate || policy && candidateId === null) && seat &&
      (same(actor, principal) || principal && principal.kind === 'realm' && ruler && actor.kind === 'character' && actor.id === ruler.id);
    var q = { operation:'support', actor:copy(actor || null), realmId:rid, seatId:seatId,
      candidateId:candidateId, cost:0, allowed:!!allowed,
      reason:allowed ? null : FB.T('Only this living interest can recognize an eligible candidate.') };
    q.stamp = JSON.stringify([FB.realmRulerGeneration(s, rid), members, candidates,
      votes(s, rid), FB.administrationProfile(s, rid), actor, ruler && [ruler.id,ruler.dead]]);
    if (policy) policy.support(s, rid, q, seat, candidate, terms);
    var court = actor && (actor.kind === 'realm' && actor.id === rid ||
      actor.kind === 'character' && ruler && actor.id === ruler.id);
    var readiness = FB.governments.publicAuthorityReadiness(s,rid);
    if (court && !readiness.allowed) {
      q.allowed = false;
      q.reason = FB.T('A minor court requires a capable adult hereditary steward for public decisions.');
    }
    q.stamp = JSON.stringify([q.stamp,readiness]);
    return q;
  };
  R.applySupport = function (s, reviewed) {
    if (!reviewed) return false;
    var policy = R.policy(s, reviewed.realmId);
    var q = R.supportQuote(s, reviewed.actor, reviewed.realmId, reviewed.seatId, reviewed.candidateId,
      policy ? reviewed.terms : undefined);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var row = record(s, q.realmId);
    if (!row) return false;
    if (policy && !policy.pay(s, q)) return false;
    var old = votes(s, q.realmId), next = {}, members = R.members(s, q.realmId);
    members.forEach(function (member) {
      var prior = old[member.id];
      if (prior && same(prior.principal, member.principal)) next[member.id] = copy(prior);
    });
    next[q.seatId] = { principal:copy(members.filter(function (member) { return member.id === q.seatId; })[0].principal),
      candidateId:q.candidateId, generation:FB.realmRulerGeneration(s, q.realmId) };
    if (policy) next[q.seatId].terms = copy(q.terms);
    row.recognition = next;
    // A designation is a claim in the canonical tree, never a property grant.
    if (q.seatId === 'court') s.realms[q.realmId].succession.designatedHeirId = policy
      ? policy.designate(s,q.realmId,q.candidateId) : q.candidateId;
    return true;
  };
  R.accessionQuote = function (s, rid, cause) {
    var policy = R.policy(s, rid);
    var profile = FB.administrationProfile(s, rid), tree = s.realms[rid] && s.realms[rid].succession;
    var members = R.members(s, rid), candidates = R.candidates(s, rid), support = votes(s, rid), totals = {};
    var weight = 0, generation = FB.realmRulerGeneration(s, rid);
    var designated = policy && tree ? policy.designated(s,rid,tree) : tree && tree.designatedHeirId;
    members.forEach(function (member) {
      weight += member.weight;
      var vote = support[member.id];
      var choice = member.id === 'court' && designated ||
        vote && vote.generation === generation && same(vote.principal, member.principal) && vote.candidateId;
      if ((!policy || policy.voteValid(s, rid, member, vote, choice)) &&
          candidates.some(function (candidate) { return candidate.id === choice; }))
        totals[choice] = (totals[choice] || 0) + member.weight;
    });
    var selected = candidates.slice().sort(function (a, b) {
      return (totals[b.id] || 0) - (totals[a.id] || 0) || candidates.indexOf(a) - candidates.indexOf(b);
    })[0];
    if (profile && profile.accession.mode === 'designation') selected = candidates.filter(function (c) {
      return c.id === designated;
    })[0] || selected;
    if (profile && profile.accession.mode === 'dynastic') selected = candidates[0];
    var recognized = selected && profile && (profile.accession.mode === 'designation' || profile.accession.mode === 'dynastic' ||
      (totals[selected.id] || 0) > weight * profile.accession.threshold);
    var q = { realmId:rid, cause:cause, rulerGeneration:generation, memberId:selected && selected.id || null,
      allowed:!!recognized && ['death','abdication','term_end','lawful_removal'].indexOf(cause) >= 0,
      minor:!!(selected && selected.minor), totals:totals, totalWeight:weight, cost:0,
      reason:!selected ? FB.T('No eligible sovereign candidate is available. Public administration continues.') :
        !recognized ? FB.T('Recognition is divided. Public administration continues while the court is vacant.') : null };
    q.stamp = JSON.stringify([generation, members, candidates, support, tree && tree.designatedHeirId, profile,
      tree && tree.rulerMemberId, tree && tree.rulerMemberId && tree.members && tree.members[tree.rulerMemberId]]);
    if (policy) policy.accession(s, rid, q);
    return q;
  };
  R.resolve = function (s, reviewed, apply) {
    if (!reviewed) return false;
    var q = R.accessionQuote(s, reviewed.realmId, reviewed.cause);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var policy = R.policy(s, reviewed.realmId);
    var member = R.candidateMember(s,reviewed.realmId,q.memberId);
    var result = FB.withLegitimacyMoments(s,function () {return apply(q);});
    if (!result) return false;
    var row = record(s, reviewed.realmId) || record(s, 'player');
    if (row) {
      row.recognition = {};
      delete row.publicVacancy;
      var settledRealmId = record(s,reviewed.realmId) ? reviewed.realmId : 'player';
      var settledMemberId = settledRealmId !== reviewed.realmId && member && member.charId || q.memberId;
      row.lastAccession = { generation:q.rulerGeneration, memberId:settledMemberId, cause:q.cause,
        turn:s.turn, minor:q.minor };
      if (policy) policy.resolved(s, settledRealmId, Object.assign({},q,{memberId:settledMemberId}));
    }
    return result;
  };
  // Mandate admission and political resolution use the canonical ruler owner.
  R.officerAccessionQuote = function (s,actor,appointment) {
    var rid = appointment.institutionId, c = s.chars[appointment.holder.id], realm = s.realms[rid],
      incumbent = rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid),
      tree = realm && realm.succession, member = tree && tree.members && tree.members[tree.rulerMemberId],
      patron = actor && (actor.kind === 'realm' && actor.id === rid || actor.kind === 'character' && incumbent && incumbent.id === actor.id),
      vacancy = !!(member && member.alive === false || incumbent && incumbent.dead);
    var q = {appointmentId:appointment.id,actor:copy(actor),realmId:rid,characterId:c && c.id,
      cause:vacancy ? 'death' : 'abdication',allowed:false,reason:null,owner:null};
    var retained = (s.authority && s.authority.appointments || []).some(function (r) { return r === appointment; });
    var claim = appointment.mandate && appointment.mandate.claim;
    if (!retained || !claim || claim.status !== 'claimed' || !FB.officeMandates.supported(s,appointment) ||
        claim.generation !== FB.realmRulerGeneration(s,rid))
      q.reason = FB.T('The original officer claim and independent recognition must remain current.');
    else if (!realm || !realm.alive || rid === 'player' && !(s.player.provs || []).length || !c || c.dead || c.unfree || FB.justiceCustodyOf(s,c.id) ||
        FB.isReigningRealmRuler(s,c) || c.id === s.player.charId && FB.station.rulesRealm(s.player,s) || !FB.treasuryPublicAccountSnapshot(s,rid))
      q.reason = FB.T('The candidate and an independent public court must remain available.');
    else if (!vacancy && !patron) q.reason = FB.T('A living incumbent must consent to abdication; recognition alone does not remove a ruler.');
    else if (!FB.governments.publicAuthorityReadiness(s,rid).allowed)
      q.reason = FB.T('The court cannot make this public decision without a capable lawful authority.');
    else if (FB.administrationProfile(s,rid)) {
      q.owner = R.accessionQuote(s,rid,q.cause);
      var selected = R.candidateMember(s,rid,q.owner.memberId);
      if (!q.owner.allowed || !selected || selected.charId !== c.id) q.reason = q.owner.reason ||
        FB.T('The independent public interests have not selected this officer.');
    }
    q.allowed = !q.reason;
    q.stamp = JSON.stringify([appointment,realm && realm.ruler,member,incumbent && [incumbent.id,incumbent.dead],
      c && [c.id,c.dead,c.unfree,c.royalLine],FB.treasuryPublicAccountSnapshot(s,rid)]);
    return q;
  };
  function installOfficer(s,r) {
    var rid = r.institutionId, c = s.chars[r.holder.id], claim = r.mandate.claim;
    if (!c || c.dead || c.unfree || FB.justiceCustodyOf(s,c.id) || FB.isReigningRealmRuler(s,c)) return false;
    claim.status = 'succeeded';
    if (rid === 'player') {
      var successorCourt = FB.abdicatePlayerRealmToHeir(s,c,{cause:'lawful_removal'});
      if (!successorCourt) { claim.status = 'disputed'; return false; }
      FB.authorityRekeyInstitution(s,'player',successorCourt.id);
      claim.currentCourtId = successorCourt.id;
      s.player.provs = [];
      FB.setPlayerTier(s,2,{attachLiege:false});
      FB.changePlayerLiege(s,successorCourt.id,'office:accession');
    } else if (!FB.assignRealmRulerCharacter(s,rid,c.id,{replaceAuthored:true})) return false;
    FB.authorityAppointmentTransition(s,r.id,'remove');
    var claimant = (s.authority.appointments || []).filter(function (p) { return p.id === claim.appointmentId; })[0];
    if (claimant) FB.authorityAppointmentTransition(s,claimant.id,'remove');
    if (c.id === s.player.charId) {
      if (!FB.absorbRealm(s,rid,c)) return false;
      claim.currentCourtId = 'player';
    }
    var current = claim.currentCourtId, at = {kind:'realm',id:current}, issuer = {kind:'realm',id:current},
      def = FBDATA.authorityOffices[claimant.officeId], source = FB.legitimacySourceFor(s,'court',issuer,def.recognitionSources);
    if (source) {
      var proof = FB.political.legitimacy(s,r.holder,at,source).filter(function (p) { return same(p.issuer,issuer); })[0] ||
        FB.authorityRecognize(s,{issuer:issuer,subject:r.holder,scope:at,source:source});
      if (proof) FB.authorityAppoint(s,{officeId:claimant.officeId,institutionId:current,appointer:issuer,
        holder:r.holder,scope:at,recognitionId:proof.id});
    }
    return true;
  }
  R.officerAccede = function (s,reviewed,r) {
    var current = R.officerAccessionQuote(s,reviewed.actor,r);
    if (!current.allowed || JSON.stringify(current) !== JSON.stringify(reviewed)) return false;
    if (FB.administrationProfile(s,r.institutionId)) {
      var fromPlayer = r.institutionId === 'player';
      r.mandate.claim.status = 'succeeded';
      var result = FB.publicAccede(s,FB.publicAccessionQuote(s,{kind:'realm',id:r.institutionId},r.institutionId,current.cause));
      if (result) {
        r.mandate.claim.currentCourtId = r.holder.id === s.player.charId ? 'player' : r.institutionId;
        if (fromPlayer) FB.authorityRekeyInstitution(s,'player',result.id);
        FB.authorityAppointmentTransition(s,r.id,'remove');
        return result;
      }
      r.mandate.claim.status = 'claimed'; return false;
    }
    return installOfficer(s,r);
  };
  R.openOfficeDispute = function (s,r) {
    var M = FB.officeMandates, claim = r.mandate.claim, rid = r.institutionId,
      c = s.chars[r.holder.id], realm = s.realms[rid], faction = 'office_dispute_' + r.id,
      forces = M.forces(s,r).map(function (id) { return {hostId:id,realmId:(s.armies || []).filter(function (a) { return a.id === id; })[0].realm}; });
    if (!forces.length || s.realms[faction]) return false;
    // A banner identity, with no county, levy, purse, dynasty or generated ruler.
    s.realms[faction] = {id:faction,name:c.name,capital:realm.capital,color:realm.color,
      rank:1,liege:null,alive:true,rebelFaction:true,nonTerritorial:true,
      religion:c.religion,ruler:{name:c.name,sex:c.sex,culture:c.culture,born:c.born,
        age:FB.ageOf(c,s.date.year),mar:FB.skillSnapshot(s,c,'mar'),generation:1},war:null};
    var war = FB.registerOrdinaryWar(s,faction,{enemy:rid,target:realm.capital,legacy:false,
      casus:{type:'office_acclamation',target:realm.capital},objectives:[{type:'office_acclamation',target:realm.capital}]});
    if (!war) { delete s.realms[faction]; return false; }
    claim.status = 'disputed'; claim.factionId = faction; claim.warId = war.id; claim.forces = forces;
    FB.authorityAppointmentTransition(s,r.id,'remove');
    forces.forEach(function (f) {
      var a = (s.armies || []).filter(function (a) { return a.id === f.hostId; })[0];
      a.realm = faction; a.warId = war.id; a.path = []; a.goal = null; a.moveLeft = 0;
      (s.authority.contracts || []).filter(function (p) { return p.hostId === a.id && ['active','offered'].indexOf(p.status) >= 0; }).forEach(function (p) {
        FB.authorityContractTransition(s,p.id,'breach',p.patronRealmId);
      });
    });
    FB.authorityRecognitionTransition(s,claim.recognitionId,'reaffirm');
    FB.news(s,FB.msg('news.office.mandate_dispute',
      '{person} disputes the court’s rule with the existing declared forces. An ordinary campaign will decide the outcome.',{person:c.name}));
    FB.invalidateRealmCache(); FB.assignCampaignHosts(s);
    return war;
  };
  R.officeDisputeValid = function (s,war) {
    var r = FB.officeMandates.warAppointment(s,war.id), c = r && s.chars[r.holder.id], claim = r && r.mandate.claim;
    return !!(claim && claim.status === 'disputed' && c && !c.dead && !c.unfree && !FB.justiceCustodyOf(s,c.id) &&
      !FB.isReigningRealmRuler(s,c) && !(c.id === s.player.charId && FB.station.rulesRealm(s.player,s)) &&
      claim.generation === FB.realmRulerGeneration(s,r.institutionId) && FB.officeMandates.supported(s,r) && (s.armies || []).some(function (a) {
        return a.realm === claim.factionId && a.men > 0 && claim.forces.some(function (f) { return f.hostId === a.id; }); }));
  };
  R.finishOfficeDispute = function (s,war,result) {
    var r = FB.officeMandates.warAppointment(s,war.id);
    if (!r || r.mandate.claim.status !== 'disputed') return false;
    var claim = r.mandate.claim, originalCourt = r.institutionId, won = result === 'victory' && R.officeDisputeValid(s,war);
    if (won) won = !!installOfficer(s,r);
    if (!won) { claim.status = 'failed'; FB.authorityRecognitionTransition(s,claim.recognitionId,'revoke'); }
    // Return surviving soldiers, food and equipment on the same actual hosts.
    claim.forces.forEach(function (f) {
      var a = (s.armies || []).filter(function (a) { return a.id === f.hostId; })[0];
      if (!a || a.realm !== claim.factionId) return;
      a.realm = won && f.realmId === originalCourt ? claim.currentCourtId : f.realmId;
      a.warId = null; a.path = []; a.goal = null; a.moveLeft = 0;
    });
    s.realms[claim.factionId].alive = false; FB.invalidateRealmCache();
    var c = s.chars[r.holder.id];
    FB.news(s,won ? FB.msg('news.office.mandate_victory',
      'The campaign brings {person} to rule. Public accounts and private property remain separate.',{person:c.name}) :
      FB.msg('news.office.mandate_failure',
        'The acclamation of {person} fails. Surviving forces return to their former institutions; the revoked mandate is not restored.',{person:c.name}));
    return won;
  };
})();
