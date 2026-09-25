/* The spring 476 prototype is a saved, bounded situation. Its choices call
   the shared authority, treasury, army and lordship transactions directly. */
(function () {
  'use strict';
  function is476(s) { return !!(s && s.start && s.start.id === '476'); }
  /* Display-only vocabulary: internal ids, mechanics and saved records stay stable. */
  FB.period476Text = function (s, kind, id, field) {
    if (!is476(s)) return null;
    if (kind === 'career' && id === 'soldier') {
      if (field === 'name') return FB.T('Federate service');
      if (field === 'ranks.apprentice') return FB.T('New recruit');
      if (field === 'ranks.journeyman') return FB.T('Federate soldier');
      if (field === 'ranks.master') return FB.T('Veteran of the host');
      if (field === 'desc') return FB.T('Drill, guard duty, and paid service in a federate host.');
    }
    if (field !== 'name') return null;
    if (kind === 'unitClass') {
      if (id === 'levy') return FB.T('Local militia');
      if (id === 'arch') return FB.T('Bowmen');
      if (id === 'cav') return FB.T('Mounted retainers');
      if (id === 'ret') return FB.T('Household soldiers');
      if (id === 'mercs') return FB.T('Contracted bands');
      if (id === 'pike') return FB.T('Spearmen');
    }
    if (kind === 'holding') {
      if (id === 'common_rights') return FB.T('Communal grazing rights');
      if (id === 'hearth_garden') return FB.T('Household plot');
      if (id === 'house_shrine') return FB.T('Household oratory');
      if (id === 'letters') return FB.T('Household letters');
      if (id === 'press') return FB.T('Oil press');
      if (id === 'good_mail') return FB.T('Mail shirt');
      if (id === 'warhorse') return FB.T('Riding horse');
    }
    return null;
  };
  function scene(s) { return is476(s) && s.situation476 || null; }
  function actor(id) { return { kind:'realm', id:id }; }
  function person(id) { return { kind:'character', id:id }; }
  function host(s, id) {
    for (var row of s.armies || []) if (row.id === id) return row;
    return null;
  }
  function alive(s, id) { return !!(id && s.chars[id] && !s.chars[id].dead); }
  function ruler(s, rid) {
    return FB.realmRulerCharacterSnapshot(s, rid) || FB.materializeRealmRuler(s, rid);
  }
  function recognize(s, source, issuer, subject, at) {
    return FB.authorityRecognize(s, { source:source, issuer:issuer,
      subject:subject, scope:at || null });
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
  FB.init476 = function (s) {
    if (!is476(s) || s.situation476) return false;
    var west = ruler(s, 'italy'), east = ruler(s, 'byzantium');
    var nepos = ruler(s, 'croatia'), odoacer = ruler(s, 'federates_476');
    if (!west || !east || !nepos || !odoacer) return false;
    var sc = s.situation476 = {
      phase:'delegate', role:'ordinary', result:null, courtAt:'ravenna',
      courtMove:null, proposal:'court_guarantee',
      westRulerId:west.id, eastRulerId:east.id,
      neposId:nepos.id, odoacerId:odoacer.id,
      backedClaimant:null, easternReturn:'pending',
      zenoCourt:{ region:'isauria', status:'displaced' },
      contractId:null, lastAllocatedPeriod:0,
      civicRecognitionId:null, churchRecognitionId:null,
      imperialRecognitionId:null, commissionId:null,
      awardRequested:false, awardGranted:false,
      pressureNoted:false, outcomeTurn:null
    };
    var orestes = made(s, 'Orestes', 'roman', 'nicene', 50, 4,
      'commander', 'ravenna');
    var zeno = made(s, 'Zeno', 'greek', 'chalcedonian', 51, 4,
      'claimant', null);
    var delegate = made(s, FB.randomName('roman', 'm'), 'roman',
      'nicene', 42, 2, 'notable', 'ravenna');
    var bishop = made(s, FB.randomName('roman', 'm'), 'roman',
      'nicene', 54, 3, 'priest', 'roma');
    var veteran = made(s, FB.randomName('gothic', 'm'), 'gothic',
      'homoian', 38, 2, 'soldier', 'ravenna');
    west.fatherId = orestes.id;
    orestes.childrenIds.push(west.id);
    sc.orestesId = orestes.id;
    sc.zenoId = zeno.id;
    sc.civicDelegateId = delegate.id;
    sc.bishopId = bishop.id;
    sc.veteranId = veteran.id;
    var italianHost = { id:'host_476_italy', realm:'italy',
      at:'ravenna', from:'ravenna', men:180, size:180,
      units:{ levy:130, ret:50 }, supply:100, warId:null,
      path:[], goal:null, moveLeft:0,
      scenarioStanding:true, scenarioEndTurn:361 };
    var federateHost = { id:'host_476_federates', realm:'federates_476',
      at:'pavia', from:'pavia', men:120, size:120,
      units:{ levy:70, ret:50 }, supply:100, warId:null,
      path:[], goal:null, moveLeft:0,
      scenarioStanding:true, scenarioEndTurn:361 };
    s.armies.push(italianHost, federateHost);
    FB.authoritySetGovernment(s, 'italy', 'roman_civic');
    FB.authoritySetGovernment(s, 'croatia', 'roman_civic');
    FB.authoritySetGovernment(s, 'byzantium', 'roman_civic');
    FB.authoritySetGovernment(s, 'federates_476', 'federate_polity');
    s.religiousHeads.rome_bishop = bishop.id;
    var westClaim = recognize(s, 'dynastic_succession', actor('italy'), person(west.id));
    var eastClaim = recognize(s, 'dynastic_succession', actor('byzantium'), person(east.id));
    recognize(s, 'dynastic_succession', actor('croatia'), person(nepos.id));
    var westOffice = appointment(s, 'imperial_office', 'italy',
      person(west.id), actor('italy'), westClaim && westClaim.id);
    var eastOffice = appointment(s, 'imperial_office', 'byzantium',
      person(east.id), actor('byzantium'), eastClaim && eastClaim.id);
    var military = appointment(s, 'field_command', 'italy',
      person(orestes.id), { kind:'host', id:italianHost.id }, null, 361);
    var civicProof = recognize(s, 'civic_acceptance',
      { kind:'county', id:'ravenna' }, person(delegate.id),
      { kind:'county', id:'ravenna' });
    var civicOffice = appointment(s, 'civic_delegate', 'italy',
      person(delegate.id), { kind:'county', id:'ravenna' },
      civicProof && civicProof.id);
    sc.westOfficeId = westOffice && westOffice.id;
    sc.eastOfficeId = eastOffice && eastOffice.id;
    sc.orestesOfficeId = military && military.id;
    sc.civicOfficeId = civicOffice && civicOffice.id;
    if (s.realms.italy.treasury) s.realms.italy.treasury.gold = 120;
    if (s.realms.federates_476.treasury) s.realms.federates_476.treasury.gold = 0;
    FB.news(s, FB.msg('news.476.opening',
      '🏛 The western court sits at Ravenna. Its federate soldiers seek a spokesman for their arrears.', {}));
    return true;
  };
  function serviceTerms(s, sc) {
    return { patronRealmId:'italy', federateRealmId:'federates_476',
      hostId:'host_476_federates', payPerSeason:10, endTurn:s.turn + 361,
      settlementAwards:[{ provinceId:'ravenna', settlement:1,
        recipientId:sc.veteranId }] };
  }
  function currentContract(s, sc) {
    return sc.contractId && FB.political.contract(s, sc.contractId);
  }
  function hasChurchSupport(s, sc) {
    return !!(sc.churchRecognitionId &&
      FB.political.legitimacy(s, actor('federates_476'),
        { kind:'county', id:'ravenna' }, 'church_support').some(function (row) {
          return row.id === sc.churchRecognitionId;
        }));
  }
  function hasCivicConsent(s, sc) {
    return !!(sc.civicRecognitionId &&
      FB.political.legitimacy(s, actor('federates_476'),
        { kind:'county', id:'ravenna' }, 'civic_acceptance').some(function (row) {
          return row.id === sc.civicRecognitionId;
        }));
  }
  function civicPermission(s, sc) {
    return alive(s, sc.civicDelegateId) &&
      FB.political.permission(s, person(sc.civicDelegateId),
        'civic_agreement', { provinceId:'ravenna' }).allowed;
  }
  function snapshot(s, sc) {
    return {
      turn:s.turn, phase:sc.phase,
      westGeneration:FB.realmRulerGeneration(s, 'italy'),
      eastGeneration:FB.realmRulerGeneration(s, 'byzantium'),
      federateGeneration:FB.realmRulerGeneration(s, 'federates_476'),
      westTreasury:FB.treasuryAvailable(s, 'italy'),
      federateTreasury:FB.treasuryAvailable(s, 'federates_476'),
      ravennaOwner:s.owner.ravenna,
      italianHost:host(s, 'host_476_italy') && host(s, 'host_476_italy').at,
      federateHost:host(s, 'host_476_federates') && host(s, 'host_476_federates').at,
      church:hasChurchSupport(s, sc), civic:civicPermission(s, sc),
      consent:hasCivicConsent(s, sc),
      contract:currentContract(s, sc) && currentContract(s, sc).status,
      contractAward:sc.awardRequested && currentContract(s, sc) &&
        FB.political.contractAwardQuote(s, sc.contractId, 0),
      court:sc.courtAt, movement:sc.courtMove,
      recipient:alive(s, sc.veteranId)
    };
  }
  FB.situation476Quote = function (s, id) {
    var sc = scene(s);
    if (!sc) return { allowed:false, reason:'not_476' };
    var facts = snapshot(s, sc), allowed = false, reason = null;
    if (sc.phase === 'delegate') {
      allowed = ['accept_delegate','remain_service','refuse_involvement'].indexOf(id) >= 0;
    } else if (sc.phase === 'commission') {
      allowed = ['seek_commission','back_odoacer','keep_serving'].indexOf(id) >= 0 &&
        alive(s, sc.odoacerId) && !!host(s, 'host_476_federates');
      if (!allowed) reason = 'no_federate_command';
    } else if (sc.phase === 'contract') {
      if (id === 'offer_pay') {
        allowed = !!(alive(s, sc.orestesId) &&
          s.owner.ravenna === 'italy' && facts.westTreasury >= 30 &&
          host(s, 'host_476_federates') &&
          FB.political.contractQuote(s, serviceTerms(s, sc)).allowed);
        if (!allowed) reason = 'pay_or_patron_unavailable';
      } else allowed = id === 'refuse_pay';
    } else if (sc.phase === 'civic') {
      if (id === 'seek_mediation') {
        allowed = !hasChurchSupport(s, sc) && alive(s, sc.bishopId) &&
          !!s.religiousHeads.rome_bishop;
      } else if (id === 'revise_civic') {
        allowed = sc.proposal !== 'court_guarantee';
      } else if (id === 'renegotiate_pay') {
        allowed = !currentContract(s, sc) ||
          !currentContract(s, sc).effective;
      } else if (id === 'present_civic') {
        var contract = currentContract(s, sc);
        var me = s.chars[s.player.charId];
        allowed = !!(contract && contract.effective && civicPermission(s, sc) &&
          FB.countyCultureShare(s, 'ravenna', 'roman') >= 0.5 &&
          (me && me.religion === 'nicene' || hasChurchSupport(s, sc)) &&
          sc.proposal === 'court_guarantee');
        if (!allowed) reason = 'civic_terms_unmet';
      } else allowed = id === 'demand_force' &&
        !!host(s, 'host_476_federates') && alive(s, sc.odoacerId);
    } else if (sc.phase === 'recognition') {
      if (id === 'petition_basiliscus') {
        allowed = alive(s, sc.eastRulerId) &&
          FB.realmRulerCharacterSnapshot(s, 'byzantium') &&
          FB.realmRulerCharacterSnapshot(s, 'byzantium').id === sc.eastRulerId &&
          s.owner.constantinople === 'byzantium';
      } else if (id === 'back_zeno') {
        allowed = alive(s, sc.zenoId) && !!s.realms.byzantium.alive;
      } else if (id === 'uphold_nepos') {
        allowed = alive(s, sc.neposId) && s.owner.split === 'croatia';
      } else allowed = id === 'forgo_recognition';
      if (!allowed) reason = 'claimant_unavailable';
    } else if (sc.phase === 'court') {
      if (id === 'escort_court') {
        var escort = host(s, 'host_476_italy');
        allowed = sc.courtMove !== 'travelling' && sc.courtAt === 'ravenna' &&
          !!escort && !!FB.armyOrderPlan(s, escort, 'pavia').ok &&
          s.owner.pavia === 'italy';
      } else if (id === 'request_classis') {
        var agreement = currentContract(s, sc);
        allowed = sc.courtAt === 'pavia' && !sc.awardRequested &&
          !!(agreement && agreement.effective &&
            FB.political.contractAwardQuote(s, agreement.id, 0));
      } else if (id === 'court_maintenance') {
        allowed = sc.courtAt === 'pavia' && !sc.maintenancePaid &&
          FB.treasuryAvailable(s, 'italy') >= 5;
      } else if (id === 'move_to_ratification') {
        allowed = sc.courtAt === 'pavia' && !!(currentContract(s, sc) &&
          currentContract(s, sc).effective && hasCivicConsent(s, sc) &&
          s.owner.pavia === 'italy');
      } else allowed = id === 'demand_force' &&
        !!host(s, 'host_476_federates') && alive(s, sc.odoacerId);
    } else if (sc.phase === 'resolution') {
      if (id === 'ratify') {
        var terms = currentContract(s, sc);
        allowed = !!(terms && terms.effective && hasCivicConsent(s, sc) &&
          sc.courtAt === 'pavia' && s.owner.pavia === 'italy' && s.owner.ravenna === 'italy' &&
          (!sc.awardRequested ||
            FB.political.contractAwardQuote(s, terms.id, 0)));
      } else allowed = id === 'reject_ratification';
    } else if (sc.phase === 'battle') {
      allowed = id === 'withdraw' && !!s.realms.federates_476.war;
    } else if (sc.phase === 'aftermath') {
      allowed = id === 'accept_aftermath';
    }
    return { id:id, allowed:!!allowed, reason:reason,
      facts:facts, stamp:JSON.stringify(facts) };
  };
  function news(s, key, fallback, params) {
    FB.news(s, FB.msg(key, fallback, params || {}));
  }
  function startContest(s, sc) {
    var federates = s.realms.federates_476;
    var army = host(s, 'host_476_federates');
    if (!federates || !federates.alive || !army ||
        !alive(s, sc.odoacerId) || federates.war) return false;
    var plan = FB.armyOrderPlan(s, army, 'ravenna');
    if (!plan.ok) return false;
    federates.war = { enemy:'italy', years:0, captures:0,
      casus:{ type:'border' } };
    army.warId = '476_ravenna';
    if (!FB.orderArmy(s, army, 'ravenna', plan)) {
      federates.war = null; return false;
    }
    if (sc.contractId) FB.authorityContractTransition(s, sc.contractId,
      'breach', 'federates_476');
    sc.phase = 'battle'; sc.result = 'contested';
    news(s, 'news.476.contest',
      '⚔ The federate host marches on Ravenna. The city and the imperial court remain separate stakes.', {});
    return true;
  }
  FB.situation476Apply = function (s, id, reviewed) {
    var sc = scene(s), now = FB.situation476Quote(s, id);
    if (!sc || !reviewed || !now.allowed ||
        JSON.stringify(now) !== JSON.stringify(reviewed)) return false;
    var rec, office, contract, q, army;
    if (id === 'accept_delegate') {
      sc.role = 'delegate'; sc.phase = 'commission';
      news(s, 'news.476.delegate',
        '📜 The soldiers name you their delegate. You hold no land or civil jurisdiction.', {});
    } else if (id === 'remain_service') {
      sc.phase = 'commission';
    } else if (id === 'refuse_involvement') {
      sc.role = 'outside'; sc.phase = 'complete'; sc.result = 'declined';
      sc.outcomeTurn = s.turn;
    } else if (id === 'seek_commission') {
      rec = recognize(s, 'army_acclamation',
        { kind:'host', id:'host_476_federates' }, person(s.player.charId));
      if (!rec) return false;
      office = appointment(s, 'field_command', 'federates_476',
        person(s.player.charId), { kind:'host', id:'host_476_federates' },
        rec.id, s.turn + 361);
      if (!office) return false;
      sc.commissionId = office.id; sc.role = 'commander';
      sc.phase = 'contract';
      news(s, 'news.476.command',
        '🚩 The federate host accepts your limited command for this service term.', {});
    } else if (id === 'back_odoacer') {
      rec = recognize(s, 'army_acclamation',
        { kind:'host', id:'host_476_federates' }, person(sc.odoacerId));
      if (!rec) return false;
      office = appointment(s, 'field_command', 'federates_476',
        person(sc.odoacerId), { kind:'host', id:'host_476_federates' },
        rec.id, s.turn + 361);
      if (!office) return false;
      sc.phase = 'contract';
    } else if (id === 'keep_serving') {
      sc.phase = 'contract';
    } else if (id === 'offer_pay') {
      q = serviceTerms(s, sc);
      contract = FB.authorityOfferContract(s, q);
      if (!contract) return false;
      if (!FB.authorityConsentContract(s, contract.id, 'italy') ||
          !FB.authorityConsentContract(s, contract.id, 'federates_476') ||
          !FB.treasuryTransfer(s, 'italy', 'federates_476', 30)) {
        FB.authorityContractTransition(s, contract.id, 'breach', 'italy');
        return false;
      }
      sc.contractId = contract.id; sc.phase = 'civic';
      news(s, 'news.476.contract',
        '🪙 Ravenna pays the federate body {money:amount} now and owes four seasonal installments.',
        { amount:30 });
    } else if (id === 'refuse_pay') {
      sc.phase = 'civic'; sc.proposal = 'force';
    } else if (id === 'seek_mediation') {
      rec = recognize(s, 'church_support',
        { kind:'religious-office', id:'rome_bishop' },
        actor('federates_476'), { kind:'county', id:'ravenna' });
      if (!rec) return false;
      sc.churchRecognitionId = rec.id;
      news(s, 'news.476.mediation',
        '✝ The bishop supports protected Nicene worship in a federate settlement; he grants no command.', {});
    } else if (id === 'revise_civic') {
      sc.proposal = 'court_guarantee';
    } else if (id === 'renegotiate_pay') {
      sc.phase = 'contract';
    } else if (id === 'present_civic') {
      rec = recognize(s, 'civic_acceptance',
        { kind:'county', id:'ravenna' }, actor('federates_476'),
        { kind:'county', id:'ravenna' });
      if (!rec) return false;
      sc.civicRecognitionId = rec.id;
      sc.phase = 'recognition';
      news(s, 'news.476.civic',
        '🏛 Ravenna accepts the bargain while its civic courts keep their jurisdiction.', {});
    } else if (id === 'petition_basiliscus' || id === 'uphold_nepos') {
      var issuerId = id === 'petition_basiliscus' ? 'byzantium' : 'croatia';
      rec = recognize(s, 'imperial_commission', actor(issuerId),
        actor('federates_476'), actor('federates_476'));
      if (!rec) return false;
      sc.imperialRecognitionId = rec.id;
      sc.backedClaimant = id === 'petition_basiliscus' ? 'basiliscus' : 'nepos';
      sc.phase = 'court';
    } else if (id === 'back_zeno') {
      sc.backedClaimant = 'zeno'; sc.phase = 'court';
      if (sc.easternReturn === 'restored' &&
          FB.realmRulerCharacterSnapshot(s, 'byzantium') &&
          FB.realmRulerCharacterSnapshot(s, 'byzantium').id === sc.zenoId) {
        rec = recognize(s, 'imperial_commission', actor('byzantium'),
          actor('federates_476'), actor('federates_476'));
        sc.imperialRecognitionId = rec && rec.id;
      }
    } else if (id === 'forgo_recognition') {
      sc.backedClaimant = 'none'; sc.phase = 'court';
    } else if (id === 'escort_court') {
      army = host(s, 'host_476_italy');
      if (!army || !FB.orderArmy(s, army, 'pavia')) return false;
      army.scenarioCourtEscort = true;
      sc.courtMove = 'travelling';
      news(s, 'news.476.court_depart',
        '🏛 The western court departs Ravenna under escort for Ticinum.', {});
    } else if (id === 'court_maintenance') {
      if (!FB.treasuryTransfer(s, 'italy', 'federates_476', 5)) return false;
      sc.maintenancePaid = true;
      news(s, 'news.476.maintenance',
        '🪙 The court pays {money:amount} for its escort at Ticinum.', { amount:5 });
    } else if (id === 'request_classis') {
      sc.awardRequested = true;
    } else if (id === 'move_to_ratification') {
      sc.phase = 'resolution';
    } else if (id === 'ratify') {
      if (sc.awardRequested) {
        contract = currentContract(s, sc);
        q = FB.political.contractAwardQuote(s, contract.id, 0);
        if (!q || !FB.authorityFulfillContractAward(s, contract.id, 0, q)) return false;
        sc.awardGranted = true;
      }
      sc.phase = 'complete'; sc.result = 'negotiated';
      sc.outcomeTurn = s.turn;
      news(s, 'news.476.ratified',
        '📜 The federate service settlement is ratified. The host keeps its commission, Ravenna its civic courts.', {});
    } else if (id === 'reject_ratification' || id === 'demand_force') {
      if (!startContest(s, sc)) return false;
    } else if (id === 'withdraw') {
      s.realms.federates_476.war = null;
      var retreat = host(s, 'host_476_federates');
      if (retreat) { retreat.path = []; retreat.goal = null; retreat.moveLeft = 0; }
      sc.phase = 'aftermath'; sc.result = 'contested_withdrawal';
      news(s, 'news.476.withdraw',
        '🏳 The host withdraws. Your household remains free and may seek ordinary service.', {});
    } else if (id === 'accept_aftermath') {
      sc.phase = 'complete'; sc.outcomeTurn = s.turn;
    } else return false;
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return true;
  };
  FB.situation476Season = function (s) {
    var sc = scene(s), row = sc && currentContract(s, sc);
    if (!row || row.status !== 'active' || !s.player.charId) return;
    var period = Math.floor(s.turn / 90);
    if (period <= sc.lastAllocatedPeriod || row.paidThroughPeriod !== period ||
        period > Math.floor(row.startTurn / 90) + 4) return;
    if (FB.treasuryTransfer(s, 'federates_476', 'player', 2)) {
      sc.lastAllocatedPeriod = period;
      news(s, 'news.476.service_share',
        '🪙 Your household receives {money:amount} from the federate body’s seasonal service pay.',
        { amount:2 });
    }
  };
  FB.situation476Day = function (s) {
    var sc = scene(s);
    if (!sc) return;
    if (sc.courtMove === 'travelling') {
      var escort = host(s, 'host_476_italy');
      if (escort && escort.at === 'pavia' && !escort.moveLeft) {
        sc.courtAt = 'pavia'; sc.courtMove = null;
        s.realms.italy.capital = 'pavia';
        FB.invalidateRealmCache();
        if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
        escort.scenarioCourtEscort = false;
        news(s, 'news.476.court_arrives',
          '🏛 The western court reaches Ticinum. Its escort asks for maintenance and a settlement.', {});
      } else if (!escort || s.owner.pavia !== 'italy') {
        sc.courtMove = 'interrupted';
        news(s, 'news.476.court_interrupted',
          '🏛 The court’s route is broken; its requested settlement must be reviewed again.', {});
      }
    }
    if ((sc.easternReturn === 'pending' || sc.easternReturn === 'delayed') &&
        s.turn >= (sc.backedClaimant === 'zeno' ? 150 : 180)) {
      var sitting = ruler(s, 'byzantium');
      if (alive(s, sc.zenoId) && alive(s, sc.eastRulerId) &&
          sitting && sitting.id === sc.eastRulerId &&
          s.owner.constantinople === 'byzantium' &&
          !s.realms.byzantium.war) {
        if (FB.assignRealmRulerCharacter(s, 'byzantium', sc.zenoId,
            { replaceAuthored:true })) {
          FB.authorityAppointmentTransition(s, sc.eastOfficeId, 'remove');
          var claim = recognize(s, 'dynastic_succession',
            actor('byzantium'), person(sc.zenoId));
          var office = appointment(s, 'imperial_office', 'byzantium',
            person(sc.zenoId), actor('byzantium'), claim && claim.id);
          sc.eastOfficeId = office && office.id;
          if (sc.backedClaimant === 'zeno') {
            var commission = recognize(s, 'imperial_commission',
              actor('byzantium'), actor('federates_476'),
              actor('federates_476'));
            sc.imperialRecognitionId = commission && commission.id;
          }
          sc.easternReturn = 'restored';
          sc.zenoCourt.status = 'returned';
          s.chars[sc.zenoId].homeProvinceId = 'constantinople';
          news(s, 'news.476.zeno_returns',
            '🏛 Zeno returns to Constantinople. Basiliscus can no longer issue a fresh imperial commission.', {});
        }
      } else sc.easternReturn = !alive(s, sc.zenoId) || s.turn >= 360
        ? 'interrupted' : 'delayed';
    }
    if (!sc.pressureNoted && s.turn >= 120 && sc.phase !== 'complete') {
      sc.pressureNoted = true;
      news(s, 'news.476.pressure',
        '⚠ Arrears and rival claims sharpen the dispute around Ravenna.', {});
    }
    if (sc.phase !== 'battle') return;
    var federates = host(s, 'host_476_federates');
    var italian = host(s, 'host_476_italy');
    if (!federates || federates.men <= 0 ||
        !alive(s, sc.odoacerId)) {
      s.realms.federates_476.war = null;
      sc.phase = 'aftermath'; sc.result = 'contested_defeat';
      news(s, 'news.476.defeat',
        '🏳 The federate attack fails. Your household survives and can continue in service.', {});
    } else if (federates.at === 'ravenna' &&
               (!italian || italian.men <= 0 || italian.at !== 'ravenna') &&
               s.owner.ravenna === 'italy') {
      FB.transferProvince(s, 'ravenna', 'federates_476');
      s.realms.federates_476.nonTerritorial = false;
      s.realms.federates_476.capital = 'ravenna';
      s.realms.federates_476.war = null;
      sc.phase = 'aftermath'; sc.result = 'contested_victory';
      var acclaim = recognize(s, 'army_acclamation',
        { kind:'host', id:federates.id }, person(sc.odoacerId));
      sc.odoacerAcclamationId = acclaim && acclaim.id;
      if (alive(s, sc.westRulerId) && sc.westOfficeId) {
        FB.authorityAppointmentTransition(s, sc.westOfficeId, 'remove');
        sc.romulusDeposed = true;
      }
      news(s, 'news.476.victory',
        '⚔ The federates take Ravenna. Odoacer is acclaimed; the western office is contested, while the city’s people and property remain.', {});
    }
  };
  function stageName(phase) {
    var names = {
      delegate:FB.T('Soldiers seek a spokesman'),
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
  function choices(s, sc) {
    if (sc.phase === 'delegate') return [
      { id:'accept_delegate', label:FB.T('Serve as the soldiers’ delegate'),
        detail:FB.T('Gain a service role. No land, command, or civil jurisdiction changes hands.') },
      { id:'remain_service', label:FB.T('Remain an ordinary soldier'),
        detail:FB.T('Keep your free household and continue to the command dispute without becoming delegate.') },
      { id:'refuse_involvement', label:FB.T('Refuse involvement'),
        detail:FB.T('Leave the political sequence; ordinary livelihood and family play continue.') }
    ];
    if (sc.phase === 'commission') return [
      { id:'seek_commission', label:FB.T('Seek the detachment commission'),
        detail:FB.T('Peers acclaim you; Odoacer appoints you for 360 days to command this host only. No land, tax, or court follows.') },
      { id:'back_odoacer', label:FB.T('Back Odoacer as commander'),
        detail:FB.T('Odoacer holds the scoped host commission. You may still serve as delegate.') },
      { id:'keep_serving', label:FB.T('Keep serving without a command'),
        detail:FB.T('Continue to the pay dispute as a free soldier.') }
    ];
    if (sc.phase === 'contract') return [
      { id:'offer_pay', label:FB.T('Offer a one-year service contract'),
        detail:FB.T('Western treasury pays {money:immediate} now to the federate body, then {money:seasonal} at the next four seasonal settlements during the 360-day term. Your household receives {money:share} from each payment, included in that amount. Classis may be awarded later only by a separate reviewed grant.',
          { immediate:30, seasonal:10, share:2 }) },
      { id:'refuse_pay', label:FB.T('Refuse these terms'),
        detail:FB.T('No treasury transfer or contract. You can revise the civic proposal or contest Ravenna.') }
    ];
    if (sc.phase === 'civic') return [
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
    if (sc.phase === 'recognition') return [
      { id:'petition_basiliscus', label:FB.T('Petition Basiliscus'),
        detail:FB.T('The sitting eastern emperor may recognize federate service. His commission needs reaffirmation if his rule ends.') },
      { id:'back_zeno', label:FB.T('Back the displaced Zeno'),
        detail:FB.T('A displaced claimant cannot issue an imperial commission now. If Zeno regains Constantinople alive, he can recognize the backed service claim.') },
      { id:'uphold_nepos', label:FB.T('Uphold Julius Nepos'),
        detail:FB.T('The Dalmatian claimant recognizes the federate body. This does not move a county or remove Romulus.') },
      { id:'forgo_recognition', label:FB.T('Proceed without imperial recognition'),
        detail:FB.T('The contract and civic bargain may stand while rival imperial claims remain unresolved.') }
    ];
    if (sc.phase === 'court') return [
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
    if (sc.phase === 'resolution') return [
      { id:'ratify', label:FB.T('Ratify the negotiated settlement'),
        detail:FB.T('Confirm live pay, civic consent, court arrival, and any requested Classis grant. Romulus remains in western office; the federate host retains only its commissioned command.') },
      { id:'reject_ratification', label:FB.T('Reject and contest Ravenna'),
        detail:FB.T('Breach the agreement and let the field hosts decide Ravenna. Your household remains playable after either result.') }
    ];
    if (sc.phase === 'battle') return [
      { id:'withdraw', label:FB.T('Withdraw the federate demand'),
        detail:FB.T('End this contest without a county award. Your free household continues.') }
    ];
    if (sc.phase === 'aftermath') return [
      { id:'accept_aftermath', label:FB.T('Continue after the contest'),
        detail:FB.T('Close the political sequence. Surviving people, communities, property, and the household remain in play.') }
    ];
    return [];
  }
  function statusText(s, sc) {
    var row = currentContract(s, sc), lines = [];
    lines.push(FB.T('Western court: {location}.', {
      location:sc.courtAt === 'pavia' ? FB.T('Ticinum') : FB.T('Ravenna') }));
    lines.push(row ? FB.T('Federate contract: {status}; {money:amount} per season during its 360-day term.',
      { status:row.status === 'active' ? FB.T('active') :
        row.status === 'breached' ? FB.T('breached') :
        row.status === 'expired' ? FB.T('expired') : FB.T('offered'),
        amount:row.payPerSeason }) :
      FB.T('Federate contract: none.'));
    lines.push(hasCivicConsent(s, sc) ? FB.T('Ravenna civic consent: recorded.') :
      FB.T('Ravenna civic consent: pending.'));
    if (sc.role === 'commander') lines.push(FB.T(
      'Your commission commands the federate host for this term only.'));
    if (sc.awardGranted) lines.push(FB.T('Classis allotment: granted to the veteran.'));
    else if (sc.awardRequested) lines.push(FB.T(
      'Classis allotment: requested, subject to the final grant review.'));
    lines.push(sc.imperialRecognitionId ? FB.T('Imperial commission: recorded.') :
      sc.backedClaimant === 'zeno' ? FB.T('Zeno’s claim: backed, awaiting his return.') :
      FB.T('Imperial commission: none.'));
    if (sc.phase === 'battle') lines.push(FB.T('The host marches on the map. Its real battle and route determine control of Ravenna.'));
    if (sc.phase === 'complete' && sc.result === 'negotiated') lines.push(FB.T('Negotiated outcome: the court and city retain their separate powers.'));
    if (sc.phase === 'complete' && sc.result !== 'negotiated') lines.push(FB.T('The household remains free to continue its story.'));
    return lines;
  }
  FB.situation476Status = function (s) {
    var sc = scene(s);
    return sc ? { phase:sc.phase, name:stageName(sc.phase),
      lines:statusText(s, sc) } : null;
  };
  if (FB.ui) {
    FB.ui.show476Situation = function () {
      var s = FB.state, sc = scene(s);
      if (!sc) return;
      var esc = FB.esc, list = choices(s, sc), html =
        '<div class="gm-body-text"><p>' + esc(FB.T('Spring 476: court, soldiers, and city')) +
        '</p><h3>' + esc(stageName(sc.phase)) + '</h3>';
      for (var line of statusText(s, sc)) html += '<p class="hint">' + esc(line) + '</p>';
      html += '</div>';
      for (var choice of list) {
        var quote = FB.situation476Quote(s, choice.id);
        html += '<button type="button" class="actionbtn" data-476-choice="' +
          esc(choice.id) + '" aria-disabled="' + (!quote.allowed) + '">' +
          '<b>' + esc(choice.label) + '</b><br><span class="hint">' +
          esc(choice.detail) + '</span></button>';
      }
      FB.ui.openModal(FB.T('The Western Court, 476'), html,
        { returnFocus:document.activeElement });
      document.querySelectorAll('[data-476-choice]').forEach(function (node) {
        node.addEventListener('click', function () {
          var id = node.getAttribute('data-476-choice');
          var selected = choices(FB.state, scene(FB.state)).filter(function (item) {
            return item.id === id;
          })[0];
          if (!selected) return;
          var reviewed = FB.situation476Quote(FB.state, id);
          var reason = reviewed.allowed ? '' :
            reviewed.reason === 'pay_or_patron_unavailable'
              ? FB.T('The western treasury, appointer, host, or Classis allotment has changed. Review the current situation.')
              : reviewed.reason === 'civic_terms_unmet'
              ? FB.T('The civic delegate needs an active contract, protected local courts, and Nicene support or episcopal mediation.')
              : FB.T('The current people, territory, route, or mandate no longer allows this choice.');
          var body = '<div class="gm-body-text"><p>' +
            esc(selected.detail) + '</p>' + (reason ? '<p class="hint">' +
            esc(reason) + '</p>' : '') + '</div>';
          if (reviewed.allowed && id === 'ratify' && reviewed.facts.contractAward) {
            var award = reviewed.facts.contractAward;
            body += '<p class="hint">' + esc(FB.T(
              'Classis grant: about {money:income} yearly revenue to the veteran; {money:loss} leaves the western treasury. The veteran holds this one port, not Ravenna county.',
              { income:Math.round(award.net * 10) / 10,
                loss:Math.round(award.lostRevenue * 10) / 10 })) + '</p>';
          }
          if (reviewed.allowed) body += '<button type="button" class="btn primary" id="gm-476-confirm">' +
            esc(FB.T('Confirm {choice}', { choice:selected.label })) + '</button>';
          FB.ui.openModal(FB.T('Review {choice}', { choice:selected.label }),
            body, { historyView:true, historyBack:true });
          var confirm = document.getElementById('gm-476-confirm');
          if (!confirm) return;
          confirm.addEventListener('click', function () {
            if (!FB.situation476Apply(FB.state, id, reviewed)) {
              FB.ui.openModal(FB.T('Terms changed'),
                '<p>' + esc(FB.T('This decision changed while it was open. Return to the situation and review it again.')) + '</p>');
              return;
            }
            var deeds = document.getElementById('tab-actions');
            var scroll = deeds && deeds.scrollTop;
            FB.ui.closeModal();
            FB.ui.refresh();
            if (deeds) deeds.scrollTop = scroll;
            var updated = scene(FB.state);
            FB.ui.openModal(FB.T('Decision recorded'),
              '<div class="gm-body-text"><p>' + esc(selected.label) +
              '</p><p>' + esc(stageName(updated.phase)) +
              '</p></div><button type="button" class="btn primary" id="gm-476-continue">' +
              esc(FB.T('Continue')) + '</button>',
              { returnFocus:document.getElementById('deeds-476-situation') });
            document.getElementById('gm-476-continue').addEventListener('click',
              FB.ui.closeModal);
          });
        });
      });
    };
  }
})();
