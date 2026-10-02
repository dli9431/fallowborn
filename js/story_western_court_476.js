/* The western court in 476, a registered world story. It authors the court's
   actors and standing hosts, keeps the displaced courts and the eastern
   claimant moving, lets the courts settle the federate dispute without the
   player, and runs the conditional historical campaigns. Its record lives at
   state.stories.western_court_476. The federate player track shares the
   helpers on FB.story476; its choices call the shared authority, treasury,
   army and lordship transactions directly. */
(function () {
  'use strict';
  var WORLD = 'western_court_476', TRACK = 'federate_track_476';
  function world(s) { return FB.stories.record(s, WORLD); }
  function track(s) { return FB.stories.record(s, TRACK); }
  function own(o, key) {
    return !!o && Object.prototype.hasOwnProperty.call(o, key);
  }
  function plain(o) {
    return !!o && typeof o === 'object' && !Array.isArray(o);
  }
  /* Display-only vocabulary: internal ids, mechanics and saved records stay stable. */
  function periodText(s, kind, id, field) {
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
  }
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
  function init(s) {
    var west = ruler(s, 'italy'), east = ruler(s, 'byzantium');
    var nepos = ruler(s, 'croatia'), odoacer = ruler(s, 'federates_476');
    if (!west || !east || !nepos || !odoacer) return null;
    var w = {
      courtAt:'ravenna', courtMove:null,
      westRulerId:west.id, eastRulerId:east.id,
      neposId:nepos.id, odoacerId:odoacer.id,
      easternReturn:'pending',
      zenoCourt:{ region:'isauria', status:'displaced' },
      pressureNoted:false,
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
    w.orestesId = orestes.id;
    w.zenoId = zeno.id;
    w.civicDelegateId = delegate.id;
    w.bishopId = bishop.id;
    w.veteranId = veteran.id;
    w.senatorId = senator.id;
    w.homoianBishopId = homoianBishop.id;
    w.clovisId = clovis.id;
    w.syagriusId = ruler(s, 'west_francia').id;
    w.theodericId = ruler(s, 'pannonia').id;
    w.childericId = childeric && childeric.id;
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
    w.westOfficeId = westOffice && westOffice.id;
    w.eastOfficeId = eastOffice && eastOffice.id;
    w.orestesOfficeId = military && military.id;
    w.civicOfficeId = civicOffice && civicOffice.id;
    w.civicProofId = civicProof && civicProof.id;
    w.senateProofId = senateProof && senateProof.id;
    w.senateOfficeId = senateOffice && senateOffice.id;
    if (s.realms.italy.treasury) s.realms.italy.treasury.gold = 120;
    if (s.realms.federates_476.treasury) s.realms.federates_476.treasury.gold = 0;
    FB.news(s, FB.msg('news.476.opening',
      '🏛 The western court sits at Ravenna. Its federate soldiers seek a spokesman for their arrears.', {}));
    return w;
  }
  function serviceTerms(s, w) {
    return { patronRealmId:'italy', federateRealmId:'federates_476',
      hostId:'host_476_federates', payPerSeason:10, endTurn:s.turn + 361,
      settlementAwards:[{ provinceId:'ravenna', settlement:1,
        recipientId:w.veteranId }] };
  }
  /* A bargain's records belong to whoever made it: the player track, or
     this story when the courts settle without the player. */
  function currentContract(s, deal) {
    return deal && deal.contractId && FB.political.contract(s, deal.contractId);
  }
  function hasChurchSupport(s, deal) {
    return !!(deal && deal.churchRecognitionId &&
      FB.political.legitimacy(s, actor('federates_476'),
        { kind:'county', id:'ravenna' }, 'church_support').some(function (row) {
          return row.id === deal.churchRecognitionId;
        }));
  }
  function hasCivicConsent(s, deal) {
    return !!(deal && deal.civicRecognitionId &&
      FB.political.legitimacy(s, actor('federates_476'),
        { kind:'county', id:'ravenna' }, 'civic_acceptance').some(function (row) {
          return row.id === deal.civicRecognitionId;
        }));
  }
  function cityRights(s, w, issuerId) {
    if (!alive(s, w.civicDelegateId) || s.owner.ravenna !== issuerId ||
        FB.countyReligionShare(s, 'ravenna', 'nicene') < 0.5) return false;
    var proof = w.civicProofId && FB.political.legitimacy(s,
      person(w.civicDelegateId), { kind:'county', id:'ravenna' },
      'civic_acceptance').some(function (row) {
        return row.id === w.civicProofId;
      });
    if (!proof) {
      var recognized = recognizeOrExisting(s, 'civic_acceptance',
        { kind:'county', id:'ravenna' }, person(w.civicDelegateId),
        { kind:'county', id:'ravenna' });
      w.civicProofId = recognized && recognized.id;
      if (!recognized) return false;
    }
    var rights = [];
    for (var power of ['peace','consent']) {
      var right = FB.authorityEstablishRight(s, { issuer:actor(issuerId),
        beneficiary:person(w.civicDelegateId),
        scope:{ kind:'county', id:'ravenna' }, power:power,
        basis:'recognition', basisRef:w.civicProofId });
      if (right) rights.push(right.id);
    }
    w.cityRightIds = (w.cityRightIds || []).concat(rights);
    return !!w.cityRightIds.length;
  }
  function civicPermission(s, w) {
    return alive(s, w.civicDelegateId) &&
      FB.political.permission(s, person(w.civicDelegateId),
        'civic_agreement', { provinceId:'ravenna' }).allowed;
  }
  function news(s, key, fallback, params) {
    FB.news(s, FB.msg(key, fallback, params || {}));
  }
  function aiSettlement476(s, w, t) {
    if (!t || t.result !== 'declined' || s.turn < 90 ||
        w.aiResolution === 'negotiated' ||
        w.aiResolution === 'won' ||
        w.aiResolution === 'failed' ||
        w.aiResolution === 'diverged') return;
    if (w.aiResolution === 'war') {
      if (s.owner.ravenna === 'federates_476') {
        s.realms.federates_476.nonTerritorial = false;
        s.realms.federates_476.capital = 'ravenna';
        if (w.westOfficeId) FB.authorityAppointmentTransition(
          s, w.westOfficeId, 'remove');
        w.romulusDeposed = true;
        var acclaim = recognize(s, 'army_acclamation',
          { kind:'host', id:'host_476_federates' }, person(w.odoacerId));
        w.odoacerAcclamationId = acclaim && acclaim.id;
        if (alive(s, w.bishopId) && alive(s, w.civicDelegateId) &&
            FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5) {
          var support = recognize(s, 'church_support',
            { kind:'religious-office', id:'rome_bishop' },
            actor('federates_476'), { kind:'county', id:'ravenna' });
          if (support && cityRights(s, w, 'federates_476')) {
            FB.authoritySetGovernment(s, 'federates_476', 'roman_civic');
            w.governanceResolved = 'civic';
          }
        }
        w.aiResolution = 'won';
        news(s, 'news.476.ai_victory',
          '⚔ Without your service, Odoacer’s host wins Ravenna through an ordinary campaign. The city’s surviving delegates negotiate their rights.', {});
      } else if (!FB.ordinaryWarById(s, w.aiWarId)) {
        w.aiResolution = 'failed';
      }
      return;
    }
    if (s.owner.ravenna !== 'italy' || !alive(s, w.odoacerId) ||
        !s.realms.federates_476.alive) {
      w.aiResolution = 'diverged'; return;
    }
    var terms = serviceTerms(s, w);
    var canAgree = alive(s, w.orestesId) &&
      alive(s, w.civicDelegateId) && alive(s, w.bishopId) &&
      s.religiousHeads.rome_bishop === w.bishopId &&
      civicPermission(s, w) &&
      FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5 &&
      FB.treasuryAvailable(s, 'italy') >= 30 &&
      FB.political.contractQuote(s, terms).allowed;
    if (canAgree) {
      var contract = FB.authorityOfferContract(s, terms);
      if (contract && FB.authorityConsentContract(s, contract.id, 'italy') &&
          FB.authorityConsentContract(s, contract.id, 'federates_476') &&
          FB.treasuryTransfer(s, 'italy', 'federates_476', 30)) {
        w.contractId = contract.id;
        var church = recognizeOrExisting(s, 'church_support',
          { kind:'religious-office', id:'rome_bishop' },
          actor('federates_476'), { kind:'county', id:'ravenna' });
        w.churchRecognitionId = church && church.id;
        var civic = recognizeOrExisting(s, 'civic_acceptance',
          { kind:'county', id:'ravenna' }, actor('federates_476'),
          { kind:'county', id:'ravenna' });
        w.civicRecognitionId = civic && civic.id;
        if (church && civic && cityRights(s, w, 'italy')) {
          w.aiResolution = 'negotiated';
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
      w.aiResolution = 'war'; w.aiWarId = war.id;
      news(s, 'news.476.ai_contest',
        '⚔ With no service agreement, Odoacer’s host contests Ravenna through an ordinary campaign.', {});
    }
  }
  function campaign476(s, w, key, firstYear, lastYear, attacker, target,
      eligible, messageKey, fallback) {
    var h = w.historical || (w.historical = {});
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
  function historical476(s, w) {
    var h = w.historical || (w.historical = {});
    if (s.date.year < 481) return;
    campaign476(s, w, 'clovis', 486, 500, 'franks_476', 'paris',
      function () {
        var frank = ruler(s, 'franks_476');
        return frank && frank.id === w.clovisId &&
          alive(s, w.clovisId) && alive(s, w.syagriusId) &&
          s.owner.paris === 'west_francia';
      }, 'news.476.clovis_campaign',
      '⚔ Clovis contests the Roman domain around Paris. Its actual war will decide the county.');
    campaign476(s, w, 'theoderic', 489, 493, 'pannonia', 'ravenna',
      function () {
        var gothic = ruler(s, 'pannonia');
        var eastern = ruler(s, 'byzantium');
        return gothic && gothic.id === w.theodericId &&
          alive(s, w.theodericId) && eastern &&
          eastern.id === w.zenoId &&
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
      if (alive(s, w.bishopId) && alive(s, w.civicDelegateId) &&
          FB.countyReligionShare(s, 'ravenna', 'nicene') >= 0.5) {
        var support = recognize(s, 'church_support',
          { kind:'religious-office', id:'rome_bishop' },
          actor('pannonia'), { kind:'county', id:'ravenna' });
        if (support && cityRights(s, w, 'pannonia'))
          FB.authoritySetGovernment(s, 'pannonia', 'roman_civic');
      }
      h.theodericSettlement = true;
      news(s, 'news.476.theoderic_outcome',
        '🏛 The Gothic court now holds Ravenna; local church and civic rights depend on the surviving delegates.', {});
    }
    campaign476(s, w, 'africa', 533, 550, 'byzantium', 'tunis',
      function () { return s.owner.tunis === 'aghlabids' &&
        s.owner.constantinople === 'byzantium'; },
      'news.476.africa_campaign',
      '⚔ The eastern court opens an African reconquest campaign against the Vandal ruler of Carthage.');
    campaign476(s, w, 'italy', 535, 560, 'byzantium', 'ravenna',
      function () { return s.owner.ravenna !== 'byzantium' &&
        s.owner.constantinople === 'byzantium'; },
      'news.476.italy_campaign',
      '⚔ The eastern court opens an Italian reconquest campaign against the current ruler of Ravenna.');
  }
  function reaffirmDelegates(s, w) {
    if (w.civicProofId && alive(s, w.civicDelegateId) &&
        s.owner.ravenna === 'italy')
      FB.authorityRecognitionTransition(s, w.civicProofId, 'reaffirm');
    if (w.senateProofId && alive(s, w.senatorId) &&
        s.owner.roma === 'italy')
      FB.authorityRecognitionTransition(s, w.senateProofId, 'reaffirm');
  }
  function displacedCourts476(s, w) {
    w.displacedCourts = w.displacedCourts || {};
    if (w.courtAt === 'ravenna' && s.owner.ravenna !== 'italy' ||
        w.courtAt === 'pavia' && s.owner.pavia !== 'italy') {
      w.courtAt = 'displaced'; w.courtMove = null;
    }
    for (var rid of ['italy','croatia','byzantium','west_francia',
        'aghlabids','pannonia']) {
      var realm = s.realms[rid];
      var anchor = w.courtAnchors && w.courtAnchors[rid];
      if (anchor && s.owner[anchor] !== rid)
        w.displacedCourts[rid] = realm && realm.alive &&
          s.owner[realm.capital] === rid ? realm.capital : 'exiled';
      if (rid === 'italy' && realm && !realm.alive) {
        w.displacedCourts.italy = 'exiled';
        w.courtAt = 'displaced'; w.courtMove = null;
      }
      if (!realm || !realm.alive || !realm.capital ||
          s.owner[realm.capital] === rid) continue;
      var lands = FB.realmTerritory(s, rid).filter(function (pid) {
        return s.owner[pid] === rid;
      }).sort();
      if (!lands.length) {
        w.displacedCourts[rid] = 'exiled';
        if (rid === 'italy') { w.courtAt = 'displaced'; w.courtMove = null; }
        continue;
      }
      realm.capital = lands[0];
      w.displacedCourts[rid] = lands[0];
      if (rid === 'italy') { w.courtAt = 'displaced'; w.courtMove = null; }
      FB.invalidateRealmCache();
    }
  }
  function day(s, w) {
    var t = track(s);
    displacedCourts476(s, w);
    reaffirmDelegates(s, w);
    if (w.courtMove === 'travelling') {
      var escort = host(s, 'host_476_italy');
      if (escort && escort.at === 'pavia' && !escort.moveLeft) {
        w.courtAt = 'pavia'; w.courtMove = null;
        s.realms.italy.capital = 'pavia';
        FB.invalidateRealmCache();
        if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
        escort.scenarioCourtEscort = false;
        news(s, 'news.476.court_arrives',
          '🏛 The western court reaches Ticinum. Its escort asks for maintenance and a settlement.', {});
      } else if (!escort || s.owner.pavia !== 'italy') {
        w.courtMove = 'interrupted';
        news(s, 'news.476.court_interrupted',
          '🏛 The court’s route is broken; its requested settlement must be reviewed again.', {});
      }
    }
    /* The escort's own flag keeps its route only while the court travels;
       arrival, interruption and displacement all release it to the AI. */
    var released = w.courtMove !== 'travelling' && host(s, 'host_476_italy');
    if (released && released.scenarioCourtEscort) released.scenarioCourtEscort = false;
    var backedZeno = !!(t && t.backedClaimant === 'zeno');
    if ((w.easternReturn === 'pending' || w.easternReturn === 'delayed') &&
        s.turn >= (backedZeno ? 150 : 180)) {
      var sitting = ruler(s, 'byzantium');
      if (alive(s, w.zenoId) && alive(s, w.eastRulerId) &&
          sitting && sitting.id === w.eastRulerId &&
          s.owner.constantinople === 'byzantium' &&
          !s.realms.byzantium.war) {
        if (FB.assignRealmRulerCharacter(s, 'byzantium', w.zenoId,
            { replaceAuthored:true })) {
          FB.authorityAppointmentTransition(s, w.eastOfficeId, 'remove');
          var claim = recognize(s, 'dynastic_succession',
            actor('byzantium'), person(w.zenoId));
          var office = appointment(s, 'imperial_office', 'byzantium',
            person(w.zenoId), actor('byzantium'), claim && claim.id);
          w.eastOfficeId = office && office.id;
          if (backedZeno) {
            var commission = recognize(s, 'imperial_commission',
              actor('byzantium'), actor('federates_476'),
              actor('federates_476'));
            t.imperialRecognitionId = commission && commission.id;
          }
          w.easternReturn = 'restored';
          w.zenoCourt.status = 'returned';
          s.chars[w.zenoId].homeProvinceId = 'constantinople';
          news(s, 'news.476.zeno_returns',
            '🏛 Zeno returns to Constantinople. Basiliscus can no longer issue a fresh imperial commission.', {});
        }
      } else w.easternReturn = !alive(s, w.zenoId) || s.turn >= 360
        ? 'interrupted' : 'delayed';
    }
    if (!w.pressureNoted && s.turn >= 120 && (!t || t.phase !== 'complete')) {
      w.pressureNoted = true;
      news(s, 'news.476.pressure',
        '⚠ Arrears and rival claims sharpen the dispute around Ravenna.', {});
    }
    aiSettlement476(s, w, t);
    historical476(s, w);
  }
  /* Branch saves from before the registry kept one state.situation476
     record. It splits once, in the detached copy, into this story and the
     federate track, and only when neither story key exists. A household
     that declined involvement made no bargain of its own, so the contract
     and recognitions in its record belong to the courts' settlement. */
  var TRACK_FIELDS = ['phase', 'role', 'result', 'proposal', 'backedClaimant',
    'contractId', 'lastAllocatedPeriod', 'civicRecognitionId',
    'churchRecognitionId', 'imperialRecognitionId', 'commissionId',
    'awardRequested', 'awardGranted', 'maintenancePaid', 'outcomeTurn',
    'cityOfficeId', 'homoianRecognitionId', 'interfaithRecognitionId',
    'senateRecognitionId', 'veteranMigration'];
  var COURT_DEAL = { contractId:true, churchRecognitionId:true,
    civicRecognitionId:true };
  function migrate(state) {
    var legacy = state.situation476;
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
    delete state.situation476;
  }
  function validate(record) {
    function bad(field) {
      throw new Error(FB.T('Invalid v4 save field at {path}.',
        { path:'state.stories.' + WORLD + '.' + field }));
    }
    if (typeof record.courtAt !== 'string') bad('courtAt');
    if (typeof record.odoacerId !== 'string') bad('odoacerId');
    if (record.historical !== undefined && !plain(record.historical)) bad('historical');
    if (record.displacedCourts !== undefined && !plain(record.displacedCourts))
      bad('displacedCourts');
  }
  FB.story476 = {
    world:world, track:track, actor:actor, person:person, host:host,
    alive:alive, recognize:recognize, recognizeOrExisting:recognizeOrExisting,
    appointment:appointment, serviceTerms:serviceTerms,
    currentContract:currentContract, hasChurchSupport:hasChurchSupport,
    hasCivicConsent:hasCivicConsent, cityRights:cityRights,
    civicPermission:civicPermission, news:news
  };
  FB.stories.register({ id:WORLD, kind:'world', init:init, day:day,
    text:periodText, validate:validate, migrate:migrate });
})();
