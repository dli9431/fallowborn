/* Typed political constituencies and reviewed selection transactions.
   This module owns progress, never genealogy, property or a second treasury. */
(function () {
  'use strict';
  var S = FB.governmentSelection = {}, MAX_MEMBERS = 24, MAX_CANDIDATES = 64;
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function integer(n, min, max) { return Number.isSafeInteger(n) && n >= min && n <= max; }
  function keys(o, allowed) { return plain(o) && Object.keys(o).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function unique(a) { return Array.isArray(a) && a.every(function (id, i) { return typeof id === 'string' && id.length <= 160 && a.indexOf(id) === i; }); }
  function rate(n) { return typeof n === 'number' && isFinite(n) && n >= 0 && n <= 1; }
  function terms(t) { return keys(t, ['levy','revenue']) && rate(t.levy) && rate(t.revenue); }
  function realm(s, rid) { return s && s.realms && s.realms[rid]; }
  function record(s, rid) { return s && s.authority && s.authority.governments && s.authority.governments[rid]; }
  S.state = function (s, rid) { var row = record(s, rid); return row && row.selection || null; };
  S.profile = function (s, rid) {
    var row = record(s, rid), form = row && FBDATA.governmentForms[row.formId];
    return form && form.selectionProfile || null;
  };
  S.localRealm = function (s) {
    if (!s || !s.player) return null;
    var rid = FB.station.rulesRealm(s.player, s) ? 'player' :
      s.holder[s.player.provinceId] || s.owner[s.player.provinceId];
    return rid && S.profile(s, rid) ? rid : null;
  };
  function tree(s, rid) { var r = realm(s, rid); return r && r.succession; }
  function generation(s, rid) { return FB.realmRulerGeneration(s, rid); }
  function memberCharacter(s, m) { return m && m.charId && s.chars[m.charId]; }
  function alive(s, m) { var c = memberCharacter(s, m); return !!m && m.alive !== false && !(m.charId && !c) && !(c && c.dead); }
  function descent(m, members, roots, seen) {
    if (!m || seen[m.id]) return false;
    if (roots.indexOf(m.id) >= 0) return true;
    seen[m.id] = true;
    return descent(members[m.fatherId || m.parentId], members, roots, seen) ||
      descent(members[m.motherId], members, roots, seen);
  }
  function eligible(s, rid, m, includeRuler, ignoreAge) {
    var data = S.state(s, rid), p = S.profile(s, rid), t = tree(s, rid);
    var c = memberCharacter(s, m), person = c || m;
    if (!data || !p || !t || !alive(s, m) || !includeRuler && m.id === t.rulerMemberId ||
        m.role === 'consort' || p.eligibility.sex && person.sex !== p.eligibility.sex ||
        !ignoreAge && s.date.year - person.born < p.eligibility.minAge ||
        p.eligibility.ancestry !== false && !descent(m, t.members, data.roots, {})) return false;
    if (p.candidatePool && !poolEligible(s, rid, m, c, ignoreAge)) return false;
    if (c && (c.captive || c.imprisoned || c.exiled || FB.justiceCustodyOf && FB.justiceCustodyOf(s, c.id))) return false;
    if (m.branchRef && FB.royalBranchEligible && !FB.royalBranchEligible(s, rid, m)) return false;
    var occupied = !c && s.chars[FB.courtCharacterId(m.id)];
    if (occupied && (occupied.dead || !occupied.royalLine || occupied.royalLine.realmId !== rid || occupied.royalLine.memberId !== m.id)) return false;
    if (p.eligibility.officeId && !(s.authority.appointments || []).some(function (row) {
      return row.officeId === p.eligibility.officeId && row.institutionId === rid && row.status === 'active' &&
        row.holder.kind === 'character' && c && row.holder.id === c.id && (row.endTurn === null || row.endTurn > s.turn);
    })) return false;
    return true;
  }
  function poolEligible(s, rid, m, c, ignoreAge) {
    var p = S.profile(s, rid), pool = p && p.candidatePool;
    if (!pool) return true;
    var culture = c ? c.culture : m.culture || realm(s, rid).ruler.culture;
    var religion = c ? c.religion : m.religion || realm(s, rid).religion;
    if (pool.cultures.length && pool.cultures.indexOf(culture) < 0 ||
        pool.religions.length && pool.religions.indexOf(religion) < 0 ||
        c && (c.unfree || pool.excludedRoles.indexOf(c.role) >= 0 ||
          FB.isReigningRealmRuler(s, c) && FB.realmIdForRulerCharacter(s, c.id) !== rid)) return false;
    if (m.role === 'electoral_candidate' && (!c ||
        !c.royalLine || c.royalLine.realmId !== rid || c.royalLine.memberId !== m.id ||
        pool.gentle && !FB.station.isGentle(FB.station.subject(c, s), s))) return false;
    return true;
  }
  S.nominees = function (s, rid) {
    var p = S.profile(s, rid), t = tree(s, rid);
    if (!p || !p.candidatePool || !t || !S.state(s, rid)) return [];
    return Object.keys(s.chars).sort().filter(function (id) {
      var c = s.chars[id], home = id === s.player.charId ? s.player.provinceId : c.homeProvinceId;
      return !c.dead && !c.captive && !c.imprisoned && !c.exiled && !FB.justiceCustodyOf(s, id) &&
        !c.royalLine && !FB.isReigningRealmRuler(s, c) && home && s.owner[home] === rid &&
        s.date.year - c.born >= p.eligibility.minAge && (!p.eligibility.sex || c.sex === p.eligibility.sex) &&
        (!p.candidatePool.gentle || FB.station.isGentle(FB.station.subject(c, s), s)) &&
        poolEligible(s, rid, c, c, false);
    }).slice(0, MAX_CANDIDATES);
  };
  S.candidates = function (s, rid, includeRuler) {
    var t = tree(s, rid);
    if (!t || !S.state(s, rid) || !S.profile(s, rid)) return [];
    return Object.keys(t.members).filter(function (id) { return eligible(s, rid, t.members[id], includeRuler); })
      .sort(function (a, b) { return (S.profile(s, rid).tieBreak === 'seniority' ? t.members[a].born - t.members[b].born : 0) || (a < b ? -1 : a > b ? 1 : 0); })
      .slice(0, MAX_CANDIDATES);
  };
  function principal(s, rid, row) {
    var t = tree(s, rid), at = row.principal;
    function availablePerson(c) { return !!c && !c.dead && !c.exiled && !c.captive && !c.imprisoned && !FB.justiceCustodyOf(s, c.id); }
    if (at.kind === 'county') return FB.world.byId[at.id] && !FB.world.byId[at.id].wasteland ? at : null;
    if (at.kind === 'character') return availablePerson(s.chars[at.id]) ? at : null;
    if (at.kind === 'institution') {
      var definitions = FB.localInstitutionDefinitions(s);
      var def = definitions && definitions[at.id];
      var inst = s.localInstitutions && s.localInstitutions[at.id];
      var c = inst && s.chars[inst.representativeId];
      return def && (!def.provinceId || s.owner[def.provinceId] === rid) && availablePerson(c)
        ? { kind:'character', id:c.id } : null;
    }
    if (at.kind === 'royal_member') {
      if (t && alive(s, t.members[at.id]) && (!memberCharacter(s, t.members[at.id]) || availablePerson(memberCharacter(s, t.members[at.id])))) return at;
      if (row.continuity === 'senior_kin') {
        var ids = S.candidates(s, rid, true);
        return ids.length ? { kind:'royal_member', id:ids[0] } : null;
      }
    }
    return null;
  }
  S.constituency = function (s, rid) {
    var data = S.state(s, rid);
    return data ? data.members.map(function (row) {
      var who = principal(s, rid, row), inScope = row.scope.kind === 'realm'
        ? !!realm(s, rid) && realm(s, rid).alive : s.owner[row.scope.id] === rid;
      return Object.assign(copy(row), { currentPrincipal:who, active:!!who && inScope });
    }) : [];
  };
  function candidateFacts(s, rid, id) {
    var t = tree(s, rid), m = t && t.members[id], c = memberCharacter(s, m);
    return m ? { id:id, alive:alive(s, m), born:m.born, sex:m.sex,
      person:c ? { name:c.name, dyn:c.dyn, born:c.born, sex:c.sex, culture:c.culture, religion:c.religion,
        role:c.role || null, unfree:!!c.unfree, station:FB.stationOf(c) } : null,
      fatherId:m.fatherId || m.parentId || null, motherId:m.motherId || null,
      charId:m.charId || null, role:m.role || null, martial:c ? FB.skillSnapshot(s, c, 'mar') : Number(m.mar) || 0,
      captive:!!(c && (c.captive || c.imprisoned || c.exiled)),
      home:c && c.homeProvinceId || m.homeProvinceId || null } : null;
  }
  function incumbent(s, rid) { var t = tree(s, rid); return t && t.members[t.rulerMemberId]; }
  function actorAllowed(s, rid, actor, candidateId, allowCandidate) {
    var r = realm(s, rid), t = tree(s, rid), candidate = t && t.members[candidateId];
    if (!actor || !r || !r.alive) return false;
    if (actor.kind === 'realm') return actor.id === rid;
    var c = actor.kind === 'character' && s.chars[actor.id];
    if (allowCandidate && !candidateId && c) candidate = S.candidates(s, rid).map(function (id) { return t.members[id]; })
      .filter(function (m) { return m.charId === c.id; })[0];
    return !!c && !c.dead && (allowCandidate && candidate && candidate.charId === c.id && eligible(s, rid, candidate, false) ||
      incumbent(s, rid) && incumbent(s, rid).charId === c.id);
  }
  function available(s, actor) {
    if (!actor) return 0;
    if (actor.kind === 'realm') return FB.treasuryAvailable ? FB.treasuryAvailable(s, actor.id) : 0;
    var c = s.chars[actor.id];
    if (c && !c.dead && actor.id === s.player.charId) return Math.max(0, Number(s.player.gold) || 0);
    return c && !c.dead ? Math.max(0, Number(c.gold) || 0) : 0;
  }
  function spend(s, actor, amount) {
    if (!amount) return true;
    if (actor.kind === 'realm') return FB.treasurySpend(s, actor.id, amount);
    var c = s.chars[actor.id];
    if (!c || c.dead || available(s, actor) < amount) return false;
    if (actor.id === s.player.charId) s.player.gold -= amount;
    else c.gold -= amount;
    return true;
  }
  function response(s, rid, row, id, offer) {
    var p = S.profile(s, rid), rule = p.members.filter(function (m) { return m.id === (row.templateId || row.id); })[0];
    var facts = candidateFacts(s, rid, id);
    var support = row.scope.kind === 'county' ? FB.countyPopularSupport(s, row.scope.id) :
      FB.realmHeldCounties(s, rid).reduce(function (n, pid) { return n + FB.countyPopularSupport(s, pid); }, 0) /
        Math.max(1, FB.realmHeldCounties(s, rid).length);
    var blocked = !row.active ? 'principal_unavailable' :
      !facts || !eligible(s, rid, tree(s, rid).members[id], true) ? 'ineligible' :
      realm(s, rid).liege || FB.realmWars(s, rid).some(function (war) {
        return Object.keys(war.occupations || {}).some(function (pid) {
          return s.owner[pid] === rid && (row.scope.kind === 'realm' || row.scope.id === pid) && war.occupations[pid].occupied;
        });
      }) ? 'external_coercion' : support < rule.minimumSupport ? 'local_refusal' :
      facts.martial < rule.minimumMartial ? 'candidate_refusal' :
      offer.levy > rule.maximumLevy || offer.revenue > rule.maximumRevenue ? 'terms_refused' : null;
    return { memberId:row.id, principal:row.currentPrincipal, candidateId:blocked ? null : id,
      reason:blocked, terms:copy(offer) };
  }
  S.winner = function (s, rid) {
    var data = S.state(s, rid), p = S.profile(s, rid), v = data && data.vacancy;
    if (!v || !p || v.status === 'resolved' || v.generation !== generation(s, rid)) return null;
    var members = S.constituency(s, rid), full = data.members.reduce(function (n, m) { return n + m.weight; }, 0);
    var active = members.filter(function (m) { return m.active; });
    var total = active.reduce(function (n, m) { return n + m.weight; }, 0);
    if (!total || total < full * p.quorum) return null;
    var ids = S.candidates(s, rid), best = null, bestWeight = -1;
    ids.forEach(function (id) {
      var weight = active.reduce(function (n, m) {
        var vote = v.support[m.id];
        return n + (vote && vote.candidateId === id &&
          JSON.stringify(vote.principal) === JSON.stringify(m.currentPrincipal) &&
          !response(s, rid, m, id, vote.terms).reason ? m.weight : 0);
      }, 0);
      if (weight >= total * p.consensus && weight > bestWeight) { best = id; bestWeight = weight; }
    });
    return best;
  };
  function stamp(s, rid, request) {
    var t = tree(s, rid), data = S.state(s, rid), p = S.profile(s, rid);
    return JSON.stringify({ request:request, form:record(s, rid).formId, profile:p, data:data,
      generation:generation(s, rid), ruler:incumbent(s, rid), liege:realm(s, rid).liege || null,
      designation:t && t.designatedHeirId || null,
      nominee:request.characterId && s.chars[request.characterId] || null, nominees:S.nominees(s, rid),
      judgment:s.justice && s.justice.last || null,
      candidates:t ? Object.keys(t.members).sort().map(function (id) { return candidateFacts(s, rid, id); }) : [],
      eligible:S.candidates(s, rid, true),
      responses:S.constituency(s, rid).map(function (row) {
        return response(s, rid, row, request.candidateId || t.rulerMemberId, request.terms && terms(request.terms) ? request.terms : p.terms);
      }),
      minors:t ? Object.keys(t.members).filter(function (id) { return eligible(s, rid, t.members[id], false, true); }) : [],
      constituency:S.constituency(s, rid), counties:FB.realmHeldCounties(s, rid).map(function (pid) {
        return [pid, s.owner[pid], s.holder[pid], FB.countyPopularSupport(s, pid)];
      }), funds:available(s, request.actor), turn:s.turn });
  }
  S.reason = function (id) {
    var text = { missing_state:FB.T('This campaign has no declared political constituency.'), invalid_actor:FB.T('A current ruler or eligible candidate must propose this decision.'),
      no_vacancy:FB.T('Open a lawful vacancy before seeking a successor.'), ruler_alive:FB.T('Death cannot open a vacancy while the ruler lives.'),
      ineligible:FB.T('The candidate must meet the declared age, ancestry, legal status and office requirements, free of captivity and exile.'),
      nomination_refused:FB.T('A living selection interest must nominate a qualified local person. Existing rulers and other courts’ royal members retain their current roles.'),
      designation_refused:FB.T('This profile does not permit this designation. Designation never replaces political assent.'),
      terms_refused:FB.T('The offered obligations exceed a local interest’s declared limit.'), funds:FB.T('The paying treasury cannot afford the displayed cost.'),
      no_consensus:FB.T('No eligible candidate has the required local recognition.'), stale:FB.T('Current facts changed. Review this decision again.'),
      already_resolved:FB.T('This ruler generation already has a resolved accession.'), principal_unavailable:FB.T('A required local principal or scope is unavailable.'),
      external_coercion:FB.T('External subordination prevents free local acclamation.'), local_refusal:FB.T('Local support is too low for recognition.'),
      candidate_refusal:FB.T('The candidate does not meet this interest’s service requirement.'), invalid_terms:FB.T('Choose bounded levy and revenue obligations.'),
      invalid_form:FB.T('Choose a different registered government form.'), no_mandate:FB.T('Only this interest’s living principal may record its recognition.'),
      removal_refused:FB.T('Lawful displacement requires judicial custody or a current lawful deposition judgment.'), missing_assent:FB.T('The current ruler must obtain local assent before exercising these powers.') };
    return id && own(text, id) ? text[id] : '';
  };
  S.quote = function (s, rid, request) {
    request = request && copy(request) || {};
    var data = S.state(s, rid), p = S.profile(s, rid), r = realm(s, rid);
    var q = { realmId:rid, request:request, allowed:false, reasonId:null, cost:0, responses:[], winnerId:null, stamp:null };
    if (!r || !r.alive || !data || !p) q.reasonId = 'missing_state';
    else {
      var v = data.vacancy, actor = request.actor, id = request.candidateId, t = tree(s, rid);
      var personalVote = request.action === 'support' || request.action === 'withdraw' || request.action === 'nominate';
      var mandate = personalVote && S.constituency(s, rid).filter(function (m) { return m.id === request.memberId && m.active; })[0];
      var isPrincipal = mandate && actor && (actor.kind === 'character' &&
        (mandate.currentPrincipal.kind === 'character' && mandate.currentPrincipal.id === actor.id ||
          mandate.currentPrincipal.kind === 'royal_member' && t.members[mandate.currentPrincipal.id].charId === actor.id) ||
        actor.kind === 'constituency' && actor.realmId === rid && actor.id === mandate.id);
      var candidateProposal = request.action === 'negotiate' || request.action === 'resolve' || request.action === 'open' && request.cause === 'lawful_removal';
      if (personalVote ? !isPrincipal : !actorAllowed(s, rid, actor, id, candidateProposal)) q.reasonId = personalVote ? 'no_mandate' : 'invalid_actor';
      else if (request.action === 'nominate') {
        if (!v || v.status === 'resolved') q.reasonId = 'no_vacancy';
        else if (S.nominees(s, rid).indexOf(request.characterId) < 0 ||
            ('royal_' + data.originRealmId + '_electoral_' + request.characterId).length > 160 ||
            Object.keys(t.members).filter(function (key) { return t.members[key].role === 'electoral_candidate' && alive(s, t.members[key]); }).length >= MAX_CANDIDATES ||
            S.candidates(s, rid).length >= MAX_CANDIDATES ||
            own(t.members, 'royal_' + data.originRealmId + '_electoral_' + request.characterId)) q.reasonId = 'nomination_refused';
      } else if (request.action === 'designate') {
        if (!p.procedure || !p.procedure.designation || !id || S.candidates(s, rid).indexOf(id) < 0 ||
            v && v.status !== 'resolved') q.reasonId = 'designation_refused';
      } else if (request.action === 'open') {
        if (['death','abdication','lawful_removal'].indexOf(request.cause) < 0) q.reasonId = 'invalid_actor';
        else if (v && v.generation === generation(s, rid)) q.reasonId = v.status === 'resolved' ? 'already_resolved' : 'no_vacancy';
        else if (request.cause === 'death' && alive(s, incumbent(s, rid))) q.reasonId = 'ruler_alive';
        else if (request.cause === 'lawful_removal') {
          var ruler = incumbent(s, rid), custody = ruler && ruler.charId && FB.justiceCustodyOf(s, ruler.charId);
          var judgment = s.justice && s.justice.last, sentence = judgment && FBDATA.justiceSentences[judgment.sentence];
          var lawful = ruler && judgment && judgment.targetId === ruler.charId && judgment.justified && judgment.turn === s.turn && sentence && sentence.kind === 'corporal';
          if ((!custody || custody.source !== 'judicial') && !lawful) q.reasonId = 'removal_refused';
        }
      } else if (request.action === 'withdraw') {
        if (!data.recognition || data.recognition.consents.indexOf(request.memberId) < 0) q.reasonId = 'missing_assent';
      } else if (request.action === 'enroll') {
        var local = p.members.filter(function (m) { return m.principal === 'capital_community'; })[0];
        if (!local || typeof request.provinceId !== 'string' || s.owner[request.provinceId] !== rid || s.holder[request.provinceId] !== rid ||
            data.members.length >= MAX_MEMBERS || data.members.some(function (m) {
              return m.id === 'local_' + request.provinceId || m.scope.kind === 'county' && m.scope.id === request.provinceId;
            }))
          q.reasonId = 'principal_unavailable';
        else { q.cost = p.negotiationCost; if (available(s, actor) < q.cost) q.reasonId = 'funds'; }
      } else if (['negotiate','support','assent','obligations'].indexOf(request.action) >= 0) {
        if (request.action !== 'assent' && request.action !== 'obligations' && (!v || v.status === 'resolved')) q.reasonId = 'no_vacancy';
        else if (!id || (request.action === 'assent' || request.action === 'obligations'
          ? !eligible(s, rid, t.members[id], true) : S.candidates(s, rid).indexOf(id) < 0)) q.reasonId = 'ineligible';
        else if ((request.action === 'assent' || request.action === 'obligations') && id !== t.rulerMemberId) q.reasonId = 'invalid_actor';
        else if (!terms(request.terms)) q.reasonId = 'invalid_terms';
        else {
          q.cost = request.action === 'support' ? 0 : p.negotiationCost;
          q.responses = (mandate ? [mandate] : S.constituency(s, rid)).map(function (row) {
            var result = response(s, rid, row, id, request.terms);
            if (request.action === 'support' && request.withhold === true) { result.candidateId = null; result.reason = 'local_refusal'; }
            return result;
          });
          if (available(s, actor) < q.cost) q.reasonId = 'funds';
        }
      } else if (request.action === 'resolve') {
        if (!v) q.reasonId = 'no_vacancy';
        else if (v.status === 'resolved') q.reasonId = 'already_resolved';
        else { q.winnerId = S.winner(s, rid); if (!q.winnerId) q.reasonId = 'no_consensus'; }
      } else if (request.action === 'transform') {
        var options = FBDATA.governmentForms[record(s, rid).formId].transformationOptions || [];
        if (!options.some(function (option) { return option.formId === request.formId; }) ||
            !FBDATA.governmentForms[request.formId] || request.formId === record(s, rid).formId || FB.governments.problems(request.formId).length)
          q.reasonId = 'invalid_form';
        else if (!S.recognized(s, rid)) q.reasonId = 'missing_assent';
      } else q.reasonId = 'invalid_actor';
      q.stamp = stamp(s, rid, request);
    }
    q.allowed = !q.reasonId; q.reason = S.reason(q.reasonId); return q;
  };
  function recognition(s, rid, id, votes, offer) {
    var p = S.profile(s, rid), members = S.constituency(s, rid), total = 0, support = 0, scopes = [], consents = [];
    members.forEach(function (m) {
      if (!m.active) return;
      total += m.weight;
      var v = votes[m.id];
      if (v && v.candidateId === id && JSON.stringify(v.principal) === JSON.stringify(m.currentPrincipal)) {
        support += m.weight; consents.push(m.id);
        if (m.scope.kind === 'county' && scopes.indexOf(m.scope.id) < 0) scopes.push(m.scope.id);
      }
    });
    var full = S.state(s, rid).members.reduce(function (n, m) { return n + m.weight; }, 0);
    return total && total >= full * p.quorum && support >= total * p.consensus ? {
      generation:generation(s, rid), memberId:id, scopes:scopes.sort(), terms:copy(offer), consents:consents.sort(),
      principals:members.filter(function (m) { return consents.indexOf(m.id) >= 0; }).map(function (m) { return { id:m.id, principal:copy(m.currentPrincipal) }; })
        .sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; })
    } : null;
  }
  S.apply = function (s, review) {
    if (!review || typeof review.realmId !== 'string') return false;
    var q = S.quote(s, review.realmId, review.request);
    if (!q.allowed || q.stamp !== review.stamp) return false;
    var rid = q.realmId, request = q.request, data = S.state(s, rid), v = data.vacancy, p = S.profile(s, rid);
    if (request.action === 'nominate') {
      var c = s.chars[request.characterId], t = tree(s, rid);
      var key = 'royal_' + data.originRealmId + '_electoral_' + c.id;
      t.members[key] = { id:key, name:c.name, dyn:c.dyn, sex:c.sex, born:c.born, alive:true,
        culture:c.culture, religion:c.religion, charId:c.id, parentId:null, childIds:[], role:'electoral_candidate' };
      c.royalLine = { realmId:rid, memberId:key };
      v.candidates = S.candidates(s, rid);
      FB.refreshRealmSuccession(s, rid);
    } else if (request.action === 'designate') {
      tree(s, rid).designatedHeirId = request.candidateId;
    } else if (request.action === 'open') {
      data.vacancy = { generation:generation(s, rid), cause:request.cause, openedTurn:s.turn,
        status:'selecting', candidates:S.candidates(s, rid), support:{}, accessionId:null };
      delete data.lastPeriod;
      if (rid === 'player' && S.releasePlayerCourt)
        S.releasePlayerCourt(s, s.chars[s.player.charId], request.cause !== 'death');
    } else if (request.action === 'withdraw') {
      data.recognition.consents = data.recognition.consents.filter(function (id) { return id !== request.memberId; });
      data.recognition.principals = data.recognition.principals.filter(function (who) { return who.id !== request.memberId; });
      var withdrawn = data.members.filter(function (m) { return m.id === request.memberId; })[0];
      if (withdrawn.scope.kind === 'county') data.recognition.scopes = data.recognition.scopes.filter(function (pid) { return pid !== withdrawn.scope.id; });
    } else if (request.action === 'enroll') {
      if (!spend(s, request.actor, q.cost)) return false;
      var template = p.members.filter(function (m) { return m.principal === 'capital_community'; })[0];
      data.members.push({ id:'local_' + request.provinceId, templateId:template.id,
        principal:{ kind:'county', id:request.provinceId }, scope:{ kind:'county', id:request.provinceId },
        basis:template.basis, weight:template.weight, continuity:template.continuity });
    } else if (['negotiate','support','assent','obligations'].indexOf(request.action) >= 0) {
      if (!spend(s, request.actor, q.cost)) return false;
      var votes = request.action === 'assent' || request.action === 'obligations' ? {} : v.support;
      q.responses.forEach(function (row) { votes[row.memberId] = copy(row); });
      if (request.action === 'assent' || request.action === 'obligations') {
        var accepted = recognition(s, rid, request.candidateId, votes, request.terms);
        if (accepted) data.recognition = accepted;
      } else {
        var current = S.candidates(s, rid);
        v.candidates = current;
        Object.keys(v.support).forEach(function (key) {
          var vote = v.support[key];
          if (vote.candidateId && current.indexOf(vote.candidateId) < 0) { vote.candidateId = null; vote.reason = 'ineligible'; }
        });
        v.status = S.winner(s, rid) ? 'selecting' : current.length ? 'contested' : 'vacant';
      }
    } else if (request.action === 'resolve') {
      var supporting = Object.keys(v.support).map(function (id) { return v.support[id]; }).filter(function (row) { return row.candidateId === q.winnerId; });
      var offer = supporting.reduce(function (t, vote) { return { levy:Math.min(t.levy, vote.terms.levy), revenue:Math.min(t.revenue, vote.terms.revenue) }; }, { levy:1, revenue:1 });
      var heir = FB.advanceRealmSuccession(s, rid, { cause:v.cause, selectionCommit:true });
      if (!heir || heir.id !== q.winnerId) return false;
      v.status = 'resolved'; v.accessionId = heir.id;
      var target = realm(s, rid).alive ? rid : S.state(s, 'player') === data ? 'player' : rid;
      data.recognition = recognition(s, target, heir.id, v.support, offer);
      FB.news(s, FB.msg('news.government.local_accession', '👑 {ruler} receives local recognition in {realm}.',
        { ruler:heir.name, realm:FB.realmNameParam(s, realm(s, target)) }));
    } else if (request.action === 'transform') {
      if (!FB.authoritySetGovernment(s, rid, request.formId, { selectionCommit:true })) return false;
    }
    data.revision++; FB.governments.invalidate();
    if (FB.invalidateRealmCache) FB.invalidateRealmCache();
    if (FB.invalidatePoliticsState) FB.invalidatePoliticsState();
    return true;
  };
  S.recognized = function (s, rid, pid) {
    var data = S.state(s, rid), row = data && data.recognition, t = tree(s, rid), p = S.profile(s, rid);
    if (!row || !t || !p || row.generation !== generation(s, rid) || row.memberId !== t.rulerMemberId || !alive(s, incumbent(s, rid)) ||
        data.vacancy && data.vacancy.generation === generation(s, rid) && data.vacancy.status !== 'resolved') return false;
    var live = S.constituency(s, rid), weight = 0, total = 0, full = data.members.reduce(function (n, m) { return n + m.weight; }, 0);
    live.forEach(function (m) {
      if (!m.active) return;
      total += m.weight;
      var saved = row.principals.filter(function (who) { return who.id === m.id; })[0];
      if (saved && JSON.stringify(saved.principal) === JSON.stringify(m.currentPrincipal) &&
          !response(s, rid, m, row.memberId, row.terms).reason) weight += m.weight;
    });
    return !!total && total >= full * p.quorum && weight >= total * p.consensus &&
      (!pid || (p.procedure && p.procedure.realmRecognition || row.scopes.indexOf(pid) >= 0) && s.owner[pid] === rid);
  };
  S.initialize = function (s, rid) {
    var p = S.profile(s, rid), t = tree(s, rid), row = record(s, rid);
    if (!p || !t || !row || row.selection) return false;
    if (p.procedure) FB.ensureLocalInstitutions(s, null, { fresh:true });
    var root = t.founderId || t.rulerMemberId;
    var data = row.selection = { schema:1, profileId:row.formId, originRealmId:rid, roots:[root], members:[], revision:0, vacancy:null, recognition:null };
    p.members.forEach(function (def) {
      var at = def.scope === 'capital' ? { kind:'county', id:realm(s, rid).capital } : { kind:'realm', id:rid };
      var who = def.principal === 'senior_kin' ? { kind:'royal_member', id:root } :
        def.principal === 'capital_community' ? { kind:'county', id:realm(s, rid).capital } : copy(def.principal);
      if (def.principal === 'capital_elite' || def.principal === 'capital_clergy') {
        var defs = FB.localInstitutionDefinitions(s);
        var id = Object.keys(defs).sort().filter(function (id) {
          return defs[id].provinceId === realm(s, rid).capital &&
            (def.principal === 'capital_elite' ? defs[id].kind === 'council' : defs[id].kind === 'congregation');
        })[0];
        if (!id) throw new Error(FB.T('The electoral profile requires a declared capital institution.'));
        who = { kind:'institution', id:id };
      }
      data.members.push({ id:def.id, templateId:def.id, principal:who, scope:at, basis:def.basis, weight:def.weight, continuity:def.continuity });
    });
    var votes = {}, offer = p.terms;
    S.constituency(s, rid).forEach(function (m) { votes[m.id] = response(s, rid, m, t.rulerMemberId, offer); });
    data.recognition = recognition(s, rid, t.rulerMemberId, votes, offer);
    FB.refreshRealmSuccession(s, rid);
    /* Community mandates retain county scopes; electoral realm-wide
       mandates come from the declared profile and never allocate land. */
    return true;
  };
  S.seed = function (s) {
    Object.keys(s.realms).forEach(function (rid) { if (S.profile(s, rid)) S.initialize(s, rid); });
  };
  S.ai = function (s, rid) {
    var data = S.state(s, rid), p = S.profile(s, rid);
    if (!data || !p || !realm(s, rid).alive) return false;
    var period = Math.floor(s.turn / 90);
    if (data.lastPeriod === period) return false;
    data.lastPeriod = period;
    var actor = { kind:'realm', id:rid }, v = data.vacancy;
    if (v && v.status !== 'resolved') {
      if (p.candidatePool) {
        var interest = S.constituency(s, rid).filter(function (m) { return m.active; })[0];
        var nominee = S.nominees(s, rid)[0];
        if (interest && nominee) S.apply(s, S.quote(s, rid, { action:'nominate',
          actor:{ kind:'constituency', realmId:rid, id:interest.id }, memberId:interest.id, characterId:nominee }));
      }
      var candidates = S.candidates(s, rid), chosen = null, best = -1;
      candidates.forEach(function (id) {
        var score = S.constituency(s, rid).reduce(function (n, m) { return n + (!response(s, rid, m, id, p.terms).reason ? m.weight : 0); }, 0);
        if (score > best || score === best && p.procedure && p.procedure.designation && tree(s, rid).designatedHeirId === id) { chosen = id; best = score; }
      });
      if (!chosen) {
        var t = tree(s, rid);
        v.status = Object.keys(t.members).some(function (id) { return eligible(s, rid, t.members[id], false, true); }) ? 'minority' : 'vacant';
        return false;
      }
      var q = S.quote(s, rid, { action:'negotiate', actor:actor, candidateId:chosen, terms:p.terms });
      if (q.allowed) S.apply(s, q);
      else if (q.reasonId === 'funds') S.constituency(s, rid).forEach(function (m) {
        var vote = S.quote(s, rid, { action:'support', actor:{ kind:'constituency', realmId:rid, id:m.id },
          memberId:m.id, candidateId:chosen, terms:p.terms });
        if (vote.allowed) S.apply(s, vote);
      });
      var accession = S.quote(s, rid, { action:'resolve', actor:actor });
      return accession.allowed && S.apply(s, accession);
    }
    if (!S.recognized(s, rid)) {
      var assent = S.quote(s, rid, { action:'assent', actor:actor, candidateId:tree(s, rid).rulerMemberId, terms:p.terms });
      return assent.allowed && S.apply(s, assent);
    }
    if (p.procedure && p.procedure.realmRecognition) return false;
    var missing = FB.realmHeldCounties(s, rid).filter(function (pid) {
      return !data.members.some(function (m) { return m.scope.kind === 'county' && m.scope.id === pid; });
    })[0];
    if (missing) {
      var invitation = S.quote(s, rid, { action:'enroll', actor:actor, provinceId:missing });
      return invitation.allowed && S.apply(s, invitation);
    }
    if (FB.realmHeldCounties(s, rid).some(function (pid) { return !S.recognized(s, rid, pid); })) {
      var localAssent = S.quote(s, rid, { action:'assent', actor:actor, candidateId:tree(s, rid).rulerMemberId, terms:p.terms });
      return localAssent.allowed && S.apply(s, localAssent);
    }
    return false;
  };
  S.profileFaults = function (p) {
    var faults = [];
    if (!keys(p, ['eligibility','candidatePool','procedure','tieBreak','consensus','quorum','negotiationCost','terms','reserved','members']) ||
        !keys(p.eligibility, ['minAge','sex','ancestry','officeId']) || !integer(p.eligibility.minAge, 16, 80) ||
        p.eligibility.ancestry !== undefined && typeof p.eligibility.ancestry !== 'boolean' ||
        p.eligibility.officeId !== undefined && !own(FBDATA.authorityOffices, p.eligibility.officeId) ||
        p.eligibility.sex !== undefined && ['m','f'].indexOf(p.eligibility.sex) < 0 ||
        ['seniority','identity'].indexOf(p.tieBreak) < 0 || !rate(p.consensus) || p.consensus <= 0.5 || !rate(p.quorum) || p.quorum <= 0 ||
        !integer(p.negotiationCost, 0, 1000000) || !terms(p.terms) || !unique(p.reserved) ||
        p.reserved.some(function (id) { return ['levy','war','treaty','grant','extraordinary_tax'].indexOf(id) < 0; }) ||
        !Array.isArray(p.members) || !p.members.length || p.members.length > MAX_MEMBERS) return [FB.T('Invalid selection profile.')];
    if (p.candidatePool !== undefined && (!keys(p.candidatePool, ['gentle','cultures','religions','excludedRoles']) ||
        p.eligibility.ancestry !== false || typeof p.candidatePool.gentle !== 'boolean' ||
        !unique(p.candidatePool.cultures) || p.candidatePool.cultures.some(function (id) { return !own(FBDATA.cultures, id); }) ||
        !unique(p.candidatePool.religions) || p.candidatePool.religions.some(function (id) { return !own(FBDATA.religions, id); }) ||
        !unique(p.candidatePool.excludedRoles) || !p.procedure)) faults.push(FB.T('Invalid elective candidate pool.'));
    if (p.procedure !== undefined && (!p.candidatePool || !keys(p.procedure, ['realmRecognition','designation','interimRevenue','defensiveLevy']) ||
        ['realmRecognition','designation','interimRevenue','defensiveLevy'].some(function (key) { return typeof p.procedure[key] !== 'boolean'; })))
      faults.push(FB.T('Invalid electoral procedure.'));
    var seen = {};
    p.members.forEach(function (m) {
      if (!keys(m, ['id','name','principal','scope','basis','weight','continuity','minimumSupport','minimumMartial','maximumLevy','maximumRevenue']) ||
          !/^[a-z][a-z0-9_]*$/.test(m.id || '') || seen[m.id] || typeof m.name !== 'string' ||
          ['senior_kin','capital_community','capital_elite','capital_clergy'].indexOf(m.principal) < 0 &&
            (!keys(m.principal, ['kind','id']) || ['character','institution'].indexOf(m.principal.kind) < 0 || typeof m.principal.id !== 'string') ||
          ['realm','capital'].indexOf(m.scope) < 0 || ['kin_recognition','community_assent','public_office'].indexOf(m.basis) < 0 ||
          ['capital_elite','capital_clergy'].indexOf(m.principal) >= 0 && (m.scope !== 'realm' || m.continuity !== 'institution') ||
          !integer(m.weight, 1, 10) || ['institution','vacant','senior_kin'].indexOf(m.continuity) < 0 ||
          typeof m.minimumSupport !== 'number' || !isFinite(m.minimumSupport) || m.minimumSupport < -100 || m.minimumSupport > 100 ||
          !integer(m.minimumMartial, 0, 100) || !rate(m.maximumLevy) || !rate(m.maximumRevenue)) faults.push(FB.T('Invalid constituency member.'));
      if (m) seen[m.id] = true;
    });
    return faults;
  };
  S.validate = function (s, rid, data) {
    function fail() { throw new Error(FB.T('Invalid government selection state for {realm}.', { realm:rid })); }
    if (data === undefined) return true;
    var t = tree(s, rid), def = FBDATA.governmentForms[data && data.profileId], p = def && def.selectionProfile;
    if (!keys(data, ['schema','profileId','originRealmId','roots','members','revision','vacancy','recognition','lastPeriod']) || data.schema !== 1 || !p || S.profileFaults(p).length || !t ||
        typeof data.originRealmId !== 'string' || data.originRealmId.length > 160 ||
        !(own(s.realms, data.originRealmId) || s.start && s.start.rulerRealmId === data.originRealmId) ||
        !integer(data.revision, 0, Number.MAX_SAFE_INTEGER) || !unique(data.roots) || !data.roots.length || data.roots.length > 16 ||
        data.roots.some(function (id) { return !own(t.members, id); }) ||
        !Array.isArray(data.members) || data.members.length < p.members.length || data.members.length > MAX_MEMBERS ||
        data.lastPeriod !== undefined && !integer(data.lastPeriod, -10000000, 10000000)) fail();
    var publicAccount = realm(s, rid).treasury;
    if (p.procedure && realm(s, rid).alive && (!publicAccount || publicAccount.version !== 1 || publicAccount.retired ||
        typeof publicAccount.gold !== 'number' || !isFinite(publicAccount.gold) ||
        typeof publicAccount.militaryAccrued !== 'number' || !isFinite(publicAccount.militaryAccrued) ||
        publicAccount.militaryAccrued < 0)) fail();
    var nominations = Object.keys(t.members).filter(function (id) { return t.members[id].role === 'electoral_candidate'; });
    if (nominations.filter(function (id) { return alive(s, t.members[id]); }).length > MAX_CANDIDATES || nominations.length && !p.candidatePool || nominations.some(function (id) {
      var m = t.members[id], c = s.chars[m.charId];
      if (!c) return m.alive !== false;
      return !c.royalLine || c.royalLine.realmId !== rid || c.royalLine.memberId !== id ||
        id !== 'royal_' + data.originRealmId + '_electoral_' + c.id || m.parentId !== null ||
        m.fatherId || m.motherId || m.born !== c.born || m.sex !== c.sex;
    })) fail();
    var ids = [], types = ['royal_member','character','county','institution'];
    function validPrincipal(at) {
      if (!keys(at, ['kind','id']) || typeof at.id !== 'string' || !at.id || at.id.length > 160 || types.indexOf(at.kind) < 0) return false;
      /* Recorded people can outlive character compaction. Only the current
         living principal can exercise the mandate, never a historic vote. */
      return at.kind === 'royal_member' ? own(t.members, at.id) : at.kind === 'character' ? true :
        at.kind === 'county' ? own(FB.world.byId, at.id) : own(FB.localInstitutionDefinitions(s), at.id);
    }
    data.members.forEach(function (m, i) {
      if (!plain(m) || !keys(m.scope, ['kind','id'])) fail();
      var d = p.members.filter(function (def) { return def.id === m.templateId; })[0];
      if (!d || !keys(m, ['id','templateId','principal','scope','basis','weight','continuity']) ||
          (i < p.members.length ? m.id !== p.members[i].id || m.templateId !== m.id :
            m.id !== 'local_' + m.scope.id || d.principal !== 'capital_community') || ids.indexOf(m.id) >= 0 ||
          !validPrincipal(m.principal) || !keys(m.scope, ['kind','id']) ||
          !(m.scope.kind === 'realm' && m.scope.id === rid || m.scope.kind === 'county' && own(FB.world.byId, m.scope.id)) ||
          d.principal === 'capital_community' && (m.scope.kind !== 'county' || m.principal.kind !== 'county' || m.principal.id !== m.scope.id) ||
          d.principal === 'senior_kin' && (m.principal.kind !== 'royal_member' || data.roots.indexOf(m.principal.id) < 0) ||
          plain(d.principal) && JSON.stringify(m.principal) !== JSON.stringify(d.principal) ||
          ['capital_elite','capital_clergy'].indexOf(d.principal) >= 0 &&
            (m.principal.kind !== 'institution' || m.scope.kind !== 'realm' ||
              !FB.localInstitutionDefinitions(s)[m.principal.id] ||
              FB.localInstitutionDefinitions(s)[m.principal.id].kind !== (d.principal === 'capital_elite' ? 'council' : 'congregation')) ||
          m.basis !== d.basis || m.weight !== d.weight || m.continuity !== d.continuity) fail();
      ids.push(m.id);
    });
    function knownCandidate(id) { return typeof id === 'string' && own(t.members, id); }
    var v = data.vacancy;
    if (v !== null) {
      if (!keys(v, ['generation','cause','openedTurn','status','candidates','support','accessionId']) ||
          !integer(v.generation, 1, generation(s, rid)) || !integer(v.openedTurn, 0, s.turn) ||
          ['death','abdication','lawful_removal'].indexOf(v.cause) < 0 ||
          ['selecting','contested','vacant','minority','resolved'].indexOf(v.status) < 0 || !unique(v.candidates) ||
          v.candidates.length > MAX_CANDIDATES || v.candidates.some(function (id) { return !knownCandidate(id); }) || !plain(v.support) ||
          Object.keys(v.support).some(function (id) { return ids.indexOf(id) < 0; }) ||
          (v.status === 'resolved' ? !knownCandidate(v.accessionId) || v.candidates.indexOf(v.accessionId) < 0 ||
            v.generation + 1 > generation(s, rid) : v.accessionId !== null || v.generation !== generation(s, rid))) fail();
      if (v.status === 'resolved' && v.generation + 1 === generation(s, rid) && v.accessionId !== t.rulerMemberId) fail();
      Object.keys(v.support).forEach(function (id) {
        var vote = v.support[id];
        if (!keys(vote, ['memberId','principal','candidateId','reason','terms']) || vote.memberId !== id ||
            vote.principal !== null && !validPrincipal(vote.principal) || vote.candidateId !== null &&
            (!knownCandidate(vote.candidateId) || v.candidates.indexOf(vote.candidateId) < 0) || !terms(vote.terms) ||
            [null,'principal_unavailable','ineligible','external_coercion','local_refusal','candidate_refusal','terms_refused'].indexOf(vote.reason) < 0 ||
            (vote.candidateId === null) !== (vote.reason !== null)) fail();
      });
    }
    var a = data.recognition;
    if (a !== null) {
      if (!keys(a, ['generation','memberId','scopes','terms','consents','principals']) ||
          !integer(a.generation, 1, generation(s, rid)) || !knownCandidate(a.memberId) || !unique(a.scopes) ||
          a.scopes.length > MAX_MEMBERS || a.scopes.some(function (id) { return !own(FB.world.byId, id); }) || !terms(a.terms) ||
          !unique(a.consents) || a.consents.some(function (id) { return ids.indexOf(id) < 0; }) ||
          !Array.isArray(a.principals) || a.principals.length !== a.consents.length ||
          a.principals.some(function (who, i) { return !keys(who, ['id','principal']) || who.id !== a.consents[i] || !validPrincipal(who.principal); })) fail();
    }
    return true;
  };
  /* Adapters share the review boundary, not an incumbent store. Later forms
     can register an owner without making a competing election or office. */
  var sources = Object.create(null);
  S.registerSource = function (id, adapter) {
    if (typeof id !== 'string' || sources[id] || !adapter || typeof adapter.quote !== 'function' || typeof adapter.apply !== 'function')
      throw new Error('Invalid government selection adapter');
    sources[id] = adapter;
  };
  S.reviewSource = function (s, id, request) {
    if (!sources[id]) return null;
    return { source:id, request:copy(request || {}), review:copy(sources[id].quote(s, request || {})) };
  };
  S.commitSource = function (s, review) {
    if (!review || !sources[review.source]) return false;
    var fresh = S.reviewSource(s, review.source, review.request);
    if (!fresh.review || !fresh.review.allowed || JSON.stringify(fresh) !== JSON.stringify(review)) return false;
    return sources[review.source].apply(s, fresh.request, fresh.review);
  };
  S.registerSource('elective_crown', {
    quote:function (s, request) { return S.quote(s, request.realmId, request.decision); },
    apply:function (s, request, review) { return S.apply(s, review); }
  });
  S.registerSource('civic_election', {
    quote:function (s, request) {
      var active = FB.activeElection(s), forecast = active && FB.electionForecast(s, active);
      return { allowed:!!active && active.id === request.electionId && !!active.tacticId,
        election:active ? copy(active) : null, forecast:forecast, turn:s.turn };
    },
    apply:function (s) { return FB.resolveElection(s); }
  });
  S.registerSource('administrative_appointment', {
    quote:function (s, request) { return FB.officeAppointmentQuote(s, request.actor, request.terms); },
    apply:function (s, request, review) { return FB.officeSeekAppointment(s, review); }
  });
  S.registerSource('religious_office_result', {
    quote:function (s, request) {
      var holder = FB.religiousOfficeSnapshot(s, request.officeId);
      return { allowed:!!holder, officeId:request.officeId || null,
        holder:holder ? { kind:s.chars[holder.id] === holder ? 'character' : 'realm', id:holder.id } : null,
        generation:holder && s.realms[holder.id] === holder ? generation(s, holder.id) : null };
    },
    /* Acknowledging a canonical result never appoints another religious head. */
    apply:function (s, request, review) { return copy(review.holder); }
  });
})();
