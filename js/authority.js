/* Scoped authority for the 476 political model. Saved records contain grants and
   commitments; all effective powers are resolved from current facts. */
(function () {
  'use strict';
  var Q = FB.political;
  var priorOffices = Q.offices, priorPermission = Q.permission;

  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function records(s) {
    var a = s && s.authority;
    return a && typeof a === 'object' && !Array.isArray(a) ? a : null;
  }
  function list(s, key) {
    var a = records(s);
    return a && Array.isArray(a[key]) ? a[key] : [];
  }
  function ensure(s) {
    if (!records(s)) s.authority = {};
    var a = s.authority;
    if (!Array.isArray(a.appointments)) a.appointments = [];
    if (!Array.isArray(a.recognitions)) a.recognitions = [];
    if (!Array.isArray(a.contracts)) a.contracts = [];
    if (!Array.isArray(a.rights)) a.rights = [];
    if (!Array.isArray(a.receipts)) a.receipts = [];
    if (!a.governments || typeof a.governments !== 'object' ||
        Array.isArray(a.governments)) a.governments = {};
    if (!Number.isInteger(a.nextId) || a.nextId < 1) a.nextId = 1;
    return a;
  }
  function next(s, prefix) {
    var a = ensure(s), id;
    do { id = prefix + a.nextId++; }
    while (a.appointments.concat(a.recognitions, a.contracts, a.rights, a.receipts, a.migrations || [])
      .some(function (row) { return row.id === id; }));
    return id;
  }
  FB.authorityNextId = next;
  function ref(s, value) {
    return value && (value.kind === 'character' || value.kind === 'realm') &&
      typeof value.id === 'string' && Q.actor(s, value) ?
      { kind:value.kind, id:value.id } : null;
  }
  function same(a, b) {
    return !!(a && b && a.kind === b.kind && a.id === b.id);
  }
  function host(s, id) {
    if (typeof id !== 'string') return null;
    for (var row of s.armies || []) if (row.id === id) return row;
    return null;
  }
  function scope(s, value) {
    if (!value || typeof value.id !== 'string') return null;
    if (value.kind === 'host') return host(s, value.id)
      ? { kind:'host', id:value.id } : null;
    if (value.kind === 'county') return FB.world && own(FB.world.byId, value.id)
      ? { kind:'county', id:value.id } : null;
    if (value.kind === 'realm') return Q.actor(s, { kind:'realm', id:value.id })
      ? { kind:'realm', id:value.id } : null;
    return null;
  }
  /* A realm without a row takes the campaign's stamped default form;
     saves without that stamp keep the legacy territorial fallback. */
  function defaultForm(s) {
    return s.start && s.start.defaultGovernment || 'territorial';
  }
  Q.defaultGovernmentForm = defaultForm;
  Q.government = function (s, realmRef) {
    if (!realmRef || realmRef.kind !== 'realm' || !Q.actor(s, realmRef)) return null;
    var a = records(s), stored = a && a.governments &&
      own(a.governments, realmRef.id) ? a.governments[realmRef.id] : null;
    var formId = stored && stored.formId || defaultForm(s);
    var rules = FBDATA.governmentForms[formId];
    return rules ? { realmId:realmRef.id, formId:formId,
      eliteCultureId:stored && stored.eliteCultureId || null,
      eliteFaithId:stored && stored.eliteFaithId || null,
      legalIdentityId:stored && stored.legalIdentityId || null,
      tolerance:stored && stored.tolerance || 'preference',
      taxation:stored && stored.taxation || 'equal',
      justicePolicy:stored && stored.justicePolicy || 'personal',
      rules:copy(rules), sinceTurn:stored && stored.sinceTurn !== undefined
        ? stored.sinceTurn : null } : null;
  };
  FB.authoritySetGovernment = function (s, rid, formId) {
    var current = Q.government(s, { kind:'realm', id:rid });
    if (!current || !FBDATA.governmentForms[formId] ||
        current.formId === formId) return false;
    ensure(s).governments[rid] = Object.assign({},
      s.authority && s.authority.governments && s.authority.governments[rid],
      { formId:formId, sinceTurn:s.turn });
    return true;
  };
  /* World creation seeds the bookmark's form for each realm (realm id ->
     form id) whose form differs from the campaign default. The realms are
     still being made, so no actor query runs here. */
  FB.authoritySeedGovernments = function (s, forms) {
    for (var rid in forms) if (own(forms, rid)) {
      if (forms[rid] === defaultForm(s) || !own(s.realms, rid) ||
          !own(FBDATA.governmentForms, forms[rid])) continue;
      ensure(s).governments[rid] = { formId:forms[rid], sinceTurn:s.turn };
    }
  };
  /* Identity reads never change community partitions or materialize rulers. */
  Q.governingIdentity = function (s, rid) {
    var g = Q.government(s, { kind:'realm', id:rid });
    if (!g) return null;
    var actor = Q.actor(s, { kind:'realm', id:rid });
    return Object.assign({}, g, {
      eliteCultureId:g.eliteCultureId || actor.cultureId,
      eliteFaithId:g.eliteFaithId || actor.realmReligionId || actor.religionId,
      declared:!!g.legalIdentityId
    });
  };
  FB.authorityIdentityValid = function (s, value) {
    return !!(value && own(FBDATA.cultures, value.eliteCultureId) &&
      FB.faithExists(value.eliteFaithId, s) &&
      own(FBDATA.legalTraditions, value.legalIdentityId) &&
      ['preference','tolerant','persecution'].indexOf(value.tolerance) >= 0 &&
      ['equal','discriminatory'].indexOf(value.taxation) >= 0 &&
      ['personal','elite'].indexOf(value.justicePolicy) >= 0);
  };
  FB.authoritySetIdentity = function (s, rid, value) {
    var g = Q.government(s, { kind:'realm', id:rid });
    if (!g || !FB.authorityIdentityValid(s, value)) return false;
    var a = ensure(s), prior = a.governments[rid] || { formId:g.formId, sinceTurn:s.turn };
    var changed = false;
    for (var key of ['eliteCultureId','eliteFaithId','legalIdentityId','tolerance','taxation','justicePolicy']) {
      if (prior[key] !== value[key]) changed = true;
    }
    if (!changed) return false;
    a.governments[rid] = Object.assign({}, prior, {
      eliteCultureId:value.eliteCultureId, eliteFaithId:value.eliteFaithId,
      legalIdentityId:value.legalIdentityId, tolerance:value.tolerance,
      taxation:value.taxation, justicePolicy:value.justicePolicy
    });
    return true;
  };
  Q.communityGovernance = function (s, pid, proposed) {
    if (!scope(s, { kind:'county', id:pid })) return null;
    var rid = FB.settlementCountyHolder(s, pid), g = rid && Q.governingIdentity(s, rid);
    if (g && proposed) g = Object.assign({}, g, proposed, { declared:true });
    var rows = FB.countyCommunities(s, pid), total = 0, faith = 0, culture = 0;
    for (var row of rows) {
      total += row.count;
      if (g && row.religion !== g.eliteFaithId) faith += row.count;
      if (g && row.culture !== g.eliteCultureId) culture += row.count;
    }
    faith = total ? faith / total : 0; culture = total ? culture / total : 0;
    var tolerance = g && g.tolerance;
    /* Existing royal proclamations override the local default for that realm. */
    if (rid === 'player' && FB.realmPolicyActive(s)) {
      var level = FB.realmPolicyLevelId(s, 'religious_tolerance');
      if (level) tolerance = level === 'persecution' ? 'persecution' :
        level === 'confessional_preference' ? 'preference' : 'tolerant';
    }
    var delta = g && g.declared ?
      faith * (tolerance === 'persecution' ? -6 : tolerance === 'tolerant' ? 2 : -1) +
      culture * (g.taxation === 'discriminatory' ? -3 : 0) +
      culture * (g.justicePolicy === 'elite' ? -2 : 0) : 0;
    return { provinceId:pid, realmId:rid, identity:g, otherFaithShare:faith,
      otherCultureShare:culture, tolerance:tolerance, annualSupport:delta,
      consentSupport:FB.countyPopularSupport(s, pid) + delta };
  };
  Q.worshipProtected = function (s, pid) {
    var local = Q.communityGovernance(s, pid);
    return !!local && local.tolerance !== 'persecution' &&
      !FB.hasModifier(s, 'persecuted_minorities', pid);
  };
  /* A civic grant remains recorded even when communities refuse the bargain. */
  Q.civicConsent = function (s, pid) {
    var local = Q.communityGovernance(s, pid);
    if (!local) return { allowed:false, support:null, reason:'missing_scope' };
    var allowed = !local.identity || !local.identity.declared || local.consentSupport >= -25;
    return { allowed:allowed, support:local.consentSupport,
      reason:allowed ? null : 'community_opposition' };
  };
  Q.identityQuote = function (s, rid, value) {
    var current = Q.governingIdentity(s, rid);
    if (!current || !FB.authorityIdentityValid(s, value)) return null;
    return { realmId:rid, generation:FB.realmRulerGeneration(s, rid),
      current:current, value:copy(value), turn:s.turn,
      counties:FB.realmHeldCounties(s, rid).map(function (pid) {
        return { provinceId:pid, communities:FB.countyCommunities(s, pid),
          support:FB.countyPopularSupport(s, pid),
          before:Q.communityGovernance(s, pid).annualSupport,
          after:Q.communityGovernance(s, pid, value).annualSupport };
      }) };
  };
  FB.authorityApplyIdentity = function (s, reviewed) {
    if (!reviewed) return false;
    var fresh = Q.identityQuote(s, reviewed.realmId, reviewed.value);
    return !!fresh && JSON.stringify(fresh) === JSON.stringify(reviewed) &&
      FB.authoritySetIdentity(s, reviewed.realmId, reviewed.value);
  };
  function validIssuer(s, issuer, source) {
    if (!issuer || typeof issuer.id !== 'string') return false;
    if (source === 'church_support' && issuer.kind === 'character') {
      var cleric = s.chars && s.chars[issuer.id];
      return !!(cleric && !cleric.dead && ['priest','monk'].indexOf(cleric.role) >= 0);
    }
    if ((source === 'imperial_commission' ||
         source === 'dynastic_succession') && issuer.kind === 'realm')
      return !!Q.actor(s, issuer);
    if (source === 'army_acclamation' && issuer.kind === 'host')
      return !!host(s, issuer.id);
    if (source === 'civic_acceptance' && issuer.kind === 'county')
      return !!scope(s, issuer);
    if (source === 'church_support' && issuer.kind === 'religious-office') {
      var holder = s.religiousHeads && s.religiousHeads[issuer.id];
      var headId = typeof holder === 'string' ? holder : holder && holder.id;
      return !!(headId && (s.chars && s.chars[headId]
        ? !s.chars[headId].dead : s.realms && s.realms[headId] &&
          s.realms[headId].alive));
    }
    return false;
  }
  function generation(s, issuer) {
    if (issuer.kind === 'character') return issuer.id;
    if (issuer.kind === 'realm') return FB.realmRulerGeneration(s, issuer.id);
    if (issuer.kind === 'county') {
      var rid = FB.settlementCountyHolder(s, issuer.id);
      return rid ? rid + ':' + FB.realmRulerGeneration(s, rid) : null;
    }
    if (issuer.kind === 'religious-office') {
      var head = s.religiousHeads && s.religiousHeads[issuer.id];
      var headId = typeof head === 'string' ? head : head && head.id;
      if (headId && s.chars && s.chars[headId]) return headId;
      return headId ? headId + ':' + FB.realmRulerGeneration(s, headId) : null;
    }
    return issuer.kind === 'host' ? issuer.id : null;
  }
  function activeRecognition(s, row) {
    if (!row || row.status !== 'active' || row.endTurn !== null &&
        row.endTurn <= s.turn || !validIssuer(s, row.issuer, row.source) ||
        !ref(s, row.subject)) return false;
    var def = FBDATA.legitimacySources[row.source];
    return !!def && (def.succession !== 'reaffirm' ||
      row.issuerGeneration === generation(s, row.issuer));
  }
  function recognition(s, id) {
    for (var row of list(s, 'recognitions')) if (row.id === id) return row;
    return null;
  }
  Q.legitimacy = function (s, subject, place, sourceId) {
    if (!ref(s, subject)) return [];
    var at = place && scope(s, place), out = [];
    if (place && !at) return out;
    for (var row of list(s, 'recognitions')) {
      if (!same(row.subject, subject) || !activeRecognition(s, row) ||
          sourceId && row.source !== sourceId ||
          at && row.scope && !same(row.scope, at)) continue;
      out.push(copy(row));
    }
    return out;
  };
  FB.authorityRecognize = function (s, terms) {
    terms = terms || {};
    var def = FBDATA.legitimacySources[terms.source];
    var subject = ref(s, terms.subject);
    var at = terms.scope ? scope(s, terms.scope) : null;
    if (!def || !subject || !validIssuer(s, terms.issuer, terms.source) ||
        terms.scope && !at || terms.endTurn !== undefined &&
        (!Number.isInteger(terms.endTurn) || terms.endTurn <= s.turn)) return null;
    for (var existing of list(s, 'recognitions')) if (existing.status === 'active' &&
        existing.source === terms.source && same(existing.issuer, terms.issuer) &&
        same(existing.subject, subject) &&
        ((!existing.scope && !at) || same(existing.scope, at))) return null;
    var row = { id:next(s, 'recognition-'), source:terms.source,
      issuer:copy(terms.issuer), issuerGeneration:generation(s, terms.issuer),
      subject:subject, scope:at, startTurn:s.turn,
      endTurn:terms.endTurn === undefined ? null : terms.endTurn,
      status:'active' };
    s.authority.recognitions.push(row);
    if (at && at.kind === 'county' &&
        ['imperial_commission','civic_acceptance','dynastic_succession'].indexOf(row.source) >= 0) {
      var holder = FB.settlementCountyHolder(s, at.id);
      if (holder) for (var power of ['peace','revenue','consent']) {
        if (!Q.power(s, subject, power, { provinceId:at.id }).allowed) continue;
        var priorRight = list(s, 'rights').filter(function (r) {
          return r.status === 'active' && r.basis === 'recognition' && r.power === power &&
            r.scope.id === at.id && r.issuer.id === holder && same(r.beneficiary, subject);
        })[0];
        if (priorRight) {
          FB.authorityRecordCustom(s, priorRight.id, 'recognition', row.id);
          priorRight.basisRef = row.id;
        } else FB.authorityEstablishRight(s, { issuer:{ kind:'realm', id:holder },
          beneficiary:subject, scope:at, power:power, basis:'recognition', basisRef:row.id });
      }
    }
    return copy(row);
  };
  FB.authorityRecognitionTransition = function (s, id, action) {
    var row = recognition(s, id);
    if (!row) return false;
    if (action === 'revoke' && row.status === 'active') row.status = 'revoked';
    else if (action === 'reaffirm' && row.status === 'active' &&
        validIssuer(s, row.issuer, row.source) && ref(s, row.subject) &&
        row.issuerGeneration !== generation(s, row.issuer))
      row.issuerGeneration = generation(s, row.issuer);
    else return false;
    row.changedTurn = s.turn;
    return true;
  };

  function activeAppointment(s, row) {
    if (!row || row.status !== 'active' || row.endTurn !== null &&
        row.endTurn <= s.turn || !ref(s, row.holder) ||
        !Q.actor(s, { kind:'realm', id:row.institutionId })) return false;
    if (!within(s, row.institutionId, row.scope)) return false;
    var def = FBDATA.authorityOffices[row.officeId];
    if (!def || def.succession === 'reaffirm' &&
        row.appointerGeneration !== FB.realmRulerGeneration(s, row.institutionId)) return false;
    if (row.recognitionId) {
      var recognized = recognition(s, row.recognitionId);
      if (!activeRecognition(s, recognized) ||
          !same(recognized.subject, row.holder) ||
          !Array.isArray(def.recognitionSources) ||
          def.recognitionSources.indexOf(recognized.source) < 0) return false;
    }
    return true;
  }
  function appointment(s, id) {
    for (var row of list(s, 'appointments')) if (row.id === id) return row;
    return null;
  }
  function within(s, rid, at) {
    if (at.kind === 'host') {
      var army = host(s, at.id);
      return !!army && (army.realm === rid || !FB.armiesHostile(s, army, {realm:rid}) && list(s, 'contracts').some(function (row) {
        return row.hostId === army.id && row.patronRealmId === rid &&
          row.federateRealmId === army.realm && activeContract(s, row);
      }));
    }
    if (at.kind === 'county') return FB.realmTerritory(s, rid).indexOf(at.id) >= 0;
    return at.kind === 'realm' && at.id === rid;
  }
  FB.authorityAppoint = function (s, terms) {
    terms = terms || {};
    var def = FBDATA.authorityOffices[terms.officeId];
    var grantor = ref(s, terms.appointer), holder = ref(s, terms.holder);
    var at = scope(s, terms.scope), rid = terms.institutionId;
    if (!def || !grantor || grantor.kind !== 'realm' || grantor.id !== rid ||
        !holder || !at || def.scopes.indexOf(at.kind) < 0 ||
        !within(s, rid, at) || terms.endTurn !== undefined &&
        (!Number.isInteger(terms.endTurn) || terms.endTurn <= s.turn) ||
        terms.recognitionId && (!activeRecognition(s, recognition(s, terms.recognitionId)) ||
          !same(recognition(s, terms.recognitionId).subject, holder) ||
          !Array.isArray(def.recognitionSources) ||
          def.recognitionSources.indexOf(recognition(s, terms.recognitionId).source) < 0)) return null;
    for (var prior of list(s, 'appointments')) {
      if (prior.institutionId === rid && prior.officeId === terms.officeId &&
          same(prior.scope, at) && (activeAppointment(s, prior) && !terms.contested ||
            terms.contested && same(prior.holder, holder) &&
              ['active','contested'].indexOf(prior.status) >= 0)) return null;
    }
    var row = { id:next(s, 'appointment-'), officeId:terms.officeId,
      institutionId:rid, appointer:grantor,
      appointerGeneration:FB.realmRulerGeneration(s, rid),
      holder:holder, scope:at,
      recognitionId:terms.recognitionId || null, startTurn:s.turn,
      endTurn:terms.endTurn === undefined ? null : terms.endTurn,
      status:terms.contested ? 'contested' : 'active' };
    s.authority.appointments.push(row);
    return copy(row);
  };
  FB.authorityAppointmentTransition = function (s, id, action) {
    var row = appointment(s, id);
    if (!row) return false;
    if (action === 'confirm' && row.status === 'contested' &&
        ref(s, row.holder) &&
        ref(s, row.appointer) && within(s, row.institutionId, row.scope) &&
        (row.endTurn === null || row.endTurn > s.turn) &&
        (!row.recognitionId ||
          activeRecognition(s, recognition(s, row.recognitionId))) &&
        !list(s, 'appointments').some(function (other) {
          return other.id !== row.id && other.officeId === row.officeId &&
            other.institutionId === row.institutionId && same(other.scope, row.scope) &&
            activeAppointment(s, other);
        })) {
      row.appointerGeneration = FB.realmRulerGeneration(s, row.institutionId);
      row.status = 'active';
    }
    else if (action === 'contest' && row.status === 'active') row.status = 'contested';
    else if (action === 'remove' && (row.status === 'active' || row.status === 'contested'))
      row.status = 'removed';
    else if (action === 'expire' && (row.status === 'active' || row.status === 'contested'))
      row.status = 'expired';
    else return false;
    row.changedTurn = s.turn;
    return true;
  };
  Q.offices = function (s, actor) {
    var out = priorOffices(s, actor);
    if (!ref(s, actor)) return out;
    for (var row of list(s, 'appointments')) if (same(row.holder, actor)) {
      out.push({ ref:{ kind:'office', institutionId:'authority:' + row.institutionId,
        officeId:row.officeId, source:'authority.appointments', holder:copy(row.holder),
        appointmentId:row.id }, holder:copy(row.holder), scope:copy(row.scope),
        status:activeAppointment(s, row) ? 'active' :
          row.status === 'active' && FBDATA.authorityOffices[row.officeId] &&
          FBDATA.authorityOffices[row.officeId].succession === 'reaffirm' &&
          row.appointerGeneration !== FB.realmRulerGeneration(s, row.institutionId)
            ? 'contested' : row.status === 'active' ? 'expired' : row.status,
        terms:copy(row) });
    }
    return out;
  };
  var priorOffice = Q.office;
  Q.office = function (s, officeRef) {
    if (officeRef && officeRef.source === 'authority.appointments') {
      var row = appointment(s, officeRef.appointmentId);
      if (!row || !same(row.holder, officeRef.holder)) return null;
      for (var view of Q.offices(s, row.holder))
        if (view.ref.appointmentId === row.id) return view;
      return null;
    }
    return priorOffice(s, officeRef);
  };

  function activeContract(s, row) {
    return !!(row && row.status === 'active' && row.succession &&
      row.endTurn > s.turn &&
      (!row.recognitionId || activeRecognition(s, recognition(s, row.recognitionId))) &&
      Q.actor(s, { kind:'realm', id:row.patronRealmId }) &&
      Q.actor(s, { kind:'realm', id:row.federateRealmId }) &&
      row.succession.patron === FB.realmRulerGeneration(s, row.patronRealmId) &&
      row.succession.federate === FB.realmRulerGeneration(s, row.federateRealmId) &&
      (!row.hostId || (host(s, row.hostId) &&
        host(s, row.hostId).realm === row.federateRealmId)));
  }
  function contractReason(s, row) {
    if (row.status !== 'active') return row.status;
    if (row.endTurn <= s.turn) return 'term_ended';
    if (!Q.actor(s, { kind:'realm', id:row.patronRealmId }) ||
        !Q.actor(s, { kind:'realm', id:row.federateRealmId })) return 'party_lost';
    if (row.succession.patron !== FB.realmRulerGeneration(s, row.patronRealmId) ||
        row.succession.federate !== FB.realmRulerGeneration(s, row.federateRealmId))
      return 'ruler_succession';
    if (row.recognitionId && !activeRecognition(s, recognition(s, row.recognitionId)))
      return 'recognition_lost';
    if (row.hostId && (!host(s, row.hostId) ||
        host(s, row.hostId).realm !== row.federateRealmId)) return 'host_lost';
    return null;
  }
  function contractNotice(s, row, reason) {
    row.changedTurn = s.turn; row.transitionReason = reason;
    var params = { patron:FB.realmNameParam(s, row.patronRealmId),
      federate:FB.realmNameParam(s, row.federateRealmId), amount:row.payPerSeason };
    if (reason === 'ruler_succession') FB.news(s, FB.msg('news.federate.succession',
      '📜 Service between {patron} and {federate} is suspended after a ruler’s succession. Both courts must consent again.', params));
    else if (reason === 'renewed') FB.news(s, FB.msg('news.federate.renewal',
      '📜 {patron} and {federate} review renewed service terms. Command resumes only after both courts consent.', params));
    else if (reason === 'breached' || reason === 'unpaid') FB.news(s, FB.msg('news.federate.breach',
      '⚠ Service between {patron} and {federate} is breached. The patron loses command of the federate host.', params));
    else FB.news(s, FB.msg('news.federate.expired',
      '📜 Service between {patron} and {federate} has ended. The patron no longer commands the federate host.', params));
  }
  function contract(s, id) {
    for (var row of list(s, 'contracts')) if (row.id === id) return row;
    return null;
  }
  Q.contract = function (s, id) {
    var row = contract(s, id);
    return row ? copy(Object.assign({}, row, { effective:activeContract(s, row),
      ineffectiveReason:contractReason(s, row) })) : null;
  };
  Q.contracts = function (s, rid) {
    return list(s, 'contracts').filter(function (row) {
      return row.patronRealmId === rid || row.federateRealmId === rid;
    }).map(function (row) { return Q.contract(s, row.id); });
  };
  Q.contractQuote = function (s, terms) {
    terms = terms || {};
    var patron = Q.actor(s, { kind:'realm', id:terms.patronRealmId });
    var federate = Q.actor(s, { kind:'realm', id:terms.federateRealmId });
    var army = terms.hostId ? host(s, terms.hostId) : null;
    var acknowledged = terms.recognitionId ? recognition(s, terms.recognitionId) : null;
    var definition = terms.templateId && FBDATA.federateContractTerms[terms.templateId];
    var valid = !!(patron && federate && patron.realmId !== federate.realmId &&
      (!terms.templateId || definition &&
        (definition.service !== 'host' || army) &&
        (definition.service !== 'none' || !terms.hostId) &&
        (definition.land !== 'none' ||
          !(terms.settlementCountyIds && terms.settlementCountyIds.length ||
            terms.settlementAwards && terms.settlementAwards.length)) &&
        (definition.recognition !== 'none' || !terms.recognitionId) &&
        (definition.recognition !== 'required' || acknowledged)) &&
      (!terms.recognitionId || acknowledged && activeRecognition(s, acknowledged) &&
        acknowledged.source === 'imperial_commission' &&
        same(acknowledged.issuer, { kind:'realm', id:patron.realmId }) &&
        same(acknowledged.subject, { kind:'realm', id:federate.realmId }) &&
        (!acknowledged.scope ||
          same(acknowledged.scope, { kind:'realm', id:federate.realmId }))) &&
      Number.isFinite(terms.payPerSeason) && terms.payPerSeason >= 0 &&
      (terms.initialPay === undefined || Number.isFinite(terms.initialPay) && terms.initialPay >= 0) &&
      (!(terms.payPerSeason || terms.initialPay) ||
        FB.treasuryCounterparty(s, patron.realmId) &&
        FB.treasuryCounterparty(s, federate.realmId)) &&
      Number.isInteger(terms.endTurn) && terms.endTurn > s.turn &&
      (!terms.hostId || army && army.realm === federate.realmId) &&
      (!terms.settlementCountyIds || Array.isArray(terms.settlementCountyIds) &&
        terms.settlementCountyIds.every(function (pid) {
          return scope(s, { kind:'county', id:pid }) &&
            (s.owner[pid] === FB.topRealm(s, patron.realmId) ||
              terms.id && contract(s, terms.id) === terms &&
              (terms.fulfilledCountyIds || []).indexOf(pid) >= 0);
        })) &&
      (!terms.settlementAwards || Array.isArray(terms.settlementAwards) &&
        terms.settlementAwards.every(function (award, index) {
          if (!award || terms.settlementAwards.some(function (other, otherIndex) {
            return otherIndex < index && other &&
              other.provinceId === award.provinceId &&
              other.settlement === award.settlement;
          })) return false;
          return award && terms.id && contract(s, terms.id) === terms &&
            award.fulfilled ||
            award && FB.settlementGrantQuote(s, award.provinceId,
            award.settlement, award.recipientId, patron.realmId);
        })));
    return { allowed:valid, reason:valid ? null : 'invalid_contract',
      requiredConsents:valid ? [patron.realmId, federate.realmId] : [] };
  };
  FB.authorityOfferContract = function (s, terms) {
    if (!terms || terms.id || !Q.contractQuote(s, terms).allowed || terms.hostId &&
        list(s, 'contracts').some(function (row) {
          return row.hostId === terms.hostId &&
            (row.status === 'offered' && Q.contractQuote(s, row).allowed ||
              activeContract(s, row));
        })) return null;
    var row = { id:next(s, 'federate-'), patronRealmId:terms.patronRealmId,
      federateRealmId:terms.federateRealmId, hostId:terms.hostId || null,
      recognitionId:terms.recognitionId || null,
      payPerSeason:terms.payPerSeason, endTurn:terms.endTurn,
      settlementCountyIds:(terms.settlementCountyIds || []).slice(),
      settlementAwards:(terms.settlementAwards || []).map(function (award) {
        return { provinceId:award.provinceId, settlement:award.settlement,
          recipientId:award.recipientId, fulfilled:false };
      }),
      approvals:{}, status:'offered', startTurn:null,
      paidThroughPeriod:Math.floor(s.turn / 90), serviceThroughPeriod:Math.floor(s.turn / 90),
      succession:{
        patron:FB.realmRulerGeneration(s, terms.patronRealmId),
        federate:FB.realmRulerGeneration(s, terms.federateRealmId)
      } };
    if (terms.templateId) row.templateId = terms.templateId;
    if (terms.initialPay) row.initialPay = terms.initialPay;
    s.authority.contracts.push(row);
    return copy(row);
  };
  Q.contractAwardQuote = function (s, id, index) {
    var row = contract(s, id);
    var award = row && row.settlementAwards && row.settlementAwards[index];
    return activeContract(s, row) && award && !award.fulfilled
      ? FB.settlementGrantQuote(s, award.provinceId, award.settlement,
          award.recipientId, row.patronRealmId) : null;
  };
  FB.authorityFulfillContractAward = function (s, id, index, reviewed) {
    var row = contract(s, id), award = row && row.settlementAwards && row.settlementAwards[index];
    var current = Q.contractAwardQuote(s, id, index);
    if (!award || !current || !reviewed ||
        JSON.stringify(current) !== JSON.stringify(reviewed) ||
        !FB.confirmSettlementGrant(s, reviewed)) return false;
    award.fulfilled = true; award.fulfilledTurn = s.turn;
    return true;
  };
  FB.authorityConsentContract = function (s, id, rid) {
    var row = contract(s, id);
    if (!row || row.status !== 'offered' ||
        rid !== row.patronRealmId && rid !== row.federateRealmId ||
        row.succession.patron !== FB.realmRulerGeneration(s, row.patronRealmId) ||
        row.succession.federate !== FB.realmRulerGeneration(s, row.federateRealmId) ||
        !Q.contractQuote(s, row).allowed || own(row.approvals, rid)) return false;
    var other = rid === row.patronRealmId ? row.federateRealmId : row.patronRealmId;
    if (row.approvals[other] === FB.realmRulerGeneration(s, other) &&
        row.initialPay && row.initialPaidTurn === undefined) {
      if (!FB.treasuryTransfer(s, row.patronRealmId, row.federateRealmId, row.initialPay)) return false;
      row.initialPaidTurn = s.turn;
      FB.news(s, FB.msg('news.federate.initial_payment',
        '💰 {patron} pays {money:amount} to equip {federate} for the agreed service.',
        { patron:FB.realmNameParam(s, row.patronRealmId),
          federate:FB.realmNameParam(s, row.federateRealmId), amount:row.initialPay }));
    }
    row.approvals[rid] = FB.realmRulerGeneration(s, rid);
    if (row.approvals[row.patronRealmId] === row.succession.patron &&
        row.approvals[row.federateRealmId] === row.succession.federate) {
      row.status = 'active'; row.startTurn = s.turn;
    }
    return true;
  };
  FB.authorityContractTransition = function (s, id, action, rid, endTurn) {
    var row = contract(s, id);
    if (!row || rid !== row.patronRealmId && rid !== row.federateRealmId ||
        !Q.actor(s, { kind:'realm', id:rid })) return false;
    if (action === 'breach' && (row.status === 'active' || row.status === 'offered'))
      row.status = 'breached';
    else if (action === 'release' && ['active','offered','expired'].indexOf(row.status) >= 0 &&
        row.transitionReason !== 'service_released') row.status = 'expired';
    else if (action === 'renew' &&
        ['active','expired','breached'].indexOf(row.status) >= 0 &&
        Number.isInteger(endTurn) && endTurn > Math.max(s.turn, row.endTurn) &&
        Q.contractQuote(s, Object.assign({}, row, { endTurn:endTurn,
          settlementAwards:row.settlementAwards.filter(function (award) {
            return !award.fulfilled;
          }), settlementCountyIds:row.settlementCountyIds.filter(function (pid) {
            return (row.fulfilledCountyIds || []).indexOf(pid) < 0;
          }) })).allowed) {
      row.status = 'offered'; row.endTurn = endTurn; row.approvals = {};
      row.succession.patron = FB.realmRulerGeneration(s, row.patronRealmId);
      row.succession.federate = FB.realmRulerGeneration(s, row.federateRealmId);
    } else return false;
    contractNotice(s, row, action === 'renew' ? 'renewed' : action === 'release' ? 'service_released' : 'breached');
    return true;
  };

  function right(s, id) {
    for (var row of list(s, 'rights')) if (row.id === id) return row;
    return null;
  }
  function activeRight(s, row) {
    return !!(row && row.status === 'active' && row.strength >= 50 &&
      ref(s, row.beneficiary) && scope(s, row.scope));
  }
  Q.rights = function (s, actor) {
    return list(s, 'rights').filter(function (row) {
      return same(row.beneficiary, actor);
    }).map(function (row) {
      return copy(Object.assign({}, row, { effective:activeRight(s, row) }));
    });
  };
  /* Recovery of county jurisdiction, independent of revenue or appointments.
     Return detached evidence so a war quote can revalidate the exact right. */
  Q.territorialClaims = function (s, actor, provinceId) {
    if (!ref(s, actor)) return [];
    return Q.rights(s, actor).filter(function (row) {
      return row.effective && row.power === 'peace' && row.scope.kind === 'county' &&
        (!provinceId || row.scope.id === provinceId);
    });
  };
  FB.authorityEstablishRight = function (s, terms) {
    terms = terms || {};
    var issuer = ref(s, terms.issuer), beneficiary = ref(s, terms.beneficiary);
    var at = scope(s, terms.scope);
    if (!issuer || issuer.kind !== 'realm' || !beneficiary || !at ||
        at.kind !== 'county' || !FBDATA.customaryBases[terms.basis] ||
        ['peace','revenue','consent'].indexOf(terms.power) < 0 ||
        !within(s, issuer.id, at)) return null;
    var held = beneficiary.kind === 'realm'
      ? FB.settlementCountyHolder(s, at.id) === beneficiary.id
      : FB.holdsSettlementInCounty(s, beneficiary, at.id);
    var proof = recognition(s, terms.basisRef);
    if ((terms.basis === 'possession' && !held) ||
        (terms.basis === 'tenure' && !held &&
          (typeof terms.basisRef !== 'string' || !terms.basisRef)) ||
        (terms.basis === 'judgment' &&
          (typeof terms.basisRef !== 'string' || !terms.basisRef)) ||
        (terms.basis === 'recognition' &&
          (!activeRecognition(s, proof) || !same(proof.subject, beneficiary) ||
            proof.scope && !same(proof.scope, at)))) return null;
    for (var prior of list(s, 'rights')) if (prior.status === 'active' &&
        same(prior.issuer, issuer) && same(prior.beneficiary, beneficiary) &&
        same(prior.scope, at) && prior.power === terms.power &&
        prior.basis === terms.basis) return null;
    var row = { id:next(s, 'custom-'), issuer:issuer, beneficiary:beneficiary,
      scope:at, power:terms.power, basis:terms.basis,
      basisRef:terms.basisRef || null, status:'active',
      strength:50, startTurn:s.turn, history:[{ turn:s.turn, event:'established' }] };
    s.authority.rights.push(row);
    return copy(row);
  };
  FB.authorityRecordCustom = function (s, id, event, evidence) {
    var row = right(s, id);
    var changes = { tenure:10, judgment:15, recognition:15, possession:10,
      disputed:-15, abandoned:-25 };
    if (!row || row.status !== 'active' || !own(changes, event)) return false;
    if ((event === 'tenure' || event === 'judgment') &&
        (typeof evidence !== 'string' || !evidence)) return false;
    if (event === 'possession' &&
        !(row.beneficiary.kind === 'realm'
          ? FB.settlementCountyHolder(s, row.scope.id) === row.beneficiary.id
          : FB.holdsSettlementInCounty(s, row.beneficiary, row.scope.id))) return false;
    if (event === 'recognition') {
      var proof = recognition(s, evidence);
      if (!activeRecognition(s, proof) || !same(proof.subject, row.beneficiary) ||
          proof.scope && !same(proof.scope, row.scope)) return false;
    }
    if (row.history.some(function (past) {
      return past.event === event && (evidence
        ? past.evidence === evidence &&
          (event !== 'recognition' || past.year === s.date.year)
        : past.turn === s.turn);
    })) return false;
    row.strength = Math.max(0, Math.min(100, row.strength + changes[event]));
    row.history.push({ turn:s.turn, year:s.date.year,
      event:event, evidence:evidence || null });
    if (!row.strength) row.status = 'lapsed';
    return true;
  };
  FB.authorityRevokeRight = function (s, id, issuer) {
    var row = right(s, id);
    if (!row || row.status !== 'active' || !ref(s, issuer) ||
        !same(row.issuer, issuer)) return false;
    row.status = 'revoked'; row.history.push({ turn:s.turn, event:'revoked' });
    return true;
  };
  FB.authorityJudgment = function (s, beneficiary, pid, evidence) {
    var issuer = { kind:'realm', id:FB.settlementCountyHolder(s, pid) };
    if (!ref(s, issuer) || !ref(s, beneficiary) || !scope(s, { kind:'county', id:pid }) ||
        !Q.power(s, beneficiary, 'peace', { provinceId:pid }).allowed) return false;
    var existing = list(s, 'rights').filter(function (row) {
      return row.status === 'active' && row.basis === 'judgment' && row.power === 'peace' &&
        row.scope.id === pid && same(row.beneficiary, beneficiary) && same(row.issuer, issuer);
    })[0];
    if (existing) return existing.basisRef !== evidence &&
      FB.authorityRecordCustom(s, existing.id, 'judgment', evidence);
    return !!FB.authorityEstablishRight(s, { issuer:issuer, beneficiary:beneficiary,
      scope:{ kind:'county', id:pid }, power:'peace', basis:'judgment', basisRef:evidence });
  };

  function basis(kind, id) {
    return { allowed:true, reason:null, basis:[{ kind:kind, id:id }], consents:[] };
  }
  function denied(reason) {
    return { allowed:false, reason:reason, basis:[], consents:[] };
  }
  Q.grantedCounties = function (s, actor, power) {
    if (!ref(s, actor) || ['peace','revenue','consent'].indexOf(power) < 0) return [];
    var out = [];
    for (var office of list(s, 'appointments')) {
      var def = FBDATA.authorityOffices[office.officeId];
      if (same(office.holder, actor) && def && def.powers.indexOf(power) >= 0 && activeAppointment(s, office)) {
        var counties = office.scope.kind === 'realm' ? FB.realmTerritory(s, office.scope.id) :
          office.scope.kind === 'county' ? [office.scope.id] : [];
        for (var pid of counties) if (out.indexOf(pid) < 0) out.push(pid);
      }
    }
    for (var custom of list(s, 'rights')) if (same(custom.beneficiary, actor) &&
        custom.power === power && activeRight(s, custom) &&
        out.indexOf(custom.scope.id) < 0) out.push(custom.scope.id);
    return out.sort();
  };
  Q.power = function (s, actor, power, context) {
    var a = ref(s, actor);
    if (!a || ['ban','peace','revenue','consent'].indexOf(power) < 0)
      return denied('invalid_actor');
    context = context || {};
    if (power === 'revenue' && context.contractId) {
      var obligation = contract(s, context.contractId);
      return obligation && activeContract(s, obligation) &&
        a.kind === 'realm' && a.id === obligation.federateRealmId
        ? basis('federate_pay', obligation.id) : denied('no_contract_receipt');
    }
    var at = power === 'ban'
      ? scope(s, { kind:'host', id:context.hostId })
      : scope(s, { kind:'county', id:context.provinceId });
    if (!at) return denied('missing_scope');
    if (power === 'consent' && !Q.civicConsent(s, at.id).allowed)
      return denied('community_opposition');
    for (var office of list(s, 'appointments')) {
      var def = FBDATA.authorityOffices[office.officeId];
      if (same(office.holder, a) && (same(office.scope, at) ||
          at.kind === 'county' && office.scope.kind === 'realm' &&
            FB.realmTerritory(s, office.scope.id).indexOf(at.id) >= 0) &&
          def && def.powers.indexOf(power) >= 0 && activeAppointment(s, office))
        return basis('appointment', office.id);
    }
    for (var custom of list(s, 'rights')) if (same(custom.beneficiary, a) &&
        same(custom.scope, at) && custom.power === power && activeRight(s, custom))
      return basis('custom', custom.id);
    if (power === 'ban') {
      var army = host(s, at.id);
      if (a.kind === 'realm' && army.realm === a.id ||
          a.kind === 'character' && a.id === s.player.charId &&
          army.realm === 'player') return basis('territory', army.realm);
      if (a.kind === 'character' && a.id === s.player.charId) {
        var commission = FB.activeMilitaryCommand(s);
        if (commission && army.realm === commission.sovereignRealmId &&
            (commission.hostId === army.id ||
              !commission.hostId && FB.hostOf(s, army.realm) === army))
          return basis('legacy_command', army.id);
      }
      for (var agreement of list(s, 'contracts')) if (activeContract(s, agreement) &&
          agreement.hostId === army.id && a.kind === 'realm' &&
          a.id === agreement.patronRealmId)
        return basis('federate_service', agreement.id);
      return denied('no_command');
    }
    var pid = at.id, rid = a.kind === 'realm' ? a.id :
      a.id === s.player.charId ? (FB.station.rulesRealm(s.player, s) ? 'player' : null) :
      FB.realmIdForRulerCharacter(s, s.chars[a.id]);
    if (power === 'peace') {
      if (a.kind === 'character' && a.id === s.player.charId &&
          FB.station.mayAdministerJustice(s.player, s) && FB.governanceEligible(s) &&
          (rid && FB.realmTerritory(s, rid).indexOf(pid) >= 0 ||
            !rid && s.player.provinceId === pid))
        return basis('territory', rid || 'barony:' + pid);
      if (rid && s.realms[rid] && FB.realmRank.isTerritorial(s.realms[rid], s) &&
          FB.realmTerritory(s, rid).indexOf(pid) >= 0)
        return basis('territory', rid);
      if (a.kind === 'character' && s.chars[a.id].role === 'lord' &&
          FB.characterResidence(s, s.chars[a.id]) === pid)
        return basis('local_lord', pid);
    } else if (power === 'revenue') {
      if (rid && FB.settlementCountyHolder(s, pid) === rid)
        return basis('direct_receipt', rid);
    } else if (power === 'consent') {
      var government = rid && Q.government(s, { kind:'realm', id:rid });
      var consent = government &&
        FB.governments.strategy('consent', government.rules.consent);
      if (consent && consent.territorialConsent &&
          FB.realmTerritory(s, rid).indexOf(pid) >= 0)
        return basis('territorial_consent', rid);
    }
    return denied('no_' + power);
  };
  Q.renderQuote = function (s, actor, terms) {
    terms = terms || {};
    var collector = ref(s, actor), payer =
      terms.payerRealmId === 'player' && s.player
        ? { kind:'realm', id:'player' }
        : ref(s, { kind:'realm', id:terms.payerRealmId });
    var permission = collector && Q.power(s, collector, 'revenue',
      { provinceId:terms.provinceId });
    var basisRow = permission && permission.allowed && permission.basis[0];
    var payee = null;
    if (basisRow && basisRow.kind === 'appointment') {
      var office = appointment(s, basisRow.id);
      payee = office && office.institutionId;
    } else if (basisRow && basisRow.kind === 'custom' &&
        collector.kind === 'realm') payee = collector.id;
    else if (basisRow && basisRow.kind === 'direct_receipt' &&
        collector.kind === 'realm') payee = collector.id;
    var existing = list(s, 'receipts').some(function (row) {
      return row.obligationId === terms.obligationId;
    });
    if (!payer || !payee || payer.id === payee ||
        !FB.treasuryCounterparty(s, payer.id) ||
        !FB.treasuryCounterparty(s, payee) ||
        !Number.isFinite(terms.amount) || terms.amount <= 0 ||
        typeof terms.obligationId !== 'string' || !terms.obligationId ||
        existing || (payer.id === 'player'
          ? Math.max(0, Number(s.player.gold) || 0)
          : FB.treasuryAvailable(s, payer.id)) < terms.amount)
      return null;
    return { collector:collector, payerRealmId:payer.id,
      beneficiaryRealmId:payee, provinceId:terms.provinceId,
      amount:terms.amount, obligationId:terms.obligationId,
      basis:copy(basisRow), payerGeneration:FB.realmRulerGeneration(s, payer.id),
      beneficiaryGeneration:FB.realmRulerGeneration(s, payee) };
  };
  FB.authorityCollectRender = function (s, reviewed) {
    if (!reviewed) return false;
    var current = Q.renderQuote(s, reviewed.collector, reviewed);
    if (!current || JSON.stringify(current) !== JSON.stringify(reviewed) ||
        !FB.treasuryTransfer(s, reviewed.payerRealmId,
          reviewed.beneficiaryRealmId, reviewed.amount)) return false;
    ensure(s).receipts.push({ id:next(s, 'render-'),
      obligationId:reviewed.obligationId, payerRealmId:reviewed.payerRealmId,
      beneficiaryRealmId:reviewed.beneficiaryRealmId,
      provinceId:reviewed.provinceId, amount:reviewed.amount, turn:s.turn });
    return true;
  };
  Q.consent = function (s, actor, operation, context) {
    var a = ref(s, actor);
    if (!a) return denied('invalid_actor');
    if (operation === 'federate_contract') {
      var row = contract(s, context && context.contractId);
      if (!row || a.kind !== 'realm' ||
          a.id !== row.patronRealmId && a.id !== row.federateRealmId)
        return denied('missing_contract');
      return row ? { allowed:activeContract(s, row), reason:row.status,
        required:[row.patronRealmId, row.federateRealmId],
        approvals:copy(row.approvals) } : denied('missing_contract');
    }
    if (operation === 'extraordinary_tax' && a.kind === 'realm' &&
        a.id === 'player') {
      var needed = !!(FB.councilActive(s) && s.council &&
        FB.effectiveCrownAuthority(s) < (FBDATA.balance.councilConsentBelow || 35));
      return { allowed:!needed, reason:needed ? 'council_consent' : null,
        required:needed ? ['council:player'] : [], approvals:{} };
    }
    return denied('unsupported_operation');
  };
  Q.permission = function (s, actor, operation, context) {
    if (operation === 'grant_settlement')
      return priorPermission(s, actor, operation, context);
    if (operation === 'collect_service_pay' &&
        (!context || !context.contractId) || operation === 'collect_render' &&
        (!context || !context.provinceId || context.contractId))
      return denied('missing_scope');
    var powers = { command_host:'ban', arrest:'peace', judge:'peace',
      collect_render:'revenue', collect_service_pay:'revenue',
      civic_agreement:'consent' };
    return own(powers, operation)
      ? Q.power(s, actor, powers[operation], context)
      : denied('unsupported_operation');
  };

  /* Public court decisions. Quotes are detached and never create people,
     recognition, authority arrays or RNG state. All clients commit through
     the existing appointment and recognition transactions. */
  FB.officeText = function (s, id, field) {
    var def = FBDATA.authorityOffices[id];
    return def && def[field] ? FB.dataText(s, s.player.charId,
      'authorityOffice', id, def, field, {}) : FB.T('Imperial office');
  };
  FB.legitimacySourceName = function (s, id) {
    return FB.dataText(s, s.player.charId, 'legitimacySource', id,
      FBDATA.legitimacySources[id], 'name', {});
  };
  function officeCatalogue(s, rid) {
    var government = Q.government(s, { kind:'realm', id:rid });
    return government && FB.systemEnabled(s, 'roman_offices', { realm:rid })
      ? government.rules.officeCatalogue || [] : [];
  }
  FB.officeCourts = function (s) {
    return Object.keys(s.realms).filter(function (rid) {
      return Q.actor(s, { kind:'realm', id:rid }) && officeCatalogue(s, rid).length;
    }).sort().map(function (rid) {
      return { id:rid, offices:officeCatalogue(s, rid).slice() };
    });
  };
  FB.officeScopes = function (s, rid, officeId) {
    var def = FBDATA.authorityOffices[officeId];
    if (!def || officeCatalogue(s, rid).indexOf(officeId) < 0) return [];
    var out = [];
    if (def.scopes.indexOf('realm') >= 0) out.push({ kind:'realm', id:rid });
    if (def.scopes.indexOf('host') >= 0) for (var army of s.armies || []) {
      if (army.men > 0 && within(s, rid, {kind:'host',id:army.id})) out.push({ kind:'host', id:army.id });
    }
    if (def.scopes.indexOf('county') >= 0) for (var pid of FB.realmTerritory(s, rid))
      out.push({ kind:'county', id:pid });
    return out;
  };
  function courtRuler(s, rid) {
    return rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s, rid);
  }
  function courtActor(s, actor, rid) {
    var ruler = courtRuler(s, rid);
    return actor && (actor.kind === 'realm' && actor.id === rid ||
      actor.kind === 'character' && ruler && ruler.id === actor.id);
  }
  function officeFunds(s, actor) {
    return actor.kind === 'realm' && actor.id !== 'player' ? FB.treasuryAvailable(s, actor.id) :
      actor.kind === 'realm' && actor.id === 'player' || actor.kind === 'character' && actor.id === s.player.charId
        ? s.player.gold : 0;
  }
  function officeFee(s, actor, cost) {
    if (!cost) return;
    if (actor.kind === 'realm' && actor.id !== 'player') FB.treasurySpend(s, actor.id, cost);
    else s.player.gold -= cost;
  }
  function sameQuote(a, b) { return !!a && !!b && JSON.stringify(a) === JSON.stringify(b); }
  function officeStatus(s, row) {
    var view = Q.offices(s, row.holder).filter(function (item) { return item.ref.appointmentId === row.id; })[0];
    return view ? view.status : 'expired';
  }
  FB.officeAppointmentQuote = function (s, actor, terms) {
    terms = terms || {};
    var rid = terms.institutionId, def = FBDATA.authorityOffices[terms.officeId],
      applicant = ref(s, terms.holder), issuer = ref(s, actor), at = scope(s, terms.scope),
      ruler = courtRuler(s, rid), requirement = def && def.appointment;
    var q = { actor:issuer, terms:copy(terms), allowed:false, reason:null,
      cost:requirement && requirement.gold || 0, prestige:0, endTurn:null,
      generation:rid && s.realms[rid] ? FB.realmRulerGeneration(s, rid) : null };
    var c = applicant && applicant.kind === 'character' && s.chars[applicant.id];
    var patron = issuer && courtActor(s, issuer, rid);
    var requesting = issuer && same(issuer, applicant) && c && c.id === s.player.charId;
    var imperialMandate = !requirement || !requirement.imperialOnly || ruler && FB.officeClaimants(s).some(function (claim) {
      return same(claim.holder, { kind:'character', id:ruler.id }) && claim.legitimacy.length > 0;
    });
    /* Registration is an applicant's expense. A court nominating its own
       officer pays no petition fee, for player and AI courts alike. */
    if (patron) q.cost = 0;
    var occupied = list(s, 'appointments').filter(function (row) {
      return row.institutionId === rid && same(row.scope, at) &&
        (row.officeId === terms.officeId || def && def.powers.indexOf('ban') >= 0 &&
          FBDATA.authorityOffices[row.officeId].powers.indexOf('ban') >= 0) &&
        ['active','contested'].indexOf(officeStatus(s, row)) >= 0;
    });
    q.signature = JSON.stringify([ruler && ruler.id, c && [c.id,c.dead,c.born,c.unfree,FB.justiceCustodyOf(s, c.id)],
      at, at && within(s, rid, at), occupied, requirement, issuer && officeFunds(s, issuer),
      c && FB.skillSnapshot(s, c, requirement && requirement.skill || 'dip'), s.player.prestige,
      s.player.flags && s.player.flags.in_prison, s.player.travel,
      imperialMandate,
      rid && Q.actor(s, { kind:'realm', id:rid }) ? FB.realmTerritory(s, rid) : []]);
    if (!issuer || !applicant || !requirement || !Q.actor(s, { kind:'realm', id:rid }) ||
        !FB.systemEnabled(s, 'roman_offices', { realm:rid }) ||
        officeCatalogue(s, rid).indexOf(terms.officeId) < 0 || !at ||
        def.scopes.indexOf(at.kind) < 0 || !within(s, rid, at) || !c)
      q.reason = FB.T('A living court, applicant and valid office scope are required.');
    else if (!patron && !requesting) q.reason = FB.T('Only the applicant or the appointing court can make this decision.');
    else if (c.dead || FB.ageOf(c, s.date.year) < 16 || c.unfree || FB.justiceCustodyOf(s, c.id) ||
        c.id === s.player.charId && !FB.station.isFree(s.player, s) ||
        c.id === s.player.charId && s.player.flags && s.player.flags.in_prison)
      q.reason = FB.T('An officeholder must be a free, living adult.');
    else if (requesting && s.player.travel) q.reason = FB.T('Finish your journey before petitioning the court.');
    else if (occupied.length) q.reason = FB.T('This office or host command already has a holder.');
    else if (!imperialMandate) q.reason = FB.T('This honor or senior command needs an appointing ruler with a live imperial claim.');
    else if (requesting && !patron && !FB.realmTerritory(s, rid).includes(s.player.provinceId) &&
        !(at.kind === 'host' && (s.armies || []).some(function (army) {
          return army.id === at.id && army.at === s.player.provinceId;
        }))) q.reason = FB.T('Seek appointment while resident in this court’s territory or beside its host.');
    else if (FB.skillSnapshot(s, c, requirement.skill) < requirement.minimum)
      q.reason = FB.T('This office needs {skill} {minimum}.',
        { skill:FB.T(FB.SKILL_NAMES[requirement.skill]), minimum:requirement.minimum });
    else if (requesting && !patron && s.player.prestige < requirement.prestige)
      q.reason = FB.T('This office needs {prestige} prestige, which is retained.', { prestige:requirement.prestige });
    else if (officeFunds(s, issuer) < q.cost)
      q.reason = FB.T('The appointment fee is {money:cost}.', { cost:q.cost });
    else q.allowed = true;
    if (requirement && requirement.annual)
      q.endTurn = s.turn + (4 - s.date.season) * 90 - s.date.day + 1;
    return q;
  };
  FB.officeSeekAppointment = function (s, reviewed) {
    if (!reviewed || !reviewed.actor) return false;
    var q = FB.officeAppointmentQuote(s, reviewed.actor, reviewed.terms);
    if (!q.allowed || !sameQuote(q, reviewed)) return false;
    var t = q.terms, patron = { kind:'realm', id:t.institutionId };
    var proof = Q.legitimacy(s, t.holder, t.scope, 'imperial_commission').filter(function (row) {
      return same(row.issuer, patron) && same(row.scope, t.scope);
    })[0];
    if (!proof) {
      proof = list(s, 'recognitions').filter(function (row) {
        return row.status === 'active' && row.source === 'imperial_commission' &&
          same(row.issuer, patron) && same(row.subject, t.holder) && same(row.scope, t.scope) &&
          (row.endTurn === null || row.endTurn > s.turn);
      })[0];
      if (proof) FB.authorityRecognitionTransition(s, proof.id, 'reaffirm');
      else proof = FB.authorityRecognize(s, { issuer:patron, subject:t.holder,
        source:'imperial_commission', scope:t.scope });
    }
    if (!proof) return false;
    var row = FB.authorityAppoint(s, { officeId:t.officeId, institutionId:t.institutionId,
      appointer:patron, holder:t.holder, scope:t.scope,
      recognitionId:FBDATA.authorityOffices[t.officeId].succession === 'continues' ? null : proof.id,
      endTurn:q.endTurn === null ? undefined : q.endTurn });
    if (!row) return false;
    officeFee(s, q.actor, q.cost);
    FB.news(s, FB.msg('news.office.appointment',
      '🏛 {court} grants a scoped appointment to {person}. Land remains with its current holder.',
      { court:FB.realmNameParam(s, t.institutionId), person:s.chars[t.holder.id].name }));
    return row;
  };
  FB.officeTransitionQuote = function (s, actor, id, action) {
    var row = appointment(s, id), issuer = ref(s, actor);
    var petition = row && issuer && action === 'confirm' && same(issuer, row.holder) &&
      issuer.kind === 'character' && issuer.id === s.player.charId &&
      FB.realmTerritory(s, row.institutionId).indexOf(s.player.provinceId) >= 0 &&
      !(s.player.flags && s.player.flags.in_prison);
    if (!row || !issuer || !courtActor(s, issuer, row.institutionId) && !petition ||
        !FB.systemEnabled(s, 'roman_offices', { realm:row.institutionId })) return null;
    var status = officeStatus(s, row), proof = row.recognitionId && recognition(s, row.recognitionId);
    var holderCharacter = row.holder.kind === 'character' && s.chars[row.holder.id];
    var free = row.holder.kind !== 'character' || !!holderCharacter &&
      !FB.justiceCustodyOf(s, row.holder.id) && !holderCharacter.unfree;
    var alive = ref(s, row.holder) && free && within(s, row.institutionId, row.scope) &&
      (row.endTurn === null || row.endTurn > s.turn);
    var competing = list(s, 'appointments').some(function (other) {
      return other.id !== id && other.officeId === row.officeId &&
        other.institutionId === row.institutionId && same(other.scope, row.scope) && activeAppointment(s, other);
    });
    var q = { actor:issuer, id:id, action:action, cost:0,
      officeId:row.officeId, holder:copy(row.holder), scope:copy(row.scope),
      institutionId:row.institutionId, endTurn:row.endTurn,
      allowed:action === 'confirm' ? !!alive && status === 'contested' && !competing &&
        (!proof || activeRecognition(s, proof) || same(proof.issuer, row.appointer) &&
          proof.status === 'active' && (proof.endTurn === null || proof.endTurn > s.turn)) :
        action === 'contest' ? row.status === 'active' : action === 'remove' && ['active','contested'].indexOf(row.status) >= 0,
      signature:JSON.stringify([row,proof,status,alive,competing,FB.realmRulerGeneration(s, row.institutionId)]) };
    q.reason = q.allowed ? null : !alive ? FB.T('The holder, term or scope is no longer available.') :
      competing ? FB.T('Another holder already exercises this office.') :
        proof && proof.status === 'revoked' ? FB.T('The supporting recognition has been withdrawn.') :
          FB.T('This appointment cannot be reaffirmed in its current state.');
    return q;
  };
  FB.officeTransition = function (s, reviewed) {
    if (!reviewed) return false;
    var q = FB.officeTransitionQuote(s, reviewed.actor, reviewed.id, reviewed.action);
    if (!q || !q.allowed || !sameQuote(q, reviewed)) return false;
    var row = appointment(s, q.id);
    if (q.action === 'confirm') {
      if (row.status === 'active') FB.authorityAppointmentTransition(s, row.id, 'contest');
      if (row.recognitionId) FB.authorityRecognitionTransition(s, row.recognitionId, 'reaffirm');
    }
    return FB.authorityAppointmentTransition(s, q.id, q.action);
  };
  FB.officeClaimants = function (s) {
    if (!FB.systemAvailable(s, 'roman_offices')) return [];
    var out = [];
    for (var row of list(s, 'appointments')) if (row.officeId === 'imperial_office' &&
        row.scope.kind === 'realm' && ref(s, row.holder)) {
      if (out.some(function (prior) { return prior.institutionId === row.institutionId && same(prior.holder, row.holder); })) continue;
      var claims = list(s, 'appointments').filter(function (other) {
        return other.officeId === 'imperial_office' && other.institutionId === row.institutionId && same(other.holder, row.holder);
      });
      var effective = claims.some(function (claim) { return activeAppointment(s, claim); });
      out.push({ institutionId:row.institutionId, holder:copy(row.holder), scope:copy(row.scope),
        status:effective ? 'active' : 'contested',
        legitimacy:Q.legitimacy(s, row.holder, row.scope),
        history:copy(list(s, 'recognitions').filter(function (proof) {
          return same(proof.subject, row.holder) && (!proof.scope || same(proof.scope, row.scope));
        })) });
    }
    return out;
  };
  FB.officeRecognitionMandates = function (s, actor) {
    var a = ref(s, actor), out = [];
    if (!a || !FB.systemEnabled(s, 'roman_offices', a.kind === 'realm' ? { realm:a.id } : { character:a.id })) return out;
    if (a.kind === 'character' && (FB.justiceCustodyOf(s, a.id) || s.chars[a.id].unfree ||
        FB.ageOf(s.chars[a.id], s.date.year) < 16)) return out;
    var rid = a.kind === 'realm' ? a.id : Object.keys(s.realms).filter(function (id) { return courtActor(s, a, id); })[0];
    if (rid && officeCatalogue(s, rid).length) out.push({ source:'imperial_commission', issuer:{ kind:'realm', id:rid } });
    for (var army of s.armies || []) if (Q.power(s, a, 'ban', { hostId:army.id }).allowed && army.men > 0)
      out.push({ source:'army_acclamation', issuer:{ kind:'host', id:army.id } });
    var counties = Q.grantedCounties(s, a, 'consent');
    if (rid) counties = counties.concat(FB.realmTerritory(s, rid));
    for (var pid of counties.filter(function (id, i, all) { return all.indexOf(id) === i; }))
      if (Q.power(s, a, 'consent', { provinceId:pid }).allowed)
        out.push({ source:'civic_acceptance', issuer:{ kind:'county', id:pid } });
    for (var id in s.religiousHeads || {}) {
      var head = s.religiousHeads[id], headId = typeof head === 'string' ? head : head && head.id;
      if (headId === a.id && validIssuer(s, { kind:'religious-office', id:id }, 'church_support'))
        out.push({ source:'church_support', issuer:{ kind:'religious-office', id:id } });
    }
    return out;
  };
  FB.officeClaimQuote = function (s, actor, claimant, mandate, action) {
    var claims = FB.officeClaimants(s), claim = claimant && claims.filter(function (row) {
      return row.institutionId === claimant.institutionId && same(row.holder, claimant.holder);
    })[0], a = ref(s, actor), available = FB.officeRecognitionMandates(s, actor);
    var valid = mandate && available.some(function (row) { return sameQuote(row, mandate); });
    var mine = claim && mandate ? list(s, 'recognitions').filter(function (row) {
      return same(row.subject, claim.holder) && same(row.issuer, mandate.issuer) &&
        row.source === mandate.source && same(row.scope, claim.scope) && row.status === 'active';
    }) : [];
    var q = { actor:a, claimant:claimant ? { institutionId:claimant.institutionId, holder:copy(claimant.holder) } : null,
      mandate:mandate ? copy(mandate) : null, action:action, cost:0,
      prestige:a && a.kind === 'character' && a.id === s.player.charId ? 5 : 0,
      allowed:false, reason:null, signature:JSON.stringify([claim, available, mine,
        mandate && generation(s, mandate.issuer), s.player.prestige]) };
    if (!claim || !a || !valid) q.reason = FB.T('Recognition needs a living claimant and your own court, army, civic or church mandate.');
    else if (q.prestige > s.player.prestige) q.reason = FB.T('This declaration costs 5 prestige.');
    else if (action === 'recognize' && mine.some(function (row) { return activeRecognition(s, row); }))
      q.reason = FB.T('Your recognition is already current.');
    else if (action === 'contest' && !mine.length) q.reason = FB.T('You have no recognition to withdraw from this claimant.');
    else if (['recognize','contest'].indexOf(action) < 0) q.reason = FB.T('Choose recognition or contestation.');
    else q.allowed = true;
    return q;
  };
  FB.officeDeclareClaim = function (s, reviewed) {
    if (!reviewed) return false;
    var q = FB.officeClaimQuote(s, reviewed.actor, reviewed.claimant, reviewed.mandate, reviewed.action);
    if (!q.allowed || !sameQuote(q, reviewed)) return false;
    var at = { kind:'realm', id:q.claimant.institutionId };
    var mine = list(s, 'recognitions').filter(function (row) {
      return row.source === q.mandate.source && same(row.issuer, q.mandate.issuer) &&
        same(row.scope, at) && row.status === 'active';
    });
    var proof = mine.filter(function (row) { return same(row.subject, q.claimant.holder); })[0];
    if (q.action === 'contest') {
      mine.filter(function (row) { return same(row.subject, q.claimant.holder); }).forEach(function (row) {
        FB.authorityRecognitionTransition(s, row.id, 'revoke');
      });
    } else {
      /* A mandate supports one claimant to this office. Other institutions'
         sources and unscoped historical claims remain independent. */
      if (proof) FB.authorityRecognitionTransition(s, proof.id, 'reaffirm');
      else proof = FB.authorityRecognize(s, { source:q.mandate.source, issuer:q.mandate.issuer,
        subject:q.claimant.holder, scope:at });
      if (!proof) return false;
      mine.filter(function (row) { return !same(row.subject, q.claimant.holder); }).forEach(function (row) {
        FB.authorityRecognitionTransition(s, row.id, 'revoke');
      });
    }
    if (q.prestige) s.player.prestige -= q.prestige;
    FB.news(s, q.action === 'recognize' ? FB.msg('news.office.recognize',
      '🏛 Recognition is declared for {person}; competing claims survive.',
      { person:s.chars[q.claimant.holder.id] ? s.chars[q.claimant.holder.id].name : FB.realmNameParam(s, q.claimant.holder.id) }) :
      FB.msg('news.office.contest', '🏛 Support for {person} is withdrawn; other sources of recognition survive.',
        { person:s.chars[q.claimant.holder.id] ? s.chars[q.claimant.holder.id].name : FB.realmNameParam(s, q.claimant.holder.id) }));
    return true;
  };
  FB.officeCourtAI = function (s, rid) {
    if (rid === 'player' || courtActor(s, { kind:'character', id:s.player.charId }, rid) ||
        !officeCatalogue(s, rid).length) return;
    /* Materialization is a mutation at the AI boundary, never in a quote. */
    var ruler = courtRuler(s, rid) || FB.materializeRealmRuler(s, rid);
    if (!ruler) return;
    var actor = { kind:'realm', id:rid }, holder = { kind:'character', id:ruler.id };
    for (var row of list(s, 'appointments').slice()) if (row.institutionId === rid &&
        officeStatus(s, row) === 'contested') {
      /* A displaced emperor remains a claimant; an ordinary officer is
         reaffirmed only while resident in the court's current territory. */
      var keep = row.officeId === 'imperial_office' ? same(row.holder, holder) :
        row.holder.kind === 'character' && ref(s, row.holder) &&
          (same(row.holder, holder) || FB.realmTerritory(s, rid).indexOf(
            FB.characterResidence(s, s.chars[row.holder.id])) >= 0);
      var review = FB.officeTransitionQuote(s, actor, row.id, keep ? 'confirm' : 'contest');
      if (review && review.allowed) FB.officeTransition(s, review);
    }
    /* Succession follows the durable office ledger. Dead claimants are absent
       from the display, but their ended tenure can still establish succession. */
    var successionClaim = list(s, 'appointments').some(function (row) {
      return row.institutionId === rid && row.officeId === 'imperial_office' && row.status !== 'removed' &&
        row.appointerGeneration !== FB.realmRulerGeneration(s, rid);
    });
    var claims = FB.officeClaimants(s).filter(function (row) { return row.institutionId === rid; });
    if (claims.length || successionClaim) {
      var at = { kind:'realm', id:rid }, proof = Q.legitimacy(s, holder, at, 'dynastic_succession')[0];
      /* An explicit deposition or vacancy is not undone just because a
         seasonal AI pass found no active emperor. */
      if (successionClaim && !list(s, 'appointments').some(function (row) {
        return row.institutionId === rid && row.officeId === 'imperial_office' && activeAppointment(s, row);
      })) {
        if (!proof) proof = FB.authorityRecognize(s, { source:'dynastic_succession', issuer:actor, subject:holder, scope:at });
        FB.authorityAppoint(s, { officeId:'imperial_office', institutionId:rid, appointer:actor,
          holder:holder, scope:at, recognitionId:proof && proof.id });
      }
      var current = FB.officeClaimants(s).filter(function (row) {
        return row.institutionId === rid && same(row.holder, holder);
      })[0];
      if (current) {
        var mandate = { source:'imperial_commission', issuer:actor };
        var declaration = FB.officeClaimQuote(s, actor, current, mandate, 'recognize');
        if (declaration.allowed) FB.officeDeclareClaim(s, declaration);
      }
    }
    /* At most one new ordinary appointment per court and season. Existing
       courts supply candidates; no court or person is generated by a read. */
    var period = Math.floor(s.turn / 90);
    if (list(s, 'appointments').some(function (row) {
      return row.institutionId === rid && FBDATA.authorityOffices[row.officeId].appointment &&
        Math.floor(row.startTurn / 90) === period;
    })) return;
    var candidates = Object.keys(s.chars).filter(function (id) {
      var c = s.chars[id];
      return id !== s.player.charId && !c.dead && (id === ruler.id ||
        c.royalLine && c.royalLine.realmId === rid ||
        c.role === 'notable' && FB.realmTerritory(s, rid).indexOf(FB.characterResidence(s, c)) >= 0);
    }).sort(function (a, b) {
      return (a === ruler.id ? 1 : 0) - (b === ruler.id ? 1 : 0) || (a < b ? -1 : a > b ? 1 : 0);
    });
    for (var officeId of officeCatalogue(s, rid)) for (var at of FB.officeScopes(s, rid, officeId)) {
      for (var id of candidates) {
        var review = FB.officeAppointmentQuote(s, actor, { institutionId:rid,
          officeId:officeId, holder:{ kind:'character', id:id }, scope:at });
        if (review.allowed && FB.officeSeekAppointment(s, review)) return;
      }
    }
  };
  FB.officeCourtSeason = function (s) {
    if (!FB.systemAvailable(s, 'roman_offices')) return;
    var period = Math.floor(s.turn / 90);
    if (period < 1 || s.officeCourtPeriod === period) return;
    s.officeCourtPeriod = period;
    for (var court of FB.officeCourts(s)) {
      var government = FB.governments.forRealm(s, court.id);
      if (government && typeof government.use.ai.offices === 'function')
        government.use.ai.offices(s, court.id);
    }
  };

  FB.validateAuthorityData = function () {
    var errors = [], offices = FBDATA.authorityOffices,
      sources = FBDATA.legitimacySources, bases = FBDATA.customaryBases,
      governments = FBDATA.governmentForms;
    if (!offices || typeof offices !== 'object') errors.push(FB.T('Authority offices are missing.'));
    else for (var id in offices) if (own(offices, id)) {
      var def = offices[id];
      if (!/^[a-z][a-z0-9_]*$/.test(id) || !def ||
          !Array.isArray(def.powers) ||
          !def.powers.length && (!Array.isArray(def.scopes) ||
            def.scopes.indexOf('realm') < 0) ||
          !Array.isArray(def.scopes) || !def.scopes.length ||
          def.powers.some(function (power) {
            return ['ban','peace','revenue','consent'].indexOf(power) < 0;
          }) || def.scopes.some(function (kind) {
            return ['host','county','realm'].indexOf(kind) < 0;
          }) || def.powers.indexOf('ban') >= 0 &&
          def.scopes.indexOf('host') < 0 ||
          def.powers.some(function (power) {
            return power !== 'ban' && def.scopes.indexOf('county') < 0 && def.scopes.indexOf('realm') < 0;
          }) ||
          ['reaffirm','continues'].indexOf(def.succession) < 0 ||
          !Array.isArray(def.recognitionSources) ||
          def.recognitionSources.some(function (sourceId) {
            return !own(sources, sourceId);
          }) || def.appointment && (!Number.isFinite(def.appointment.gold) || def.appointment.gold < 0 ||
            !Number.isFinite(def.appointment.prestige) || def.appointment.prestige < 0 ||
            FB.SKILLS.indexOf(def.appointment.skill) < 0 ||
            !Number.isFinite(def.appointment.minimum) || def.appointment.minimum < 0 ||
            def.recognitionSources.indexOf('imperial_commission') < 0 ||
            def.appointment.imperialOnly !== undefined && typeof def.appointment.imperialOnly !== 'boolean' ||
            def.appointment.annual !== undefined && typeof def.appointment.annual !== 'boolean'))
        errors.push(FB.T('Invalid authority office {id}.', { id:id }));
    }
    if (!sources || typeof sources !== 'object') errors.push(FB.T('Legitimacy sources are missing.'));
    else for (var source in sources) if (own(sources, source)) {
      if (!/^[a-z][a-z0-9_]*$/.test(source) || !sources[source] ||
          ['reaffirm','continues'].indexOf(sources[source].succession) < 0)
        errors.push(FB.T('Invalid legitimacy source {id}.', { id:source }));
    }
    if (!bases || typeof bases !== 'object') errors.push(FB.T('Customary bases are missing.'));
    else for (var basisId in bases) if (own(bases, basisId)) {
      if (!/^[a-z][a-z0-9_]*$/.test(basisId) || !bases[basisId] ||
          typeof bases[basisId] !== 'object')
        errors.push(FB.T('Invalid customary basis {id}.', { id:basisId }));
    }
    if (!governments || typeof governments !== 'object')
      errors.push(FB.T('Government forms are missing.'));
    else {
      if (!own(governments, 'territorial'))
        errors.push(FB.T('Territorial government form is missing.'));
      /* Each form's strategies are checked by FB.governments.validate. */
      for (var formId in governments) if (own(governments, formId)) {
        if (!/^[a-z][a-z0-9_]*$/.test(formId) || !governments[formId] ||
            typeof governments[formId] !== 'object')
          errors.push(FB.T('Invalid government form {id}.', { id:formId }));
        var catalogue = governments[formId] && governments[formId].officeCatalogue;
        if (catalogue !== undefined && (!Array.isArray(catalogue) || catalogue.some(function (officeId, index) {
          return !offices[officeId] || !offices[officeId].appointment || catalogue.indexOf(officeId) !== index;
        }))) errors.push(FB.T('Invalid office catalogue for government {id}.', { id:formId }));
      }
    }
    if (FB.validateFederateData) errors.push.apply(errors, FB.validateFederateData());
    return errors;
  };

  /* One season is settled once. A failed payment breaches service and never
     creates an unpaid credit; renewal requires both current rulers' consent. */
  FB.authoritySeason = function (s) {
    var period = Math.floor(s.turn / 90);
    for (var row of list(s, 'contracts')) {
      if (row.status === 'offered') {
        if (!Q.contractQuote(s, row).allowed ||
            row.succession.patron !== FB.realmRulerGeneration(s, row.patronRealmId) ||
            row.succession.federate !== FB.realmRulerGeneration(s, row.federateRealmId)) {
          var reason = row.succession.patron !== FB.realmRulerGeneration(s, row.patronRealmId) ||
            row.succession.federate !== FB.realmRulerGeneration(s, row.federateRealmId)
            ? 'ruler_succession' : 'term_ended';
          row.status = 'expired'; contractNotice(s, row, reason);
        }
        continue;
      }
      if (row.status !== 'active') continue;
      if (!activeContract(s, row) ||
          row.succession.patron !== FB.realmRulerGeneration(s, row.patronRealmId) ||
          row.succession.federate !== FB.realmRulerGeneration(s, row.federateRealmId)) {
        var ended = contractReason(s, row);
        row.status = 'expired'; contractNotice(s, row, ended); continue;
      }
      if (period <= row.paidThroughPeriod) continue;
      var payer = FB.treasuryCounterparty(s, row.patronRealmId);
      var payee = FB.treasuryCounterparty(s, row.federateRealmId);
      if (row.payPerSeason > 0 && (!payer || !payee ||
          !Q.permission(s, { kind:'realm', id:row.federateRealmId },
            'collect_service_pay', { contractId:row.id }).allowed ||
          !FB.treasuryTransfer(s, payer, payee, row.payPerSeason))) {
        row.status = 'breached'; contractNotice(s, row, 'unpaid'); continue;
      }
      row.paidThroughPeriod = period;
      row.serviceThroughPeriod = period;
      if (row.templateId && row.payPerSeason) FB.news(s, FB.msg('news.federate.payment',
        '💰 {patron} pays {money:amount} to {federate} for the season’s service.',
        { patron:FB.realmNameParam(s, row.patronRealmId),
          federate:FB.realmNameParam(s, row.federateRealmId), amount:row.payPerSeason }));
    }
    for (var office of list(s, 'appointments')) {
      if (office.status === 'active' && FBDATA.authorityOffices[office.officeId] &&
          FBDATA.authorityOffices[office.officeId].succession === 'reaffirm' &&
          office.appointerGeneration !== FB.realmRulerGeneration(s, office.institutionId)) {
        office.status = 'contested'; office.changedTurn = s.turn;
      } else if (office.status === 'active' && !activeAppointment(s, office) ||
          office.status === 'contested' && (!ref(s, office.holder) ||
            !Q.actor(s, office.appointer) || !within(s, office.institutionId, office.scope) ||
            office.endTurn !== null && office.endTurn <= s.turn)) {
        office.status = 'expired'; office.changedTurn = s.turn;
      }
    }
    if (FB.federateContractSeason) FB.federateContractSeason(s);
    if (FB.officeCourtSeason) FB.officeCourtSeason(s);
  };
  FB.authoritySeedCommunities = function (s, realms, provinces) {
    for (var realm of realms) if (realm.governingIdentity)
      FB.authoritySetIdentity(s, realm.id, realm.governingIdentity);
    for (var pr of provinces) for (var seed of pr.customaryRights || []) {
      FB.authorityEstablishRight(s, { issuer:{ kind:'realm', id:pr.realm },
        beneficiary:{ kind:'realm', id:seed.realmId || pr.realm },
        scope:{ kind:'county', id:pr.id }, power:seed.power, basis:seed.basis,
        basisRef:seed.basisRef });
    }
  };
  FB.authorityYear = function (s) {
    var a = records(s);
    if (a && a.lastCustomYear === s.date.year) return;
    /* Index the yearly possession pass once, rather than scan all saved rights
       for every county. Repeated annual calls cannot manufacture more rights. */
    var possessed = {};
    for (var existing of list(s, 'rights')) if (existing.status === 'active' &&
        existing.basis === 'possession' && existing.beneficiary.kind === 'realm')
      possessed[existing.beneficiary.id + '|' + existing.scope.id + '|' + existing.power] = true;
    for (var pr of FB.world.provs) {
      if (pr.wasteland) continue;
      var rid = FB.settlementCountyHolder(s, pr.id), actor = { kind:'realm', id:rid };
      if (!rid || !Q.actor(s, actor)) continue;
      for (var power of ['peace','revenue']) {
        if (possessed[rid + '|' + pr.id + '|' + power]) continue;
        FB.authorityEstablishRight(s, { issuer:actor, beneficiary:actor,
          scope:{ kind:'county', id:pr.id }, power:power, basis:'possession' });
      }
      var saved = records(s), stored = saved && saved.governments[rid];
      if (stored && stored.legalIdentityId) {
        var local = Q.communityGovernance(s, pr.id);
        if (local.annualSupport) FB.adjustCountySupport(s, pr.id, local.annualSupport);
      }
    }
    a = ensure(s);
    a.lastCustomYear = s.date.year;
    for (var row of list(s, 'rights')) {
      if (row.status !== 'active') continue;
      var held = row.beneficiary.kind === 'realm'
        ? FB.settlementCountyHolder(s, row.scope.id) === row.beneficiary.id
        : FB.holdsSettlementInCounty(s, row.beneficiary, row.scope.id);
      if (row.basis === 'possession' || row.basis === 'tenure') {
        FB.authorityRecordCustom(s, row.id, held ? 'possession' : 'disputed');
      } else if (row.basis === 'recognition') {
        var proof = recognition(s, row.basisRef);
        var recognized = activeRecognition(s, proof) &&
          same(proof.subject, row.beneficiary) && (!proof.scope || same(proof.scope, row.scope)) ? proof : null;
        FB.authorityRecordCustom(s, row.id, recognized ? 'recognition' : 'disputed',
          recognized && recognized.id);
      } else if (row.basis === 'judgment' &&
          (!ref(s, row.issuer) || !within(s, row.issuer.id, row.scope))) {
        FB.authorityRecordCustom(s, row.id, 'disputed');
      }
    }
  };
})();
