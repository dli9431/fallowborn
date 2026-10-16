/* Public offices and source-backed remuneration. No second holder, economy,
   scheduler or religious succession ledger. Loaded after dispatch adapters. */
(function () {
  'use strict';
  var G = FB.governments, Q = FB.political, R = FB.governmentRecognition;
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function rows(s) { return s.authority && s.authority.appointments || []; }
  function saved(s, rid) { return s.authority && s.authority.governments && s.authority.governments[rid]; }
  function same(a, b) { return !!a && !!b && a.kind === b.kind && a.id === b.id; }
  function period(s) { return Math.floor(s.turn / 90); }
  function ruler(s, rid) { return rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s, rid); }
  function courtActor(s, actor, rid) {
    var c = ruler(s, rid);
    return !!Q.actor(s, actor) && (actor.kind === 'realm' && actor.id === rid ||
      actor.kind === 'character' && c && c.id === actor.id);
  }
  function spend(s, rid, amount) {
    return rid === 'player' ? FB.treasuryTransfer(s, rid, null, amount) : FB.treasurySpend(s, rid, amount);
  }
  FB.administrationProfile = function (s, rid) {
    var government = G.forRealm(s, rid), row = saved(s, rid);
    var definition = government && FBDATA.governmentForms[government.id];
    var id = definition && definition.administrationProfileId &&
      (row && row.administrationProfileId || definition.administrationProfileId);
    return id && FBDATA.administrationProfiles[id] || null;
  };
  FB.publicAdministrationSeed = function (s, declarations) {
    declarations.forEach(function (realm) {
      var formId = realm.government || s.start && s.start.defaultGovernment;
      var form = FBDATA.governmentForms[formId];
      if (!form || !form.administrationProfileId) return;
      var id = realm.administrationProfileId || form.administrationProfileId;
      if (!own(FBDATA.administrationProfiles, id)) throw new Error('Unknown administration profile ' + id);
      if (!s.authority) s.authority = { nextId:1, appointments:[], recognitions:[], contracts:[], rights:[], receipts:[], governments:{} };
      if (!s.authority.governments[realm.id]) s.authority.governments[realm.id] = { formId:formId, sinceTurn:s.turn };
      s.authority.governments[realm.id].administrationProfileId = id;
    });
  };
  FB.publicAdministrationReferencesCharacter = function (s,cid) {
    if (rows(s).some(function (row) { return row.publicTerms && row.holder.id === cid; })) return true;
    return Object.keys(s.authority && s.authority.governments || {}).some(function (rid) {
      var row = saved(s,rid), tree = s.realms[rid] && s.realms[rid].succession;
      var ids = (tree && tree.publicCandidateIds || []).slice();
      if (row.lastAccession) ids.push(row.lastAccession.memberId);
      return Object.keys(row.recognition || {}).some(function (id) {
        var vote = row.recognition[id];
        ids.push(vote.candidateId);
        return vote.principal.kind === 'character' && vote.principal.id === cid;
      }) || ids.some(function (id) { var m = R.candidateMember(s,rid,id); return m && (rid === 'player' ? m.id : m.charId) === cid; });
    });
  };
  // Re-key the institution, never its household property or personal genealogy.
  FB.publicAdministrationRekey = function (s,from,to) {
    if (!FB.administrationProfile(s,from)) return false;
    var row = saved(s,from);
    s.authority.governments[to] = row;
    delete s.authority.governments[from];
    row.recognition = {};
    delete row.lastAccession;
    rows(s).forEach(function (office) {
      if (!office.publicTerms || office.institutionId !== from) return;
      office.institutionId = to;
      if (office.appointer && office.appointer.kind === 'realm' && office.appointer.id === from) office.appointer.id = to;
    });
    return true;
  };
  FB.publicPlayerHouseholdSuccession = function (s,heir,cause) {
    if (!FB.administrationProfile(s,'player')) return;
    var q = R.accessionQuote(s,'player',cause), row = saved(s,'player');
    if (!q.allowed && cause === 'abdication') return false;
    if (q.allowed && q.memberId === heir.id) {
      row.recognition = {};
      delete row.publicVacancy;
      delete s.realms.player.succession.designatedHeirId;
      row.lastAccession = {generation:q.rulerGeneration,memberId:heir.id,cause:cause,turn:s.turn,minor:q.minor};
      return;
    }
    var successor = q.allowed ? s.chars[q.memberId] : s.chars[s.player.charId];
    var realm = FB.abdicatePlayerRealmToHeir(s,successor,{publicVacancy:!q.allowed,cause:cause});
    if (!realm) throw new Error('Public crown transfer failed');
    s.player.provs = [];
    FB.setPlayerTier(s,2,{attachLiege:false});
    FB.changePlayerLiege(s,realm.id,'public:household_succession');
  };
  FB.publicAppointmentEffective = function (s, row) {
    var terms = row && row.publicTerms, profile = row && FB.administrationProfile(s, row.institutionId);
    var hereditary = FB.aristocracy && FB.aristocracy.assignment(s, row);
    if (!terms || !profile || row.status !== 'active' || row.endTurn !== null && row.endTurn <= s.turn ||
        !s.chars[row.holder.id] || s.chars[row.holder.id].dead || s.chars[row.holder.id].unfree ||
        FB.justiceCustodyOf(s, row.holder.id) || !hereditary && profile.offices.indexOf(row.officeId) < 0 ||
        terms.confirmation === 'reaffirm' && row.appointerGeneration !== FB.realmRulerGeneration(s, row.institutionId)) return false;
    var realm = s.realms[row.institutionId], pid = terms.source.provinceId;
    if (!realm || !realm.alive || (s.holder[pid] || s.owner[pid]) !== row.institutionId) return false;
    if (row.scope.kind === 'county') return row.scope.id === pid;
    return (s.armies || []).some(function (army) { return army.id === row.scope.id && army.realm === row.institutionId && army.men > 0; });
  };
  function stateName(s, row) {
    if (row.status !== 'active') return row.status;
    if (row.publicTerms.confirmation === 'reaffirm' &&
        row.appointerGeneration !== FB.realmRulerGeneration(s, row.institutionId)) return 'contested';
    return FB.publicAppointmentEffective(s, row) ? 'active' : 'expired';
  }
  FB.publicOfficeRows = function (s, rid) {
    return rows(s).filter(function (row) { return row.publicTerms && row.institutionId === rid; }).map(function (row) {
      return Object.assign(copy(row), { effective:FB.publicAppointmentEffective(s, row), status:stateName(s, row),
        role:FBDATA.authorityOffices[row.officeId].publicRole });
    });
  };
  FB.publicCountyIncome = function (s, rid, pid, context) {
    if (!pid || !FB.world.byId[pid] || (s.holder[pid] || s.owner[pid]) !== rid) return 0;
    var total = 0;
    context = context || {};
    for (var slot = 0, n = FB.settlementVisibleCount(s, pid); slot < n; slot++) {
      var fiscal = FB.settlementFiscalProjection(s, pid, slot, context);
      if (!fiscal) continue;
      var holder = fiscal.holder;
      var belongs = holder.kind === 'realm' && holder.id === rid || holder.kind === 'character' &&
        (rid === 'player' && holder.id === s.player.charId || FB.realmIdForRulerCharacter(s, holder.id) === rid);
      total += belongs ? fiscal.amounts.tax + fiscal.amounts.tolls + fiscal.amounts.national : fiscal.amounts.dues;
    }
    return Math.max(0, total);
  };
  FB.publicOfficeAssessment = function (s, row, context) {
    var t = row.publicTerms, gross = FB.publicCountyIncome(s, row.institutionId, t.source.provinceId, context);
    var amount = t.kind === 'salary' ? Math.min(t.salary, gross * t.share) : gross * t.share;
    return { gross:gross, amount:FB.publicAppointmentEffective(s, row) ? amount : 0 };
  };
  FB.publicOfficeBudget = function (s, rid, context) {
    var total = 0;
    rows(s).forEach(function (row) {
      if (row.institutionId === rid && row.publicTerms) total += FB.publicOfficeAssessment(s, row, context).amount;
    });
    return total;
  };
  FB.publicOfficerIncome = function (s, cid) {
    var total = 0, context = {};
    rows(s).forEach(function (row) {
      if (row.publicTerms && row.holder.id === cid && row.institutionId !== 'player')
        total += FB.publicOfficeAssessment(s,row,context).amount;
    });
    return total;
  };
  function termsFor(s, rid, input) {
    var profile = FB.administrationProfile(s, rid);
    return profile && { schema:1, kind:profile.finance.kind,
      source:{ kind:'county_tax', provinceId:input.provinceId }, share:profile.finance.share,
      salary:profile.finance.salary, serviceShare:profile.finance.serviceShare,
      confirmation:profile.confirmation, remittance:1, arrears:0, unpaid:0, lastPeriod:period(s), last:null };
  }
  FB.publicAppointmentQuote = function (s, actor, input) {
    input = input || {};
    var rid = input.institutionId, profile = FB.administrationProfile(s, rid);
    var def = FBDATA.authorityOffices[input.officeId], c = s.chars[input.holderId];
    var at = input.scope, pid = input.provinceId, funds = rid && FB.treasuryAvailable(s, rid);
    var existing = rows(s).filter(function (row) {
      return row.institutionId === rid && row.publicTerms && ['active','contested'].indexOf(stateName(s, row)) >= 0;
    });
    var occupied = existing.some(function (row) { return same(row.scope, at) && row.officeId === input.officeId; });
    var shares = existing.filter(function (row) { return row.publicTerms.source.provinceId === pid; })
      .reduce(function (total, row) { return total + row.publicTerms.share; }, 0);
    var capacity = existing.filter(function (row) { return row.holder.id === input.holderId; }).length;
    var county = !!pid && !!FB.world.byId[pid] && !FB.world.byId[pid].wasteland && (s.holder[pid] || s.owner[pid]) === rid;
    var scopeValid = at && def && def.scopes.indexOf(at.kind) >= 0 && (at.kind === 'county' ? at.id === pid :
      (s.armies || []).some(function (army) { return army.id === at.id && army.realm === rid && army.men > 0; }));
    var patron = courtActor(s, actor, rid);
    var petition = actor && actor.kind === 'character' && actor.id === input.holderId && actor.id === s.player.charId &&
      FB.realmTerritory(s, rid).indexOf(s.player.provinceId) >= 0 && !s.player.travel;
    var q = { operation:'appoint', actor:copy(actor || null), input:copy(input), allowed:false,
      cost:profile && profile.appointmentCost || 0, endTurn:profile ? s.turn + profile.termDays : null,
      publicTerms:termsFor(s, rid, input), generation:FB.realmRulerGeneration(s, rid), reason:null };
    var qualification = c && def && def.appointment && FB.skillSnapshot(s, c, def.appointment.skill);
    q.reason = !profile || !def || profile.offices.indexOf(input.officeId) < 0 || !county || !scopeValid
      ? FB.T('A public court, listed office and productive source within its direct jurisdiction are required.') :
      !patron && !petition ? FB.T('Only the appointing court or a resident applicant can propose this appointment.') :
      !c || c.dead || c.unfree || FB.ageOf(c, s.date.year) < 16 || FB.justiceCustodyOf(s, c.id) ||
        c.id === s.player.charId && !FB.station.isFree(s.player, s) ? FB.T('A public officer must be a free, living adult.') :
      occupied ? FB.T('This public office already has an incumbent.') :
      ruler(s,rid) && c.id === ruler(s,rid).id ? FB.T('The sovereign appoints other people to public service.') :
      capacity >= 2 ? FB.T('One person can hold at most two public commissions in this court.') :
      qualification < def.appointment.minimum ? FB.T('This office needs {skill} {minimum}.',
        { skill:FB.T(FB.SKILL_NAMES[def.appointment.skill]), minimum:def.appointment.minimum }) :
      !patron && s.player.prestige < def.appointment.prestige ? FB.T('This office needs {prestige} retained prestige.', { prestige:def.appointment.prestige }) :
      shares + profile.finance.share > 1 + 0.000001 ? FB.T('The productive source is already fully assigned.') :
      FB.publicCountyIncome(s, rid, pid) <= 0 ? FB.T('This source has no collectible public receipts.') :
      !FB.treasuryCounterparty(s,rid) || funds < q.cost ? FB.T('The court needs {money:cost} in an active treasury for appointment.', { cost:q.cost }) : null;
    q.allowed = !q.reason;
    q.stamp = JSON.stringify([q.generation, profile, c && [c.id,c.dead,c.born,c.unfree,qualification,FB.characterResidence(s,c)],
      existing, funds, scopeValid, county, c && FB.justiceCustodyOf(s,c.id), s.player.prestige,
      s.player.travel, s.player.provinceId, FB.publicCountyIncome(s, rid, pid),
      s.player.charId, ruler(s, rid) && ruler(s, rid).id]);
    return q;
  };
  FB.publicAppoint = function (s, reviewed) {
    if (!reviewed) return false;
    var q = FB.publicAppointmentQuote(s, reviewed.actor, reviewed.input);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var input = q.input;
    // All authorityAppoint preconditions were quoted before any debit or write.
    var result = FB.authorityAppoint(s, { officeId:input.officeId, institutionId:input.institutionId,
      appointer:{ kind:'realm', id:input.institutionId }, holder:{ kind:'character', id:input.holderId },
      scope:input.scope, endTurn:q.endTurn });
    if (!result) return false;
    var row = rows(s).filter(function (office) { return office.id === result.id; })[0];
    row.publicTerms = copy(q.publicTerms);
    spend(s, input.institutionId, q.cost);
    // Keep one ended commission per office/scope. Referenced legal evidence
    // is retained; a replaced unreferenced payroll is not a growing log.
    s.authority.appointments = rows(s).filter(function (prior) {
      return prior.id === row.id || !prior.publicTerms || prior.institutionId !== row.institutionId ||
        prior.officeId !== row.officeId || !same(prior.scope,row.scope) ||
        ['active','contested'].indexOf(stateName(s,prior)) >= 0 ||
        prior.publicTerms.arrears > 0 ||
        (s.authority.rights || []).some(function (right) { return right.basisRef === prior.id; });
    });
    FB.news(s, FB.msg('news.public_office.appointed',
      '🏛 {court} appoints {person} to public service. Private property remains separate.',
      { court:FB.realmNameParam(s,input.institutionId), person:s.chars[input.holderId].name }));
    return copy(row);
  };
  FB.publicOfficeQuote = function (s, actor, id, action, value) {
    var row = rows(s).filter(function (office) { return office.id === id && office.publicTerms; })[0];
    if (!row) return null;
    var c = s.chars[row.holder.id], patron = courtActor(s, actor, row.institutionId), holder = same(actor, row.holder) && !!Q.actor(s,actor);
    var current = stateName(s, row), live = c && !c.dead && !c.unfree && !FB.justiceCustodyOf(s,c.id);
    var province = row.publicTerms.source.provinceId;
    var controlled = (s.holder[province] || s.owner[province]) === row.institutionId;
    var confirmed = copy(row);
    confirmed.status = 'active'; confirmed.appointerGeneration = FB.realmRulerGeneration(s,row.institutionId);
    var allowed = action === 'remove' ? patron && ['active','contested'].indexOf(row.status) >= 0 :
      action === 'confirm' ? patron && current === 'contested' && live && controlled && !row.publicTerms.arrears &&
        FB.publicAppointmentEffective(s,confirmed) && !rows(s).some(function (other) {
          return other.id !== row.id && other.officeId === row.officeId && other.institutionId === row.institutionId &&
            same(other.scope,row.scope) && FB.publicAppointmentEffective(s,other);
        }) :
      action === 'remit' ? holder && current === 'active' && FBDATA.authorityOffices[row.officeId].publicRole === 'governor' &&
        typeof value === 'number' && value >= 0.5 && value <= 1 && !row.publicTerms.arrears :
      action === 'audit' ? patron && current === 'active' :
      action === 'repay' ? holder && live && FB.treasuryCounterparty(s,row.institutionId) && row.publicTerms.arrears > 0 &&
        (FB.treasuryCharacterRealm(s,c.id) ? FB.treasuryAvailable(s,FB.treasuryCharacterRealm(s,c.id)) : Number(c.gold) || 0) >= row.publicTerms.arrears : false;
    // A perpetual family assignment continues through its own probate review.
    // Dismissing a personal governor cannot revoke surviving customary rights.
    if (FB.aristocracy && FB.aristocracy.assignment(s,row) && ['remove','confirm'].indexOf(action) >= 0) allowed = false;
    var q = { operation:'office', actor:copy(actor || null), id:id, action:action, value:value === undefined ? null : value,
      allowed:!!allowed, cost:action === 'repay' ? row.publicTerms.arrears : 0,
      reason:allowed ? null : FB.T('The holder, appointing authority, funding or office terms no longer permit this decision.') };
    q.stamp = JSON.stringify([row, current, live, controlled, FB.realmRulerGeneration(s,row.institutionId),
      c && [c.gold,c.dead,c.unfree,FB.justiceCustodyOf(s,c.id),
        FB.treasuryCharacterRealm(s,c.id) && FB.treasuryAvailable(s,FB.treasuryCharacterRealm(s,c.id))],
      s.player.gold, ruler(s,row.institutionId) && ruler(s,row.institutionId).id]);
    return q;
  };
  FB.publicOfficeApply = function (s, reviewed) {
    if (!reviewed) return false;
    var q = FB.publicOfficeQuote(s, reviewed.actor, reviewed.id, reviewed.action, reviewed.value);
    if (!q || !q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var row = rows(s).filter(function (office) { return office.id === q.id; })[0], t = row.publicTerms;
    if (q.action === 'remove') FB.authorityAppointmentTransition(s, row.id, 'remove');
    else if (q.action === 'confirm') { row.appointerGeneration = FB.realmRulerGeneration(s,row.institutionId); row.status = 'active'; }
    else if (q.action === 'remit') t.remittance = q.value;
    else if (q.action === 'audit') {
      t.remittance = 1;
      if (t.arrears > 0) { row.status = 'contested'; row.changedTurn = s.turn; }
    } else if (q.action === 'repay') {
      var c = s.chars[row.holder.id], payer = FB.treasuryCharacterRealm(s,c.id);
      if (payer) {
        if (!FB.treasuryTransfer(s,payer,row.institutionId,t.arrears)) return false;
      } else {
        c.gold -= t.arrears;
        if (row.institutionId === 'player') s.player.gold += t.arrears;
        else s.realms[row.institutionId].treasury.gold += t.arrears;
      }
      t.arrears = 0;
    }
    return true;
  };
  function payOfficer(s, row, amount) {
    if (!amount) return true;
    var cid = row.holder.id, rid = row.institutionId;
    if (!FB.treasuryCounterparty(s,rid)) return false;
    if (cid === s.player.charId) return rid !== 'player' && FB.treasuryTransfer(s,rid,'player',amount);
    var officerRealm = FB.realmIdForRulerCharacter(s,cid);
    if (officerRealm === rid) return true; // Internal court allowance, retained in its one purse.
    if (officerRealm && FB.treasuryCounterparty(s,officerRealm)) return FB.treasuryTransfer(s,rid,officerRealm,amount);
    if (!spend(s,rid,amount)) return false;
    s.chars[cid].gold = (Number(s.chars[cid].gold) || 0) + amount;
    return true;
  }
  FB.publicOfficeSettle = function (s, snapshot, currentPeriod, playerOnly) {
    var groups = {}, context = {};
    rows(s).forEach(function (row) {
      if ((row.institutionId === 'player') !== !!playerOnly || !row.publicTerms ||
          row.publicTerms.lastPeriod >= currentPeriod || !FB.publicAppointmentEffective(s,row)) return;
      var key = row.institutionId + ':' + row.publicTerms.source.provinceId;
      (groups[key] || (groups[key] = [])).push(row);
    });
    Object.keys(groups).sort().forEach(function (key) {
      var group = groups[key], rid = group[0].institutionId;
      var gross = FB.publicCountyIncome(s,rid,group[0].publicTerms.source.provinceId,context), local = 0;
      group.forEach(function (row) {
        var t = row.publicTerms, quote = FB.publicOfficeAssessment(s,row,context);
        var paid = Math.min(quote.amount, FB.treasuryAvailable(s,rid));
        if (!payOfficer(s,row,paid)) paid = 0;
        local += paid;
        t.lastPeriod = currentPeriod;
        // Unfunded remuneration is an obligation, never a newly minted credit.
        t.unpaid = Math.min(gross, quote.amount - paid);
        t.last = { period:currentPeriod, gross:gross, due:quote.amount, paid:paid, withheld:0, remitted:0 };
      });
      var collector = group.filter(function (row) { return FBDATA.authorityOffices[row.officeId].publicRole === 'governor'; })[0];
      var remainder = Math.max(0,gross - local), withheld = collector ? remainder * (1 - collector.publicTerms.remittance) : 0;
      if (collector && withheld) {
        withheld = Math.min(withheld, FB.treasuryAvailable(s,rid));
        if (!payOfficer(s,collector,withheld)) withheld = 0;
        collector.publicTerms.arrears += withheld;
        collector.publicTerms.last.withheld = withheld;
      }
      group.forEach(function (row) { row.publicTerms.last.remitted = Math.max(0,remainder - withheld); });
      var account = s.realms[rid] && s.realms[rid].treasury;
      if (account && account.lastSummary && account.lastSummary.period === currentPeriod) {
        account.lastSummary.publicOffices = (account.lastSummary.publicOffices || 0) + local + withheld;
        account.lastSummary.closing = account.gold;
      }
    });
  };
  function serviceFactor(s, rid, pid) {
    var profile = FB.administrationProfile(s,rid);
    if (!profile || !profile.finance.serviceShare) return 1;
    var commissioned = rows(s).some(function (row) { return row.institutionId === rid && row.publicTerms &&
      row.publicTerms.source.provinceId === pid && FB.publicAppointmentEffective(s,row) &&
      !row.publicTerms.unpaid && !row.publicTerms.arrears && row.publicTerms.last && row.publicTerms.last.paid > 0; });
    return 1 - profile.finance.serviceShare + (commissioned ? profile.finance.serviceShare : 0);
  }
  G.register('holders','public_offices', { assign:function (s,rid) { G.strategy('holders','direct').assign(s,rid); },
    conquest:function (s,rid) { return rid; }, vacancy:function (s,rid) { return rid; } });
  var levy = Object.assign({}, G.strategy('levy','feudal_levy'));
  var baseLevy = levy.settlementBase;
  levy.settlementBase = function (s,rid,c) { return baseLevy(s,rid,c) * serviceFactor(s,rid,c.provinceId); };
  levy.subjectRate = function () { return 0; };
  levy.subjectContribution = function () { return 0; };
  levy.mayCall = function (s,rid) { return FB.treasuryAvailable(s,rid) > 0 && Q.consent(s,{kind:'realm',id:rid},'levy',{}).allowed; };
  G.register('levy','public_service',levy);
  var revenue = Object.assign({},G.strategy('revenue','demesne_revenue'));
  revenue.subjectContribution = function () { return 0; };
  revenue.remittance = function (s,rid,c) {
    // Existing independently retained settlement rights remain authoritative.
    return c.kind === 'settlement' ? c.amount * c.share : 0;
  };
  G.register('revenue','public_receipts',revenue);
  G.register('council','appointed_council', {
    seats:function () { return []; }, eligible:function () { return false; }, vacancy:function () { return null; }
  });
  var dynastic = G.strategy('succession','dynastic');
  G.register('succession','public_accession', {
    repairEmpty:false,
    eligible:function (member,tree,year,frontier) { return dynastic.eligible(member,tree,year,frontier); },
    order:function (tree,year,frontier) { return frontier.slice(); },
    candidates:function (s,rid,c) {
      var tree = c.succession, profile = FB.administrationProfile(s,rid);
      var out = c.frontier.filter(function (id) { return tree.members[id].role !== 'public_candidate'; });
      if (profile && profile.accession.officeCandidates) (tree.publicCandidateIds || []).forEach(function (id) {
        var m = tree.members[id], person = m && m.charId && s.chars[m.charId];
        if (person && !person.dead && !person.unfree && id !== tree.rulerMemberId && out.indexOf(id) < 0 &&
            rows(s).some(function (row) { return row.institutionId === rid && row.holder.id === person.id &&
              row.publicTerms && FB.publicAppointmentEffective(s,row); })) out.push(id);
      });
      return out;
    },
    vacancy:function (s,rid,c) { return { allowed:true, cause:c.cause, rulerGeneration:FB.realmRulerGeneration(s,rid) }; },
    accession:function (s,rid,c) { return R.accessionQuote(s,rid,c.cause); }, refresh:function () { return false; }
  });
  var advance = FB.advanceRealmSuccession;
  FB.publicAccessionQuote = function (s,actor,rid,cause) {
    var q = R.accessionQuote(s,rid,cause);
    q.operation = 'accession'; q.actor = copy(actor || null);
    q.allowed = q.allowed && courtActor(s,actor,rid);
    if (!q.allowed && !q.reason) q.reason = FB.T('Only the current court can confirm a public accession.');
    return q;
  };
  FB.publicAccede = function (s,reviewed) {
    if (!reviewed) return false;
    var q = FB.publicAccessionQuote(s,reviewed.actor,reviewed.realmId,reviewed.cause);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    if (q.realmId === 'player') {
      var successor = s.chars[q.memberId];
      if (FB.heirsOf(s).some(function (c) { return c.id === q.memberId; }))
        return FB.game.succeedTo(q.memberId,{livingAbdication:q.cause !== 'death'});
      var realm = FB.abdicatePlayerRealmToHeir(s,successor,{cause:q.cause});
      if (!realm) return false;
      s.player.provs = [];
      FB.setPlayerTier(s,2,{attachLiege:false});
      FB.changePlayerLiege(s,realm.id,'public:abdication');
      return realm;
    }
    // The normal transition remains the one owner of ruler and faith effects.
    return R.resolve(s,R.accessionQuote(s,q.realmId,q.cause),function () {
      return advance(s,q.realmId,{cause:q.cause});
    });
  };
  FB.advanceRealmSuccession = function (s,rid,opts) {
    if (!FB.administrationProfile(s,rid)) return advance(s,rid,opts);
    opts = opts || {};
    if (rid === 'player') return FB.publicAccede(s,FB.publicAccessionQuote(s,
      {kind:'realm',id:rid},rid,opts.cause || 'death'));
    if (!s.realms[rid].succession) return null;
    FB.refreshRealmSuccession(s,rid);
    if (rid !== 'player') FB.publicRecognitionAI(s,rid);
    var q = R.accessionQuote(s,rid,opts.cause || 'death');
    if (!q.allowed) {
      var row = saved(s,rid);
      if (row && (!row.publicVacancy || row.publicVacancy.generation !== q.rulerGeneration))
        row.publicVacancy = { generation:q.rulerGeneration, cause:q.cause, openedTurn:s.turn };
      return null;
    }
    return R.resolve(s,q,function () { return advance(s,rid,opts); });
  };
  FB.publicRecognitionAI = function (s,rid) {
    var candidates = R.candidates(s,rid), tree = s.realms[rid].succession;
    if (!candidates.length && FB.administrationProfile(s,rid).accession.officeCandidates) {
      var offices = FB.publicOfficeRows(s,rid);
      for (var office of offices) {
        var nomination = R.nominationQuote(s,{kind:'realm',id:rid},rid,office.holder.id);
        if (nomination.allowed && R.nominate(s,nomination)) { candidates = R.candidates(s,rid); break; }
      }
    }
    if (!candidates.length) return;
    R.members(s,rid).forEach(function (seat) {
      var old = saved(s,rid).recognition && saved(s,rid).recognition[seat.id];
      if (old && old.generation === FB.realmRulerGeneration(s,rid) && same(old.principal,seat.principal) &&
          candidates.some(function (c) { return c.id === old.candidateId; })) return;
      var ordered = candidates.slice().sort(function (a,b) {
        var skill = seat.basis === 'commander' ? 'military' : 'civil';
        return b[skill] - a[skill] || candidates.indexOf(a) - candidates.indexOf(b);
      });
      var selected = seat.id === 'court' ? candidates.filter(function (c) { return c.id === tree.designatedHeirId; })[0] || candidates[0] : ordered[0];
      var q = R.supportQuote(s,seat.principal,rid,seat.id,selected.id);
      R.applySupport(s,q);
    });
  };
  FB.publicAdministrationAI = function (s,rid) {
    if (rid === 'player') return;
    var profile = FB.administrationProfile(s,rid);
    if (!profile) return;
    var actor = {kind:'realm',id:rid};
    rows(s).filter(function (row) { return row.institutionId === rid && row.publicTerms; }).forEach(function (row) {
      if (row.publicTerms.arrears) {
        var audit = FB.publicOfficeQuote(s,actor,row.id,'audit');
        if (audit && audit.allowed) FB.publicOfficeApply(s,audit);
        var repay = FB.publicOfficeQuote(s,row.holder,row.id,'repay');
        if (repay && repay.allowed) FB.publicOfficeApply(s,repay);
        else { var remove = FB.publicOfficeQuote(s,actor,row.id,'remove'); if (remove && remove.allowed) FB.publicOfficeApply(s,remove); }
      } else if (stateName(s,row) === 'contested') {
        var confirm = FB.publicOfficeQuote(s,actor,row.id,'confirm');
        if (confirm && confirm.allowed) FB.publicOfficeApply(s,confirm);
      }
    });
    var currentPeriod = period(s);
    if (rows(s).some(function (row) { return row.institutionId === rid && row.publicTerms && period({turn:row.startTurn}) === currentPeriod; })) {
      FB.publicRecognitionAI(s,rid); return;
    }
    var territory = FB.realmHeldCounties(s,rid), people = Object.keys(s.chars).filter(function (id) {
      var c = s.chars[id];
      return id !== s.player.charId && !c.dead && !c.unfree && territory.indexOf(FB.characterResidence(s,c)) >= 0 &&
        !FB.realmIdForRulerCharacter(s,id);
    }).sort();
    // Existing courts and local people only. Vacancy never generates a count.
    for (var officeId of profile.offices) for (var pid of territory) {
      var def = FBDATA.authorityOffices[officeId], scope = {kind:'county',id:pid};
      if (def.scopes.indexOf('host') >= 0) {
        var army = (s.armies || []).filter(function (host) { return host.realm === rid && host.men > 0; })[0];
        if (!army) continue;
        scope = {kind:'host',id:army.id};
      }
      for (var cid of people) {
        var q = FB.publicAppointmentQuote(s,actor,{institutionId:rid,officeId:officeId,holderId:cid,scope:scope,provinceId:pid});
        if (q.allowed && FB.publicAppoint(s,q)) { FB.publicRecognitionAI(s,rid); return; }
      }
    }
    FB.publicRecognitionAI(s,rid);
  };
  var ai = Object.assign({},G.strategy('ai','realm_decisions'));
  ai.offices = FB.publicAdministrationAI;
  G.register('ai','public_administration',ai);
  G.register('ladder','public_careers',FBDATA.stationLadders.administrative_monarchy);

  FB.validateAdministrationProfiles = function (table) {
    var errors = [], profiles = table || FBDATA.administrationProfiles;
    function rate(v) { return typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1; }
    Object.keys(profiles || {}).forEach(function (id) {
      var p = profiles[id], f = p && p.finance, a = p && p.accession;
      if (!p || typeof p.name !== 'string' || !Array.isArray(p.offices) || !p.offices.length ||
          p.offices.some(function (office,i) { return !FBDATA.authorityOffices[office] ||
            !FBDATA.authorityOffices[office].publicRole || p.offices.indexOf(office) !== i; }) ||
          ['governor','fiscal','commander'].some(function (role) { return p.offices.indexOf(p[role]) < 0 ||
            FBDATA.authorityOffices[p[role]].publicRole !== role; }) ||
          !Number.isFinite(p.appointmentCost) || p.appointmentCost < 0 ||
          !Number.isInteger(p.termDays) || p.termDays < 90 || p.termDays > 3600 ||
          ['continues','reaffirm'].indexOf(p.confirmation) < 0 || !f ||
          ['salary','revenue_service'].indexOf(f.kind) < 0 || !rate(f.share) || !f.share ||
          !Number.isFinite(f.salary) || f.salary < 0 || !rate(f.serviceShare) || f.remittance !== 1 ||
          !a || ['designation','recognition','dynastic'].indexOf(a.mode) < 0 ||
          !Number.isInteger(a.minimumAge) || a.minimumAge < 16 || a.minimumAge > 30 ||
          typeof a.allowMinor !== 'boolean' || typeof a.officeCandidates !== 'boolean' || !rate(a.threshold) || a.threshold < 0.5 || a.threshold >= 1 ||
          !Array.isArray(a.interests) || a.interests.length > 8 || a.interests.some(function (interest,i) {
            return !interest || typeof interest.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(interest.id) ||
              interest.id === 'court' || a.interests.slice(0,i).some(function (other) { return other.id === interest.id; }) ||
              ['governor','fiscal','commander'].indexOf(interest.role) < 0 ||
              !Number.isFinite(interest.weight) || interest.weight <= 0 || interest.weight > 10;
          })) errors.push(FB.T('Invalid public administration profile {id}.', {id:id}));
    });
    return errors;
  };
  FB.validatePublicAdministrationState = function (s) {
    var totals = {}, seats = {}, fault = null;
    rows(s).forEach(function (row) {
      var t = row.publicTerms;
      if (t === undefined || fault) return;
      var def = FBDATA.authorityOffices[row.officeId];
      var required = ['schema','kind','source','share','salary','serviceShare','confirmation','remittance','arrears','unpaid','lastPeriod','last'];
      if (!def || !def.publicRole || row.holder.kind !== 'character' || !own(s.chars,row.holder.id) ||
          !t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).length !== required.length ||
          required.some(function (key) { return !own(t,key); }) || t.schema !== 1 ||
          ['salary','revenue_service'].indexOf(t.kind) < 0 ||
          !t.source || t.source.kind !== 'county_tax' || !own(s.owner,t.source.provinceId) ||
          Object.keys(t.source).length !== 2 || row.scope.kind === 'county' && row.scope.id !== t.source.provinceId ||
          !Number.isFinite(t.share) || t.share <= 0 || t.share > 1 ||
          !Number.isFinite(t.salary) || t.salary < 0 || !Number.isFinite(t.serviceShare) || t.serviceShare < 0 || t.serviceShare > 1 ||
          ['continues','reaffirm'].indexOf(t.confirmation) < 0 || !Number.isFinite(t.remittance) || t.remittance < 0.5 || t.remittance > 1 ||
          !Number.isFinite(t.arrears) || t.arrears < 0 || !Number.isFinite(t.unpaid) || t.unpaid < 0 ||
          !Number.isInteger(t.lastPeriod) || t.lastPeriod < 0 || t.lastPeriod > period(s) ||
          t.last !== null && (!t.last || typeof t.last !== 'object' ||
            !Number.isInteger(t.last.period) || t.last.period !== t.lastPeriod ||
            ['gross','due','paid','withheld','remitted'].some(function (key) { return !Number.isFinite(t.last[key]) || t.last[key] < 0; }) ||
            Object.keys(t.last).length !== 6 || t.last.paid > t.last.due + 0.000001 ||
            t.last.due > t.last.gross + 0.000001 || t.last.withheld + t.last.remitted > t.last.gross + 0.000001)) {
        fault = 'authority.appointments.' + row.id + '.publicTerms'; return;
      }
      if (['active','contested'].indexOf(row.status) >= 0 && (row.endTurn === null || row.endTurn > s.turn)) {
        var key = row.institutionId + ':' + t.source.provinceId;
        totals[key] = (totals[key] || 0) + t.share;
        var seat = row.institutionId + ':' + row.officeId + ':' + row.scope.id;
        if (totals[key] > 1 + 0.000001 || seats[seat]) fault = 'authority.appointments.publicAssignments';
        seats[seat] = true;
      }
    });
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var row = saved(s,rid);
      if (!row || typeof row !== 'object' || !s.realms[rid]) { fault = 'authority.governments.' + rid; return; }
      if (row.administrationProfileId !== undefined && !own(FBDATA.administrationProfiles,row.administrationProfileId))
        fault = 'authority.governments.' + rid + '.administrationProfileId';
      if (row.recognition !== undefined) {
        var support = row.recognition;
        if (!support || typeof support !== 'object' || Array.isArray(support) ||
            Object.keys(support).length > 1 + rows(s).length * 8 || Object.keys(support).some(function (id) {
              var vote = support[id], tree = s.realms[rid].succession;
              var extended = FB.aristocracy && FB.aristocracy.state(s,rid);
              return !vote || Object.keys(vote).length !== (extended ? 4 : 3) || !vote.principal ||
                ['character','realm'].indexOf(vote.principal.kind) < 0 ||
                !own(vote.principal.kind === 'character' ? s.chars : s.realms,vote.principal.id) ||
                !Number.isInteger(vote.generation) || vote.generation < 1 ||
                Object.keys(vote.principal).length !== 2 || !tree ||
                !(extended && vote.candidateId === null) && !R.candidateMember(s,rid,vote.candidateId);
            })) fault = 'authority.governments.' + rid + '.recognition';
      }
      if (row.lastAccession !== undefined) {
        var a = row.lastAccession, tree = s.realms[rid].succession;
        if (!a || Object.keys(a).length !== 5 || !Number.isInteger(a.generation) || a.generation < 1 ||
            !tree || !R.candidateMember(s,rid,a.memberId) || !Number.isInteger(a.turn) || a.turn > s.turn ||
            typeof a.minor !== 'boolean' || ['death','abdication','term_end','lawful_removal'].indexOf(a.cause) < 0)
          fault = 'authority.governments.' + rid + '.lastAccession';
      }
      if (row.publicVacancy !== undefined) {
        var vacancy = row.publicVacancy;
        if (!vacancy || Object.keys(vacancy).length !== 3 || !Number.isInteger(vacancy.generation) || vacancy.generation < 1 ||
            !Number.isInteger(vacancy.openedTurn) || vacancy.openedTurn > s.turn ||
            ['death','abdication','term_end','lawful_removal'].indexOf(vacancy.cause) < 0)
          fault = 'authority.governments.' + rid + '.publicVacancy';
      }
    });
    Object.keys(s.realms || {}).forEach(function (rid) {
      var tree = s.realms[rid].succession;
      if (!tree || tree.publicCandidateIds === undefined) return;
      if (!Array.isArray(tree.publicCandidateIds) || tree.publicCandidateIds.length > 8 ||
          tree.publicCandidateIds.some(function (id,i) { var m = R.candidateMember(s,rid,id);
            if (rid === 'player') return !m || tree.publicCandidateIds.indexOf(id) !== i;
            // Detached v4 validation precedes inflation. Only the canonical
            // royal character/member links may be omitted by compaction.
            var derivedId = typeof id === 'string' && id.indexOf('royal_') === 0
              ? 'ro_' + id.slice('royal_'.length) : null;
            var cid = m && (m.charId === undefined ? derivedId : m.charId);
            var c = cid && s.chars && s.chars[cid], line = c && c.royalLine;
            return !m || tree.publicCandidateIds.indexOf(id) !== i || !line || line.realmId !== rid ||
              (line.memberId === undefined ? cid !== derivedId : line.memberId !== id);
          })) fault = 'state.realms.' + rid + '.succession.publicCandidateIds';
    });
    return fault;
  };
})();
