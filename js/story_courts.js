/* Reusable political story mechanics. Historical selectors and presentation belong to declarations. */
(function () {
  'use strict';

  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function need(ok, detail) { if (!ok) throw new Error('Invalid political story declaration: ' + detail + '.'); }
  function characterValid(c) {
    return plain(c) && typeof c.name === 'string' && !!c.name &&
      typeof c.culture === 'string' && !!c.culture && typeof c.religion === 'string' && !!c.religion &&
      typeof c.role === 'string' && !!c.role && typeof c.home === 'string' && !!c.home &&
      Number.isInteger(c.age) && c.age >= 0 && Number.isInteger(c.station) && c.station >= 0;
  }
  function choiceOperation(def, id) {
    var keys = Object.keys(def.choices || {});
    for (var key of keys) if (def.choices[key].id === id) return def.choices[key].operation;
    return null;
  }
  function renderChoices(def, keys) {
    return keys.map(function (key) { var row = def.choices[key];
      return { id:row.id, label:FB.T(row.label), detail:FB.T(row.detail, row.detailParams || {}) };
    });
  }
  function stageChoices(s, t, def, context) {
    var stage = def.stages[t.phase], keys = stage ? stage.choices.slice() : [];
    for (var group of stage && stage.groups || []) {
      var p = def.parameters, w = context.world(s), yes = false;
      if (group.visibility === 'service_victory') yes = t.result === 'contested_victory' && s.owner[p.targetProvinceId] === FB.startRealmId(s, p.serviceRealmId);
      if (group.visibility === 'patron_restoration') yes = w && w[p.fields.deposed] && s.owner[p.targetProvinceId] === FB.startRealmId(s, p.patronRealmId);
      if (yes) { keys = keys.concat(group.choices); break; }
    }
    return renderChoices(def, keys);
  }
  function validateParameters(def) {
    need(plain(def.parameters) && plain(def.parameters.fields), 'parameters');
    var p = def.parameters;
    ['patronRealmId','issuerRealmId','claimantRealmId','serviceRealmId','targetProvinceId','retreatProvinceId',
      'senateProvinceId','issuerProvinceId','claimantProvinceId','civicId','churchId','religiousOfficeId',
      'minorityOfficeId','patronHostId','serviceHostId','majorityFaithId','minorityFaithId','civicCultureId',
      'successionSource','commissionSource','acclamationSource','churchSource','civicSource','sovereignOfficeId',
      'judicialOfficeId','commandOfficeId','civicGovernmentForm','civicCareerId','churchCareerId','civicPermission',
      'returnStoryId','officeStoryId','serviceTrackId','civicTrackId','returningClaimant','sittingClaimant',
      'rivalClaimant','retainedResult','contestWarId'].forEach(function (key) {
      need(typeof p[key] === 'string' && !!p[key], 'selector ' + key);
    });
    ['patronRuler','sittingRuler','rival','serviceRuler','returningRuler','commander','delegate','bishop',
      'recipient','senator','minorityBishop','displacedCourt','patronOffice','issuerOffice','serviceAcclamation'].forEach(function (key) {
      need(typeof p.fields[key] === 'string' && !!p.fields[key], 'record role ' + key);
    });
    Object.keys(p).forEach(function (key) {
      if (key === 'fields') { Object.keys(p.fields).forEach(function (role) {
        need(typeof p.fields[role] === 'string' && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(p.fields[role]), 'record field'); }); return; }
      need(typeof p[key] === 'string' && !!p[key] || typeof p[key] === 'number' && Number.isFinite(p[key]) && p[key] >= 0, 'parameter ' + key);
    });
    ['serviceDays','paymentPeriods','returnTurn','backedReturnTurn','returnDeadline','officeReviewTurn','settlementTurn','pressureTurn','settlementIndex'].forEach(function (key) {
      need(Number.isInteger(p[key]) && p[key] >= 0, 'timing or index ' + key);
    });
    need(p.serviceDays > 0 && p.majorityShare <= 1 && p.backedReturnTurn <= p.returnTurn && p.returnTurn < p.returnDeadline, 'window or majority');
    need(typeof p.fields.deposed === 'string' && !!p.fields.deposed, 'displacement record field');
    ['immediatePay','seasonalPay','householdShare','escortPay','registrationFee','prestigeMinimum'].forEach(function (key) {
      need(Number.isFinite(p[key]) && p[key] >= 0, 'cost ' + key);
    });
    need(plain(def.text) && plain(def.news), 'presentation');
    Object.keys(def.text).forEach(function (key) { need(typeof def.text[key] === 'string', 'text'); });
    Object.keys(def.news).forEach(function (key) { var n = def.news[key]; need(plain(n) && typeof n.key === 'string' && typeof n.text === 'string', 'news'); });
  }
  function validateChoices(def, operations) {
    need(plain(def.choices) && plain(def.stages), 'stages and choices');
    var ids = {};
    Object.keys(def.choices).forEach(function (key) {
      var row = def.choices[key];
      need(plain(row) && typeof row.id === 'string' && !!row.id && operations.indexOf(row.operation) >= 0 &&
        typeof row.label === 'string' && typeof row.detail === 'string', 'choice');
      need(!ids[row.id] || ids[row.id] === row.operation, 'ambiguous choice'); ids[row.id] = row.operation;
      need(Object.keys(row).every(function (field) { return ['id','operation','label','detail','detailParams','nextStage'].indexOf(field) >= 0; }), 'choice field');
      need(row.nextStage === undefined || def.type === 'political_track' && typeof row.nextStage === 'string' && !!row.nextStage, 'choice next stage');
    });
    Object.keys(def.stages).forEach(function (phase) {
      var row = def.stages[phase]; need(plain(row) && Array.isArray(row.choices), 'stage');
      function keys(list) { need(Array.isArray(list) && list.every(function (key, i) {
        return !!def.choices[key] && list.indexOf(key) === i; }), 'stage choice'); }
      keys(row.choices);
      (row.groups || []).forEach(function (group) {
        need(plain(group) && ['service_victory','patron_restoration'].indexOf(group.visibility) >= 0, 'visibility'); keys(group.choices);
      });
    });
  }

  FB.storyCourts = { validateParameters:validateParameters, validateChoices:validateChoices, validateLinked:validateLinked,
    choiceOperation:choiceOperation, stageChoices:stageChoices,
    context:function (id) { var story = FB.stories.get(id); return story && story.context; } };
  function courtFactory(def) {
    var p = def.parameters, WORLD = def.id, TRACK = p.serviceTrackId, R = FB.startRealmId;
    function world(s) { return FB.stories.record(s, WORLD); }
    function track(s) {
      var federate = FB.stories.record(s, TRACK);
      if (federate) {
        var view = Object.assign({}, federate);
        view.phase = FB.storyCourts.trackPhase(TRACK, federate);
        return view;
      }
      var civic = FB.stories.record(s, p.civicTrackId);
      return civic && FB.storyCourts.trackPhase(p.civicTrackId, civic) === 'complete'
        ? { phase:'complete', role:'outside', result:'declined' } : null;
    }
    function own(o, key) {
      return !!o && Object.prototype.hasOwnProperty.call(o, key);
    }
    function plain(o) {
      return !!o && typeof o === 'object' && !Array.isArray(o);
    }
    function actor(id) { return { kind:'realm', id:id }; }
    function person(id) { return { kind:'character', id:id }; }
    function host(s, id) {
      for (var row of s.armies || []) if (row.id === id) return row;
      return null;
    }
    function alive(s, id) { return !!(id && s.chars[id] && !s.chars[id].dead); }
    function ruler(s, rid) {
      return rid === 'player' ? s.chars[s.player.charId] :
        FB.realmRulerCharacterSnapshot(s, rid) || FB.materializeRealmRuler(s, rid);
    }
    function recognize(s, source, issuer, subject, at) {
      return FB.authorityRecognize(s, { source:source, issuer:issuer,
        subject:subject, scope:at || null });
    }
    function recognizeOrExisting(s, source, issuer, subject, at) {
      var created = recognize(s, source, issuer, subject, at);
      if (created) return created;
      for (var row of s.authority && s.authority.recognitions || []) {
        if (row.source !== source || row.status !== 'active' ||
            row.issuer.kind !== issuer.kind || row.issuer.id !== issuer.id ||
            row.subject.kind !== subject.kind || row.subject.id !== subject.id ||
            !!row.scope !== !!at || row.scope &&
              (row.scope.kind !== at.kind || row.scope.id !== at.id)) continue;
        FB.authorityRecognitionTransition(s, row.id, 'reaffirm');
        if (FB.political.legitimacy(s, subject, at, source).some(function (live) {
          return live.id === row.id;
        })) return row;
      }
      return null;
    }
    function appointment(s, office, institution, holder, at, recognitionId, endTurn) {
      return FB.authorityAppoint(s, { officeId:office,
        institutionId:institution, appointer:actor(institution),
        holder:holder, scope:at, recognitionId:recognitionId || null,
        endTurn:endTurn });
    }
    function made(s, name, culture, religion, age, station, role, home) {
      var c = FB.makeCharacter(s, { name:name, sex:'m', culture:culture,
        religion:religion, born:s.date.year - age, station:station, role:role,
        quality:2, traitsN:1 });
      c.homeProvinceId = home;
      return c;
    }
    function init(s) {
      var d = FB.stories.definition(s, def).opening, w = JSON.parse(JSON.stringify(d.record));
      for (var row of d.cast) {
        var c;
        if (row.ref) { var cid = FB.stories.resolve(s, row.ref);
          c = cid && s.chars[cid] || (row.ref.realmId && ruler(s, row.ref.realmId)); }
        else if (row.kind === 'royal_member') {
          var member = FB.authoredRoyalMemberSnapshot(s, row.realmId, row.memberId);
          c = member && FB.materializeRoyalMember(s, row.realmId, member.id);
        } else { var a = row.character; c = made(s, a.name, a.culture, a.religion, a.age, a.station, a.role, a.home); }
        if (!c) return null;
        w[row.field] = c.id;
      }
      if (d.family) {
        var parent = s.chars[w[d.family.parentField]], child = s.chars[w[d.family.childField]];
        child.fatherId = parent.id;
        if (parent.childrenIds.indexOf(child.id) < 0) parent.childrenIds.push(child.id);
      }
      d.hosts.forEach(function (army) { army = JSON.parse(JSON.stringify(army)); FB.hostUnits(army); s.armies.push(army); });
      for (var service of (FBDATA.federateServiceStarts || {})[WORLD] || []) {
        var contract = FB.authorityOfferContractTemplate(s, service.templateId, FB.stories.definition(s, service));
        if (contract) FB.federateNegotiateContract(s, contract.id);
      }
      d.heads.forEach(function (row) { s.religiousHeads[row.officeId] = w[row.field]; });
      var claims = {};
      d.authority.forEach(function (row) {
        if (row.kind === 'recognition') {
          claims[row.key] = recognize(s, row.source, actor(row.issuerRealmId), person(w[row.field]),
            row.scopeRealmId ? actor(row.scopeRealmId) : null);
        } else {
          var rec = claims[row.claim];
          var office = FB.authorityAppoint(s, { officeId:row.officeId, institutionId:row.institutionId,
            appointer:actor(row.institutionId), holder:person(w[row.field]), scope:actor(row.institutionId),
            recognitionId:rec && rec.id, contested:row.contested });
          if (row.recordField) w[row.recordField] = office && office.id;
        }
      });
      FB.bookmarkSetupAppointments(s);
      d.seededOffices.forEach(function (row) {
        var office = s.bookmarkSetup.appointments[row.actorId];
        w[row.field] = office.id;
        if (row.proofField) w[row.proofField] = office.recognitionId;
      });
      d.treasuries.forEach(function (row) { if (s.realms[row.realmId].treasury) s.realms[row.realmId].treasury.gold = row.gold; });
      restoreInstitutions(s, w, true);
      FB.news(s, FB.msg(def.news.opening.key, def.news.opening.text, {}));
      return w;
    }
    function serviceTerms(s, w, terms) {
      var policy = terms || p;
      return { patronRealmId:R(s, policy.patronRealmId), federateRealmId:R(s, policy.serviceRealmId),
        hostId:policy.serviceHostId, payPerSeason:policy.seasonalPay, endTurn:s.turn + policy.serviceDays,
        settlementAwards:[{ provinceId:policy.targetProvinceId, settlement:policy.settlementIndex,
          recipientId:w[policy.fields.recipient] }] };
    }

    function currentContract(s, deal) {
      return deal && deal.contractId && FB.political.contract(s, deal.contractId);
    }
    function hasChurchSupport(s, deal, terms) {
      var policy = terms || p;
      return !!(deal && deal.churchRecognitionId &&
        FB.political.legitimacy(s, actor(R(s, policy.serviceRealmId)),
          { kind:'county', id:policy.targetProvinceId }, policy.churchSource).some(function (row) {
            return row.id === deal.churchRecognitionId;
          }));
    }
    function hasCivicConsent(s, deal, terms) {
      var policy = terms || p, institution = s.localInstitutions && s.localInstitutions[policy.civicId];
      if (institution && institution.petitions['realm:' + R(s, policy.serviceRealmId)])
        return FB.localInstitutionConsent(s, policy.civicId, actor(R(s, policy.serviceRealmId)));
      return !!(deal && deal.civicRecognitionId &&
        FB.political.legitimacy(s, actor(R(s, policy.serviceRealmId)),
          { kind:'county', id:policy.targetProvinceId }, policy.civicSource).some(function (row) {
            return row.id === deal.civicRecognitionId;
          }));
    }
    function cityRights(s, w, issuerId, terms) {
      var policy = terms || p;
      if (!alive(s, w[policy.fields.delegate]) || s.owner[policy.targetProvinceId] !== issuerId ||
          FB.countyReligionShare(s, policy.targetProvinceId, policy.majorityFaithId) < policy.majorityShare) return false;
      var rights = FB.localInstitutionRights(s, policy.civicId, issuerId);
      if (!rights) return false;
      w.cityRightIds = rights;
      return true;
    }
    function restoreInstitutions(s, w, fresh) {
      var representatives = {};
      def.opening.institutions.forEach(function (row) { representatives[row.institutionId] = w[row.field]; });
      FB.ensureLocalInstitutions(s, representatives, { fresh:!!fresh });
    }
    function civicSettlement(s, deal, terms) {
      var policy = terms || p;
      return FB.localInstitutionSettle(s, policy.civicId, actor(R(s, policy.serviceRealmId)),
        { courts:true, protection:true, tolerance:true, contractId:deal.contractId });
    }
    function civicPermission(s, w, terms) {
      var policy = terms || p;
      return alive(s, w[policy.fields.delegate]) &&
        FB.political.permission(s, person(w[policy.fields.delegate]),
          policy.civicPermission, { provinceId:policy.targetProvinceId }).allowed;
    }
    function news(s, key, fallback, params) {
      FB.news(s, FB.msg(key, fallback, params || {}));
    }
    function aiSettlement(s, w, t) {
      if (R(s, p.patronRealmId) === 'player' || R(s, p.serviceRealmId) === 'player') return;
      if (!t && FB.stories.record(s, p.civicTrackId)) return;
      if (t && t.result !== 'declined' || s.turn < p.settlementTurn ||
          w.aiResolution === 'negotiated' ||
          w.aiResolution === 'won' ||
          w.aiResolution === 'failed' ||
          w.aiResolution === 'diverged') return;
      if (w.aiResolution === 'war') {
        if (s.owner[p.targetProvinceId] === R(s, p.serviceRealmId)) {
          s.realms[R(s, p.serviceRealmId)].nonTerritorial = false;
          s.realms[R(s, p.serviceRealmId)].capital = p.targetProvinceId;
          if (w[p.fields.patronOffice]) FB.authorityAppointmentTransition(
            s, w[p.fields.patronOffice], 'remove');
          w[p.fields.deposed] = true;
          var acclaim = recognize(s, p.acclamationSource,
            { kind:'host', id:p.serviceHostId }, person(w[p.fields.serviceRuler]));
          w[p.fields.serviceAcclamation] = acclaim && acclaim.id;
          if (alive(s, w[p.fields.bishop]) && alive(s, w[p.fields.delegate]) &&
              FB.countyReligionShare(s, p.targetProvinceId, p.majorityFaithId) >= p.majorityShare) {
            var support = recognize(s, p.churchSource,
              { kind:'religious-office', id:p.religiousOfficeId },
              actor(R(s, p.serviceRealmId)), { kind:'county', id:p.targetProvinceId });
            if (support && cityRights(s, w, R(s, p.serviceRealmId))) {
              FB.authoritySetGovernment(s, R(s, p.serviceRealmId), p.civicGovernmentForm);
              w.governanceResolved = 'civic';
            }
          }
          w.aiResolution = 'won';
          news(s, def.news.message1.key, def.news.message1.text, {});
        } else if (!FB.ordinaryWarById(s, w.aiWarId)) {
          w.aiResolution = 'failed';
        }
        return;
      }
      if (s.owner[p.targetProvinceId] !== R(s, p.patronRealmId) || !alive(s, w[p.fields.serviceRuler]) ||
          !s.realms[R(s, p.serviceRealmId)].alive) {
        w.aiResolution = 'diverged'; return;
      }
      var terms = serviceTerms(s, w);
      var canAgree = alive(s, w[p.fields.commander]) &&
        alive(s, w[p.fields.delegate]) && alive(s, w[p.fields.bishop]) &&
        s.religiousHeads[p.religiousOfficeId] === w[p.fields.bishop] &&
        civicPermission(s, w) &&
        FB.countyReligionShare(s, p.targetProvinceId, p.majorityFaithId) >= p.majorityShare &&
        FB.treasuryAvailable(s, R(s, p.patronRealmId)) >= p.immediatePay &&
        FB.political.contractQuote(s, terms).allowed;
      if (canAgree) {
        var contract = FB.authorityOfferContract(s, terms);
        if (contract && FB.authorityConsentContract(s, contract.id, R(s, p.patronRealmId)) &&
            FB.authorityConsentContract(s, contract.id, R(s, p.serviceRealmId)) &&
            FB.treasuryTransfer(s, R(s, p.patronRealmId), R(s, p.serviceRealmId), p.immediatePay)) {
          w.contractId = contract.id;
          var church = FB.localInstitutionMediate(s, p.churchId, actor(R(s, p.serviceRealmId)), p.targetProvinceId);
          w.churchRecognitionId = church && church.id;
          var civic = civicSettlement(s, w);
          w.civicRecognitionId = civic && civic.recognitionId;
          if (church && civic && cityRights(s, w, R(s, p.patronRealmId))) {
            w.aiResolution = 'negotiated';
            news(s, def.news.message2.key, def.news.message2.text, {});
            return;
          }
        }
        if (contract) FB.authorityContractTransition(
          s, contract.id, 'breach', R(s, p.patronRealmId));
      }
      if (FB.isRealmAtWar(s, R(s, p.patronRealmId)) ||
          FB.isRealmAtWar(s, R(s, p.serviceRealmId))) return;
      var war = FB.registerOrdinaryWar(s, R(s, p.serviceRealmId), {
        enemy:R(s, p.patronRealmId), target:p.targetProvinceId, legacy:false,
        casus:{ type:'border', target:p.targetProvinceId },
        objectives:[{ target:p.targetProvinceId, type:'border' }]
      });
      if (war) {
        w.aiResolution = 'war'; w.aiWarId = war.id;
        news(s, def.news.message3.key, def.news.message3.text, {});
      }
    }
    function reaffirmDelegates(s, w) {
      if (w.civicProofId && alive(s, w[p.fields.delegate]) &&
          s.owner[p.targetProvinceId] === R(s, p.patronRealmId))
        FB.authorityRecognitionTransition(s, w.civicProofId, 'reaffirm');
      if (w.senateProofId && alive(s, w[p.fields.senator]) &&
          s.owner[p.senateProvinceId] === R(s, p.patronRealmId))
        FB.authorityRecognitionTransition(s, w.senateProofId, 'reaffirm');
    }
    function displacedCourts(s, w) {
      w.displacedCourts = w.displacedCourts || {};
      if (w.courtAt === p.targetProvinceId && s.owner[p.targetProvinceId] !== R(s, p.patronRealmId) ||
          w.courtAt === p.retreatProvinceId && s.owner[p.retreatProvinceId] !== R(s, p.patronRealmId)) {
        w.courtAt = 'displaced'; w.courtMove = null;
      }
      for (var rid of Object.keys(FB.stories.definition(s, def).opening.record.courtAnchors)) {
        var realm = s.realms[rid];
        var anchor = w.courtAnchors && w.courtAnchors[rid];
        if (realm && realm.nonTerritorial) continue;
        if (anchor && s.owner[anchor] !== rid)
          w.displacedCourts[rid] = realm && realm.alive &&
            s.owner[realm.capital] === rid ? realm.capital : 'exiled';
        if (rid === R(s, p.patronRealmId) && realm && !realm.alive) {
          w.displacedCourts[R(s, p.patronRealmId)] = 'exiled';
          w.courtAt = 'displaced'; w.courtMove = null;
        }
        if (!realm || !realm.alive || !realm.capital ||
            realm.nonTerritorial && !FB.realmTerritory(s, rid).length ||
            s.owner[realm.capital] === rid) continue;
        var lands = FB.realmTerritory(s, rid).filter(function (pid) {
          return s.owner[pid] === rid;
        }).sort();
        if (!lands.length) {
          w.displacedCourts[rid] = 'exiled';
          if (rid === R(s, p.patronRealmId)) { w.courtAt = 'displaced'; w.courtMove = null; }
          continue;
        }
        realm.capital = lands[0];
        w.displacedCourts[rid] = lands[0];
        if (rid === R(s, p.patronRealmId)) { w.courtAt = 'displaced'; w.courtMove = null; }
        FB.invalidateRealmCache();
      }
    }
    function rulerChoices(s, w) {
      if (R(s, p.serviceRealmId) !== 'player' || s.player.charId !== w[p.fields.serviceRuler] ||
          !alive(s, w[p.fields.serviceRuler]) || s.player.dead || w.rulerInterruptionTurn !== undefined) return [];
      if (s.owner[p.targetProvinceId] === 'player' && !w.governanceResolved)
        return renderChoices(def, def.stages.government.choices);
      if (w.aiResolution || s.owner[p.targetProvinceId] !== R(s, p.patronRealmId)) return [];
      return renderChoices(def, def.stages.opening.choices);
    }
    function rulerQuote(s, w, id) {
      var op = choiceOperation(def, id);
      var terms = serviceTerms(s, w), agreement = FB.political.contractQuote(s, terms);
      var bishop = FB.religiousOfficeSnapshot(s, p.religiousOfficeId);
      var council = s.localInstitutions && s.localInstitutions[p.civicId];
      var petition = council && council.petitions['realm:player'];
      var facts = { turn:s.turn, player:s.player.charId, resolution:w.aiResolution || null,
        interruption:w.rulerInterruptionTurn,
        governance:w.governanceResolved, owner:s.owner[p.targetProvinceId], host:host(s, p.serviceHostId),
        dead:s.player.dead, living:alive(s, w[p.fields.serviceRuler]),
        west:FB.political.actor(s, actor(R(s, p.patronRealmId))),
        patronGeneration:FB.realmRulerGeneration(s, R(s, p.patronRealmId)),
        funds:FB.treasuryAvailable(s, R(s, p.patronRealmId)), agreement:agreement,
        civic:civicPermission(s, w), bishop:bishop && bishop.id,
        representative:council && council.representativeId,
        consent:FB.political.civicConsent(s, p.targetProvinceId),
        councilAgreement:FB.localInstitutionConsent(s, p.civicId, actor('player')),
        councilTerms:petition && petition.terms,
        mediation:FB.localInstitutionMediationQuote(s, p.churchId, actor('player'), p.targetProvinceId),
        institutions:JSON.parse(JSON.stringify(s.localInstitutions)),
        churchHolder:s.religiousHeads[p.religiousOfficeId],
        majority:FB.countyReligionShare(s, p.targetProvinceId, p.majorityFaithId),
        wars:[FB.isRealmAtWar(s, 'player'), FB.isRealmAtWar(s, R(s, p.patronRealmId))] };
      var available = rulerChoices(s, w).some(function (choice) { return choice.id === id; });
      var allowed = available && (op === 'keep_host' || op === 'retain_host_rule' ||
        op === 'contest_capital' && facts.host && facts.host.men > 0 && !facts.wars[0] && !facts.wars[1] ||
        op === 'accept_service' && facts.funds >= p.immediatePay && facts.agreement.allowed &&
          facts.civic && facts.bishop && facts.mediation.allowed &&
          alive(s, w[p.fields.commander]) && facts.majority >= p.majorityShare ||
        op === 'accept_civic_rule' && alive(s, w[p.fields.delegate]) &&
          facts.representative === w[p.fields.delegate] && facts.consent.allowed &&
          facts.councilAgreement && facts.councilTerms.courts &&
          facts.councilTerms.protection && facts.councilTerms.tolerance &&
          facts.bishop && facts.mediation.allowed && facts.majority >= p.majorityShare);
      facts.operation = op;
      facts.terms = JSON.parse(JSON.stringify(p));
      return { id:id, allowed:!!allowed, reason:'ruler_settlement', facts:facts, stamp:JSON.stringify(facts) };
    }
    function rulerApply(s, w, id, reviewed) {
      var op = choiceOperation(def, id);
      var q = rulerQuote(s, w, id);
      if (!q.allowed || !reviewed || reviewed.id !== id || q.stamp !== reviewed.stamp) return false;
      if (op === 'accept_service') {
        var contract = FB.authorityOfferContract(s, serviceTerms(s, w));
        if (!contract || !FB.authorityConsentContract(s, contract.id, R(s, p.patronRealmId)) ||
            !FB.authorityConsentContract(s, contract.id, 'player') ||
            !FB.treasuryTransfer(s, R(s, p.patronRealmId), 'player', p.immediatePay)) return false;
        w.contractId = contract.id; w.aiResolution = 'negotiated';
        var church = FB.localInstitutionMediate(s, p.churchId, actor('player'), p.targetProvinceId);
        w.churchRecognitionId = church && church.id;
        var civic = civicSettlement(s, w); w.civicRecognitionId = civic && civic.recognitionId;
        cityRights(s, w, R(s, p.patronRealmId));
      } else if (op === 'contest_capital') {
        var war = FB.registerOrdinaryWar(s, 'player', { enemy:R(s, p.patronRealmId), target:p.targetProvinceId,
          legacy:false, casus:{ type:'border', target:p.targetProvinceId }, objectives:[{ type:'border', target:p.targetProvinceId }] });
        if (!war) return false;
        w.aiResolution = 'war'; w.aiWarId = war.id;
      } else if (op === 'accept_civic_rule') {
        var support = FB.localInstitutionMediate(s, p.churchId, actor('player'), p.targetProvinceId);
        if (!support || !cityRights(s, w, 'player') || !FB.authoritySetGovernment(s, 'player', p.civicGovernmentForm)) return false;
        w.governanceResolved = 'civic';
      } else if (op === 'retain_host_rule') w.governanceResolved = 'federate';
      else w.aiResolution = 'declined';
      news(s, def.news.message4.key, def.news.message4.text, {});
      return true;
    }
    function day(s, w) {
      var t = track(s);

      if (R(s, p.serviceRealmId) === 'player' && !w.governanceResolved &&
          (!w.aiResolution || ['war','won'].indexOf(w.aiResolution) >= 0 || s.owner[p.targetProvinceId] === 'player') &&
          w.rulerInterruptionTurn === undefined &&
          (!alive(s, w[p.fields.serviceRuler]) || s.player.dead || s.player.charId !== w[p.fields.serviceRuler]))
        w.rulerInterruptionTurn = s.turn;
      if (R(s, p.serviceRealmId) === 'player' && w.aiResolution === 'war') {
        if (s.owner[p.targetProvinceId] === 'player') {
          w.aiResolution = 'won';
          s.realms.player.nonTerritorial = false; s.realms.player.capital = p.targetProvinceId;
          FB.invalidateRealmCache();
        } else if (!FB.ordinaryWarById(s, w.aiWarId)) w.aiResolution = 'failed';
      }
      displacedCourts(s, w);
      reaffirmDelegates(s, w);
      if (w.courtMove === 'travelling') {
        var escort = host(s, p.patronHostId);
        if (escort && escort.at === p.retreatProvinceId && !escort.moveLeft) {
          w.courtAt = p.retreatProvinceId; w.courtMove = null;
          s.realms[R(s, p.patronRealmId)].capital = p.retreatProvinceId;
          FB.invalidateRealmCache();
          if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
          escort.scenarioCourtEscort = false;
          news(s, def.news.message5.key, def.news.message5.text, {});
        } else if (!escort || s.owner[p.retreatProvinceId] !== R(s, p.patronRealmId)) {
          w.courtMove = 'interrupted';
          news(s, def.news.message6.key, def.news.message6.text, {});
        }
      }

      var released = w.courtMove !== 'travelling' && host(s, p.patronHostId);
      if (released && released.scenarioCourtEscort) released.scenarioCourtEscort = false;
      if (!w.pressureNoted && s.turn >= p.pressureTurn && (!t || t.phase !== 'complete')) {
        w.pressureNoted = true;
        news(s, def.news.message7.key, def.news.message7.text, {});
      }
      aiSettlement(s, w, t);
    }

    var TRACK_FIELDS = ['phase', 'role', 'result', 'proposal', 'backedClaimant',
      'contractId', 'lastAllocatedPeriod', 'civicRecognitionId',
      'churchRecognitionId', 'imperialRecognitionId', 'commissionId',
      'awardRequested', 'awardGranted', 'maintenancePaid', 'outcomeTurn',
      'cityOfficeId', 'homoianRecognitionId', 'interfaithRecognitionId',
      'senateRecognitionId', 'veteranMigration'];
    var COURT_DEAL = { contractId:true, churchRecognitionId:true,
      civicRecognitionId:true };
    function migrate(state) {
      var legacy = state[def.legacy.stateField];
      if (!plain(legacy)) return;
      if (state.stories !== undefined && (!plain(state.stories) ||
          own(state.stories, WORLD) || own(state.stories, TRACK))) return;
      var w = {}, t = {}, outside = legacy.role === 'outside';
      for (var key in legacy) if (own(legacy, key)) {
        var mine = TRACK_FIELDS.indexOf(key) >= 0 && !(outside && COURT_DEAL[key]);
        (mine ? t : w)[key] = legacy[key];
      }
      if (typeof t.result === 'string' && t.result.indexOf('ai_') === 0) t.result = 'declined';
      state.stories = state.stories || {};
      state.stories[WORLD] = w;
      state.stories[TRACK] = t;
      delete state[def.legacy.stateField];
    }
    function validate(record, s) {
      function bad(field) {
        throw new Error(FB.T('Invalid v4 save field at {path}.',
          { path:'state.stories.' + WORLD + '.' + field }));
      }
      if (typeof record.courtAt !== 'string') bad('courtAt');
      if (typeof record[p.fields.serviceRuler] !== 'string') bad(p.fields.serviceRuler);
      if (!plain(record[p.fields.displacedCourt]) || typeof record[p.fields.displacedCourt].provinceId !== 'string' ||
          ['displaced','returned','interrupted','diverted'].indexOf(record[p.fields.displacedCourt].status) < 0) bad(p.fields.displacedCourt);
      if (record.railsSchema !== 1 || record.historical !== undefined || record.easternReturn !== undefined) bad('railsSchema');
      var wanted = (FB.campaignBookmark(s) || {}).stories || [];
      for (var id of def.legacyRails)
        if (wanted.indexOf(id) >= 0 && !s.stories[id]) bad('railsSchema');
      if (record.displacedCourts !== undefined && !plain(record.displacedCourts))
        bad('displacedCourts');
      if (record.aiResolution !== undefined &&
          ['negotiated','war','won','failed','diverged','declined'].indexOf(record.aiResolution) < 0) bad('aiResolution');
      if (record.governanceResolved !== undefined && record.governanceResolved !== false &&
          ['civic','federate'].indexOf(record.governanceResolved) < 0) bad('governanceResolved');
      if (record.rulerInterruptionTurn !== undefined &&
          (!Number.isInteger(record.rulerInterruptionTurn) || record.rulerInterruptionTurn < 0 ||
            record.rulerInterruptionTurn > s.turn || record.governanceResolved ||
            R(s, p.serviceRealmId) !== 'player')) bad('rulerInterruptionTurn');
      for (var field of ['aiWarId','restoredClaimantId','restoredCourtId','restoredOfficeId'])
        if (record[field] !== undefined && (typeof record[field] !== 'string' || !record[field])) bad(field);
    }
    var context = {
      world:world, track:track, actor:actor, person:person, host:host, made:made,
      alive:alive, recognize:recognize, recognizeOrExisting:recognizeOrExisting,
      appointment:appointment, serviceTerms:serviceTerms,
      currentContract:currentContract, hasChurchSupport:hasChurchSupport,
      hasCivicConsent:hasCivicConsent, cityRights:cityRights,
      civicPermission:civicPermission, civicSettlement:civicSettlement, news:news
    };
    return { id:WORLD, kind:'world', requires:def.requires, fields:def.opening.cast.map(function (row) { return row.field; }), context:context, requirements:def.requirements, init:init, day:day,
      title:function () { return FB.T(def.text.text12); },
      intro:function () { return FB.T(def.text.text13); },
      status:function (s, w) {
        if (R(s, p.serviceRealmId) !== 'player') return null;
        if (w.rulerInterruptionTurn !== undefined) return { phase:'interrupted',
          name:FB.T(def.text.text14),
          lines:[FB.T(def.text.text15)] };
        return { phase:w.aiResolution || 'opening', name:w.governanceResolved ? FB.T(def.text.text16) :
          w.aiResolution === 'war' ? FB.T(def.text.text17) :
          w.aiResolution === 'negotiated' ? FB.T(def.text.text18) :
          w.aiResolution === 'won' ? FB.T(def.text.text19) :
          w.aiResolution ? FB.T(def.text.text20) : FB.T(def.text.text21), lines:[] };
      },
      choices:rulerChoices, quote:rulerQuote, apply:rulerApply,
      blocker:function () { return FB.T(def.text.text22); },
      validate:validate, migrate:migrate, restore:restoreInstitutions };
  }

  function restorationFactory(def) {
    function cast(s, role) { return FB.stories.resolve(s, def.cast[role]); }
    var p = def.parameters, RETURN = def.id, R = FB.startRealmId, X = FB.storyCourts.context(def.courtStoryId);
    function plain(row) { return !!row && typeof row === 'object' && !Array.isArray(row); }
    function ruler(s, id) {
      id = FB.startRealmId(s, id);
      return id === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s, id);
    }
    function politicalRecord() { return { phase:'pending', result:null, reason:null, outcomeTurn:null }; }
    function end(s, rec, result, reason) {
      rec.phase = 'resolved'; rec.result = result; rec.reason = reason; rec.outcomeTurn = s.turn;
    }
    function bad(id, field) { throw new Error(FB.T('Invalid v4 save field at {path}.',
      { path:'state.stories.' + id + '.' + field })); }
    function validatePolitical(rec, id, results) {
      if (!plain(rec) || ['pending','resolved'].indexOf(rec.phase) < 0) bad(id, 'phase');
      if (rec.phase === 'resolved' ? results.indexOf(rec.result) < 0 : rec.result !== null) bad(id, 'result');
      if (rec.phase === 'resolved' ? !Number.isInteger(rec.outcomeTurn) || rec.outcomeTurn < 0 : rec.outcomeTurn !== null)
        bad(id, 'outcomeTurn');
      if (rec.reason !== null && (typeof rec.reason !== 'string' || !rec.reason)) bad(id, 'reason');
    }
    function restorationInit(s) {
      var rec = politicalRecord();
      def.commanders.forEach(function (row) {
        var a = row.character;
        rec[row.field] = X.made(s, a.name, a.culture, a.religion, a.age, a.station, a.role, a.home).id;
      });
      rec.legacy = false; return rec;
    }
    function restorationDay(s, rec) {
      if (rec.phase === 'resolved') return;
      var w = X.world(s), track = FB.stories.record(s, p.serviceTrackId);
      var sitting = ruler(s, R(s, p.issuerRealmId));
      var cause = !X.alive(s, cast(s, 'returningRuler')) ? 'claimant_dead' :
        !s.realms[R(s, p.issuerRealmId)].alive ? 'court_extinct' :
        !sitting ? 'office_vacant' :
        sitting.id !== cast(s, 'sittingRuler') && sitting.id !== cast(s, 'returningRuler') ? 'court_succeeded' :
        !X.alive(s, cast(s, 'sittingRuler')) && (!sitting || sitting.id !== cast(s, 'returningRuler')) ? 'issuer_dead' :
        !rec.legacy && (def.commanders.some(function (row) { return !X.alive(s, rec[row.field]); })) ? 'commanders_lost' : null;
      if (cause) {
        end(s, rec, 'interrupted', cause); w[p.fields.displacedCourt].status = 'interrupted';
        FB.news(s, FB.msg(def.news.message1.key, def.news.message1.text, {}));
        return;
      }
      if (s.owner[p.issuerProvinceId] !== R(s, p.issuerRealmId)) {
        end(s, rec, 'diverted', 'capital_lost'); w[p.fields.displacedCourt].status = 'diverted';
        FB.news(s, FB.msg(def.news.message2.key, def.news.message2.text, {}));
        return;
      }
      if (sitting.id === cast(s, 'returningRuler')) {
        end(s, rec, 'restored', 'already_returned'); w[p.fields.displacedCourt].status = 'returned'; return;
      }
      var backed = track && track.backedClaimant === p.returningClaimant;
      if (s.turn < (backed ? p.backedReturnTurn : p.returnTurn)) return;
      if (s.turn >= p.returnDeadline) {
        end(s, rec, 'diverted', 'return_window_closed');
        w[p.fields.displacedCourt].status = 'diverted';
        FB.news(s, FB.msg(def.news.message3.key, def.news.message3.text, {}));
        return;
      }
      if (FB.isRealmAtWar(s, R(s, p.issuerRealmId))) return;
      if (!FB.assignRealmRulerCharacter(s, R(s, p.issuerRealmId), cast(s, 'returningRuler'), { replaceAuthored:true })) return;
      var commissionSource = p.commissionSource;

      for (var old of s.authority.recognitions)
        if (old.source === commissionSource && old.status === 'active' &&
            old.issuer.kind === 'realm' && old.issuer.id === R(s, p.issuerRealmId) &&
            old.issuerGeneration !== FB.realmRulerGeneration(s, R(s, p.issuerRealmId)))
          FB.authorityRecognitionTransition(s, old.id, 'revoke');
      FB.authorityAppointmentTransition(s, w[p.fields.issuerOffice], 'remove');
      var claim = X.recognize(s, p.successionSource, X.actor(R(s, p.issuerRealmId)), X.person(cast(s, 'returningRuler')));
      var office = claim && X.appointment(s, p.sovereignOfficeId, R(s, p.issuerRealmId),
        X.person(cast(s, 'returningRuler')), X.actor(R(s, p.issuerRealmId)), claim.id);
      w[p.fields.issuerOffice] = office && office.id;
      if (backed) {
        var commission = X.recognize(s, commissionSource, X.actor(R(s, p.issuerRealmId)),
          X.actor(R(s, p.serviceRealmId)), X.actor(R(s, p.serviceRealmId)));
        track.imperialRecognitionId = commission && commission.id;
      }
      end(s, rec, 'restored', 'commanders_defected');
      w[p.fields.displacedCourt].status = 'returned'; s.chars[cast(s, 'returningRuler')].homeProvinceId = p.issuerProvinceId;
      for (var id of def.commanders.map(function (row) { return rec[row.field]; }))
        if (X.alive(s, id)) s.chars[id].homeProvinceId = s.chars[cast(s, 'returningRuler')].homeProvinceId;
      FB.news(s, FB.msg(def.news.message4.key, def.news.message4.text, {}));
    }
    return { id:def.id, kind:'world', requires:def.requires, fields:def.commanders.map(function (row) { return row.field; }),
      init:restorationInit, day:restorationDay,
      title:function () { return FB.T(def.text.text2); },
      intro:function () { return FB.T(def.text.text3); },
      status:function (s, rec) {
        var names = { restored:FB.T(def.text.text4), interrupted:FB.T(def.text.text5),
          diverted:FB.T(def.text.text6) };
        return { phase:rec.phase, name:names[rec.result] || FB.T(def.text.text7), lines:[] };
      },
      validate:function (rec) {
        validatePolitical(rec, RETURN, ['restored','interrupted','diverted']);
        if (typeof rec.legacy !== 'boolean') bad(RETURN, 'legacy');
        for (var key of def.commanders.map(function (row) { return row.field; }))
          if (rec[key] !== null && (typeof rec[key] !== 'string' || !rec[key])) bad(RETURN, key);
        if (!rec.legacy && def.commanders.some(function (row) { return !rec[row.field]; })) bad(RETURN, def.commanders[0].field);
      } };
  }
  function officeFactory(def) {
    function cast(s, role) { return FB.stories.resolve(s, def.cast[role]); }
    var p = def.parameters, R = FB.startRealmId, OFFICE = def.id, RETURN = p.returnStoryId, PATRON_REALM = p.patronRealmId,
      CAMPAIGNS = def.legacyCampaigns, X = FB.storyCourts.context(def.courtStoryId);
    function plain(row) { return !!row && typeof row === 'object' && !Array.isArray(row); }
    function ruler(s, id) {
      id = FB.startRealmId(s, id);
      return id === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s, id);
    }
    function politicalRecord() { return { phase:'pending', result:null, reason:null, outcomeTurn:null }; }
    function end(s, rec, result, reason) {
      rec.phase = 'resolved'; rec.result = result; rec.reason = reason; rec.outcomeTurn = s.turn;
    }
    function bad(id, field) { throw new Error(FB.T('Invalid v4 save field at {path}.',
      { path:'state.stories.' + id + '.' + field })); }
    function validatePolitical(rec, id, results) {
      if (!plain(rec) || ['pending','resolved'].indexOf(rec.phase) < 0) bad(id, 'phase');
      if (rec.phase === 'resolved' ? results.indexOf(rec.result) < 0 : rec.result !== null) bad(id, 'result');
      if (rec.phase === 'resolved' ? !Number.isInteger(rec.outcomeTurn) || rec.outcomeTurn < 0 : rec.outcomeTurn !== null)
        bad(id, 'outcomeTurn');
      if (rec.reason !== null && (typeof rec.reason !== 'string' || !rec.reason)) bad(id, 'reason');
    }
    function restoreOffice(s, w) {
      if (w[p.fields.patronOffice]) FB.authorityAppointmentTransition(s, w[p.fields.patronOffice], 'remove');
      var claim = X.recognizeOrExisting(s, p.successionSource, X.actor(FB.startRealmId(s, PATRON_REALM)), X.person(cast(s, 'patronRuler')));
      var office = claim && X.appointment(s, p.sovereignOfficeId, FB.startRealmId(s, PATRON_REALM),
        X.person(cast(s, 'patronRuler')), X.actor(FB.startRealmId(s, PATRON_REALM)), claim.id);
      if (!office) return false;
      delete w.restoredClaimantId; delete w.restoredCourtId; delete w.restoredOfficeId;
      w[p.fields.patronOffice] = office.id; w.westernOfficeResolved = 'restored';
      FB.news(s, FB.msg(def.news.message1.key, def.news.message1.text, {}));
      return true;
    }
    X.restoreOffice = restoreOffice;
    function officeDay(s, rec) {
      var w = X.world(s), t = FB.stories.record(s, p.serviceTrackId);
      var result = w.westernOfficeResolved || null, reason = 'reviewed_office';

      if (s.owner[p.targetProvinceId] !== FB.startRealmId(s, PATRON_REALM) && (!w[p.fields.deposed] || w.westernOfficeResolved === 'restored' && !w.restoredClaimantId)) {
        if (w[p.fields.patronOffice]) FB.authorityAppointmentTransition(s, w[p.fields.patronOffice], 'remove');
        w[p.fields.deposed] = true;
        if (w.westernOfficeResolved === 'restored' && !w.restoredClaimantId) { w.westernOfficeResolved = false; result = null; }
      }
      if (w.restoredClaimantId && w.restoredOfficeId && w.westernOfficeResolved === 'restored') {
        var liveClaim = X.alive(s, w.restoredClaimantId) &&
          FB.political.offices(s, X.person(w.restoredClaimantId)).some(function (row) {
            return row.ref.appointmentId === w.restoredOfficeId && row.status === 'active';
          });
        if (s.owner[p.targetProvinceId] !== w.restoredCourtId || !liveClaim) {
          if (s.owner[p.targetProvinceId] !== w.restoredCourtId)
            FB.authorityAppointmentTransition(s, w.restoredOfficeId, 'remove');
          result = s.owner[p.targetProvinceId] !== w.restoredCourtId ? 'deposed' : 'interrupted';
          w.westernOfficeResolved = result;
        }
      }
      if (!result && w[p.fields.deposed]) { result = 'deposed'; reason = 'capital_lost'; }
      // A restored claimant's loss remains its own outcome. The original court
      // must not overwrite that displacement with a separate restoration.
      var independent = (!t || t.role === 'outside') && !w.restoredClaimantId;
      if (independent && w[p.fields.deposed] && s.owner[p.targetProvinceId] === FB.startRealmId(s, PATRON_REALM) &&
          X.alive(s, cast(s, 'patronRuler')) && s.realms[FB.startRealmId(s, PATRON_REALM)].alive &&
          w.westernOfficeResolved !== 'restored' && ruler(s, FB.startRealmId(s, PATRON_REALM)) &&
          ruler(s, FB.startRealmId(s, PATRON_REALM)).id === cast(s, 'patronRuler') && restoreOffice(s, w)) result = 'restored';
      if (!result && rec.phase === 'pending') {
        if (!X.alive(s, cast(s, 'patronRuler')) || !s.realms[FB.startRealmId(s, PATRON_REALM)].alive) {
          result = 'interrupted'; reason = 'holder_or_court_lost';
        } else if (ruler(s, FB.startRealmId(s, PATRON_REALM)) && ruler(s, FB.startRealmId(s, PATRON_REALM)).id !== cast(s, 'patronRuler')) {
          result = 'diverted'; reason = 'court_succeeded';
        } else if (s.turn >= p.officeReviewTurn) {
          var active = FB.political.offices(s, X.person(cast(s, 'patronRuler'))).some(function (row) {
            return row.ref.appointmentId === w[p.fields.patronOffice] && row.status === 'active';
          });
          result = active ? 'survived' : 'interrupted'; reason = active ? 'office_retained' : 'mandate_lapsed';
        }
      }
      if (!result || rec.result === result) return;
      rec.history.push({ result:result, turn:s.turn,
        officeId:w.restoredOfficeId || w[p.fields.patronOffice] || null });
      if (rec.history.length > 12) rec.history.shift();
      end(s, rec, result, reason);
      rec.officeId = w.restoredOfficeId || w[p.fields.patronOffice] || null;
      if (result === 'deposed') FB.news(s, FB.msg(def.news.message2.key, def.news.message2.text, {}));
      if (result === 'survived') FB.news(s, FB.msg(def.news.message3.key, def.news.message3.text, {}));
      if (result === 'interrupted' || result === 'diverted') FB.news(s, FB.msg(def.news.message4.key, def.news.message4.text, {}));
    }
    X.syncOffice = function (s) {
      var rec = FB.stories.record(s, OFFICE);
      if (rec) officeDay(s, rec);
    };

    function migrate(s) {
      var w = s.stories && s.stories[def.courtStoryId];
      if (!w || s[def.legacyStateField] || w.railsSchema !== undefined) return;
      var h = w.historical || {};
      if (!plain(h)) bad(def.courtStoryId, 'historical');
      if (!s.stories[RETURN]) {
        var z = politicalRecord(), old = w.easternReturn || 'pending';
        if (['pending','delayed','restored','interrupted'].indexOf(old) < 0) bad(RETURN, 'phase');
        FB.stories.get(RETURN).declaration.commanders.forEach(function (row) { z[row.field] = null; }); z.legacy = true;
        if (old === 'restored' || old === 'interrupted') end(s, z, old, 'legacy_outcome');
        s.stories[RETURN] = z;
      }
      if (w[p.fields.displacedCourt] === undefined) { w[p.fields.displacedCourt] = JSON.parse(JSON.stringify(def.legacyDisplacedCourt));
        if (s.stories[RETURN].result === 'restored') w[p.fields.displacedCourt].status = 'returned'; }
      for (var key in CAMPAIGNS) {
        var id = CAMPAIGNS[key], campaign = FB.stories.definition(s, FBDATA.storyCampaigns[id]);
        if (s.stories[id]) continue;
        var rec = FB.storyCampaign.fresh(), phase = h[key] || 'pending';
        if (['pending','negotiating','started','won','failed','diverged'].indexOf(phase) < 0) bad(id, 'phase');
        rec.warId = h[key + 'WarId'] || null;
        rec.migrationId = h[key + 'MigrationId'] || null;
        rec.commissionId = h[key + 'CommissionId'] || null;
        var moving = (s.authority && s.authority.migrations || []).filter(function (row) { return row.id === rec.migrationId; })[0];
        rec.contractId = moving && moving.contractId || null;
        rec.settlementApplied = !!h[key + 'Settlement'];
        if (['won','failed','diverged'].indexOf(phase) >= 0) end(s, rec, phase === 'diverged' ? 'diverted' : phase, 'legacy_outcome');
        else if (phase !== 'pending') {
          var war = s.wars && s.wars[rec.warId];
          rec.phase = rec.warId ? 'started' : 'negotiating';
          rec.startedTurn = moving ? moving.startTurn : war ? war.startedTurn : s.turn;
          rec.deadline = moving ? moving.endTurn : rec.startedTurn + campaign.durationDays;
          rec.actorId = campaign.actor.character ? w[campaign.actor.character.field] || null : ruler(s, campaign.actor.realmId) && ruler(s, campaign.actor.realmId).id;
          rec.actorGeneration = FB.realmRulerGeneration(s, campaign.actor.realmId);
          rec.targetOwnerId = war ? war.defender : s.owner[campaign.target.provinceId];
          if (campaign.commission) rec.patronGeneration = FB.realmRulerGeneration(s, campaign.commission.issuerRealmId);
        }
        s.stories[id] = rec;
      }
      if (!s.stories[OFFICE]) {
        var office = politicalRecord(); office.officeId = w[p.fields.patronOffice] || null; office.history = [];
        if (w.westernOfficeResolved || w[p.fields.deposed])
          end(s, office, w.westernOfficeResolved || 'deposed', 'legacy_outcome');
        s.stories[OFFICE] = office;
      }
      delete w.historical; delete w.easternReturn; w.railsSchema = 1;
    }
    return { id:OFFICE, kind:'world', requires:def.requires,
      init:function (s) { var rec = politicalRecord(); rec.officeId = X.world(s)[p.fields.patronOffice] || null; rec.history = []; return rec; },
      day:officeDay, migrate:migrate,
      title:function () { return FB.T(def.text.text2); },
      intro:function () { return FB.T(def.text.text3); },
      status:function (s, rec) {
        var names = { deposed:FB.T(def.text.text4), survived:FB.T(def.text.text5),
          restored:FB.T(def.text.text6), retired:FB.T(def.text.text8),
          interrupted:FB.T(def.text.text9), diverted:FB.T(def.text.text10) };
        names[p.rivalClaimant] = FB.T(def.text.text7);
        return { phase:rec.phase, name:names[rec.result] || FB.T(def.text.text11), lines:[] };
      },
      validate:function (rec, s) {
        validatePolitical(rec, OFFICE, ['deposed','survived','restored',p.rivalClaimant,'retired','interrupted','diverted']);
        if (rec.officeId !== null && typeof rec.officeId !== 'string') bad(OFFICE, 'officeId');
        if (!Array.isArray(rec.history) || rec.history.length > 12) bad(OFFICE, 'history');
        rec.history.forEach(function (row) {
          if (!plain(row) || !Number.isInteger(row.turn) || row.turn < 0 ||
              ['deposed','survived','restored',p.rivalClaimant,'retired','interrupted','diverted'].indexOf(row.result) < 0 ||
              row.officeId !== null && typeof row.officeId !== 'string') bad(OFFICE, 'history');
        });
        if (X.world(s).railsSchema !== 1) bad(def.courtStoryId, 'railsSchema');
        var wanted = (FB.campaignBookmark(s) || {}).stories || [];
        for (var id of def.legacyRails)
          if (wanted.indexOf(id) >= 0 && !s.stories[id]) bad(def.courtStoryId, 'railsSchema');
      } };
  }

  function validateCourt(def) {
    validateParameters(def); validateChoices(def, ['accept_civic_rule','retain_host_rule','accept_service','contest_capital','keep_host']);
    need(def.stages.opening && def.stages.government && Object.keys(def.stages).length === 2, 'court stages');
    var d = def.opening, fields = {};
    need(plain(d) && plain(d.record) && Array.isArray(d.cast) && d.cast.length > 0, 'opening');
    d.cast.forEach(function (row) {
      need(plain(row) && typeof row.field === 'string' && !fields[row.field], 'cast field'); fields[row.field] = true;
      need(row.ref && FB.stories.referenceValid(row.ref, def) || row.kind === 'royal_member' && typeof row.realmId === 'string' && typeof row.memberId === 'string' ||
        row.kind === 'created' && characterValid(row.character), 'cast');
    });
    ['patronRuler','sittingRuler','rival','serviceRuler','returningRuler','commander','delegate',
      'bishop','recipient','senator','minorityBishop'].forEach(function (role) {
      need(fields[def.parameters.fields[role]], 'court cast role ' + role);
    });
    need(d.family === undefined || plain(d.family) && fields[d.family.parentField] && fields[d.family.childField], 'family');
    var claims = {};
    need(Array.isArray(d.authority), 'authority');
    d.authority.forEach(function (row) {
      need(plain(row) && fields[row.field], 'authority actor');
      if (row.kind === 'recognition') { need(typeof row.key === 'string' && !claims[row.key] && typeof row.source === 'string' && typeof row.issuerRealmId === 'string', 'recognition'); claims[row.key] = true; }
      else need(row.kind === 'appointment' && claims[row.claim] && typeof row.officeId === 'string' && typeof row.institutionId === 'string' && typeof row.contested === 'boolean', 'appointment');
    });
    ['hosts','heads','seededOffices','treasuries','institutions'].forEach(function (key) { need(Array.isArray(d[key]), 'opening list'); });
    d.hosts.forEach(function (row) { need(plain(row) && typeof row.id === 'string' && typeof row.realm === 'string' &&
      typeof row.at === 'string' && Number.isInteger(row.men) && row.men > 0 && plain(row.units) &&
      Number.isInteger(row.units.levy) && Number.isInteger(row.units.ret) && row.units.levy + row.units.ret === row.men, 'host'); });
    d.heads.forEach(function (row) { need(plain(row) && typeof row.officeId === 'string' && fields[row.field], 'religious head'); });
    d.institutions.forEach(function (row) { need(plain(row) && typeof row.institutionId === 'string' && fields[row.field], 'institution representative'); });
    d.seededOffices.forEach(function (row) { need(plain(row) && typeof row.actorId === 'string' && typeof row.field === 'string' &&
      (row.proofField === undefined || typeof row.proofField === 'string'), 'seeded appointment'); });
    d.treasuries.forEach(function (row) { need(Number.isFinite(row.gold) && row.gold >= 0, 'treasury'); });
    need(Array.isArray(def.legacyRails) && plain(def.legacy), 'legacy compatibility');
  }
  function validateLinked(def, roles) {
    validateParameters(def);
    need(typeof def.courtStoryId === 'string' && (def.requires || []).indexOf(def.courtStoryId) >= 0, 'court dependency');
    var court = FB.stories.get(def.courtStoryId);
    need(court && court.declaration && court.declaration.type === 'court_settlement', 'court type');
    need(plain(def.cast) && Object.keys(def.cast).every(function (role) {
      return FB.stories.referenceValid(def.cast[role], def);
    }), 'cast references');
    (roles || []).forEach(function (role) { need(!!def.cast[role], 'cast role ' + role); });
  }
  FB.stories.registerType('court_settlement', courtFactory, 'js/story_courts.js', validateCourt);
  FB.stories.registerType('ruler_restoration', restorationFactory, 'js/story_courts.js', function (def) {
    validateLinked(def, ['sittingRuler','returningRuler']); need(Array.isArray(def.commanders) && def.commanders.length > 0, 'commanders');
    var fields = {};
    def.commanders.forEach(function (row) { need(plain(row) && typeof row.field === 'string' && !fields[row.field] &&
      characterValid(row.character), 'commander'); fields[row.field] = true; });
  });
  FB.stories.registerType('contested_office', officeFactory, 'js/story_courts.js', function (def) {
    validateLinked(def, ['patronRuler']); need(plain(def.legacyCampaigns) && Array.isArray(def.legacyRails) && plain(def.legacyDisplacedCourt), 'legacy rails');
  });

})();
