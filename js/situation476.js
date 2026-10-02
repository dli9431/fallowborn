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
      pressureNoted:false, outcomeTurn:null,
      governanceResolved:false, westernOfficeResolved:false,
      historical:{ clovis:'pending', theoderic:'pending',
        africa:'pending', italy:'pending' },
      courtAnchors:{ italy:'ravenna', croatia:'split',
        byzantium:'constantinople', west_francia:'paris',
        aghlabids:'tunis', pannonia:'szekesfehervar' }
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
      'homoian', 38, 2, 'soldier', 'pavia');
    var senator = made(s, FB.randomName('roman', 'm'), 'roman',
      'nicene', 58, 3, 'notable', 'roma');
    var homoianBishop = made(s, FB.randomName('gothic', 'm'), 'gothic',
      'homoian', 46, 3, 'priest', 'ravenna');
    var clovis = made(s, 'Clovis', 'frankish', 'germanic_pagan',
      10, 2, 'heir', 'arras');
    var childeric = ruler(s, 'franks_476');
    if (childeric) {
      clovis.fatherId = childeric.id;
      childeric.childrenIds.push(clovis.id);
      var frankSuccession = FB.ensureRealmSuccession(s, 'franks_476');
      var frankRoot = frankSuccession &&
        frankSuccession.members[frankSuccession.rulerMemberId];
      if (frankRoot) {
        var clovisMemberId = 'royal_franks_476_' + clovis.id;
        frankSuccession.members[clovisMemberId] = {
          id:clovisMemberId, name:clovis.name, sex:'m',
          born:clovis.born, alive:true, parentId:frankRoot.id,
          childIds:[], charId:clovis.id, role:null
        };
        frankRoot.childIds.unshift(clovisMemberId);
        frankSuccession.order.unshift(clovisMemberId);
        frankSuccession.heirId = clovisMemberId;
        clovis.royalLine = { realmId:'franks_476', memberId:clovisMemberId };
        FB.refreshRealmSuccession(s, 'franks_476');
      }
    }
    west.fatherId = orestes.id;
    orestes.childrenIds.push(west.id);
    sc.orestesId = orestes.id;
    sc.zenoId = zeno.id;
    sc.civicDelegateId = delegate.id;
    sc.bishopId = bishop.id;
    sc.veteranId = veteran.id;
    sc.senatorId = senator.id;
    sc.homoianBishopId = homoianBishop.id;
    sc.clovisId = clovis.id;
    sc.syagriusId = ruler(s, 'west_francia').id;
    sc.theodericId = ruler(s, 'pannonia').id;
    sc.childericId = childeric && childeric.id;
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
    s.religiousHeads.rome_bishop = bishop.id;
    s.religiousHeads.ravenna_homoian_bishop = homoianBishop.id;
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
    var senateProof = recognize(s, 'civic_acceptance',
      { kind:'county', id:'roma' }, person(senator.id),
      { kind:'county', id:'roma' });
    var senateOffice = appointment(s, 'civic_delegate', 'italy',
      person(senator.id), { kind:'county', id:'roma' },
      senateProof && senateProof.id);
    sc.westOfficeId = westOffice && westOffice.id;
    sc.eastOfficeId = eastOffice && eastOffice.id;
    sc.orestesOfficeId = military && military.id;
    sc.civicOfficeId = civicOffice && civicOffice.id;
    sc.civicProofId = civicProof && civicProof.id;
    sc.senateProofId = senateProof && senateProof.id;
    sc.senateOfficeId = senateOffice && senateOffice.id;
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
  function cityRights(s, sc, issuerId) {
    if (!alive(s, sc.civicDelegateId) || s.owner.ravenna !== issuerId ||
        FB.countyReligionShare(s, 'ravenna', 'nicene') < 0.5) return false;
    var proof = sc.civicProofId && FB.political.legitimacy(s,
      person(sc.civicDelegateId), { kind:'county', id:'ravenna' },
      'civic_acceptance').some(function (row) {
        return row.id === sc.civicProofId;
      });
    if (!proof) {
      var recognized = recognizeOrExisting(s, 'civic_acceptance',
        { kind:'county', id:'ravenna' }, person(sc.civicDelegateId),
        { kind:'county', id:'ravenna' });
      sc.civicProofId = recognized && recognized.id;
      if (!recognized) return false;
    }
    var rights = [];
    for (var power of ['peace','consent']) {
      var right = FB.authorityEstablishRight(s, { issuer:actor(issuerId),
        beneficiary:person(sc.civicDelegateId),
        scope:{ kind:'county', id:'ravenna' }, power:power,
        basis:'recognition', basisRef:sc.civicProofId });
      if (right) rights.push(right.id);
    }
    sc.cityRightIds = (sc.cityRightIds || []).concat(rights);
    return !!sc.cityRightIds.length;
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
      recipient:alive(s, sc.veteranId),
      delegate:alive(s, sc.civicDelegateId),
      romanBishop:alive(s, sc.bishopId),
      homoianBishop:alive(s, sc.homoianBishopId),
      senator:alive(s, sc.senatorId),
      westernOffice:sc.westernOfficeResolved,
      governance:sc.governanceResolved
    };
  }
  FB.situation476Quote = function (s, id) {
    var sc = scene(s);
    if (!sc) return { allowed:false, reason:'not_476' };
    var facts = snapshot(s, sc), allowed = false, reason = null;
    if (id === 'leave_dispute') allowed =
      sc.phase !== 'delegate' && sc.phase !== 'complete' &&
      sc.phase !== 'battle';
    else if (sc.phase === 'delegate') {
      allowed = ['accept_delegate','remain_service','refuse_involvement',
        'seek_city_service','seek_church_service'].indexOf(id) >= 0;
      if (id === 'seek_city_service') allowed = facts.delegate &&
        s.owner.ravenna === 'italy' && facts.senator;
      if (id === 'seek_church_service') allowed = facts.homoianBishop &&
        s.chars[s.player.charId] &&
        s.chars[s.player.charId].religion === 'homoian';
    } else if (sc.phase === 'civic_service') {
      allowed = id === 'leave_city_service' ||
        id === 'petition_city_office' && facts.delegate &&
          s.owner.ravenna === 'italy' &&
          FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5 &&
          !sc.cityOfficeId &&
          (sc.role === 'city_clerk' || !!sc.interfaithRecognitionId);
    } else if (sc.phase === 'church_service') {
      allowed = id === 'leave_church_service' ||
        id === 'seek_homoian_commission' && facts.homoianBishop &&
          s.chars[s.player.charId].religion === 'homoian' &&
          !sc.homoianRecognitionId ||
        id === 'mediate_communities' && facts.romanBishop &&
          facts.homoianBishop && !!sc.homoianRecognitionId &&
          s.chars[s.player.charId].religion === 'homoian' &&
          FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5;
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
    } else if (sc.phase === 'complete') {
      var victorious = sc.result === 'contested_victory' &&
        s.owner.ravenna === 'federates_476';
      if (id === 'adopt_civic_rule') allowed = victorious &&
        !sc.governanceResolved && facts.delegate &&
        facts.romanBishop &&
        FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5;
      else if (id === 'affirm_host_rule') allowed = victorious &&
        !sc.governanceResolved;
      else if (id === 'recognize_nepos_west') allowed = victorious &&
        !sc.westernOfficeResolved && alive(s, sc.neposId) &&
        s.owner.split === 'croatia' && s.owner.roma === 'italy' &&
        facts.senator && FB.political.permission(s,
          person(sc.senatorId), 'civic_agreement',
          { provinceId:'roma' }).allowed;
      else if (id === 'retire_western_office') allowed = victorious &&
        !sc.westernOfficeResolved && s.owner.constantinople === 'byzantium';
      else if (id === 'restore_western_office') allowed =
        sc.romulusDeposed && sc.westernOfficeResolved !== 'restored' &&
        s.owner.ravenna === 'italy' && alive(s, sc.westRulerId) &&
        !!s.realms.italy.alive;
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
    if (id === 'leave_dispute') {
      sc.phase = 'complete'; sc.result = 'interrupted';
      sc.outcomeTurn = s.turn;
      news(s, 'news.476.leave_dispute',
        '🏳 Your household leaves the court dispute and remains free to continue its life.', {});
    } else if (id === 'accept_delegate') {
      sc.role = 'delegate'; sc.phase = 'commission';
      news(s, 'news.476.delegate',
        '📜 The soldiers name you their delegate. You hold no land or civil jurisdiction.', {});
    } else if (id === 'remain_service') {
      sc.phase = 'commission';
    } else if (id === 'seek_city_service') {
      if (!FB.setCareer(s, s.chars[s.player.charId], 'civic_clerk')) return false;
      sc.role = 'city_clerk'; sc.phase = 'civic_service';
      news(s, 'news.476.city_service',
        '🏛 The Ravenna council accepts your service as a clerk; civic jurisdiction remains with the city.', {});
    } else if (id === 'seek_church_service') {
      if (!FB.setCareer(s, s.chars[s.player.charId], 'priest')) return false;
      sc.role = 'church_clerk'; sc.phase = 'church_service';
      news(s, 'news.476.church_service',
        '☧ You enter the Ravenna congregation’s clerical service. The bishop holds its local commission.', {});
    } else if (id === 'seek_homoian_commission') {
      rec = recognize(s, 'church_support',
        { kind:'religious-office', id:'ravenna_homoian_bishop' },
        person(s.player.charId), { kind:'county', id:'ravenna' });
      if (!rec) return false;
      sc.homoianRecognitionId = rec.id; sc.role = 'church_delegate';
    } else if (id === 'mediate_communities') {
      rec = recognize(s, 'church_support',
        { kind:'religious-office', id:'rome_bishop' },
        person(s.player.charId), { kind:'county', id:'ravenna' });
      if (!rec) return false;
      sc.interfaithRecognitionId = rec.id; sc.phase = 'civic_service';
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
      sc.cityOfficeId = office.id; sc.phase = 'complete';
      sc.result = sc.role === 'city_clerk' ? 'civic_office' : 'church_civic_office';
      sc.outcomeTurn = s.turn;
      news(s, 'news.476.city_office',
        '⚖ The court appoints you to Ravenna’s local Peace. The county and its revenue remain separate.', {});
    } else if (id === 'leave_city_service' || id === 'leave_church_service') {
      sc.phase = 'complete'; sc.result = id === 'leave_city_service'
        ? 'civic_service' : 'church_service'; sc.outcomeTurn = s.turn;
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
        s.chars[sc.veteranId].homeProvinceId = 'ravenna';
        sc.veteranMigration = { provinceId:'ravenna', settlement:1,
          turn:s.turn };
      }
      sc.phase = 'complete'; sc.result = 'negotiated';
      sc.outcomeTurn = s.turn;
      cityRights(s, sc, 'italy');
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
    } else if (id === 'adopt_civic_rule') {
      rec = recognizeOrExisting(s, 'church_support',
        { kind:'religious-office', id:'rome_bishop' },
        actor('federates_476'), { kind:'county', id:'ravenna' });
      if (!rec || !cityRights(s, sc, 'federates_476') ||
          !FB.authoritySetGovernment(s, 'federates_476', 'roman_civic')) return false;
      sc.governanceResolved = 'civic';
      news(s, 'news.476.civic_rule',
        '🏛 Odoacer accepts Ravenna’s civic courts and Nicene worship under a Roman civic government.', {});
    } else if (id === 'affirm_host_rule') {
      sc.governanceResolved = 'federate';
      news(s, 'news.476.host_rule',
        '🚩 The federate host keeps its own government. Ravenna’s civic claims remain unsettled.', {});
    } else if (id === 'recognize_nepos_west') {
      var senate = recognize(s, 'civic_acceptance',
        { kind:'county', id:'roma' }, person(sc.neposId),
        { kind:'county', id:'roma' });
      if (!senate) return false;
      sc.senateRecognitionId = senate.id;
      rec = recognize(s, 'imperial_commission', actor('croatia'),
        person(sc.neposId), actor('italy'));
      if (!rec) return false;
      office = appointment(s, 'imperial_office', 'italy',
        person(sc.neposId), actor('italy'), rec.id);
      if (!office) return false;
      sc.westOfficeId = office.id; sc.westernOfficeResolved = 'nepos';
      news(s, 'news.476.nepos_west',
        '📜 Nepos receives a western office claim while his Dalmatian court remains separate.', {});
    } else if (id === 'retire_western_office') {
      rec = recognizeOrExisting(s, 'imperial_commission', actor('byzantium'),
        actor('federates_476'), actor('federates_476'));
      if (!rec) return false;
      sc.imperialRecognitionId = rec.id;
      sc.westernOfficeResolved = 'retired';
      news(s, 'news.476.office_retired',
        '📜 The host seeks eastern recognition and leaves the western office vacant.', {});
    } else if (id === 'restore_western_office') {
      if (sc.westOfficeId)
        FB.authorityAppointmentTransition(s, sc.westOfficeId, 'remove');
      rec = recognizeOrExisting(s, 'dynastic_succession', actor('italy'),
        person(sc.westRulerId));
      if (!rec) return false;
      office = appointment(s, 'imperial_office', 'italy',
        person(sc.westRulerId), actor('italy'), rec.id);
      if (!office) return false;
      sc.westOfficeId = office.id; sc.westernOfficeResolved = 'restored';
      news(s, 'news.476.office_restored',
        '🏛 Romulus returns to the western office after Ravenna returns to his court.', {});
    } else return false;
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return true;
  };
  FB.situation476Season = function (s) {
    var sc = scene(s), row = sc && currentContract(s, sc);
    if (!row || row.status !== 'active' || !s.player.charId ||
        sc.role === 'outside') return;
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
  function aiSettlement476(s, sc) {
    if (sc.result !== 'declined' || s.turn < 90 ||
        sc.aiResolution === 'negotiated' ||
        sc.aiResolution === 'won' ||
        sc.aiResolution === 'failed' ||
        sc.aiResolution === 'diverged') return;
    if (sc.aiResolution === 'war') {
      if (s.owner.ravenna === 'federates_476') {
        s.realms.federates_476.nonTerritorial = false;
        s.realms.federates_476.capital = 'ravenna';
        if (sc.westOfficeId) FB.authorityAppointmentTransition(
          s, sc.westOfficeId, 'remove');
        sc.romulusDeposed = true;
        var acclaim = recognize(s, 'army_acclamation',
          { kind:'host', id:'host_476_federates' }, person(sc.odoacerId));
        sc.odoacerAcclamationId = acclaim && acclaim.id;
        if (alive(s, sc.bishopId) && alive(s, sc.civicDelegateId) &&
            FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5) {
          var support = recognize(s, 'church_support',
            { kind:'religious-office', id:'rome_bishop' },
            actor('federates_476'), { kind:'county', id:'ravenna' });
          if (support && cityRights(s, sc, 'federates_476')) {
            FB.authoritySetGovernment(s, 'federates_476', 'roman_civic');
            sc.governanceResolved = 'civic';
          }
        }
        sc.aiResolution = 'won'; sc.result = 'ai_victory';
        news(s, 'news.476.ai_victory',
          '⚔ Without your service, Odoacer’s host wins Ravenna through an ordinary campaign. The city’s surviving delegates negotiate their rights.', {});
      } else if (!FB.ordinaryWarById(s, sc.aiWarId)) {
        sc.aiResolution = 'failed'; sc.result = 'ai_failure';
      }
      return;
    }
    if (s.owner.ravenna !== 'italy' || !alive(s, sc.odoacerId) ||
        !s.realms.federates_476.alive) {
      sc.aiResolution = 'diverged'; return;
    }
    var terms = serviceTerms(s, sc);
    var canAgree = alive(s, sc.orestesId) &&
      alive(s, sc.civicDelegateId) && alive(s, sc.bishopId) &&
      s.religiousHeads.rome_bishop === sc.bishopId &&
      civicPermission(s, sc) &&
      FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5 &&
      FB.treasuryAvailable(s, 'italy') >= 30 &&
      FB.political.contractQuote(s, terms).allowed;
    if (canAgree) {
      var contract = FB.authorityOfferContract(s, terms);
      if (contract && FB.authorityConsentContract(s, contract.id, 'italy') &&
          FB.authorityConsentContract(s, contract.id, 'federates_476') &&
          FB.treasuryTransfer(s, 'italy', 'federates_476', 30)) {
        sc.contractId = contract.id;
        var church = recognizeOrExisting(s, 'church_support',
          { kind:'religious-office', id:'rome_bishop' },
          actor('federates_476'), { kind:'county', id:'ravenna' });
        sc.churchRecognitionId = church && church.id;
        var civic = recognizeOrExisting(s, 'civic_acceptance',
          { kind:'county', id:'ravenna' }, actor('federates_476'),
          { kind:'county', id:'ravenna' });
        sc.civicRecognitionId = civic && civic.id;
        if (church && civic && cityRights(s, sc, 'italy')) {
          sc.aiResolution = 'negotiated'; sc.result = 'ai_negotiated';
          news(s, 'news.476.ai_accord',
            '📜 The western and federate courts agree on paid service while Ravenna keeps its civic Peace.', {});
          return;
        }
      }
      if (contract) FB.authorityContractTransition(
        s, contract.id, 'breach', 'italy');
    }
    if (FB.isRealmAtWar(s, 'italy') ||
        FB.isRealmAtWar(s, 'federates_476')) return;
    var war = FB.registerOrdinaryWar(s, 'federates_476', {
      enemy:'italy', target:'ravenna', legacy:false,
      casus:{ type:'border', target:'ravenna' },
      objectives:[{ target:'ravenna', type:'border' }]
    });
    if (war) {
      sc.aiResolution = 'war'; sc.aiWarId = war.id;
      news(s, 'news.476.ai_contest',
        '⚔ With no service agreement, Odoacer’s host contests Ravenna through an ordinary campaign.', {});
    }
  }
  function campaign476(s, sc, key, firstYear, lastYear, attacker, target,
      eligible, messageKey, fallback) {
    var h = sc.historical || (sc.historical = {});
    var status = h[key] || 'pending';
    if (status === 'won' || status === 'failed' || status === 'diverged') return;
    if (s.owner[target] === attacker) { h[key] = 'won'; return; }
    if (status === 'started') {
      if (!FB.ordinaryWarById(s, h[key + 'WarId'])) h[key] = 'failed';
      return;
    }
    if (s.date.year < firstYear) return;
    if (s.date.year > lastYear) { h[key] = 'diverged'; return; }
    if (!eligible() || !s.realms[attacker] ||
        !s.realms[attacker].alive ||
        !s.realms[s.owner[target]] ||
        !s.realms[s.owner[target]].alive ||
        FB.isRealmAtWar(s, attacker) ||
        FB.isRealmAtWar(s, s.owner[target])) return;
    var war = FB.registerOrdinaryWar(s, attacker, {
      enemy:s.owner[target], target:target, legacy:false,
      casus:{ type:'border', target:target },
      objectives:[{ target:target, type:'border' }]
    });
    if (!war) return;
    h[key] = 'started'; h[key + 'WarId'] = war.id;
    news(s, messageKey, fallback, {});
  }
  function historical476(s, sc) {
    var h = sc.historical || (sc.historical = {});
    if (s.date.year < 481) return;
    campaign476(s, sc, 'clovis', 486, 500, 'franks_476', 'paris',
      function () {
        var frank = ruler(s, 'franks_476');
        return frank && frank.id === sc.clovisId &&
          alive(s, sc.clovisId) && alive(s, sc.syagriusId) &&
          s.owner.paris === 'west_francia';
      }, 'news.476.clovis_campaign',
      '⚔ Clovis contests the Roman domain around Paris. Its actual war will decide the county.');
    campaign476(s, sc, 'theoderic', 489, 493, 'pannonia', 'ravenna',
      function () {
        var gothic = ruler(s, 'pannonia');
        var eastern = ruler(s, 'byzantium');
        return gothic && gothic.id === sc.theodericId &&
          alive(s, sc.theodericId) && eastern &&
          eastern.id === sc.zenoId &&
          s.owner.constantinople === 'byzantium' &&
          (s.owner.ravenna === 'italy' ||
            s.owner.ravenna === 'federates_476');
      }, 'news.476.theoderic_campaign',
      '⚔ With a living eastern patron, Theoderic marches toward Ravenna. The war can fail or change course.');
    if (h.theoderic === 'started' && !h.theodericCommissionId) {
      var commission = recognize(s, 'imperial_commission',
        actor('byzantium'), actor('pannonia'), actor('pannonia'));
      h.theodericCommissionId = commission && commission.id;
    }
    if (h.theoderic === 'won' && !h.theodericSettlement &&
        s.owner.ravenna === 'pannonia') {
      s.realms.pannonia.capital = 'ravenna';
      FB.invalidateRealmCache();
      if (alive(s, sc.bishopId) && alive(s, sc.civicDelegateId) &&
          FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5) {
        var support = recognize(s, 'church_support',
          { kind:'religious-office', id:'rome_bishop' },
          actor('pannonia'), { kind:'county', id:'ravenna' });
        if (support && cityRights(s, sc, 'pannonia'))
          FB.authoritySetGovernment(s, 'pannonia', 'roman_civic');
      }
      h.theodericSettlement = true;
      news(s, 'news.476.theoderic_outcome',
        '🏛 The Gothic court now holds Ravenna; local church and civic rights depend on the surviving delegates.', {});
    }
    campaign476(s, sc, 'africa', 533, 550, 'byzantium', 'tunis',
      function () { return s.owner.tunis === 'aghlabids' &&
        s.owner.constantinople === 'byzantium'; },
      'news.476.africa_campaign',
      '⚔ The eastern court opens an African reconquest campaign against the Vandal ruler of Carthage.');
    campaign476(s, sc, 'italy', 535, 560, 'byzantium', 'ravenna',
      function () { return s.owner.ravenna !== 'byzantium' &&
        s.owner.constantinople === 'byzantium'; },
      'news.476.italy_campaign',
      '⚔ The eastern court opens an Italian reconquest campaign against the current ruler of Ravenna.');
  }
  function reconcile476(s, sc) {
    if (sc.civicProofId && alive(s, sc.civicDelegateId) &&
        s.owner.ravenna === 'italy')
      FB.authorityRecognitionTransition(s, sc.civicProofId, 'reaffirm');
    if (sc.senateProofId && alive(s, sc.senatorId) &&
        s.owner.roma === 'italy')
      FB.authorityRecognitionTransition(s, sc.senateProofId, 'reaffirm');
    if (sc.phase === 'complete' || sc.phase === 'battle' ||
        sc.phase === 'aftermath') return;
    if (['civic','recognition','court','resolution'].indexOf(sc.phase) < 0)
      return;
    var contract = currentContract(s, sc);
    if (contract && (!contract.effective || contract.status !== 'active')) {
      sc.phase = 'contract'; sc.civicRecognitionId = null;
      sc.awardRequested = false;
      news(s, 'news.476.terms_lapsed',
        '📜 A change of court or service command ends the old terms. The parties must review a new contract.', {});
    } else if (sc.phase === 'resolution' &&
        (sc.courtAt !== 'pavia' || s.owner.pavia !== 'italy' ||
          !hasCivicConsent(s, sc))) {
      sc.phase = sc.courtAt !== 'pavia' ? 'court' : 'civic';
      news(s, 'news.476.review_bargain',
        '🏛 The court route or city consent has changed. The settlement returns for review.', {});
    }
  }
  function displacedCourts476(s, sc) {
    sc.displacedCourts = sc.displacedCourts || {};
    if (sc.courtAt === 'ravenna' && s.owner.ravenna !== 'italy' ||
        sc.courtAt === 'pavia' && s.owner.pavia !== 'italy') {
      sc.courtAt = 'displaced'; sc.courtMove = null;
    }
    for (var rid of ['italy','croatia','byzantium','west_francia',
        'aghlabids','pannonia']) {
      var realm = s.realms[rid];
      var anchor = sc.courtAnchors && sc.courtAnchors[rid];
      if (anchor && s.owner[anchor] !== rid)
        sc.displacedCourts[rid] = realm && realm.alive &&
          s.owner[realm.capital] === rid ? realm.capital : 'exiled';
      if (rid === 'italy' && realm && !realm.alive) {
        sc.displacedCourts.italy = 'exiled';
        sc.courtAt = 'displaced'; sc.courtMove = null;
      }
      if (!realm || !realm.alive || !realm.capital ||
          s.owner[realm.capital] === rid) continue;
      var lands = FB.realmTerritory(s, rid).filter(function (pid) {
        return s.owner[pid] === rid;
      }).sort();
      if (!lands.length) {
        sc.displacedCourts[rid] = 'exiled';
        if (rid === 'italy') { sc.courtAt = 'displaced'; sc.courtMove = null; }
        continue;
      }
      realm.capital = lands[0];
      sc.displacedCourts[rid] = lands[0];
      if (rid === 'italy') { sc.courtAt = 'displaced'; sc.courtMove = null; }
      FB.invalidateRealmCache();
    }
  }
  FB.situation476Day = function (s) {
    var sc = scene(s);
    if (!sc) return;
    displacedCourts476(s, sc);
    reconcile476(s, sc);
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
    /* The escort's own flag keeps its route only while the court travels;
       arrival, interruption and displacement all release it to the AI. */
    var released = sc.courtMove !== 'travelling' && host(s, 'host_476_italy');
    if (released && released.scenarioCourtEscort) released.scenarioCourtEscort = false;
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
    aiSettlement476(s, sc);
    historical476(s, sc);
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
  function choices(s, sc) {
    if (sc.phase === 'delegate') return [
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
    if (sc.phase === 'civic_service') return [
      { id:'petition_city_office', label:FB.T('Petition for Ravenna’s local court'),
        detail:FB.T('Requires a living civic delegate, a Nicene majority and a western court holding Ravenna. A judicial appointment grants local Peace only; succession can require reaffirmation.') },
      { id:'leave_city_service', label:FB.T('Continue as a clerk'),
        detail:FB.T('Keep the civic career without acquiring a court office or county.') }
    ];
    if (sc.phase === 'church_service') return [
      { id:'seek_homoian_commission', label:FB.T('Seek the Homoian bishop’s commission'),
        detail:FB.T('A living local bishop recognizes your service in Ravenna. This does not grant a county, office, or change anyone’s faith.') },
      { id:'mediate_communities', label:FB.T('Mediate with the Nicene bishop'),
        detail:FB.T('Requires both living bishops and a Homoian commission. The Nicene bishop recognizes your mediation; you may then petition the civic court.') },
      { id:'leave_church_service', label:FB.T('Continue in the congregation'),
        detail:FB.T('Keep the clerical career and its ordinary faith progression without a civic office.') }
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
    if (sc.phase === 'complete' && sc.result === 'contested_victory' &&
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
    if (sc.phase === 'complete' && sc.romulusDeposed &&
        s.owner.ravenna === 'italy') return [
      { id:'restore_western_office', label:FB.T('Restore Romulus’s western office'),
        detail:FB.T('Requires Romulus alive and Ravenna back under the western court. Restore the office without granting new counties.') }
    ];
    return [];
  }
  function statusText(s, sc) {
    var row = currentContract(s, sc), lines = [];
    lines.push(FB.T('Western court: {location}.', {
      location:sc.courtAt === 'pavia' ? FB.T('Ticinum') :
        sc.courtAt === 'displaced' ? FB.T('displaced') : FB.T('Ravenna') }));
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
    if (sc.cityOfficeId) lines.push(FB.political.permission(s,
      person(s.player.charId), 'judge', { provinceId:'ravenna' }).allowed
      ? FB.T('Ravenna’s local Peace: your court appointment is effective.')
      : FB.T('Ravenna’s local Peace: your former appointment needs a live mandate.'));
    if (sc.cityRightIds && sc.cityRightIds.length) lines.push(FB.T('Ravenna civic rights: recorded separately from county ownership.'));
    if (sc.governanceResolved === 'civic') lines.push(FB.T('Federate government: Roman civic form with local courts.'));
    if (sc.governanceResolved === 'federate') lines.push(FB.T('Federate government: host form; city claims unresolved.'));
    if (sc.westernOfficeResolved === 'nepos') lines.push(FB.T('Western office: claimed by Nepos from Dalmatia.'));
    if (sc.westernOfficeResolved === 'retired') lines.push(FB.T('Western office: vacant under an eastern commission.'));
    if (sc.westernOfficeResolved === 'restored') lines.push(FB.T('Western office: restored to Romulus.'));
    if (sc.aiResolution === 'negotiated') lines.push(FB.T('The courts agreed on service after you declined involvement.'));
    if (sc.aiResolution === 'war') lines.push(FB.T('The courts are fighting for Ravenna through an ordinary war.'));
    if (sc.historical && sc.historical.theoderic === 'started') lines.push(FB.T('Theoderic’s campaign for Ravenna is underway.'));
    if (sc.historical && sc.historical.africa === 'started') lines.push(FB.T('The eastern African reconquest campaign is underway.'));
    if (sc.historical && sc.historical.italy === 'started') lines.push(FB.T('The eastern Italian reconquest campaign is underway.'));
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
      if (sc.phase !== 'delegate' && sc.phase !== 'complete' &&
          sc.phase !== 'battle' && sc.phase !== 'aftermath') {
        list.push({ id:'leave_dispute', label:FB.T('Leave the court dispute'),
          detail:FB.T('End this political sequence. Your household and its current career survive; live contracts and existing offices retain their own terms.') });
      }
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
          var available = choices(FB.state, scene(FB.state));
          if (id === 'leave_dispute') available.push({
            id:'leave_dispute', label:FB.T('Leave the court dispute'),
            detail:FB.T('End the political sequence while the household remains playable.')
          });
          var selected = available.filter(function (item) {
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
