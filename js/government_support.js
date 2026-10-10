/* Shared constituency, review and mandate contract. No historical ids or
   rendered prose live in this ledger. Reads never initialize institutions. */
(function () {
  'use strict';
  var C = FB.governments.support = {};
  var LIMIT = 12, MAX_MEMBERS = 16, MAX_CANDIDATES = 16;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function keys(v, allowed) { return plain(v) && Object.keys(v).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function person(s, id) { var c = s.chars && s.chars[id]; return c && !c.dead ? c : null; }
  C.row = function (s, rid) { return s && s.governmentSupport && s.governmentSupport.polities[rid] || null; };
  C.profile = function (s, rid) { var r = C.row(s, rid); return r && FBDATA.constituencyProfiles[r.profileId] || null; };
  C.isDelegated = function (s, rid) {
    var form = FB.governments.forRealm(s, rid);
    return !!(form && form.use.succession.delegatedLeadership);
  };
  C.members = function (s, rid) {
    var r = C.row(s, rid);
    return r ? r.members.filter(function (m) {
      if (m.principal.kind === 'character') return !!person(s, m.principal.id);
      return r.scopes.indexOf(m.principal.id) >= 0;
    }).map(copy) : [];
  };
  C.delegate = function (s, rid) {
    var r = C.row(s, rid), p = C.profile(s, rid), m = r && r.mandate;
    return C.isDelegated(s, rid) && p && m && C.members(s, rid).length === r.members.length && m.status === 'active' && (m.endTurn === null || s.turn < m.endTurn) &&
      C.eligible(s, rid, m.delegateId).allowed ? person(s, m.delegateId) : null;
  };
  C.eligible = function (s, rid, cid) {
    var r = C.row(s, rid), p = C.profile(s, rid), c = person(s, cid), reason = null;
    if (!r || !p || !c) reason = 'missing_person';
    else if (r.scopes.indexOf(cid === s.player.charId ? s.player.provinceId : c.homeProvinceId) < 0) reason = 'not_local';
    else if (s.date.year - c.born < p.eligibility.minAge) reason = 'minor';
    else if (p.eligibility.free && (c.unfree || cid === s.player.charId && FB.station.isSerf(s.player, s))) reason = 'not_free';
    else if ((Number(c.career && c.career.experience) || 0) < p.eligibility.minServiceYears) reason = 'service';
    else if (Object.keys(p.eligibility.skills).some(function (k) {
      return (FB.skillSnapshot ? FB.skillSnapshot(s, c, k) : Number(c.skills && c.skills[k]) || 0) < p.eligibility.skills[k];
    })) reason = 'skills';
    return { allowed:!reason, reason:reason, facts:c && p ? {
      born:c.born, home:cid === s.player.charId ? s.player.provinceId : c.homeProvinceId,
      unfree:!!c.unfree, service:Number(c.career && c.career.experience) || 0,
      skills:Object.keys(p.eligibility.skills).map(function (k) { return [k, FB.skillSnapshot ? FB.skillSnapshot(s, c, k) : Number(c.skills && c.skills[k]) || 0]; })
    } : null };
  };
  C.candidates = function (s, rid) {
    return Object.keys(s.chars || {}).filter(function (id) { return C.eligible(s, rid, id).allowed; }).sort().slice(0, MAX_CANDIDATES);
  };
  function treasury(s, rid, cid) {
    return cid === s.player.charId ? Math.max(0, Number(s.player.gold) || 0) : FB.treasuryAvailable(s, rid);
  }
  function stamp(s, rid) {
    var r = C.row(s, rid), realm = s.realms[rid];
    return r && { turn:s.turn, revision:r.revision, generation:FB.realmRulerGeneration(s, rid),
      alive:!!(realm && realm.alive), profile:copy(C.profile(s, rid)), members:C.members(s, rid),
      mandate:copy(r.mandate), selection:copy(r.selection),
      occupation:r.scopes.map(function (pid) { return { id:pid, owner:s.owner[pid], holder:s.holder[pid] }; }) };
  }
  function archive(r, outcome) { r.history.push(outcome); if (r.history.length > LIMIT) r.history.shift(); }
  function next(r, kind) { r.serial++; return r.id + ':' + kind + ':' + r.serial; }
  C.validRecordId = function (r, id, kind) {
    var prefix = r.id + ':' + kind + ':', suffix = typeof id === 'string' && id.indexOf(prefix) === 0 ? id.slice(prefix.length) : '';
    return /^[1-9][0-9]*$/.test(suffix) && Number.isSafeInteger(Number(suffix)) && Number(suffix) <= r.serial;
  };
  C.openVacancy = function (s, rid, cause) {
    var r = C.row(s, rid);
    if (!r || !C.isDelegated(s, rid) || ['opening','death','resign','recall','term_end','ineligible','repair'].indexOf(cause) < 0 ||
        r.selection && r.selection.status === 'open') return false;
    if (r.mandate && r.mandate.status === 'active') r.mandate.status = 'ended';
    r.selection = { id:next(r, 'selection'), cause:cause,
      openingGeneration:FB.realmRulerGeneration(s, rid), nominations:[], votes:{}, status:'open', resolvedId:null };
    r.decisions = [];
    r.revision++;
    return true;
  };
  C.quote = function (s, rid, action, terms) {
    var r = C.row(s, rid), p = C.profile(s, rid), reason = null, cost = 0, selected = null;
    terms = copy(terms || {});
    if (!r || !p || !s.realms[rid] || !s.realms[rid].alive || !C.isDelegated(s, rid)) return null;
    var members = C.members(s, rid), selection = r.selection;
    if (!members.length || members.length !== r.members.length) reason = 'constituency_unresolved';
    else if (r.scopes.some(function (pid) { return s.owner[pid] !== rid || s.holder[pid] !== rid; }) && action !== 'repair_member') reason = 'occupied';
    if (action === 'nominate') {
      cost = p.selection.nominationCost;
      if (!selection || selection.status !== 'open') reason = reason || 'no_vacancy';
      else if (selection.nominations.length >= MAX_CANDIDATES || selection.nominations.indexOf(terms.candidateId) >= 0) reason = reason || 'already_nominated';
      reason = reason || C.eligible(s, rid, terms.candidateId).reason;
      if (treasury(s, rid, terms.candidateId) < cost + (cost && terms.candidateId !== s.player.charId ? p.obligations.reserve : 0)) reason = reason || 'funds';
    } else if (action === 'recognize') {
      if (!selection || selection.status !== 'open') reason = reason || 'no_vacancy';
      else if (!members.some(function (m) { return m.id === terms.memberId; }) ||
          terms.candidateId !== null && (selection.nominations.indexOf(terms.candidateId) < 0 || !C.eligible(s, rid, terms.candidateId).allowed)) reason = reason || 'invalid_vote';
    } else if (action === 'select') {
      if (!selection || selection.status !== 'open') reason = reason || 'no_vacancy';
      else {
        var total = members.reduce(function (n, m) { return n + m.weight; }, 0);
        var scored = selection.nominations.filter(function (id) { return C.eligible(s, rid, id).allowed; }).map(function (id) {
          return { id:id, weight:members.reduce(function (n, m) { return n + (selection.votes[m.id] === id ? m.weight : 0); }, 0) };
        }).sort(function (a, b) { return b.weight - a.weight || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
        selected = scored.length && scored[0].weight >= total * p.selection.threshold ? scored[0].id : null;
        if (!selected) reason = reason || 'withheld';
      }
    } else if (action === 'resign') {
      if (!C.delegate(s, rid) || terms.delegateId !== r.mandate.delegateId) reason = reason || 'no_mandate';
    } else if (action === 'recall') {
      if (!r.mandate || r.mandate.status !== 'active') reason = reason || 'no_mandate';
      else if (p.recall.reasons.indexOf(terms.reason) < 0 || terms.reason === 'ineligible' && C.eligible(s, rid, r.mandate.delegateId).allowed ||
          terms.reason === 'overreach' && !r.overreach || terms.reason === 'neglect' && !r.scopes.some(function (pid) { return FB.countyPopularSupport(s, pid) < -35; })) reason = reason || 'unjustified';
      var approved = members.reduce(function (n, m) { return n + ((terms.members || []).indexOf(m.id) >= 0 ? m.weight : 0); }, 0);
      if (approved < members.reduce(function (n, m) { return n + m.weight; }, 0) * p.recall.threshold) reason = reason || 'withheld';
    } else if (action === 'repair_member') {
      var missing = r.members.filter(function (m) { return m.id === terms.memberId; })[0];
      if (!missing || missing.continuity !== 'institution' || missing.principal.kind !== 'character' ||
          person(s, missing.principal.id)) reason = reason || 'not_repairable';
      else reason = reason === 'constituency_unresolved' ? null : reason;
    } else reason = reason || 'unsupported';
    return { realmId:rid, action:action, terms:terms, stamp:stamp(s, rid), cost:cost,
      funds:action === 'nominate' ? treasury(s, rid, terms.candidateId) : null,
      eligibility:action === 'nominate' ? C.eligible(s, rid, terms.candidateId) :
        action === 'select' && selection ? selection.nominations.map(function (id) { return [id, C.eligible(s, rid, id)]; }) : null,
      selectedId:selected, allowed:!reason, reason:reason };
  };
  function install(s, rid, cid, selectionId) {
    var r = C.row(s, rid), p = C.profile(s, rid), c = person(s, cid), realm = s.realms[rid];
    var generation = FB.realmRulerGeneration(s, rid) + 1;
    r.mandate = { id:next(r, 'mandate'), delegateId:cid, generation:generation, startTurn:s.turn,
      endTurn:p.selection.termDays === null ? null : s.turn + p.selection.termDays, status:'active' };
    realm.ruler = { name:c.name, sex:c.sex, culture:c.culture, born:c.born, age:s.date.year - c.born,
      mar:Number(c.skills.mar) || 0, generation:generation };
    if (r.selection) { r.selection.status = 'resolved'; r.selection.resolvedId = r.mandate.id; }
    archive(r, { id:selectionId, result:'selected', delegateId:cid, mandateId:r.mandate.id, turn:s.turn });
    r.decisions = []; r.overreach = false; r.revision++;
    FB.governments.invalidate();
    if (FB.rebuildRulerIndex) FB.rebuildRulerIndex(s);
    if (s.player.charId) FB.news(s, FB.msg('news.community.delegate', '{name} receives a local mandate in {realm}.',
      { name:c.name, realm:FB.realmNameParam(s, rid) }));
  }
  C.apply = function (s, reviewed) {
    if (!reviewed) return false;
    var fresh = C.quote(s, reviewed.realmId, reviewed.action, reviewed.terms);
    if (!fresh || !fresh.allowed || !equal(fresh, reviewed)) return false;
    var rid = fresh.realmId, r = C.row(s, rid), t = fresh.terms;
    if (fresh.action === 'nominate') {
      if (fresh.cost && (t.candidateId === s.player.charId
        ? !(s.player.gold >= fresh.cost) : !FB.treasurySpend(s, rid, fresh.cost))) return false;
      if (t.candidateId === s.player.charId) s.player.gold -= fresh.cost;
      r.selection.nominations.push(t.candidateId);
    } else if (fresh.action === 'recognize') r.selection.votes[t.memberId] = t.candidateId;
    else if (fresh.action === 'select') { install(s, rid, fresh.selectedId, r.selection.id); return true; }
    else if (fresh.action === 'recall' || fresh.action === 'resign') {
      archive(r, { id:next(r, 'replacement'), result:fresh.action, delegateId:r.mandate.delegateId, turn:s.turn });
      return C.openVacancy(s, rid, fresh.action);
    } else if (fresh.action === 'repair_member') {
      var m = r.members.filter(function (m) { return m.id === t.memberId; })[0];
      m.principal = { kind:'county', id:m.scope[0] };
      if (r.selection && r.selection.status === 'open') delete r.selection.votes[m.id];
    }
    r.revision++;
    return true;
  };
  C.initialize = function (s, definitions) {
    definitions.forEach(function (d) {
      if (!d.constituency || C.row(s, d.id)) return;
      var p = FBDATA.constituencyProfiles[d.constituency];
      if (!p || !C.isDelegated(s, d.id)) throw new Error('Invalid constituency declaration');
      if (!s.governmentSupport) s.governmentSupport = { schema:1, polities:{} };
      var scopes = FB.realmHeldCounties(s, d.id).slice();
      var r = s.governmentSupport.polities[d.id] = { id:d.id, profileId:d.constituency, scopes:scopes,
        serial:0, revision:0, mandate:null, selection:null, decisions:[], history:[], overreach:false,
        dues:null, members:p.members.map(function (m) { return { id:m.id, principal:{ kind:'county', id:scopes[0] },
          scope:scopes.slice(), basis:m.basis, weight:m.weight, continuity:m.continuity }; }), agreements:[] };
      C.openVacancy(s, d.id, 'opening');
      var seed = d.representative || {}, cap = FB.world.byId[scopes[0]];
      var c = FB.makeCharacter(s, { name:seed.name, sex:seed.sex || 'm', culture:cap.culture,
        religion:cap.religion, born:seed.born || s.date.year - Math.max(30, p.eligibility.minAge), quality:1, station:1, traitsN:1 });
      c.homeProvinceId = scopes[0];
      Object.keys(p.eligibility.skills).forEach(function (k) { c.skills[k] = p.eligibility.skills[k]; });
      Object.keys(seed.skills || {}).forEach(function (k) { c.skills[k] = seed.skills[k]; });
      if (p.eligibility.minServiceYears) {
        FB.careerOf(s, c).experience = p.eligibility.minServiceYears;
      }
      Object.keys(p.eligibility.skills).forEach(function (k) {
        c.skills[k] += Math.max(0, p.eligibility.skills[k] - FB.skillSnapshot(s, c, k));
      });
      if (!C.eligible(s, d.id, c.id).allowed) throw new Error('Ineligible opening representative');
      r.selection.nominations.push(c.id);
      r.members.forEach(function (m) { r.selection.votes[m.id] = c.id; });
      C.apply(s, C.quote(s, d.id, 'select', {}));
      // Two ordinary local residents provide continuity without an eligible
      // dynasty. Their qualifications are authored local service, not descent.
      for (var i = 0; i < 2; i++) {
        var neighbor = FB.makeCharacter(s, { culture:cap.culture, religion:cap.religion,
          born:s.date.year - Math.max(24, p.eligibility.minAge) - i * 6, quality:1, station:1, traitsN:1 });
        neighbor.homeProvinceId = scopes[0];
        Object.keys(p.eligibility.skills).forEach(function (k) { neighbor.skills[k] = p.eligibility.skills[k]; });
        if (p.eligibility.minServiceYears) {
          FB.careerOf(s, neighbor).experience = p.eligibility.minServiceYears;
        }
        Object.keys(p.eligibility.skills).forEach(function (k) {
          neighbor.skills[k] += Math.max(0, p.eligibility.skills[k] - FB.skillSnapshot(s, neighbor, k));
        });
      }
    });
  };
  C.referencesCharacter = function (s, cid) {
    if (!s || !cid) return false;
    return Object.keys(s.governmentSupport && s.governmentSupport.polities || {}).some(function (rid) {
      var r = C.row(s, rid);
      return r.mandate && r.mandate.status === 'active' && r.mandate.delegateId === cid ||
        r.selection && r.selection.status === 'open' && r.selection.nominations.indexOf(cid) >= 0 ||
        r.members.some(function (m) { return m.principal.kind === 'character' && m.principal.id === cid; });
    });
  };
  C.validate = function (s) {
    var root = s.governmentSupport;
    if (root === undefined) return true;
    function fault() { throw new Error(FB.T('Invalid constituency or mandate in this save.')); }
    function int(n) { return Number.isSafeInteger(n) && n >= 0; }
    if (!keys(root, ['schema','polities']) || root.schema !== 1 || !plain(root.polities)) fault();
    var bookmark = FB.campaignBookmark(s);
    if (!bookmark || !s.realms || !s.chars || !s.owner || !s.holder) fault();
    Object.keys(root.polities).forEach(function (rid) {
      var r = root.polities[rid], p = r && FBDATA.constituencyProfiles[r.profileId];
      var savedForm = s.authority && s.authority.governments && s.authority.governments[rid];
      var form = FBDATA.governmentForms[savedForm && savedForm.formId || s.start.defaultGovernment];
      var succession = form && FB.governments.strategy('succession', form.succession);
      if (!keys(r, ['id','profileId','scopes','serial','revision','mandate','selection','decisions','history','overreach','members','agreements','dues']) ||
          r.id !== rid || !s.realms[rid] || !p || !int(r.serial) || !int(r.revision) ||
          !Array.isArray(r.scopes) || !r.scopes.length || new Set(r.scopes).size !== r.scopes.length ||
          !r.scopes.every(function (pid) { return typeof pid === 'string' && (bookmark.provinces || []).some(function (q) { return q.id === pid; }) &&
            (!(succession && succession.delegatedLeadership) || s.holder[pid] === rid) && !!s.realms[s.owner[pid]]; }) ||
          !Array.isArray(r.members) || !r.members.length || r.members.length > MAX_MEMBERS ||
          !Array.isArray(r.history) || r.history.length > LIMIT || !Array.isArray(r.decisions) || r.decisions.length > LIMIT ||
          !Array.isArray(r.agreements) || r.agreements.length > LIMIT || typeof r.overreach !== 'boolean') fault();
      var ids = {};
      function recordId(id, kind) {
        var prefix = rid + ':' + kind + ':', suffix = typeof id === 'string' && id.indexOf(prefix) === 0 ? id.slice(prefix.length) : '';
        return /^[1-9][0-9]*$/.test(suffix) && int(Number(suffix)) && Number(suffix) <= r.serial;
      }
      r.members.forEach(function (m) {
        if (!keys(m, ['id','principal','scope','basis','weight','continuity']) || typeof m.id !== 'string' || !m.id || ids[m.id] ||
            !p.members.some(function (d) { return d.id === m.id; }) || !keys(m.principal, ['kind','id']) ||
            ['county','character'].indexOf(m.principal.kind) < 0 ||
            (m.principal.kind === 'county' ? r.scopes.indexOf(m.principal.id) < 0 : !s.chars[m.principal.id]) ||
            !Number.isInteger(m.weight) || m.weight < 1 || m.weight > 10 ||
            ['custom','service'].indexOf(m.basis) < 0 || ['institution','person'].indexOf(m.continuity) < 0 ||
            !Array.isArray(m.scope) || !m.scope.length || new Set(m.scope).size !== m.scope.length ||
            m.scope.some(function (pid) { return r.scopes.indexOf(pid) < 0; })) fault();
        ids[m.id] = true;
      });
      if (r.mandate !== null) {
        var m = r.mandate;
        if (!keys(m, ['id','delegateId','generation','startTurn','endTurn','status']) || !recordId(m.id, 'mandate') || !int(m.generation) || !m.generation || !int(m.startTurn) || m.startTurn > s.turn ||
            ['active','ended'].indexOf(m.status) < 0 || typeof m.delegateId !== 'string' ||
            m.status === 'active' && !s.chars[m.delegateId] ||
            m.endTurn !== null && (!int(m.endTurn) || m.endTurn <= m.startTurn) ||
            (p.selection.termDays === null ? m.endTurn !== null : m.endTurn !== m.startTurn + p.selection.termDays) ||
            m.status === 'active' && m.generation !== FB.realmRulerGeneration(s, rid)) fault();
      }
      if (r.selection !== null) {
        var v = r.selection;
        if (!keys(v, ['id','cause','openingGeneration','nominations','votes','status','resolvedId']) || !recordId(v.id, 'selection') || !int(v.openingGeneration) ||
            ['opening','death','resign','recall','term_end','ineligible','repair'].indexOf(v.cause) < 0 ||
            ['open','resolved'].indexOf(v.status) < 0 || !Array.isArray(v.nominations) || v.nominations.length > MAX_CANDIDATES ||
            new Set(v.nominations).size !== v.nominations.length || v.nominations.some(function (id) { return typeof id !== 'string' || !id; }) || !plain(v.votes) ||
            v.status === 'open' && v.nominations.some(function (id) { return !s.chars[id]; }) ||
            Object.keys(v.votes).some(function (id) { return !ids[id] || v.votes[id] !== null && v.nominations.indexOf(v.votes[id]) < 0; }) ||
            v.status === 'open' && (v.resolvedId !== null || r.mandate && r.mandate.status === 'active' || v.openingGeneration !== FB.realmRulerGeneration(s, rid)) ||
            v.status === 'resolved' && (!r.mandate || v.resolvedId !== r.mandate.id || v.openingGeneration + 1 !== r.mandate.generation)) fault();
      }
      if (r.mandate && r.mandate.status === 'active' && (!r.selection || r.selection.status !== 'resolved')) fault();
      if (r.dues !== null) {
        var d = r.dues;
        if (!keys(d, ['id','amount','startTurn','endTurn','mandateId']) || !recordId(d.id, 'dues') ||
            !Number.isFinite(d.amount) || d.amount <= 0 || d.amount > p.obligations.maxDues || !int(d.startTurn) || d.startTurn > s.turn ||
            !int(d.endTurn) || d.endTurn <= d.startTurn || d.endTurn - d.startTurn > 360 || !recordId(d.mandateId, 'mandate')) fault();
      }
      C.validateDecisions(s, rid, fault);
    });
    return true;
  };
  C.validateProfiles = function (table) {
    var errors = [];
    table = table || FBDATA.constituencyProfiles;
    Object.keys(table || {}).forEach(function (id) {
      var p = table[id], e = p && p.eligibility, v = p && p.selection, o = p && p.obligations;
      if (!/^[a-z][a-z0-9_]*$/.test(id) || !plain(p) || Object.keys(p).some(function (k) {
        return ['eligibility','selection','recall','obligations','reserved','powers','members'].indexOf(k) < 0;
      }) || !keys(e, ['minAge','minServiceYears','skills','free']) || !Number.isInteger(e.minAge) || e.minAge < 16 || e.minAge > 60 ||
          !Number.isFinite(e.minServiceYears) || e.minServiceYears < 0 || e.minServiceYears > 20 || typeof e.free !== 'boolean' ||
          !plain(e.skills) || Object.keys(e.skills).some(function (k) { return FB.SKILLS.indexOf(k) < 0 ||
            !Number.isFinite(e.skills[k]) || e.skills[k] < 0 || e.skills[k] > 20; }) ||
          !keys(v, ['threshold','tie','termDays','nominationCost']) || !Number.isFinite(v.threshold) || !(v.threshold > 0 && v.threshold <= 1) || v.tie !== 'id' ||
          v.termDays !== null && (!Number.isInteger(v.termDays) || v.termDays < 90 || v.termDays > 7200) ||
          !Number.isFinite(v.nominationCost) || v.nominationCost < 0 || v.nominationCost > 100 ||
          !plain(o) || Object.keys(o).some(function (k) { return ['revenueRate','levyRate','maxDues','maxLevy','reserve'].indexOf(k) < 0; }) || ['revenueRate','levyRate'].some(function (k) { return !Number.isFinite(o[k]) || o[k] < 0 || o[k] > 1; }) ||
          ['maxDues','maxLevy','reserve'].some(function (k) { return !Number.isFinite(o[k]) || o[k] < 0 || o[k] > 10000; }) ||
          !keys(p.recall, ['threshold','reasons']) || !Number.isFinite(p.recall.threshold) || !(p.recall.threshold > 0 && p.recall.threshold <= 1) || !Array.isArray(p.recall.reasons) ||
          !p.recall.reasons.length || new Set(p.recall.reasons).size !== p.recall.reasons.length ||
          p.recall.reasons.some(function (k) { return ['neglect','overreach','ineligible'].indexOf(k) < 0; }) ||
          !Array.isArray(p.powers) || new Set(p.powers).size !== p.powers.length || p.powers.some(function (k) { return ['ban','peace','revenue'].indexOf(k) < 0; }) ||
          !Array.isArray(p.reserved) || new Set(p.reserved).size !== p.reserved.length || p.reserved.some(function (k) { return ['war','treaty','grant','extraordinary_tax','pledge','conversion'].indexOf(k) < 0; }) ||
          !Array.isArray(p.members) || !p.members.length || p.members.length > MAX_MEMBERS ||
          p.members.some(function (m, i) { return !keys(m, ['id','name','weight','basis','continuity','support']) || typeof m.id !== 'string' || !m.id || typeof m.name !== 'string' || !m.name ||
            p.members.some(function (q, j) { return j < i && m.id === q.id; }) || !Number.isInteger(m.weight) || m.weight < 1 || m.weight > 10 ||
            ['custom','service'].indexOf(m.basis) < 0 || ['institution','person'].indexOf(m.continuity) < 0 ||
            !Number.isFinite(m.support) || m.support < 0 || m.support > 100; }))
        errors.push(FB.T('Invalid constituency policy {id}.', { id:id }));
    });
    return errors;
  };
  var validateGovernments = FB.governments.validate;
  FB.governments.validate = function () { return validateGovernments().concat(C.validateProfiles()); };
  C.definitionFaults = function (d, formId, year, provinces) {
    var form = FB.governments.resolve(formId), delegated = form.use.succession.delegatedLeadership;
    if (!delegated && d.constituency === undefined && d.representative === undefined) return [];
    var p = FBDATA.constituencyProfiles[d.constituency], errors = [];
    if (!delegated || !p || d.liege || !provinces.some(function (q) { return q.realm === d.id && !q.wasteland; }))
      errors.push('invalid local constituency or territory');
    var c = d.representative;
    if (c !== undefined && (!keys(c, ['name','sex','born','skills']) ||
        c.name !== undefined && (typeof c.name !== 'string' || !c.name) ||
        c.sex !== undefined && ['m','f'].indexOf(c.sex) < 0 ||
        c.born !== undefined && (!Number.isInteger(c.born) || c.born > year - (p ? p.eligibility.minAge : 18) || c.born < year - 100) ||
        c.skills !== undefined && (!plain(c.skills) || Object.keys(c.skills).some(function (k) {
          return FB.SKILLS.indexOf(k) < 0 || !Number.isFinite(c.skills[k]) || c.skills[k] < 0 || c.skills[k] > 20 ||
            p && c.skills[k] < (p.eligibility.skills[k] || 0);
        })))) errors.push('invalid opening representative');
    return errors;
  };
})();
