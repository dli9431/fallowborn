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
    while (a.appointments.concat(a.recognitions, a.contracts, a.rights, a.receipts)
      .some(function (row) { return row.id === id; }));
    return id;
  }
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
      otherCultureShare:culture, annualSupport:delta,
      consentSupport:FB.countyPopularSupport(s, pid) + delta };
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
      return !!army && army.realm === rid;
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
          same(prior.scope, at) && activeAppointment(s, prior)) return null;
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
        ref(s, row.appointer) && within(s, row.institutionId, row.scope) &&
        (row.endTurn === null || row.endTurn > s.turn) &&
        (!row.recognitionId ||
          activeRecognition(s, recognition(s, row.recognitionId)))) {
      row.appointerGeneration = FB.realmRulerGeneration(s, row.institutionId);
      row.status = 'active';
    }
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
  function contract(s, id) {
    for (var row of list(s, 'contracts')) if (row.id === id) return row;
    return null;
  }
  Q.contract = function (s, id) {
    var row = contract(s, id);
    return row ? copy(Object.assign({}, row, { effective:activeContract(s, row) })) : null;
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
    var valid = !!(patron && federate && patron.realmId !== federate.realmId &&
      (!terms.recognitionId || acknowledged && activeRecognition(s, acknowledged) &&
        acknowledged.source === 'imperial_commission' &&
        same(acknowledged.issuer, { kind:'realm', id:patron.realmId }) &&
        same(acknowledged.subject, { kind:'realm', id:federate.realmId }) &&
        (!acknowledged.scope ||
          same(acknowledged.scope, { kind:'realm', id:federate.realmId }))) &&
      Number.isFinite(terms.payPerSeason) && terms.payPerSeason >= 0 &&
      (!terms.payPerSeason ||
        FB.treasuryCounterparty(s, patron.realmId) &&
        FB.treasuryCounterparty(s, federate.realmId)) &&
      Number.isInteger(terms.endTurn) && terms.endTurn > s.turn &&
      (!terms.hostId || army && army.realm === federate.realmId) &&
      (!terms.settlementCountyIds || Array.isArray(terms.settlementCountyIds) &&
        terms.settlementCountyIds.every(function (pid) {
          return scope(s, { kind:'county', id:pid }) &&
            s.owner[pid] === FB.topRealm(s, patron.realmId);
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
    else if (action === 'renew' && row.status === 'active' &&
        Number.isInteger(endTurn) && endTurn > row.endTurn) {
      row.status = 'offered'; row.endTurn = endTurn; row.approvals = {};
      row.succession.patron = FB.realmRulerGeneration(s, row.patronRealmId);
      row.succession.federate = FB.realmRulerGeneration(s, row.federateRealmId);
    } else return false;
    row.changedTurn = s.turn;
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
      if (same(office.holder, actor) && office.scope.kind === 'county' &&
          def && def.powers.indexOf(power) >= 0 && activeAppointment(s, office) &&
          out.indexOf(office.scope.id) < 0) out.push(office.scope.id);
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
      if (same(office.holder, a) && same(office.scope, at) &&
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
            return power !== 'ban' && def.scopes.indexOf('county') < 0;
          }) ||
          ['reaffirm','continues'].indexOf(def.succession) < 0 ||
          !Array.isArray(def.recognitionSources) ||
          def.recognitionSources.some(function (sourceId) {
            return !own(sources, sourceId);
          }))
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
      }
    }
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
          row.status = 'expired'; row.changedTurn = s.turn;
        }
        continue;
      }
      if (row.status !== 'active') continue;
      if (!activeContract(s, row) ||
          row.succession.patron !== FB.realmRulerGeneration(s, row.patronRealmId) ||
          row.succession.federate !== FB.realmRulerGeneration(s, row.federateRealmId)) {
        row.status = 'expired'; row.changedTurn = s.turn; continue;
      }
      if (period <= row.paidThroughPeriod) continue;
      var payer = FB.treasuryCounterparty(s, row.patronRealmId);
      var payee = FB.treasuryCounterparty(s, row.federateRealmId);
      if (row.payPerSeason > 0 && (!payer || !payee ||
          !Q.permission(s, { kind:'realm', id:row.federateRealmId },
            'collect_service_pay', { contractId:row.id }).allowed ||
          !FB.treasuryTransfer(s, payer, payee, row.payPerSeason))) {
        row.status = 'breached'; row.changedTurn = s.turn; continue;
      }
      row.paidThroughPeriod = period;
      row.serviceThroughPeriod = period;
    }
    for (var office of list(s, 'appointments')) {
      if (office.status === 'active' && FBDATA.authorityOffices[office.officeId] &&
          FBDATA.authorityOffices[office.officeId].succession === 'reaffirm' &&
          office.appointerGeneration !== FB.realmRulerGeneration(s, office.institutionId)) {
        office.status = 'contested'; office.changedTurn = s.turn;
      } else if (office.status === 'active' && !activeAppointment(s, office) ||
          office.status === 'contested' && office.endTurn !== null &&
            office.endTurn <= s.turn) {
        office.status = 'expired'; office.changedTurn = s.turn;
      }
    }
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
