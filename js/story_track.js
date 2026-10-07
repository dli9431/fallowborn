/* Reusable political story mechanics. Historical selectors and presentation belong to declarations. */
(function () {
  'use strict';
  function service_negotiation(def) {
    function cast(s, role) { return FB.stories.resolve(s, def.cast[role]); }
    function operation(id) { return choiceOperation(def, id); }

    var p = def.parameters, TRACK = def.id, ID = def.id, R = FB.startRealmId, X = FB.storyCourts.context(def.courtStoryId);
    var actor = X.actor, person = X.person, host = X.host, alive = X.alive;
    var recognize = X.recognize, recognizeOrExisting = X.recognizeOrExisting;
    var appointment = X.appointment, news = X.news;
    function init() {
      return {
        phase:def.initialStage, role:'ordinary', result:null,
        proposal:'court_guarantee', backedClaimant:null,
        contractId:null, lastAllocatedPeriod:0,
        civicRecognitionId:null, churchRecognitionId:null,
        imperialRecognitionId:null, commissionId:null,
        awardRequested:false, awardGranted:false, outcomeTurn:null
      };
    }
    function snapshot(s, w, t) {
      var contract = X.currentContract(s, t);
      return {
        turn:s.turn, phase:t.phase,
        patronGeneration:FB.realmRulerGeneration(s, R(s, p.patronRealmId)),
        issuerGeneration:FB.realmRulerGeneration(s, R(s, p.issuerRealmId)),
        serviceGeneration:FB.realmRulerGeneration(s, R(s, p.serviceRealmId)),
        patronTreasury:FB.treasuryAvailable(s, R(s, p.patronRealmId)),
        serviceTreasury:FB.treasuryAvailable(s, R(s, p.serviceRealmId)),
        targetOwner:s.owner[p.targetProvinceId],
        patronHost:host(s, p.patronHostId) && host(s, p.patronHostId).at,
        serviceHost:host(s, p.serviceHostId) && host(s, p.serviceHostId).at,
        church:X.hasChurchSupport(s, t, p), civic:X.civicPermission(s, w, p),
        consent:X.hasCivicConsent(s, t, p),
        contract:contract && contract.status,
        contractAward:t.awardRequested && contract &&
          FB.political.contractAwardQuote(s, t.contractId, 0),
        court:w.courtAt, movement:w.courtMove,
        recipient:alive(s, cast(s, 'recipient')),
        delegate:alive(s, cast(s, 'delegate')),
        majorityBishop:alive(s, cast(s, 'bishop')),
        minorityBishop:alive(s, cast(s, 'minorityBishop')),
        senator:alive(s, cast(s, 'senator')),
        institutionReview:FB.localInstitutionQuote(s, p.civicId, actor(R(s, p.serviceRealmId)),
          'petition', { courts:true, protection:true, tolerance:true, contractId:t.contractId }).stamp,
        mediationReview:FB.localInstitutionMediationQuote(s, p.churchId, actor(R(s, p.serviceRealmId)), p.targetProvinceId).stamp,
        officeResolution:w.westernOfficeResolved,
        governance:w.governanceResolved
      };
    }
    function quote(s, t, id) {
      var op = operation(id);
      var w = X.world(s);
      if (!w) return { id:id, allowed:false, reason:'no_story', facts:null, stamp:'null' };
      var facts = snapshot(s, w, t), allowed = false, reason = null;
      if (op === 'leave_dispute') allowed =
        phase(def, t) !== 'delegate' && phase(def, t) !== 'complete' &&
        phase(def, t) !== 'battle';
      else if (phase(def, t) === 'delegate') {
        allowed = ['accept_delegate','remain_service','refuse_involvement',
          'seek_city_service','seek_church_service'].indexOf(op) >= 0;
        if (op === 'seek_city_service') allowed = facts.delegate &&
          s.owner[p.targetProvinceId] === R(s, p.patronRealmId) && facts.senator;
        if (op === 'seek_church_service') allowed = facts.minorityBishop &&
          s.chars[s.player.charId] &&
          s.chars[s.player.charId].religion === p.minorityFaithId;
      } else if (phase(def, t) === 'civic_service') {
        allowed = op === 'leave_city_service' ||
          op === 'petition_city_office' && facts.delegate &&
            s.owner[p.targetProvinceId] === R(s, p.patronRealmId) &&
            FB.countyReligionShare(s, p.targetProvinceId, p.majorityFaithId) >= p.majorityShare &&
            !t.cityOfficeId &&
            (t.role === 'city_clerk' || !!t.interfaithRecognitionId);
      } else if (phase(def, t) === 'church_service') {
        allowed = op === 'leave_church_service' ||
          op === 'seek_minority_commission' && facts.minorityBishop &&
            s.chars[s.player.charId].religion === p.minorityFaithId &&
            !t.homoianRecognitionId ||
          op === 'mediate_communities' && facts.majorityBishop &&
            facts.minorityBishop && !!t.homoianRecognitionId &&
            s.chars[s.player.charId].religion === p.minorityFaithId &&
            FB.countyReligionShare(s, p.targetProvinceId, p.majorityFaithId) >= p.majorityShare;
      } else if (phase(def, t) === 'commission') {
        allowed = ['seek_commission','back_commander','keep_serving'].indexOf(op) >= 0 &&
          alive(s, cast(s, 'serviceRuler')) && !!host(s, p.serviceHostId);
        if (!allowed) reason = 'no_federate_command';
      } else if (phase(def, t) === 'contract') {
        if (op === 'offer_pay') {
          allowed = !!(alive(s, cast(s, 'commander')) &&
            s.owner[p.targetProvinceId] === R(s, p.patronRealmId) && facts.patronTreasury >= p.immediatePay &&
            host(s, p.serviceHostId) &&
            FB.political.contractQuote(s, X.serviceTerms(s, w, p)).allowed);
          if (!allowed) reason = 'pay_or_patron_unavailable';
        } else allowed = op === 'refuse_pay';
      } else if (phase(def, t) === 'civic') {
        if (op === 'seek_mediation') {
          allowed = !X.hasChurchSupport(s, t, p) && alive(s, cast(s, 'bishop')) &&
            !!s.religiousHeads[p.religiousOfficeId];
        } else if (op === 'revise_civic') {
          allowed = t.proposal !== 'court_guarantee';
        } else if (op === 'renegotiate_pay') {
          allowed = !X.currentContract(s, t) ||
            !X.currentContract(s, t).effective;
        } else if (op === 'present_civic') {
          var contract = X.currentContract(s, t);
          var me = s.chars[s.player.charId];
          allowed = !!(contract && contract.effective && X.civicPermission(s, w, p) &&
            FB.countyCultureShare(s, p.targetProvinceId, p.civicCultureId) >= p.majorityShare &&
            (me && me.religion === p.majorityFaithId || X.hasChurchSupport(s, t, p)) &&
            t.proposal === 'court_guarantee');
          if (!allowed) reason = 'civic_terms_unmet';
        } else allowed = op === 'demand_force' &&
          !!host(s, p.serviceHostId) && alive(s, cast(s, 'serviceRuler'));
      } else if (phase(def, t) === 'recognition') {
        if (op === 'seek_issuer_commission') {
          allowed = alive(s, cast(s, 'sittingRuler')) &&
            FB.realmRulerCharacterSnapshot(s, R(s, p.issuerRealmId)) &&
            FB.realmRulerCharacterSnapshot(s, R(s, p.issuerRealmId)).id === cast(s, 'sittingRuler') &&
            s.owner[p.issuerProvinceId] === R(s, p.issuerRealmId);
        } else if (op === 'back_returning_claimant') {
          var returning = FB.stories.record(s, p.returnStoryId);
          allowed = !!returning && returning.result !== 'interrupted' && returning.result !== 'diverted' &&
            alive(s, cast(s, 'returningRuler')) && !!s.realms[R(s, p.issuerRealmId)].alive;
        } else if (op === 'back_rival_claimant') {
          allowed = alive(s, cast(s, 'rival')) && s.owner[p.claimantProvinceId] === R(s, p.claimantRealmId);
        } else allowed = op === 'forgo_recognition';
        if (!allowed) reason = 'claimant_unavailable';
      } else if (phase(def, t) === 'court') {
        if (op === 'escort_court') {
          var escort = host(s, p.patronHostId);
          allowed = w.courtMove !== 'travelling' && w.courtAt === p.targetProvinceId &&
            !!escort && !!FB.armyOrderPlan(s, escort, p.retreatProvinceId).ok &&
            s.owner[p.retreatProvinceId] === R(s, p.patronRealmId);
        } else if (op === 'request_settlement') {
          var agreement = X.currentContract(s, t);
          allowed = w.courtAt === p.retreatProvinceId && !t.awardRequested &&
            !!(agreement && agreement.effective &&
              FB.political.contractAwardQuote(s, agreement.id, 0));
        } else if (op === 'court_maintenance') {
          allowed = w.courtAt === p.retreatProvinceId && !t.maintenancePaid &&
            FB.treasuryAvailable(s, R(s, p.patronRealmId)) >= p.escortPay;
        } else if (op === 'move_to_ratification') {
          allowed = w.courtAt === p.retreatProvinceId && !!(X.currentContract(s, t) &&
            X.currentContract(s, t).effective && X.hasCivicConsent(s, t, p) &&
            s.owner[p.retreatProvinceId] === R(s, p.patronRealmId));
        } else allowed = op === 'demand_force' &&
          !!host(s, p.serviceHostId) && alive(s, cast(s, 'serviceRuler'));
      } else if (phase(def, t) === 'resolution') {
        if (op === 'ratify') {
          var terms = X.currentContract(s, t);
          allowed = !!(terms && terms.effective && X.hasCivicConsent(s, t, p) &&
            w.courtAt === p.retreatProvinceId && s.owner[p.retreatProvinceId] === R(s, p.patronRealmId) && s.owner[p.targetProvinceId] === R(s, p.patronRealmId) &&
            (!t.awardRequested ||
              FB.political.contractAwardQuote(s, terms.id, 0)));
        } else allowed = op === 'reject_ratification';
      } else if (phase(def, t) === 'battle') {
        allowed = op === 'withdraw' && !!s.realms[R(s, p.serviceRealmId)].war;
      } else if (phase(def, t) === 'aftermath') {
        allowed = op === 'accept_aftermath';
      } else if (phase(def, t) === 'complete') {
        var victorious = t.result === 'contested_victory' &&
          s.owner[p.targetProvinceId] === R(s, p.serviceRealmId);
        if (op === 'adopt_civic_rule') allowed = victorious &&
          !w.governanceResolved && facts.delegate &&
          facts.majorityBishop &&
          FB.countyReligionShare(s, p.targetProvinceId, p.majorityFaithId) >= p.majorityShare;
        else if (op === 'affirm_host_rule') allowed = victorious &&
          !w.governanceResolved;
        else if (op === 'recognize_rival_office') allowed = victorious &&
          !w.westernOfficeResolved && alive(s, cast(s, 'rival')) &&
          s.owner[p.claimantProvinceId] === R(s, p.claimantRealmId) && s.owner[p.senateProvinceId] === R(s, p.patronRealmId) &&
          facts.senator && FB.political.permission(s,
            person(cast(s, 'senator')), p.civicPermission,
            { provinceId:p.senateProvinceId }).allowed;
        else if (op === 'retire_contested_office') allowed = victorious &&
          !w.westernOfficeResolved && s.owner[p.issuerProvinceId] === R(s, p.issuerRealmId);
        else if (op === 'restore_contested_office') allowed =
          w[p.fields.deposed] && w.westernOfficeResolved !== 'restored' &&
          s.owner[p.targetProvinceId] === R(s, p.patronRealmId) && alive(s, cast(s, 'patronRuler')) &&
          !!s.realms[R(s, p.patronRealmId)].alive;
      }
      allowed = allowed && stageChoices(s, t, def, X).some(function (row) { return row.id === id; });
      facts.graph = graph(def);
      allowed = allowed && routeValid(def, t.phase, stageChoice(def, t, id));
      facts.operation = op;
      facts.terms = JSON.parse(JSON.stringify(p));
      return { id:id, allowed:!!allowed, reason:reason,
        facts:facts, stamp:JSON.stringify(facts) };
    }
    function startContest(s, w, t, selected) {
      var federates = s.realms[R(s, p.serviceRealmId)];
      var army = host(s, p.serviceHostId);
      if (!federates || !federates.alive || !army ||
          !alive(s, cast(s, 'serviceRuler')) || federates.war) return false;
      var plan = FB.armyOrderPlan(s, army, p.targetProvinceId);
      if (!plan.ok) return false;
      federates.war = { enemy:R(s, p.patronRealmId), years:0, captures:0,
        casus:{ type:'border' } };
      army.warId = p.contestWarId;
      if (!FB.orderArmy(s, army, p.targetProvinceId, plan)) {
        federates.war = null; return false;
      }
      if (t.contractId) FB.authorityContractTransition(s, t.contractId,
        'breach', R(s, p.serviceRealmId));
      advance(def, t, 'battle', selected); t.result = 'contested';
      news(s, def.news.message1.key, def.news.message1.text, {});
      return true;
    }
    function apply(s, t, id, reviewed) {
      var from = t.phase, selected = stageChoice(def, t, id);
      var op = operation(id);
      var w = X.world(s), now = quote(s, t, id);
      if (!w || !reviewed || !now.allowed ||
          JSON.stringify(now) !== JSON.stringify(reviewed)) return false;
      var rec, office, contract, q, army;
      if (op === 'leave_dispute') {
        advance(def, t, 'complete', selected); t.result = 'interrupted';
        t.outcomeTurn = s.turn;
        news(s, def.news.message2.key, def.news.message2.text, {});
      } else if (op === 'accept_delegate') {
        t.role = 'delegate'; advance(def, t, 'commission', selected);
        news(s, def.news.message3.key, def.news.message3.text, {});
      } else if (op === 'remain_service') {
        advance(def, t, 'commission', selected);
      } else if (op === 'seek_city_service') {
        if (!FB.setCareer(s, s.chars[s.player.charId], p.civicCareerId)) return false;
        t.role = 'city_clerk'; advance(def, t, 'civic_service', selected);
        news(s, def.news.message4.key, def.news.message4.text, {});
      } else if (op === 'seek_church_service') {
        if (!FB.setCareer(s, s.chars[s.player.charId], p.churchCareerId)) return false;
        t.role = 'church_clerk'; advance(def, t, 'church_service', selected);
        news(s, def.news.message5.key, def.news.message5.text, {});
      } else if (op === 'seek_minority_commission') {
        rec = recognize(s, p.churchSource,
          { kind:'religious-office', id:p.minorityOfficeId },
          person(s.player.charId), { kind:'county', id:p.targetProvinceId });
        if (!rec) return false;
        t.homoianRecognitionId = rec.id; t.role = 'church_delegate';
      } else if (op === 'mediate_communities') {
        rec = recognize(s, p.churchSource,
          { kind:'religious-office', id:p.religiousOfficeId },
          person(s.player.charId), { kind:'county', id:p.targetProvinceId });
        if (!rec) return false;
        t.interfaithRecognitionId = rec.id; advance(def, t, 'civic_service', selected);
        news(s, def.news.message6.key, def.news.message6.text, {});
      } else if (op === 'petition_city_office') {
        rec = recognizeOrExisting(s, p.civicSource,
          { kind:'county', id:p.targetProvinceId }, person(s.player.charId),
          { kind:'county', id:p.targetProvinceId });
        if (!rec) return false;
        office = appointment(s, p.judicialOfficeId, R(s, p.patronRealmId),
          person(s.player.charId), { kind:'county', id:p.targetProvinceId }, rec.id);
        if (!office) return false;
        t.cityOfficeId = office.id; advance(def, t, 'complete', selected);
        t.result = t.role === 'city_clerk' ? 'civic_office' : 'church_civic_office';
        t.outcomeTurn = s.turn;
        news(s, def.news.message7.key, def.news.message7.text, {});
      } else if (op === 'leave_city_service' || op === 'leave_church_service') {
        advance(def, t, 'complete', selected); t.result = op === 'leave_city_service'
          ? 'civic_service' : 'church_service'; t.outcomeTurn = s.turn;
      } else if (op === 'refuse_involvement') {
        t.role = 'outside'; advance(def, t, 'complete', selected); t.result = 'declined';
        t.outcomeTurn = s.turn;
      } else if (op === 'seek_commission') {
        rec = recognize(s, p.acclamationSource,
          { kind:'host', id:p.serviceHostId }, person(s.player.charId));
        if (!rec) return false;
        office = appointment(s, p.commandOfficeId, R(s, p.serviceRealmId),
          person(s.player.charId), { kind:'host', id:p.serviceHostId },
          rec.id, s.turn + p.serviceDays);
        if (!office) return false;
        t.commissionId = office.id; t.role = 'commander';
        advance(def, t, 'contract', selected);
        news(s, def.news.message8.key, def.news.message8.text, {});
      } else if (op === 'back_commander') {
        rec = recognize(s, p.acclamationSource,
          { kind:'host', id:p.serviceHostId }, person(cast(s, 'serviceRuler')));
        if (!rec) return false;
        office = appointment(s, p.commandOfficeId, R(s, p.serviceRealmId),
          person(cast(s, 'serviceRuler')), { kind:'host', id:p.serviceHostId },
          rec.id, s.turn + p.serviceDays);
        if (!office) return false;
        advance(def, t, 'contract', selected);
      } else if (op === 'keep_serving') {
        advance(def, t, 'contract', selected);
      } else if (op === 'offer_pay') {
        q = X.serviceTerms(s, w, p);
        contract = FB.authorityOfferContract(s, q);
        if (!contract) return false;
        if (!FB.authorityConsentContract(s, contract.id, R(s, p.patronRealmId)) ||
            !FB.authorityConsentContract(s, contract.id, R(s, p.serviceRealmId)) ||
            !FB.treasuryTransfer(s, R(s, p.patronRealmId), R(s, p.serviceRealmId), p.immediatePay)) {
          FB.authorityContractTransition(s, contract.id, 'breach', R(s, p.patronRealmId));
          return false;
        }
        t.contractId = contract.id; advance(def, t, 'civic', selected);
        news(s, def.news.message9.key, def.news.message9.text,
          { amount:p.immediatePay });
      } else if (op === 'refuse_pay') {
        advance(def, t, 'civic', selected); t.proposal = 'force';
      } else if (op === 'seek_mediation') {
        rec = FB.localInstitutionMediate(s, p.churchId, actor(R(s, p.serviceRealmId)), p.targetProvinceId);
        if (!rec) return false;
        t.churchRecognitionId = rec.id;
        news(s, def.news.message10.key, def.news.message10.text, {});
      } else if (op === 'revise_civic') {
        t.proposal = 'court_guarantee';
      } else if (op === 'renegotiate_pay') {
        advance(def, t, 'contract', selected);
      } else if (op === 'present_civic') {
        rec = X.civicSettlement(s, t, p);
        if (!rec) return false;
        t.civicRecognitionId = rec.recognitionId;
        advance(def, t, 'recognition', selected);
        news(s, def.news.message11.key, def.news.message11.text, {});
      } else if (op === 'seek_issuer_commission' || op === 'back_rival_claimant') {
        var issuerId = op === 'seek_issuer_commission' ? R(s, p.issuerRealmId) : R(s, p.claimantRealmId);
        rec = recognize(s, p.commissionSource, actor(issuerId),
          actor(R(s, p.serviceRealmId)), actor(R(s, p.serviceRealmId)));
        if (!rec) return false;
        t.imperialRecognitionId = rec.id;
        t.backedClaimant = op === 'seek_issuer_commission' ? p.sittingClaimant : p.rivalClaimant;
        advance(def, t, 'court', selected);
      } else if (op === 'back_returning_claimant') {
        t.backedClaimant = p.returningClaimant; advance(def, t, 'court', selected);
        if (FB.stories.record(s, p.returnStoryId) && FB.stories.record(s, p.returnStoryId).result === 'restored' &&
            FB.realmRulerCharacterSnapshot(s, R(s, p.issuerRealmId)) &&
            FB.realmRulerCharacterSnapshot(s, R(s, p.issuerRealmId)).id === cast(s, 'returningRuler')) {
          rec = recognize(s, p.commissionSource, actor(R(s, p.issuerRealmId)),
            actor(R(s, p.serviceRealmId)), actor(R(s, p.serviceRealmId)));
          t.imperialRecognitionId = rec && rec.id;
        }
      } else if (op === 'forgo_recognition') {
        t.backedClaimant = 'none'; advance(def, t, 'court', selected);
      } else if (op === 'escort_court') {
        army = host(s, p.patronHostId);
        if (!army || !FB.orderArmy(s, army, p.retreatProvinceId)) return false;
        army.scenarioCourtEscort = true;
        w.courtMove = 'travelling';
        news(s, def.news.message12.key, def.news.message12.text, {});
      } else if (op === 'court_maintenance') {
        if (!FB.treasuryTransfer(s, R(s, p.patronRealmId), R(s, p.serviceRealmId), p.escortPay)) return false;
        t.maintenancePaid = true;
        news(s, def.news.message13.key, def.news.message13.text, { amount:p.escortPay });
      } else if (op === 'request_settlement') {
        t.awardRequested = true;
      } else if (op === 'move_to_ratification') {
        advance(def, t, 'resolution', selected);
      } else if (op === 'ratify') {
        if (t.awardRequested) {
          contract = X.currentContract(s, t);
          q = FB.political.contractAwardQuote(s, contract.id, 0);
          if (!q || !FB.authorityFulfillContractAward(s, contract.id, 0, q)) return false;
          t.awardGranted = true;
          s.chars[cast(s, 'recipient')].homeProvinceId = p.targetProvinceId;
          t.veteranMigration = { provinceId:p.targetProvinceId, settlement:p.settlementIndex,
            turn:s.turn };
        }
        advance(def, t, 'complete', selected); t.result = 'negotiated';
        t.outcomeTurn = s.turn;
        X.cityRights(s, w, R(s, p.patronRealmId), p);
        news(s, def.news.message14.key, def.news.message14.text, {});
      } else if (op === 'reject_ratification' || op === 'demand_force') {
        if (!startContest(s, w, t, selected)) return false;
      } else if (op === 'withdraw') {
        s.realms[R(s, p.serviceRealmId)].war = null;
        var retreat = host(s, p.serviceHostId);
        if (retreat) { retreat.path = []; retreat.goal = null; retreat.moveLeft = 0; }
        advance(def, t, 'aftermath', selected); t.result = 'contested_withdrawal';
        news(s, def.news.message15.key, def.news.message15.text, {});
      } else if (op === 'accept_aftermath') {
        advance(def, t, 'complete', selected); t.outcomeTurn = s.turn;
      } else if (op === 'adopt_civic_rule') {
        rec = recognizeOrExisting(s, p.churchSource,
          { kind:'religious-office', id:p.religiousOfficeId },
          actor(R(s, p.serviceRealmId)), { kind:'county', id:p.targetProvinceId });
        if (!rec || !X.cityRights(s, w, R(s, p.serviceRealmId), p) ||
            !FB.authoritySetGovernment(s, R(s, p.serviceRealmId), p.civicGovernmentForm)) return false;
        w.governanceResolved = 'civic';
        news(s, def.news.message16.key, def.news.message16.text, {});
      } else if (op === 'affirm_host_rule') {
        w.governanceResolved = 'federate';
        news(s, def.news.message17.key, def.news.message17.text, {});
      } else if (op === 'recognize_rival_office') {
        var senate = recognize(s, p.civicSource,
          { kind:'county', id:p.senateProvinceId }, person(cast(s, 'rival')),
          { kind:'county', id:p.senateProvinceId });
        if (!senate) return false;
        t.senateRecognitionId = senate.id;
        rec = recognize(s, p.commissionSource, actor(R(s, p.claimantRealmId)),
          person(cast(s, 'rival')), actor(R(s, p.patronRealmId)));
        if (!rec) return false;
        office = appointment(s, p.sovereignOfficeId, R(s, p.patronRealmId),
          person(cast(s, 'rival')), actor(R(s, p.patronRealmId)), rec.id);
        if (!office) return false;
        w[p.fields.patronOffice] = office.id; w.westernOfficeResolved = p.rivalClaimant;
        news(s, def.news.message18.key, def.news.message18.text, {});
      } else if (op === 'retire_contested_office') {
        rec = recognizeOrExisting(s, p.commissionSource, actor(R(s, p.issuerRealmId)),
          actor(R(s, p.serviceRealmId)), actor(R(s, p.serviceRealmId)));
        if (!rec) return false;
        t.imperialRecognitionId = rec.id;
        w.westernOfficeResolved = 'retired';
        news(s, def.news.message19.key, def.news.message19.text, {});
      } else if (op === 'restore_contested_office') {
        if (!X.restoreOffice(s, w)) return false;
      } else return false;
      if (t.phase === from) advance(def, t, phase(def, t), selected);
      if (X.syncOffice) X.syncOffice(s);
      if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
      return true;
    }
    function season(s, t) {
      var row = X.currentContract(s, t);
      if (!row || row.status !== 'active' || !s.player.charId ||
          t.role === 'outside') return;
      var period = Math.floor(s.turn / 90);
      if (period <= t.lastAllocatedPeriod || row.paidThroughPeriod !== period ||
          period > Math.floor(row.startTurn / 90) + p.paymentPeriods) return;
      if (FB.treasuryTransfer(s, R(s, p.serviceRealmId), 'player', p.householdShare)) {
        t.lastAllocatedPeriod = period;
        news(s, def.news.message20.key, def.news.message20.text,
          { amount:p.householdShare });
      }
    }

    function day(s, t) {
      var w = X.world(s);
      if (!w) return;
      if (['civic','recognition','court','resolution'].indexOf(phase(def, t)) >= 0) {
        var contract = X.currentContract(s, t);
        if (contract && (!contract.effective || contract.status !== 'active')) {
          advance(def, t, 'contract'); t.civicRecognitionId = null;
          t.awardRequested = false;
          news(s, def.news.message21.key, def.news.message21.text, {});
        } else if (phase(def, t) === 'resolution' &&
            (w.courtAt !== p.retreatProvinceId || s.owner[p.retreatProvinceId] !== R(s, p.patronRealmId) ||
              !X.hasCivicConsent(s, t, p))) {
          advance(def, t, w.courtAt !== p.retreatProvinceId ? 'court' : 'civic');
          news(s, def.news.message22.key, def.news.message22.text, {});
        }
      }
      if (phase(def, t) !== 'battle') return;
      var federates = host(s, p.serviceHostId);
      var italian = host(s, p.patronHostId);
      if (!federates || federates.men <= 0 ||
          !alive(s, cast(s, 'serviceRuler'))) {
        s.realms[R(s, p.serviceRealmId)].war = null;
        advance(def, t, 'aftermath'); t.result = 'contested_defeat';
        news(s, def.news.message23.key, def.news.message23.text, {});
      } else if (federates.at === p.targetProvinceId &&
                 (!italian || italian.men <= 0 || italian.at !== p.targetProvinceId) &&
                 s.owner[p.targetProvinceId] === R(s, p.patronRealmId)) {
        FB.transferProvince(s, p.targetProvinceId, R(s, p.serviceRealmId));
        s.realms[R(s, p.serviceRealmId)].nonTerritorial = false;
        s.realms[R(s, p.serviceRealmId)].capital = p.targetProvinceId;
        s.realms[R(s, p.serviceRealmId)].war = null;
        advance(def, t, 'aftermath'); t.result = 'contested_victory';
        var acclaim = recognize(s, p.acclamationSource,
          { kind:'host', id:federates.id }, person(cast(s, 'serviceRuler')));
        w[p.fields.serviceAcclamation] = acclaim && acclaim.id;
        if (alive(s, cast(s, 'patronRuler')) && w[p.fields.patronOffice]) {
          FB.authorityAppointmentTransition(s, w[p.fields.patronOffice], 'remove');
          w[p.fields.deposed] = true;
        }
        if (X.syncOffice) X.syncOffice(s);
        news(s, def.news.message24.key, def.news.message24.text, {});
      }
    }
    function stageName(phase) { return FB.T(def.stages[phase].name); }
    function choices(s, t) { return stageChoices(s, t, def, X); }
    function statusText(s, w, t) {

      var deal = t.role === 'outside' ? w : t;
      var row = X.currentContract(s, deal), lines = [];
      lines.push(FB.T(def.text.text13, {
        location:w.courtAt === p.retreatProvinceId ? FB.T(def.text.text14) :
          w.courtAt === 'displaced' ? FB.T(def.text.text15) : FB.T(def.text.text16) }));
      lines.push(row ? FB.T(def.text.text17,
        { status:row.status === 'active' ? FB.T(def.text.text18) :
          row.status === 'breached' ? FB.T(def.text.text19) :
          row.status === 'expired' ? FB.T(def.text.text20) : FB.T(def.text.text21),
          amount:row.payPerSeason }) :
        FB.T(def.text.text22));
      lines.push(X.hasCivicConsent(s, deal, p) ? FB.T(def.text.text23) :
        FB.T(def.text.text24));
      if (t.role === 'commander') lines.push(FB.T(def.text.text25));
      if (t.awardGranted) lines.push(FB.T(def.text.text26));
      else if (t.awardRequested) lines.push(FB.T(def.text.text27));
      lines.push(t.imperialRecognitionId ? FB.T(def.text.text28) :
        t.backedClaimant === p.returningClaimant ? FB.T(def.text.text29) :
        FB.T(def.text.text30));
      if (phase(def, t) === 'battle') lines.push(FB.T(def.text.text31));
      if (phase(def, t) === 'complete' && t.result === 'negotiated') lines.push(FB.T(def.text.text32));
      if (phase(def, t) === 'complete' && t.result !== 'negotiated') lines.push(FB.T(def.text.text33));
      if (t.cityOfficeId) lines.push(FB.political.permission(s,
        person(s.player.charId), 'judge', { provinceId:p.targetProvinceId }).allowed
        ? FB.T(def.text.text34)
        : FB.T(def.text.text35));
      if (w.cityRightIds && w.cityRightIds.length) lines.push(FB.T(def.text.text36));
      if (w.governanceResolved === 'civic') lines.push(FB.T(def.text.text37));
      if (w.governanceResolved === 'federate') lines.push(FB.T(def.text.text38));
      if (w.westernOfficeResolved === p.rivalClaimant) lines.push(FB.T(def.text.text39));
      if (w.westernOfficeResolved === 'retired') lines.push(FB.T(def.text.text40));
      if (w.westernOfficeResolved === 'restored') lines.push(FB.T(def.text.text41));
      if (w.aiResolution === 'negotiated') lines.push(FB.T(def.text.text42));
      if (w.aiResolution === 'war') lines.push(FB.T(def.text.text43));
      if (FB.stories.record(s, p.migrationStoryId) && FB.stories.record(s, p.migrationStoryId).phase === 'started') lines.push(FB.T(def.text.text44));
      if (FB.stories.record(s, p.southernStoryId) && FB.stories.record(s, p.southernStoryId).phase === 'started') lines.push(FB.T(def.text.text45));
      if (FB.stories.record(s, p.reconquestStoryId) && FB.stories.record(s, p.reconquestStoryId).phase === 'started') lines.push(FB.T(def.text.text46));
      return lines;
    }
    function status(s, t) {
      var w = X.world(s);
      return w ? { phase:t.phase, name:stageName(t.phase),
        lines:statusText(s, w, t) } : null;
    }
    function blocker(s, t, reason) {
      if (reason === 'pay_or_patron_unavailable')
        return FB.T(def.text.text47);
      if (reason === 'civic_terms_unmet')
        return FB.T(def.text.text48);
      return null;
    }
    function review(s, t, id, reviewed) {
      var op = operation(id);
      if (op !== 'ratify' || !reviewed.facts || !reviewed.facts.contractAward) return [];
      var award = reviewed.facts.contractAward;
      return [FB.T(def.text.text49,
        { income:Math.round(award.net * 10) / 10,
          loss:Math.round(award.lostRevenue * 10) / 10 })];
    }
    function validate(record, s) {
      function bad(field) {
        throw new Error(FB.T('Invalid v4 save field at {path}.',
          { path:'state.stories.' + TRACK + '.' + field }));
      }
      if (['delegate','commission','contract','civic','recognition','court','resolution',
          'battle','aftermath','complete','civic_service','church_service'].indexOf(phase(def, record)) < 0) bad('phase');
      if (['ordinary','delegate','commander','outside','city_clerk','church_clerk',
          'church_delegate'].indexOf(record.role) < 0) bad('role');
      if (record.result !== undefined && [null,'declined','interrupted','negotiated',
          'contested','contested_withdrawal','contested_defeat','contested_victory',
          'civic_office','church_civic_office','civic_service','church_service'].indexOf(record.result) < 0) bad('result');
      if (record.proposal !== undefined && ['court_guarantee','force'].indexOf(record.proposal) < 0) bad('proposal');
      if (record.backedClaimant !== undefined &&
          [null,p.sittingClaimant,p.returningClaimant,p.rivalClaimant,'none'].indexOf(record.backedClaimant) < 0) bad('backedClaimant');
      ['contractId','commissionId','civicRecognitionId','churchRecognitionId',
        'imperialRecognitionId','cityOfficeId','homoianRecognitionId',
        'interfaithRecognitionId','senateRecognitionId'].forEach(function (key) {
        if (record[key] !== undefined && record[key] !== null &&
            (typeof record[key] !== 'string' || !record[key])) bad(key);
      });
      ['awardRequested','awardGranted','maintenancePaid'].forEach(function (key) {
        if (record[key] !== undefined && typeof record[key] !== 'boolean') bad(key);
      });
      if (record.lastAllocatedPeriod !== undefined &&
          (!Number.isInteger(record.lastAllocatedPeriod) || record.lastAllocatedPeriod < 0 ||
            record.lastAllocatedPeriod > Math.floor(s.turn / 90))) bad('lastAllocatedPeriod');
      if (record.outcomeTurn !== undefined && record.outcomeTurn !== null &&
          (!Number.isInteger(record.outcomeTurn) || record.outcomeTurn < 0 ||
            record.outcomeTurn > s.turn)) bad('outcomeTurn');
      if (record.veteranMigration !== undefined) {
        var move = record.veteranMigration;
        if (!move || typeof move !== 'object' || Array.isArray(move) ||
            typeof move.provinceId !== 'string' || !Object.prototype.hasOwnProperty.call(s.owner, move.provinceId) ||
            !Number.isInteger(move.settlement) || move.settlement < 0 ||
            !Number.isInteger(move.turn) || move.turn < 0 || move.turn > s.turn) bad('veteranMigration');
      }
    }
    return { id:def.id, kind:'track', requires:def.requires,
      init:init, day:day, season:season,
      title:function () { return FB.T(def.text.text51); },
      intro:function () { return FB.T(def.text.text52); },
      status:status, choices:choices, quote:quote, blocker:blocker,
      review:review, apply:apply, validate:validate };
  }

  function civic_mandate(def) {
    function cast(s, role) { return FB.stories.resolve(s, def.cast[role]); }
    function operation(id) { return choiceOperation(def, id); }

    var p = def.parameters, TRACK = def.id, ID = def.id, R = FB.startRealmId, X = FB.storyCourts.context(def.courtStoryId);
    function quote(s, t, id) {
      var op = operation(id);
      var w = X.world(s), me = s.chars[s.player.charId];
      var rule = FB.station.promotion(s.player, s), cost = rule && rule.cost;
      var elevation = FB.standingElevationStatus(s, null, null, true);
      var ref = X.person(s.player.charId), offices = FB.political.offices(s, ref);
      var occupied = (s.authority.appointments || []).filter(function (row) {
        return row.officeId === p.judicialOfficeId && row.institutionId === R(s, p.patronRealmId) &&
          row.scope.kind === 'county' && row.scope.id === p.targetProvinceId &&
          FB.political.offices(s, row.holder).some(function (o) {
            return o.ref.appointmentId === row.id && o.status === 'active';
          });
      }).map(function (row) { return row.id; });
      var facts = { phase:t.phase, charId:me && me.id, dead:!me || !!me.dead,
        province:s.player.provinceId, travel:!!s.player.travel, tier:s.player.tier,
        context:FB.station.context(s.player, s),
        rule:rule,
        elevation:elevation && elevation.stamp, occupied:occupied,
        owner:s.owner[p.targetProvinceId], holder:s.holder[p.targetProvinceId],
        generation:FB.realmRulerGeneration(s, R(s, p.patronRealmId)),
        court:!!FB.political.actor(s, X.actor(R(s, p.patronRealmId))),
        religion:me && me.religion,
        delegate:w && X.alive(s, cast(s, 'delegate')),
        bishop:w && X.alive(s, cast(s, 'bishop')),
        majority:FB.countyReligionShare(s, p.targetProvinceId, p.majorityFaithId),
        gold:s.player.gold, prestige:s.player.prestige,
        offices:offices.map(function (o) { return [o.ref.appointmentId, o.status]; }) };
      var allowed = phase(def, t) === 'opening' && !facts.dead &&
        (op === 'keep_household' || op === 'serve_council' && FB.station.isGentry(s.player, s) &&
          facts.province === p.targetProvinceId && !facts.travel && facts.owner === R(s, p.patronRealmId) &&
          facts.holder === R(s, p.patronRealmId) && facts.court && facts.delegate && facts.bishop && facts.religion === p.majorityFaithId &&
          facts.majority >= p.majorityShare && !occupied.length && elevation && elevation.ready &&
          cost && facts.gold >= p.registrationFee + cost.gold &&
          facts.prestige >= Math.max(p.prestigeMinimum, cost.prestige) && s.player.piety >= cost.piety);
      allowed = allowed && stageChoices(s, t, def, X).some(function (row) { return row.id === id; });
      facts.graph = graph(def);
      allowed = allowed && routeValid(def, t.phase, stageChoice(def, t, id));
      facts.operation = op;
      facts.terms = JSON.parse(JSON.stringify(p));
      return { id:id, allowed:!!allowed, reason:'civic_opening', facts:facts, stamp:JSON.stringify(facts) };
    }
    function apply(s, t, id, reviewed) {
      var from = t.phase, selected = stageChoice(def, t, id);
      var op = operation(id);
      var q = quote(s, t, id);
      if (!q.allowed || !reviewed || reviewed.id !== id || q.stamp !== reviewed.stamp) return false;
      if (op === 'serve_council') {
        var ref = X.person(s.player.charId), at = { kind:'county', id:p.targetProvinceId };
        var rec = X.recognizeOrExisting(s, p.civicSource, at, ref, at);
        if (!rec) return false;
        var office = X.appointment(s, p.judicialOfficeId, R(s, p.patronRealmId), ref, at, rec.id);
        if (!office) return false;
        var elevation = FB.standingElevationStatus(s);
        if (!elevation || !elevation.ready || !FB.claimRankElevation(s,
          FB.rankElevationContext(s, elevation), { combinedResult:true })) return false;
        s.player.gold -= p.registrationFee;
        t.officeId = office.id;
        t.result = 'civic_mandate';
        FB.news(s, FB.msg(def.news.message1.key, def.news.message1.text, {}));
      } else t.result = 'household';
      advance(def, t, 'complete', selected); t.outcomeTurn = s.turn;
      if (t.phase === from) advance(def, t, phase(def, t), selected);
      return true;
    }
    return { id:def.id, kind:'track', requires:def.requires,
      init:function () { return { phase:def.initialStage, result:null, officeId:null, outcomeTurn:null }; },
      title:function () { return FB.T(def.text.text1); },
      intro:function () { return FB.T(def.text.text2); },
      status:function (s, t) {
        return { phase:t.phase, name:FB.T(def.stages[t.phase].name),
          lines:t.officeId ? [FB.political.offices(s, X.person(s.player.charId)).some(function (o) {
            return o.ref.appointmentId === t.officeId && o.status === 'active';
          }) ? FB.T(def.text.text5) : FB.T(def.text.text6)] : [] };
      },
      choices:function (s, t) { return stageChoices(s, t, def, X); },
      quote:quote, apply:apply,
      review:function (s, t, id) {
        var op = operation(id);
        if (op !== 'serve_council') return [];
        var rule = FB.station.promotion(s.player, s), cost = rule && rule.cost;
        return cost ? [FB.T(def.text.text7,
          { amount:p.registrationFee + cost.gold, prestige:cost.prestige, piety:cost.piety })] : [];
      },
      blocker:function (s) {
        var rule = FB.station.promotion(s.player, s), cost = rule && rule.cost;
        return FB.T(def.text.text8,
          { amount:p.registrationFee + (cost ? cost.gold : 0), prestige:Math.max(p.prestigeMinimum, cost ? cost.prestige : 0) });
      },
      validate:function (t) {
        if (['opening','complete'].indexOf(phase(def, t)) < 0 ||
            [null,'civic_mandate','household'].indexOf(t.result) < 0 ||
            t.officeId !== null && typeof t.officeId !== 'string' ||
            t.outcomeTurn !== null && (!Number.isInteger(t.outcomeTurn) || t.outcomeTurn < 0))
          throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + TRACK }));
      }
    };
  }

  function claim_restoration(def) {
    function cast(s, role) { return FB.stories.resolve(s, def.cast[role]); }
    function operation(id) { return choiceOperation(def, id); }

    var p = def.parameters, TRACK = def.id, ID = def.id, R = FB.startRealmId, X = FB.storyCourts.context(def.courtStoryId);
    function quote(s, t, id) {
      var op = operation(id);
      var w = X.world(s), ref = X.person(t.claimantId), owner = s.owner[p.targetProvinceId];
      var senate = X.alive(s, cast(s, 'senator')) && FB.political.permission(s,
        X.person(cast(s, 'senator')), p.civicPermission, { provinceId:p.senateProvinceId }).allowed;
      var east = FB.political.actor(s, X.actor(R(s, p.issuerRealmId)));
      var claim = FB.political.legitimacy(s, ref, null, p.commissionSource).filter(function (row) {
        return row.scope && row.scope.kind === 'realm' &&
          [R(s, p.patronRealmId),'player'].indexOf(row.scope.id) >= 0;
      });
      var facts = { phase:t.phase, claimant:t.claimantId, player:s.player.charId,
        dead:!X.alive(s, t.claimantId) || !!s.player.dead, turn:s.turn,
        owner:owner, holder:s.holder[p.targetProvinceId], senate:!!senate,
        senateId:cast(s, 'senator'), east:east && east.characterId,
        issuerGeneration:FB.realmRulerGeneration(s, R(s, p.issuerRealmId)),
        playerGeneration:FB.realmRulerGeneration(s, 'player'),
        at:s.player.provinceId, travel:!!s.player.travel,
        recognition:claim.map(function (row) { return row.id; }),
        appointments:s.authority.appointments, wars:[FB.isRealmAtWar(s, 'player'), FB.isRealmAtWar(s, owner)] };
      var live = !facts.dead && facts.player === t.claimantId &&
        ['complete','interrupted'].indexOf(phase(def, t)) < 0;
      var allowed = live && (op === 'retain_domain' ||
        op === 'seek_recognition' && (phase(def, t) === 'opening' || claim.length === 0) && !!east && senate ||
        op === 'restore_by_campaign' && phase(def, t) === 'claim' && claim.length > 0 &&
          owner && owner !== 'player' && !facts.wars[0] && !facts.wars[1] ||
        op === 'confirm_restoration' && ['claim','campaign'].indexOf(phase(def, t)) >= 0 &&
          owner === 'player' && !facts.travel && claim.length > 0);
      allowed = allowed && stageChoices(s, t, def, X).some(function (row) { return row.id === id; });
      facts.graph = graph(def);
      allowed = allowed && routeValid(def, t.phase, stageChoice(def, t, id));
      facts.operation = op;
      facts.terms = JSON.parse(JSON.stringify(p));
      return { id:id, allowed:!!allowed, reason:'western_claim', facts:facts, stamp:JSON.stringify(facts) };
    }
    function apply(s, t, id, reviewed) {
      var from = t.phase, selected = stageChoice(def, t, id);
      var op = operation(id);
      var q = quote(s, t, id), w = X.world(s), ref = X.person(t.claimantId);
      if (!q.allowed || !reviewed || reviewed.id !== id || q.stamp !== reviewed.stamp) return false;
      if (op === 'retain_domain') { advance(def, t, 'complete', selected); t.result = p.retainedResult; t.outcomeTurn = s.turn; }
      else if (op === 'seek_recognition') {
        var east = X.recognizeOrExisting(s, p.commissionSource, X.actor(R(s, p.issuerRealmId)),
          ref, X.actor(s.realms[R(s, p.patronRealmId)] && s.realms[R(s, p.patronRealmId)].alive ? R(s, p.patronRealmId) : 'player'));
        var senate = X.recognizeOrExisting(s, p.civicSource, { kind:'county', id:p.senateProvinceId },
          ref, { kind:'county', id:p.senateProvinceId });
        if (!east || !senate) return false;
        t.recognitionId = east.id; t.senateRecognitionId = senate.id;
        if (phase(def, t) !== 'campaign') advance(def, t, 'claim', selected);
        w.westernOfficeResolved = p.rivalClaimant;
        X.syncOffice(s);
        FB.news(s, FB.msg(def.news.message1.key, def.news.message1.text, {}));
      } else if (op === 'restore_by_campaign') {
        var war = FB.registerOrdinaryWar(s, 'player', { enemy:s.owner[p.targetProvinceId], target:p.targetProvinceId,
          legacy:false, casus:{ type:'border', target:p.targetProvinceId }, objectives:[{ type:'border', target:p.targetProvinceId }] });
        if (!war) return false;
        t.warId = war.id; advance(def, t, 'campaign', selected);
      } else if (op === 'confirm_restoration') {
        var rec = X.recognizeOrExisting(s, p.commissionSource, X.actor(R(s, p.issuerRealmId)),
          ref, X.actor('player'));
        var office = rec && X.appointment(s, p.sovereignOfficeId, 'player', ref, X.actor('player'), rec.id);
        if (!office) return false;
        t.officeId = office.id; advance(def, t, 'complete', selected); t.result = 'restored'; t.outcomeTurn = s.turn;
        w.restoredClaimantId = t.claimantId; w.restoredCourtId = 'player';
        w.restoredOfficeId = office.id; w.westernOfficeResolved = 'restored';
        X.syncOffice(s);
        FB.news(s, FB.msg(def.news.message2.key, def.news.message2.text, {}));
      }
      if (t.phase === from) advance(def, t, phase(def, t), selected);
      return true;
    }
    return { id:def.id, kind:'track', requires:def.requires,
      init:function (s) { return { phase:def.initialStage, result:null, claimantId:s.player.charId,
        recognitionId:null, senateRecognitionId:null, warId:null, officeId:null, outcomeTurn:null }; },
      title:function () { return FB.T(def.text.text1); },
      intro:function () { return FB.T(def.text.text2); },
      status:function (s, t) {
        return { phase:t.phase, name:t.result === 'restored' ? FB.T(def.text.text8) : FB.T(def.stages[t.phase].name),
          lines:[FB.T(def.text.text9)] };
      },
      choices:function (s, t) { return stageChoices(s, t, def, X); },
      quote:quote, apply:apply,
      blocker:function () { return FB.T(def.text.text10); },
      day:function (s, t) {
        if (['complete','interrupted'].indexOf(phase(def, t)) >= 0) return;
        if (!X.alive(s, t.claimantId) || s.player.charId !== t.claimantId) {
          advance(def, t, 'interrupted'); t.result = 'interrupted'; t.outcomeTurn = s.turn;
        } else if (phase(def, t) === 'campaign' && !FB.ordinaryWarById(s, t.warId) && s.owner[p.targetProvinceId] !== 'player') {
          advance(def, t, 'claim'); t.warId = null;
        }
      },
      validate:function (t) {
        var valid = ['opening','claim','campaign','complete','interrupted'].indexOf(phase(def, t)) >= 0 &&
          [null,p.retainedResult,'restored','interrupted'].indexOf(t.result) >= 0 && typeof t.claimantId === 'string';
        ['recognitionId','senateRecognitionId','warId','officeId'].forEach(function (key) {
          if (t[key] !== null && (typeof t[key] !== 'string' || !t[key])) valid = false;
        });
        if (t.outcomeTurn !== null && (!Number.isInteger(t.outcomeTurn) || t.outcomeTurn < 0) ||
            ['complete','interrupted'].indexOf(phase(def, t)) >= 0 && (!t.result || t.outcomeTurn === null) ||
            ['complete','interrupted'].indexOf(phase(def, t)) < 0 && (t.result !== null || t.outcomeTurn !== null) ||
            phase(def, t) === 'campaign' && !t.warId ||
            t.result === 'restored' && !t.officeId ||
            ['claim','campaign'].indexOf(phase(def, t)) >= 0 && (!t.recognitionId || !t.senateRecognitionId)) valid = false;
        if (!valid) throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + ID }));
      }
    };
  }

  var choiceOperation = FB.storyCourts.choiceOperation, stageChoices = FB.storyCourts.stageChoices;
  var profiles = { service_negotiation:service_negotiation, civic_mandate:civic_mandate, claim_restoration:claim_restoration };
  var mechanics = {
    service_negotiation:['delegate','civic_service','church_service','commission','contract','civic','recognition','court','resolution','battle','aftermath','complete'],
    civic_mandate:['opening','complete'], claim_restoration:['opening','claim','campaign','complete','interrupted']
  };
  /* Closed transaction contracts describe mechanics and required participants.
     They do not prescribe authored stage ids, stage counts or choice ordering. */
  var contracts = { service_negotiation:{}, civic_mandate:{}, claim_restoration:{} };
  function contract(profile, operations, from, to, roles) {
    operations.forEach(function (op) {
      contracts[profile][op] = { from:from, to:to, roles:roles || [] };
    });
  }
  contract('service_negotiation', ['accept_delegate','remain_service'], ['delegate'], 'commission');
  contract('service_negotiation', ['refuse_involvement'], ['delegate'], 'complete');
  contract('service_negotiation', ['seek_city_service'], ['delegate'], 'civic_service', ['delegate','senator']);
  contract('service_negotiation', ['seek_church_service'], ['delegate'], 'church_service', ['minorityBishop']);
  contract('service_negotiation', ['leave_dispute'], ['civic_service','church_service','commission','contract','civic','recognition','court','resolution','aftermath'], 'complete');
  contract('service_negotiation', ['petition_city_office'], ['civic_service'], 'complete', ['delegate']);
  contract('service_negotiation', ['leave_city_service'], ['civic_service'], 'complete');
  contract('service_negotiation', ['leave_church_service'], ['church_service'], 'complete');
  contract('service_negotiation', ['seek_minority_commission'], ['church_service'], null, ['minorityBishop']);
  contract('service_negotiation', ['mediate_communities'], ['church_service'], 'civic_service', ['bishop','minorityBishop']);
  contract('service_negotiation', ['seek_commission','back_commander','keep_serving'], ['commission'], 'contract', ['serviceRuler']);
  contract('service_negotiation', ['offer_pay'], ['contract'], 'civic', ['commander','recipient']);
  contract('service_negotiation', ['refuse_pay'], ['contract'], 'civic');
  contract('service_negotiation', ['seek_mediation'], ['civic'], null, ['bishop']);
  contract('service_negotiation', ['revise_civic'], ['civic'], null);
  contract('service_negotiation', ['renegotiate_pay'], ['civic'], 'contract');
  contract('service_negotiation', ['present_civic'], ['civic'], 'recognition');
  contract('service_negotiation', ['demand_force'], ['civic','court'], 'battle', ['serviceRuler']);
  contract('service_negotiation', ['seek_issuer_commission'], ['recognition'], 'court', ['sittingRuler']);
  contract('service_negotiation', ['back_returning_claimant'], ['recognition'], 'court', ['returningRuler']);
  contract('service_negotiation', ['back_rival_claimant'], ['recognition'], 'court', ['rival']);
  contract('service_negotiation', ['forgo_recognition'], ['recognition'], 'court');
  contract('service_negotiation', ['escort_court','court_maintenance'], ['court'], null);
  contract('service_negotiation', ['request_settlement'], ['court'], null, ['recipient']);
  contract('service_negotiation', ['move_to_ratification'], ['court'], 'resolution');
  contract('service_negotiation', ['ratify'], ['resolution'], 'complete');
  contract('service_negotiation', ['reject_ratification'], ['resolution'], 'battle', ['serviceRuler']);
  contract('service_negotiation', ['withdraw'], ['battle'], 'aftermath');
  contract('service_negotiation', ['accept_aftermath'], ['aftermath'], 'complete');
  contract('service_negotiation', ['adopt_civic_rule'], ['complete'], null, ['delegate','bishop']);
  contract('service_negotiation', ['affirm_host_rule'], ['complete'], null);
  contract('service_negotiation', ['recognize_rival_office'], ['complete'], null, ['rival','senator']);
  contract('service_negotiation', ['retire_contested_office'], ['complete'], null);
  contract('service_negotiation', ['restore_contested_office'], ['complete'], null, ['patronRuler']);
  contract('civic_mandate', ['serve_council'], ['opening'], 'complete', ['delegate','bishop']);
  contract('civic_mandate', ['keep_household'], ['opening'], 'complete');
  contract('claim_restoration', ['retain_domain'], ['opening','claim','campaign'], 'complete');
  contract('claim_restoration', ['seek_recognition'], ['opening','claim','campaign'], null, ['senator']);
  contract('claim_restoration', ['restore_by_campaign'], ['claim'], 'campaign');
  contract('claim_restoration', ['confirm_restoration'], ['claim','campaign'], 'complete');

  function own(o, key) { return !!o && Object.prototype.hasOwnProperty.call(o, key); }
  function phase(def, t) {
    return typeof t.phase === 'string' && own(def.stages, t.phase) ? def.stages[t.phase].mechanic : null;
  }
  function stageKeys(stage) {
    var keys = stage.choices.slice();
    (stage.groups || []).forEach(function (group) { keys = keys.concat(group.choices); });
    return keys;
  }
  function stageChoice(def, t, id) {
    var stage = def.stages[t.phase];
    if (!stage) return null;
    var keys = stageKeys(stage);
    for (var key of keys) if (def.choices[key].id === id) return def.choices[key];
    return null;
  }
  function target(def, stageId, mechanic, choice) {
    var stage = def.stages[stageId];
    return choice && choice.nextStage || stage && stage.transitions && stage.transitions[mechanic] ||
      (stage && stage.mechanic === mechanic ? stageId : def.phaseStages[mechanic]);
  }
  function targetValid(def, stageId, mechanic, choice) {
    var id = target(def, stageId, mechanic, choice);
    return own(def.stages, id) && def.stages[id].mechanic === mechanic;
  }
  function outcome(def, mechanic, choice) {
    if (def.profile === 'claim_restoration' && choice.operation === 'seek_recognition')
      return mechanic === 'campaign' ? mechanic : 'claim';
    return contracts[def.profile][choice.operation].to || mechanic;
  }
  function routeValid(def, stageId, choice) {
    var stage = def.stages[stageId], c = choice && contracts[def.profile][choice.operation];
    return !!stage && !!c && c.from.indexOf(stage.mechanic) >= 0 &&
      targetValid(def, stageId, outcome(def, stage.mechanic, choice), choice);
  }
  function advance(def, t, mechanic, choice) {
    var id = target(def, t.phase, mechanic, choice);
    if (!targetValid(def, t.phase, mechanic, choice)) throw new Error('Invalid political track transition.');
    t.phase = id;
  }
  function graph(def) {
    return JSON.parse(JSON.stringify({ stages:def.stages, phaseStages:def.phaseStages, choices:def.choices, cast:def.cast }));
  }
  function autonomous(def, mechanic) {
    if (def.profile === 'claim_restoration') return mechanic === 'campaign' ? ['claim','interrupted'] :
      ['opening','claim'].indexOf(mechanic) >= 0 ? ['interrupted'] : [];
    if (def.profile !== 'service_negotiation') return [];
    if (mechanic === 'battle') return ['aftermath'];
    if (mechanic === 'resolution') return ['contract','court','civic'];
    return ['civic','recognition','court'].indexOf(mechanic) >= 0 ? ['contract'] : [];
  }
  function validateTrack(def) {
    function need(ok, field) { if (!ok) throw new Error('Invalid political track declaration: ' + field + '.'); }
    need(own(profiles, def.profile), 'profile');
    FB.storyCourts.validateChoices(def, Object.keys(contracts[def.profile]));
    need(def.phaseStages && typeof def.phaseStages === 'object' && !Array.isArray(def.phaseStages), 'phase stages');
    need(typeof def.initialStage === 'string' && own(def.stages, def.initialStage) && def.stages[def.initialStage].mechanic ===
      (def.profile === 'service_negotiation' ? 'delegate' : 'opening'), 'initial stage');
    Object.keys(def.phaseStages).forEach(function (mechanic) {
      need(mechanics[def.profile].indexOf(mechanic) >= 0 && typeof def.phaseStages[mechanic] === 'string' && own(def.stages, def.phaseStages[mechanic]) &&
        def.stages[def.phaseStages[mechanic]].mechanic === mechanic, 'phase stage');
    });
    var roles = [], used = {};
    Object.keys(def.stages).forEach(function (stageId) {
      var stage = def.stages[stageId], ids = {};
      need(/^[a-z][a-z0-9_]*$/.test(stageId) && Object.keys(stage).every(function (key) {
        return ['name','mechanic','choices','groups','transitions'].indexOf(key) >= 0;
      }), 'stage fields');
      need(mechanics[def.profile].indexOf(stage.mechanic) >= 0 && typeof stage.name === 'string' && !!stage.name, 'stage mechanic or name');
      need(!stage.transitions || typeof stage.transitions === 'object' && !Array.isArray(stage.transitions), 'stage transitions');
      Object.keys(stage.transitions || {}).forEach(function (mechanic) {
        need(mechanics[def.profile].indexOf(mechanic) >= 0 && typeof stage.transitions[mechanic] === 'string' &&
          own(def.stages, stage.transitions[mechanic]) && targetValid(def, stageId, mechanic), 'stage transition');
      });
      stageKeys(stage).forEach(function (key) {
        var row = def.choices[key]; used[key] = true;
        need(!ids[row.id] && routeValid(def, stageId, row), 'choice route'); ids[row.id] = true;
        contracts[def.profile][row.operation].roles.forEach(function (role) {
          if (roles.indexOf(role) < 0) roles.push(role);
        });
      });
      autonomous(def, stage.mechanic).forEach(function (mechanic) {
        need(targetValid(def, stageId, mechanic), 'autonomous transition');
      });
      if (def.profile === 'service_negotiation' && stage.mechanic === 'battle' && roles.indexOf('serviceRuler') < 0)
        roles.push('serviceRuler');
    });
    Object.keys(def.choices).forEach(function (key) { need(used[key], 'unused choice'); });
    var reached = Object.create(null), pending = [def.initialStage];
    while (pending.length) {
      var stageId = pending.shift();
      if (reached[stageId]) continue;
      reached[stageId] = true;
      var stage = def.stages[stageId];
      stageKeys(stage).forEach(function (key) {
        var row = def.choices[key];
        pending.push(target(def, stageId, outcome(def, stage.mechanic, row), row));
      });
      autonomous(def, stage.mechanic).forEach(function (mechanic) {
        pending.push(target(def, stageId, mechanic));
      });
    }
    Object.keys(def.stages).forEach(function (stageId) { need(reached[stageId], 'unreachable stage'); });
    FB.storyCourts.validateLinked(def, roles);
  }
  FB.storyCourts.trackPhase = function (id, t) {
    var story = FB.stories.get(id);
    return story && story.declaration && story.declaration.type === 'political_track'
      ? phase(story.declaration, t) : t.phase;
  };
  FB.stories.registerType('political_track', function (def) { return profiles[def.profile](def); }, 'js/story_track.js', validateTrack);

})();
