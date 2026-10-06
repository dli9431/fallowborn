/* The federate soldier's track in 476, a registered player track. It holds
   the household's part in the western court story: the delegate choice, the
   host commission, the service contract, the civic and church routes, the
   claimant, the moving court and the contest for Ravenna. Its record lives at
   state.stories.federate_track_476 and needs the western court story. */
(function () {
  'use strict';
  var TRACK = 'federate_track_476';
  var X = FB.story476;
  var actor = X.actor, person = X.person, host = X.host, alive = X.alive;
  var recognize = X.recognize, recognizeOrExisting = X.recognizeOrExisting;
  var appointment = X.appointment, news = X.news;
  function init() {
    return {
      phase:'delegate', role:'ordinary', result:null,
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
      westGeneration:FB.realmRulerGeneration(s, 'italy'),
      eastGeneration:FB.realmRulerGeneration(s, 'byzantium'),
      federateGeneration:FB.realmRulerGeneration(s, 'federates_476'),
      westTreasury:FB.treasuryAvailable(s, 'italy'),
      federateTreasury:FB.treasuryAvailable(s, 'federates_476'),
      ravennaOwner:s.owner.ravenna,
      italianHost:host(s, 'host_476_italy') && host(s, 'host_476_italy').at,
      federateHost:host(s, 'host_476_federates') && host(s, 'host_476_federates').at,
      church:X.hasChurchSupport(s, t), civic:X.civicPermission(s, w),
      consent:X.hasCivicConsent(s, t),
      contract:contract && contract.status,
      contractAward:t.awardRequested && contract &&
        FB.political.contractAwardQuote(s, t.contractId, 0),
      court:w.courtAt, movement:w.courtMove,
      recipient:alive(s, w.veteranId),
      delegate:alive(s, w.civicDelegateId),
      romanBishop:alive(s, w.bishopId),
      homoianBishop:alive(s, w.homoianBishopId),
      senator:alive(s, w.senatorId),
      institutionReview:FB.localInstitutionQuote(s, 'ravenna_council', actor('federates_476'),
        'petition', { courts:true, protection:true, tolerance:true, contractId:t.contractId }).stamp,
      mediationReview:FB.localInstitutionMediationQuote(s, 'rome_see', actor('federates_476'), 'ravenna').stamp,
      westernOffice:w.westernOfficeResolved,
      governance:w.governanceResolved
    };
  }
  function quote(s, t, id) {
    var w = X.world(s);
    if (!w) return { id:id, allowed:false, reason:'no_story', facts:null, stamp:'null' };
    var facts = snapshot(s, w, t), allowed = false, reason = null;
    if (id === 'leave_dispute') allowed =
      t.phase !== 'delegate' && t.phase !== 'complete' &&
      t.phase !== 'battle';
    else if (t.phase === 'delegate') {
      allowed = ['accept_delegate','remain_service','refuse_involvement',
        'seek_city_service','seek_church_service'].indexOf(id) >= 0;
      if (id === 'seek_city_service') allowed = facts.delegate &&
        s.owner.ravenna === 'italy' && facts.senator;
      if (id === 'seek_church_service') allowed = facts.homoianBishop &&
        s.chars[s.player.charId] &&
        s.chars[s.player.charId].religion === 'homoian';
    } else if (t.phase === 'civic_service') {
      allowed = id === 'leave_city_service' ||
        id === 'petition_city_office' && facts.delegate &&
          s.owner.ravenna === 'italy' &&
          FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5 &&
          !t.cityOfficeId &&
          (t.role === 'city_clerk' || !!t.interfaithRecognitionId);
    } else if (t.phase === 'church_service') {
      allowed = id === 'leave_church_service' ||
        id === 'seek_homoian_commission' && facts.homoianBishop &&
          s.chars[s.player.charId].religion === 'homoian' &&
          !t.homoianRecognitionId ||
        id === 'mediate_communities' && facts.romanBishop &&
          facts.homoianBishop && !!t.homoianRecognitionId &&
          s.chars[s.player.charId].religion === 'homoian' &&
          FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5;
    } else if (t.phase === 'commission') {
      allowed = ['seek_commission','back_odoacer','keep_serving'].indexOf(id) >= 0 &&
        alive(s, w.odoacerId) && !!host(s, 'host_476_federates');
      if (!allowed) reason = 'no_federate_command';
    } else if (t.phase === 'contract') {
      if (id === 'offer_pay') {
        allowed = !!(alive(s, w.orestesId) &&
          s.owner.ravenna === 'italy' && facts.westTreasury >= 30 &&
          host(s, 'host_476_federates') &&
          FB.political.contractQuote(s, X.serviceTerms(s, w)).allowed);
        if (!allowed) reason = 'pay_or_patron_unavailable';
      } else allowed = id === 'refuse_pay';
    } else if (t.phase === 'civic') {
      if (id === 'seek_mediation') {
        allowed = !X.hasChurchSupport(s, t) && alive(s, w.bishopId) &&
          !!s.religiousHeads.rome_bishop;
      } else if (id === 'revise_civic') {
        allowed = t.proposal !== 'court_guarantee';
      } else if (id === 'renegotiate_pay') {
        allowed = !X.currentContract(s, t) ||
          !X.currentContract(s, t).effective;
      } else if (id === 'present_civic') {
        var contract = X.currentContract(s, t);
        var me = s.chars[s.player.charId];
        allowed = !!(contract && contract.effective && X.civicPermission(s, w) &&
          FB.countyCultureShare(s, 'ravenna', 'roman') >= 0.5 &&
          (me && me.religion === 'nicene' || X.hasChurchSupport(s, t)) &&
          t.proposal === 'court_guarantee');
        if (!allowed) reason = 'civic_terms_unmet';
      } else allowed = id === 'demand_force' &&
        !!host(s, 'host_476_federates') && alive(s, w.odoacerId);
    } else if (t.phase === 'recognition') {
      if (id === 'petition_basiliscus') {
        allowed = alive(s, w.eastRulerId) &&
          FB.realmRulerCharacterSnapshot(s, 'byzantium') &&
          FB.realmRulerCharacterSnapshot(s, 'byzantium').id === w.eastRulerId &&
          s.owner.constantinople === 'byzantium';
      } else if (id === 'back_zeno') {
        var returning = FB.stories.record(s, 'zeno_return_476');
        allowed = !!returning && returning.result !== 'interrupted' && returning.result !== 'diverted' &&
          alive(s, w.zenoId) && !!s.realms.byzantium.alive;
      } else if (id === 'uphold_nepos') {
        allowed = alive(s, w.neposId) && s.owner.split === 'croatia';
      } else allowed = id === 'forgo_recognition';
      if (!allowed) reason = 'claimant_unavailable';
    } else if (t.phase === 'court') {
      if (id === 'escort_court') {
        var escort = host(s, 'host_476_italy');
        allowed = w.courtMove !== 'travelling' && w.courtAt === 'ravenna' &&
          !!escort && !!FB.armyOrderPlan(s, escort, 'pavia').ok &&
          s.owner.pavia === 'italy';
      } else if (id === 'request_classis') {
        var agreement = X.currentContract(s, t);
        allowed = w.courtAt === 'pavia' && !t.awardRequested &&
          !!(agreement && agreement.effective &&
            FB.political.contractAwardQuote(s, agreement.id, 0));
      } else if (id === 'court_maintenance') {
        allowed = w.courtAt === 'pavia' && !t.maintenancePaid &&
          FB.treasuryAvailable(s, 'italy') >= 5;
      } else if (id === 'move_to_ratification') {
        allowed = w.courtAt === 'pavia' && !!(X.currentContract(s, t) &&
          X.currentContract(s, t).effective && X.hasCivicConsent(s, t) &&
          s.owner.pavia === 'italy');
      } else allowed = id === 'demand_force' &&
        !!host(s, 'host_476_federates') && alive(s, w.odoacerId);
    } else if (t.phase === 'resolution') {
      if (id === 'ratify') {
        var terms = X.currentContract(s, t);
        allowed = !!(terms && terms.effective && X.hasCivicConsent(s, t) &&
          w.courtAt === 'pavia' && s.owner.pavia === 'italy' && s.owner.ravenna === 'italy' &&
          (!t.awardRequested ||
            FB.political.contractAwardQuote(s, terms.id, 0)));
      } else allowed = id === 'reject_ratification';
    } else if (t.phase === 'battle') {
      allowed = id === 'withdraw' && !!s.realms.federates_476.war;
    } else if (t.phase === 'aftermath') {
      allowed = id === 'accept_aftermath';
    } else if (t.phase === 'complete') {
      var victorious = t.result === 'contested_victory' &&
        s.owner.ravenna === 'federates_476';
      if (id === 'adopt_civic_rule') allowed = victorious &&
        !w.governanceResolved && facts.delegate &&
        facts.romanBishop &&
        FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5;
      else if (id === 'affirm_host_rule') allowed = victorious &&
        !w.governanceResolved;
      else if (id === 'recognize_nepos_west') allowed = victorious &&
        !w.westernOfficeResolved && alive(s, w.neposId) &&
        s.owner.split === 'croatia' && s.owner.roma === 'italy' &&
        facts.senator && FB.political.permission(s,
          person(w.senatorId), 'civic_agreement',
          { provinceId:'roma' }).allowed;
      else if (id === 'retire_western_office') allowed = victorious &&
        !w.westernOfficeResolved && s.owner.constantinople === 'byzantium';
      else if (id === 'restore_western_office') allowed =
        w.romulusDeposed && w.westernOfficeResolved !== 'restored' &&
        s.owner.ravenna === 'italy' && alive(s, w.westRulerId) &&
        !!s.realms.italy.alive;
    }
    return { id:id, allowed:!!allowed, reason:reason,
      facts:facts, stamp:JSON.stringify(facts) };
  }
  function startContest(s, w, t) {
    var federates = s.realms.federates_476;
    var army = host(s, 'host_476_federates');
    if (!federates || !federates.alive || !army ||
        !alive(s, w.odoacerId) || federates.war) return false;
    var plan = FB.armyOrderPlan(s, army, 'ravenna');
    if (!plan.ok) return false;
    federates.war = { enemy:'italy', years:0, captures:0,
      casus:{ type:'border' } };
    army.warId = '476_ravenna';
    if (!FB.orderArmy(s, army, 'ravenna', plan)) {
      federates.war = null; return false;
    }
    if (t.contractId) FB.authorityContractTransition(s, t.contractId,
      'breach', 'federates_476');
    t.phase = 'battle'; t.result = 'contested';
    news(s, 'news.476.contest',
      '⚔ The federate host marches on Ravenna. The city and the imperial court remain separate stakes.', {});
    return true;
  }
  function apply(s, t, id, reviewed) {
    var w = X.world(s), now = quote(s, t, id);
    if (!w || !reviewed || !now.allowed ||
        JSON.stringify(now) !== JSON.stringify(reviewed)) return false;
    var rec, office, contract, q, army;
    if (id === 'leave_dispute') {
      t.phase = 'complete'; t.result = 'interrupted';
      t.outcomeTurn = s.turn;
      news(s, 'news.476.leave_dispute',
        '🏳 Your household leaves the court dispute and remains free to continue its life.', {});
    } else if (id === 'accept_delegate') {
      t.role = 'delegate'; t.phase = 'commission';
      news(s, 'news.476.delegate',
        '📜 The soldiers name you their delegate. You hold no land or civil jurisdiction.', {});
    } else if (id === 'remain_service') {
      t.phase = 'commission';
    } else if (id === 'seek_city_service') {
      if (!FB.setCareer(s, s.chars[s.player.charId], 'civic_clerk')) return false;
      t.role = 'city_clerk'; t.phase = 'civic_service';
      news(s, 'news.476.city_service',
        '🏛 The Ravenna council accepts your service as a clerk; civic jurisdiction remains with the city.', {});
    } else if (id === 'seek_church_service') {
      if (!FB.setCareer(s, s.chars[s.player.charId], 'priest')) return false;
      t.role = 'church_clerk'; t.phase = 'church_service';
      news(s, 'news.476.church_service',
        '☧ You enter the Ravenna congregation’s clerical service. The bishop holds its local commission.', {});
    } else if (id === 'seek_homoian_commission') {
      rec = recognize(s, 'church_support',
        { kind:'religious-office', id:'ravenna_homoian_bishop' },
        person(s.player.charId), { kind:'county', id:'ravenna' });
      if (!rec) return false;
      t.homoianRecognitionId = rec.id; t.role = 'church_delegate';
    } else if (id === 'mediate_communities') {
      rec = recognize(s, 'church_support',
        { kind:'religious-office', id:'rome_bishop' },
        person(s.player.charId), { kind:'county', id:'ravenna' });
      if (!rec) return false;
      t.interfaithRecognitionId = rec.id; t.phase = 'civic_service';
      news(s, 'news.476.interfaith',
        '✝ Ravenna’s congregations accept a mediator without changing their faiths or their civic courts.', {});
    } else if (id === 'petition_city_office') {
      rec = recognizeOrExisting(s, 'civic_acceptance',
        { kind:'county', id:'ravenna' }, person(s.player.charId),
        { kind:'county', id:'ravenna' });
      if (!rec) return false;
      office = appointment(s, 'judicial_vicar', 'italy',
        person(s.player.charId), { kind:'county', id:'ravenna' }, rec.id);
      if (!office) return false;
      t.cityOfficeId = office.id; t.phase = 'complete';
      t.result = t.role === 'city_clerk' ? 'civic_office' : 'church_civic_office';
      t.outcomeTurn = s.turn;
      news(s, 'news.476.city_office',
        '⚖ The court appoints you to Ravenna’s local Peace. The county and its revenue remain separate.', {});
    } else if (id === 'leave_city_service' || id === 'leave_church_service') {
      t.phase = 'complete'; t.result = id === 'leave_city_service'
        ? 'civic_service' : 'church_service'; t.outcomeTurn = s.turn;
    } else if (id === 'refuse_involvement') {
      t.role = 'outside'; t.phase = 'complete'; t.result = 'declined';
      t.outcomeTurn = s.turn;
    } else if (id === 'seek_commission') {
      rec = recognize(s, 'army_acclamation',
        { kind:'host', id:'host_476_federates' }, person(s.player.charId));
      if (!rec) return false;
      office = appointment(s, 'field_command', 'federates_476',
        person(s.player.charId), { kind:'host', id:'host_476_federates' },
        rec.id, s.turn + 361);
      if (!office) return false;
      t.commissionId = office.id; t.role = 'commander';
      t.phase = 'contract';
      news(s, 'news.476.command',
        '🚩 The federate host accepts your limited command for this service term.', {});
    } else if (id === 'back_odoacer') {
      rec = recognize(s, 'army_acclamation',
        { kind:'host', id:'host_476_federates' }, person(w.odoacerId));
      if (!rec) return false;
      office = appointment(s, 'field_command', 'federates_476',
        person(w.odoacerId), { kind:'host', id:'host_476_federates' },
        rec.id, s.turn + 361);
      if (!office) return false;
      t.phase = 'contract';
    } else if (id === 'keep_serving') {
      t.phase = 'contract';
    } else if (id === 'offer_pay') {
      q = X.serviceTerms(s, w);
      contract = FB.authorityOfferContract(s, q);
      if (!contract) return false;
      if (!FB.authorityConsentContract(s, contract.id, 'italy') ||
          !FB.authorityConsentContract(s, contract.id, 'federates_476') ||
          !FB.treasuryTransfer(s, 'italy', 'federates_476', 30)) {
        FB.authorityContractTransition(s, contract.id, 'breach', 'italy');
        return false;
      }
      t.contractId = contract.id; t.phase = 'civic';
      news(s, 'news.476.contract',
        '🪙 Ravenna pays the federate body {money:amount} now and owes four seasonal installments.',
        { amount:30 });
    } else if (id === 'refuse_pay') {
      t.phase = 'civic'; t.proposal = 'force';
    } else if (id === 'seek_mediation') {
      rec = FB.localInstitutionMediate(s, 'rome_see', actor('federates_476'), 'ravenna');
      if (!rec) return false;
      t.churchRecognitionId = rec.id;
      news(s, 'news.476.mediation',
        '✝ The bishop supports protected Nicene worship in a federate settlement; he grants no command.', {});
    } else if (id === 'revise_civic') {
      t.proposal = 'court_guarantee';
    } else if (id === 'renegotiate_pay') {
      t.phase = 'contract';
    } else if (id === 'present_civic') {
      rec = X.civicSettlement(s, t);
      if (!rec) return false;
      t.civicRecognitionId = rec.recognitionId;
      t.phase = 'recognition';
      news(s, 'news.476.civic',
        '🏛 Ravenna accepts the bargain while its civic courts keep their jurisdiction.', {});
    } else if (id === 'petition_basiliscus' || id === 'uphold_nepos') {
      var issuerId = id === 'petition_basiliscus' ? 'byzantium' : 'croatia';
      rec = recognize(s, 'imperial_commission', actor(issuerId),
        actor('federates_476'), actor('federates_476'));
      if (!rec) return false;
      t.imperialRecognitionId = rec.id;
      t.backedClaimant = id === 'petition_basiliscus' ? 'basiliscus' : 'nepos';
      t.phase = 'court';
    } else if (id === 'back_zeno') {
      t.backedClaimant = 'zeno'; t.phase = 'court';
      if (FB.stories.record(s, 'zeno_return_476') && FB.stories.record(s, 'zeno_return_476').result === 'restored' &&
          FB.realmRulerCharacterSnapshot(s, 'byzantium') &&
          FB.realmRulerCharacterSnapshot(s, 'byzantium').id === w.zenoId) {
        rec = recognize(s, 'imperial_commission', actor('byzantium'),
          actor('federates_476'), actor('federates_476'));
        t.imperialRecognitionId = rec && rec.id;
      }
    } else if (id === 'forgo_recognition') {
      t.backedClaimant = 'none'; t.phase = 'court';
    } else if (id === 'escort_court') {
      army = host(s, 'host_476_italy');
      if (!army || !FB.orderArmy(s, army, 'pavia')) return false;
      army.scenarioCourtEscort = true;
      w.courtMove = 'travelling';
      news(s, 'news.476.court_depart',
        '🏛 The western court departs Ravenna under escort for Ticinum.', {});
    } else if (id === 'court_maintenance') {
      if (!FB.treasuryTransfer(s, 'italy', 'federates_476', 5)) return false;
      t.maintenancePaid = true;
      news(s, 'news.476.maintenance',
        '🪙 The court pays {money:amount} for its escort at Ticinum.', { amount:5 });
    } else if (id === 'request_classis') {
      t.awardRequested = true;
    } else if (id === 'move_to_ratification') {
      t.phase = 'resolution';
    } else if (id === 'ratify') {
      if (t.awardRequested) {
        contract = X.currentContract(s, t);
        q = FB.political.contractAwardQuote(s, contract.id, 0);
        if (!q || !FB.authorityFulfillContractAward(s, contract.id, 0, q)) return false;
        t.awardGranted = true;
        s.chars[w.veteranId].homeProvinceId = 'ravenna';
        t.veteranMigration = { provinceId:'ravenna', settlement:1,
          turn:s.turn };
      }
      t.phase = 'complete'; t.result = 'negotiated';
      t.outcomeTurn = s.turn;
      X.cityRights(s, w, 'italy');
      news(s, 'news.476.ratified',
        '📜 The federate service settlement is ratified. The host keeps its commission, Ravenna its civic courts.', {});
    } else if (id === 'reject_ratification' || id === 'demand_force') {
      if (!startContest(s, w, t)) return false;
    } else if (id === 'withdraw') {
      s.realms.federates_476.war = null;
      var retreat = host(s, 'host_476_federates');
      if (retreat) { retreat.path = []; retreat.goal = null; retreat.moveLeft = 0; }
      t.phase = 'aftermath'; t.result = 'contested_withdrawal';
      news(s, 'news.476.withdraw',
        '🏳 The host withdraws. Your household remains free and may seek ordinary service.', {});
    } else if (id === 'accept_aftermath') {
      t.phase = 'complete'; t.outcomeTurn = s.turn;
    } else if (id === 'adopt_civic_rule') {
      rec = recognizeOrExisting(s, 'church_support',
        { kind:'religious-office', id:'rome_bishop' },
        actor('federates_476'), { kind:'county', id:'ravenna' });
      if (!rec || !X.cityRights(s, w, 'federates_476') ||
          !FB.authoritySetGovernment(s, 'federates_476', 'roman_civic')) return false;
      w.governanceResolved = 'civic';
      news(s, 'news.476.civic_rule',
        '🏛 Odoacer accepts Ravenna’s civic courts and Nicene worship under a Roman civic government.', {});
    } else if (id === 'affirm_host_rule') {
      w.governanceResolved = 'federate';
      news(s, 'news.476.host_rule',
        '🚩 The federate host keeps its own government. Ravenna’s civic claims remain unsettled.', {});
    } else if (id === 'recognize_nepos_west') {
      var senate = recognize(s, 'civic_acceptance',
        { kind:'county', id:'roma' }, person(w.neposId),
        { kind:'county', id:'roma' });
      if (!senate) return false;
      t.senateRecognitionId = senate.id;
      rec = recognize(s, 'imperial_commission', actor('croatia'),
        person(w.neposId), actor('italy'));
      if (!rec) return false;
      office = appointment(s, 'imperial_office', 'italy',
        person(w.neposId), actor('italy'), rec.id);
      if (!office) return false;
      w.westOfficeId = office.id; w.westernOfficeResolved = 'nepos';
      news(s, 'news.476.nepos_west',
        '📜 Nepos receives a western office claim while his Dalmatian court remains separate.', {});
    } else if (id === 'retire_western_office') {
      rec = recognizeOrExisting(s, 'imperial_commission', actor('byzantium'),
        actor('federates_476'), actor('federates_476'));
      if (!rec) return false;
      t.imperialRecognitionId = rec.id;
      w.westernOfficeResolved = 'retired';
      news(s, 'news.476.office_retired',
        '📜 The host seeks eastern recognition and leaves the western office vacant.', {});
    } else if (id === 'restore_western_office') {
      if (!X.restoreWestOffice(s, w)) return false;
    } else return false;
    if (X.syncWestOffice) X.syncWestOffice(s);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return true;
  }
  function season(s, t) {
    var row = X.currentContract(s, t);
    if (!row || row.status !== 'active' || !s.player.charId ||
        t.role === 'outside') return;
    var period = Math.floor(s.turn / 90);
    if (period <= t.lastAllocatedPeriod || row.paidThroughPeriod !== period ||
        period > Math.floor(row.startTurn / 90) + 4) return;
    if (FB.treasuryTransfer(s, 'federates_476', 'player', 2)) {
      t.lastAllocatedPeriod = period;
      news(s, 'news.476.service_share',
        '🪙 Your household receives {money:amount} from the federate body’s seasonal service pay.',
        { amount:2 });
    }
  }
  /* A stale contract or a changed court route returns the bargain for
     review; the field contest resolves on the real map. */
  function day(s, t) {
    var w = X.world(s);
    if (!w) return;
    if (['civic','recognition','court','resolution'].indexOf(t.phase) >= 0) {
      var contract = X.currentContract(s, t);
      if (contract && (!contract.effective || contract.status !== 'active')) {
        t.phase = 'contract'; t.civicRecognitionId = null;
        t.awardRequested = false;
        news(s, 'news.476.terms_lapsed',
          '📜 A change of court or service command ends the old terms. The parties must review a new contract.', {});
      } else if (t.phase === 'resolution' &&
          (w.courtAt !== 'pavia' || s.owner.pavia !== 'italy' ||
            !X.hasCivicConsent(s, t))) {
        t.phase = w.courtAt !== 'pavia' ? 'court' : 'civic';
        news(s, 'news.476.review_bargain',
          '🏛 The court route or city consent has changed. The settlement returns for review.', {});
      }
    }
    if (t.phase !== 'battle') return;
    var federates = host(s, 'host_476_federates');
    var italian = host(s, 'host_476_italy');
    if (!federates || federates.men <= 0 ||
        !alive(s, w.odoacerId)) {
      s.realms.federates_476.war = null;
      t.phase = 'aftermath'; t.result = 'contested_defeat';
      news(s, 'news.476.defeat',
        '🏳 The federate attack fails. Your household survives and can continue in service.', {});
    } else if (federates.at === 'ravenna' &&
               (!italian || italian.men <= 0 || italian.at !== 'ravenna') &&
               s.owner.ravenna === 'italy') {
      FB.transferProvince(s, 'ravenna', 'federates_476');
      s.realms.federates_476.nonTerritorial = false;
      s.realms.federates_476.capital = 'ravenna';
      s.realms.federates_476.war = null;
      t.phase = 'aftermath'; t.result = 'contested_victory';
      var acclaim = recognize(s, 'army_acclamation',
        { kind:'host', id:federates.id }, person(w.odoacerId));
      w.odoacerAcclamationId = acclaim && acclaim.id;
      if (alive(s, w.westRulerId) && w.westOfficeId) {
        FB.authorityAppointmentTransition(s, w.westOfficeId, 'remove');
        w.romulusDeposed = true;
      }
      if (X.syncWestOffice) X.syncWestOffice(s);
      news(s, 'news.476.victory',
        '⚔ The federates take Ravenna. Odoacer is acclaimed; the western office is contested, while the city’s people and property remain.', {});
    }
  }
  function stageName(phase) {
    var names = {
      delegate:FB.T('Soldiers seek a spokesman'),
      civic_service:FB.T('Service to the Ravenna council'),
      church_service:FB.T('Service to the Ravenna congregation'),
      commission:FB.T('A disputed command'),
      contract:FB.T('Arrears and service'),
      civic:FB.T('Ravenna civic bargain'),
      recognition:FB.T('Imperial recognition'),
      court:FB.T('The moving court'),
      resolution:FB.T('Ratify the settlement'),
      battle:FB.T('Contest for Ravenna'),
      aftermath:FB.T('Review the peace'),
      complete:FB.T('Situation concluded')
    };
    return names[phase] || phase;
  }
  function choices(s, t) {
    var list = phaseChoices(s, t);
    if (t.phase !== 'delegate' && t.phase !== 'complete' &&
        t.phase !== 'battle' && t.phase !== 'aftermath') {
      list.push({ id:'leave_dispute', label:FB.T('Leave the court dispute'),
        detail:FB.T('End this political sequence. Your household and its current career survive; live contracts and existing offices retain their own terms.') });
    }
    return list;
  }
  function phaseChoices(s, t) {
    var w = X.world(s);
    if (t.phase === 'delegate') return [
      { id:'accept_delegate', label:FB.T('Serve as the soldiers’ delegate'),
        detail:FB.T('Gain a service role. No land, command, or civil jurisdiction changes hands.') },
      { id:'remain_service', label:FB.T('Remain an ordinary soldier'),
        detail:FB.T('Keep your free household and continue to the command dispute without becoming delegate.') },
      { id:'refuse_involvement', label:FB.T('Refuse involvement'),
        detail:FB.T('Leave the political sequence; ordinary livelihood and family play continue.') },
      { id:'seek_city_service', label:FB.T('Serve the Ravenna council'),
        detail:FB.T('Enter civic service as a clerk. The city delegate and senator remain separate actors; a later court appointment can grant Peace but no land or revenue.') },
      { id:'seek_church_service', label:FB.T('Enter clerical service'),
        detail:FB.T('Begin as a priestly clerk in the Homoian congregation. Church progression follows your faith’s ordinary path; episcopal mediation can lead to civic service.') }
    ];
    if (t.phase === 'civic_service') return [
      { id:'petition_city_office', label:FB.T('Petition for Ravenna’s local court'),
        detail:FB.T('Requires a living civic delegate, a Nicene majority and a western court holding Ravenna. A judicial appointment grants local Peace only; succession can require reaffirmation.') },
      { id:'leave_city_service', label:FB.T('Continue as a clerk'),
        detail:FB.T('Keep the civic career without acquiring a court office or county.') }
    ];
    if (t.phase === 'church_service') return [
      { id:'seek_homoian_commission', label:FB.T('Seek the Homoian bishop’s commission'),
        detail:FB.T('A living local bishop recognizes your service in Ravenna. This does not grant a county, office, or change anyone’s faith.') },
      { id:'mediate_communities', label:FB.T('Mediate with the Nicene bishop'),
        detail:FB.T('Requires both living bishops and a Homoian commission. The Nicene bishop recognizes your mediation; you may then petition the civic court.') },
      { id:'leave_church_service', label:FB.T('Continue in the congregation'),
        detail:FB.T('Keep the clerical career and its ordinary faith progression without a civic office.') }
    ];
    if (t.phase === 'commission') return [
      { id:'seek_commission', label:FB.T('Seek the detachment commission'),
        detail:FB.T('Peers acclaim you; Odoacer appoints you for 360 days to command this host only. No land, tax, or court follows.') },
      { id:'back_odoacer', label:FB.T('Back Odoacer as commander'),
        detail:FB.T('Odoacer holds the scoped host commission. You may still serve as delegate.') },
      { id:'keep_serving', label:FB.T('Keep serving without a command'),
        detail:FB.T('Continue to the pay dispute as a free soldier.') }
    ];
    if (t.phase === 'contract') return [
      { id:'offer_pay', label:FB.T('Offer a one-year service contract'),
        detail:FB.T('Western treasury pays {money:immediate} now to the federate body, then {money:seasonal} at the next four seasonal settlements during the 360-day term. Your household receives {money:share} from each payment, included in that amount. Classis may be awarded later only by a separate reviewed grant.',
          { immediate:30, seasonal:10, share:2 }) },
      { id:'refuse_pay', label:FB.T('Refuse these terms'),
        detail:FB.T('No treasury transfer or contract. You can revise the civic proposal or contest Ravenna.') }
    ];
    if (t.phase === 'civic') return [
      { id:'seek_mediation', label:FB.T('Seek the bishop’s mediation'),
        detail:FB.T('Promise protected Nicene worship. The bishop can support the bargain without converting your household or the city.') },
      { id:'renegotiate_pay', label:FB.T('Reopen the service terms'),
        detail:FB.T('Return to the western treasury with a reviewed pay proposal. Existing arrears are not forgiven.') },
      { id:'revise_civic', label:FB.T('Revise the civic proposal'),
        detail:FB.T('Replace a demand for force with a guarantee that Ravenna’s civic courts keep jurisdiction. No county or tax right is granted.') },
      { id:'present_civic', label:FB.T('Present the bargain to Ravenna'),
        detail:FB.T('Requires an active paid contract, a living civic delegate, a Roman civic majority, and Nicene standing or episcopal mediation. Acceptance is scoped to Ravenna; civil courts remain with the city.') },
      { id:'demand_force', label:FB.T('Demand a settlement by force'),
        detail:FB.T('Breach the bargain, march the real federate host on Ravenna, and face the western host. Victory does not itself grant civic or imperial recognition.') }
    ];
    if (t.phase === 'recognition') return [
      { id:'petition_basiliscus', label:FB.T('Petition Basiliscus'),
        detail:FB.T('The sitting eastern {term:emperor} may recognize federate service. His commission needs reaffirmation if his rule ends.') },
      { id:'back_zeno', label:FB.T('Back the displaced Zeno'),
        detail:FB.T('A displaced claimant cannot issue an imperial commission now. If Zeno regains Constantinople alive, he can recognize the backed service claim.') },
      { id:'uphold_nepos', label:FB.T('Uphold Julius Nepos'),
        detail:FB.T('The Dalmatian claimant recognizes the federate body. This does not move a county or remove Romulus.') },
      { id:'forgo_recognition', label:FB.T('Proceed without imperial recognition'),
        detail:FB.T('The contract and civic bargain may stand while rival imperial claims remain unresolved.') }
    ];
    if (t.phase === 'court') return [
      { id:'escort_court', label:FB.T('Escort the court to Ticinum'),
        detail:FB.T('The western host follows the existing route from Ravenna to Pavia. Arrival changes the court’s location, not territorial ownership.') },
      { id:'court_maintenance', label:FB.T('Ask for court maintenance'),
        detail:FB.T('After arrival, the western treasury pays {money:amount} once to the federate body for escort. This is separate from service pay.', { amount:5 }) },
      { id:'request_classis', label:FB.T('Request a Classis allotment'),
        detail:FB.T('Ask to grant the existing port settlement to a named veteran at ratification. The grant is reviewed again then; other holdings and residents remain.') },
      { id:'move_to_ratification', label:FB.T('Review final settlement'),
        detail:FB.T('Requires court arrival, active service pay, and Ravenna civic consent. No award is made by opening the review.') },
      { id:'demand_force', label:FB.T('Break talks and march on Ravenna'),
        detail:FB.T('The active service contract is breached. The two field hosts resolve the contest on the map.') }
    ];
    if (t.phase === 'resolution') return [
      { id:'ratify', label:FB.T('Ratify the negotiated settlement'),
        detail:FB.T('Confirm live pay, civic consent, court arrival, and any requested Classis grant. Romulus remains in western office; the federate host retains only its commissioned command.') },
      { id:'reject_ratification', label:FB.T('Reject and contest Ravenna'),
        detail:FB.T('Breach the agreement and let the field hosts decide Ravenna. Your household remains playable after either result.') }
    ];
    if (t.phase === 'battle') return [
      { id:'withdraw', label:FB.T('Withdraw the federate demand'),
        detail:FB.T('End this contest without a county award. Your free household continues.') }
    ];
    if (t.phase === 'aftermath') return [
      { id:'accept_aftermath', label:FB.T('Continue after the contest'),
        detail:FB.T('Close the political sequence. Surviving people, communities, property, and the household remain in play.') }
    ];
    if (t.phase === 'complete' && t.result === 'contested_victory' &&
        s.owner.ravenna === 'federates_476') return [
      { id:'adopt_civic_rule', label:FB.T('Recognize Ravenna’s civic courts'),
        detail:FB.T('Requires living city and Nicene church delegates. Record their local Peace and consent as customary rights; the federate government becomes Roman civic. No resident is converted.') },
      { id:'affirm_host_rule', label:FB.T('Keep federate government'),
        detail:FB.T('The host keeps its political form. Ravenna’s civic rights remain contested; no automatic local consent follows conquest.') },
      { id:'recognize_nepos_west', label:FB.T('Recognize Nepos for the western office'),
        detail:FB.T('Requires Nepos alive in Dalmatia and a living Rome senator with civic consent. Senate and imperial recognition support his office without moving a county.') },
      { id:'retire_western_office', label:FB.T('Leave the western office vacant'),
        detail:FB.T('Seek an eastern commission for the federate polity. The western title remains vacant; no eastern territory transfers.') }
    ];
    if (t.phase === 'complete' && w && w.romulusDeposed &&
        s.owner.ravenna === 'italy') return [
      { id:'restore_western_office', label:FB.T('Restore Romulus’s western office'),
        detail:FB.T('Requires Romulus alive and Ravenna back under the western court. Restore the office without granting new counties.') }
    ];
    return [];
  }
  function statusText(s, w, t) {
    /* A declined household made no bargain; the courts' own records show. */
    var deal = t.role === 'outside' ? w : t;
    var row = X.currentContract(s, deal), lines = [];
    lines.push(FB.T('Western court: {location}.', {
      location:w.courtAt === 'pavia' ? FB.T('Ticinum') :
        w.courtAt === 'displaced' ? FB.T('displaced') : FB.T('Ravenna') }));
    lines.push(row ? FB.T('Federate contract: {status}; {money:amount} per season during its 360-day term.',
      { status:row.status === 'active' ? FB.T('active') :
        row.status === 'breached' ? FB.T('breached') :
        row.status === 'expired' ? FB.T('expired') : FB.T('offered'),
        amount:row.payPerSeason }) :
      FB.T('Federate contract: none.'));
    lines.push(X.hasCivicConsent(s, deal) ? FB.T('Ravenna civic consent: recorded.') :
      FB.T('Ravenna civic consent: pending.'));
    if (t.role === 'commander') lines.push(FB.T(
      'Your commission commands the federate host for this term only.'));
    if (t.awardGranted) lines.push(FB.T('Classis allotment: granted to the veteran.'));
    else if (t.awardRequested) lines.push(FB.T(
      'Classis allotment: requested, subject to the final grant review.'));
    lines.push(t.imperialRecognitionId ? FB.T('Imperial commission: recorded.') :
      t.backedClaimant === 'zeno' ? FB.T('Zeno’s claim: backed, awaiting his return.') :
      FB.T('Imperial commission: none.'));
    if (t.phase === 'battle') lines.push(FB.T('The host marches on the map. Its real battle and route determine control of Ravenna.'));
    if (t.phase === 'complete' && t.result === 'negotiated') lines.push(FB.T('Negotiated outcome: the court and city retain their separate powers.'));
    if (t.phase === 'complete' && t.result !== 'negotiated') lines.push(FB.T('The household remains free to continue its story.'));
    if (t.cityOfficeId) lines.push(FB.political.permission(s,
      person(s.player.charId), 'judge', { provinceId:'ravenna' }).allowed
      ? FB.T('Ravenna’s local Peace: your court appointment is effective.')
      : FB.T('Ravenna’s local Peace: your former appointment needs a live mandate.'));
    if (w.cityRightIds && w.cityRightIds.length) lines.push(FB.T('Ravenna civic rights: recorded separately from county ownership.'));
    if (w.governanceResolved === 'civic') lines.push(FB.T('Federate government: Roman civic form with local courts.'));
    if (w.governanceResolved === 'federate') lines.push(FB.T('Federate government: host form; city claims unresolved.'));
    if (w.westernOfficeResolved === 'nepos') lines.push(FB.T('Western office: claimed by Nepos from Dalmatia.'));
    if (w.westernOfficeResolved === 'retired') lines.push(FB.T('Western office: vacant under an eastern commission.'));
    if (w.westernOfficeResolved === 'restored') lines.push(FB.T('Western office: restored to Romulus.'));
    if (w.aiResolution === 'negotiated') lines.push(FB.T('The courts agreed on service after you declined involvement.'));
    if (w.aiResolution === 'war') lines.push(FB.T('The courts are fighting for Ravenna through an ordinary war.'));
    if (FB.stories.record(s, 'theoderic_italy_476') && FB.stories.record(s, 'theoderic_italy_476').phase === 'started') lines.push(FB.T('Theoderic’s campaign for Ravenna is underway.'));
    if (FB.stories.record(s, 'eastern_africa_476') && FB.stories.record(s, 'eastern_africa_476').phase === 'started') lines.push(FB.T('The eastern African reconquest campaign is underway.'));
    if (FB.stories.record(s, 'eastern_italy_476') && FB.stories.record(s, 'eastern_italy_476').phase === 'started') lines.push(FB.T('The eastern Italian reconquest campaign is underway.'));
    return lines;
  }
  function status(s, t) {
    var w = X.world(s);
    return w ? { phase:t.phase, name:stageName(t.phase),
      lines:statusText(s, w, t) } : null;
  }
  function blocker(s, t, reason) {
    if (reason === 'pay_or_patron_unavailable')
      return FB.T('The western treasury, appointer, host, or Classis allotment has changed. Review the current situation.');
    if (reason === 'civic_terms_unmet')
      return FB.T('The civic delegate needs an active contract, protected local courts, and Nicene support or episcopal mediation.');
    return null;
  }
  function review(s, t, id, reviewed) {
    if (id !== 'ratify' || !reviewed.facts || !reviewed.facts.contractAward) return [];
    var award = reviewed.facts.contractAward;
    return [FB.T(
      'Classis grant: about {money:income} yearly revenue to the veteran; {money:loss} leaves the western treasury. The veteran holds this one port, not Ravenna county.',
      { income:Math.round(award.net * 10) / 10,
        loss:Math.round(award.lostRevenue * 10) / 10 })];
  }
  function validate(record, s) {
    function bad(field) {
      throw new Error(FB.T('Invalid v4 save field at {path}.',
        { path:'state.stories.' + TRACK + '.' + field }));
    }
    if (['delegate','commission','contract','civic','recognition','court','resolution',
        'battle','aftermath','complete','civic_service','church_service'].indexOf(record.phase) < 0) bad('phase');
    if (['ordinary','delegate','commander','outside','city_clerk','church_clerk',
        'church_delegate'].indexOf(record.role) < 0) bad('role');
    if (record.result !== undefined && [null,'declined','interrupted','negotiated',
        'contested','contested_withdrawal','contested_defeat','contested_victory',
        'civic_office','church_civic_office','civic_service','church_service'].indexOf(record.result) < 0) bad('result');
    if (record.proposal !== undefined && ['court_guarantee','force'].indexOf(record.proposal) < 0) bad('proposal');
    if (record.backedClaimant !== undefined &&
        [null,'basiliscus','zeno','nepos','none'].indexOf(record.backedClaimant) < 0) bad('backedClaimant');
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
  FB.stories.register({ id:TRACK, kind:'track', requires:['western_court_476'],
    init:init, day:day, season:season,
    title:function () { return FB.T('The Western Court, 476'); },
    intro:function () { return FB.T('Spring 476: court, soldiers, and city'); },
    status:status, choices:choices, quote:quote, blocker:blocker,
    review:review, apply:apply, validate:validate });
})();
