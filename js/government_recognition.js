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
    var principal = seat && seat.principal, ruler = FB.realmRulerCharacterSnapshot(s, rid);
    var allowed = validActor(s, actor) && (candidate || policy && candidateId === null) && seat &&
      (same(actor, principal) || principal && principal.kind === 'realm' && ruler && actor.kind === 'character' && actor.id === ruler.id);
    var q = { operation:'support', actor:copy(actor || null), realmId:rid, seatId:seatId,
      candidateId:candidateId, cost:0, allowed:!!allowed,
      reason:allowed ? null : FB.T('Only this living interest can recognize an eligible candidate.') };
    q.stamp = JSON.stringify([FB.realmRulerGeneration(s, rid), members, candidates,
      votes(s, rid), FB.administrationProfile(s, rid), actor, ruler && [ruler.id,ruler.dead]]);
    if (policy) policy.support(s, rid, q, seat, candidate, terms);
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
    var result = apply(q);
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
})();
