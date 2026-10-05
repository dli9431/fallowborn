/* The western court in 476, a registered world story. It authors the court's
   actors and standing hosts, keeps displaced courts moving, and lets the
   courts settle the federate dispute without the player. Independent world
   stories own the eastern return, western office and historical campaigns. Its record lives at
   state.stories.western_court_476. The federate player track shares the
   helpers on FB.story476; its choices call the shared authority, treasury,
   army and lordship transactions directly. */
(function () {
  'use strict';
  var WORLD = 'western_court_476', TRACK = 'federate_track_476';
  function world(s) { return FB.stories.record(s, WORLD); }
  function track(s) {
    var federate = FB.stories.record(s, TRACK);
    if (federate) return federate;
    var civic = FB.stories.record(s, 'curialis_track_476');
    return civic && civic.phase === 'complete'
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
      railsSchema:1,
      zenoCourt:{ region:'isauria', provinceId:'ikonion', site:'isauria_476', status:'displaced' },
      pressureNoted:false,
      governanceResolved:false, westernOfficeResolved:false,
      courtAnchors:{ italy:'ravenna', croatia:'split',
        byzantium:'constantinople', west_francia:'laon',
        aghlabids:'tunis', pannonia:'thessaloniki' }
    };
    var orestes = made(s, 'Orestes', 'roman', 'nicene', 50, 4,
      'commander', 'ravenna');
    var zeno = made(s, 'Zeno', 'greek', 'chalcedonian', 51, 4,
      'claimant', 'ikonion');
    var delegate = made(s, FB.randomName('roman', 'm', null, s), 'roman',
      'nicene', 42, 2, 'notable', 'ravenna');
    var bishop = made(s, 'Simplicius', 'roman',
      'nicene', 54, 3, 'priest', 'roma');
    var veteran = made(s, FB.randomName('gothic', 'm', null, s), 'gothic',
      'homoian', 38, 2, 'soldier', 'pavia');
    var senator = made(s, FB.randomName('roman', 'm', null, s), 'roman',
      'nicene', 58, 3, 'notable', 'roma');
    var homoianBishop = made(s, FB.randomName('gothic', 'm', null, s), 'gothic',
      'homoian', 46, 3, 'priest', 'ravenna');
    var clovis = made(s, 'Clovis', 'frankish', 'germanic_pagan',
      10, 2, 'heir', 'ghent');
    var gundobad = made(s, 'Gundobad', 'gothic', 'homoian', 31, 4,
      'co_ruler', 'vienne');
    var godegisel = made(s, 'Godegisel', 'gothic', 'homoian', 26, 3,
      'co_ruler', 'geneva');
    var burgundianSuccession = FB.ensureRealmSuccession(s, 'burgundy');
    if (burgundianSuccession) {
      var gundobadMemberId = 'royal_burgundy_' + gundobad.id;
      burgundianSuccession.members[gundobadMemberId] = {
        id:gundobadMemberId, name:gundobad.name, sex:'m', born:gundobad.born,
        alive:true, parentId:null, childIds:[], charId:gundobad.id, role:'co_ruler'
      };
      burgundianSuccession.order.unshift(gundobadMemberId);
      burgundianSuccession.heirId = gundobadMemberId;
      gundobad.royalLine = { realmId:'burgundy', memberId:gundobadMemberId };
      FB.refreshRealmSuccession(s, 'burgundy');
    }
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
    w.gundobadId = gundobad.id;
    w.godegiselId = godegisel.id;
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
    var amalHost = { id:'host_476_amal', realm:'pannonia',
      at:'thessaloniki', from:'thessaloniki', men:160, size:160,
      units:{ levy:100, ret:60 }, supply:100, warId:null,
      path:[], goal:null, moveLeft:0,
      scenarioStanding:true, scenarioEndTurn:18 * 360 };
    var thracianHost = { id:'host_476_thracian', realm:'thracian_goths_476',
      at:'adrianople', from:'adrianople', men:140, size:140,
      units:{ levy:90, ret:50 }, supply:100, warId:null,
      path:[], goal:null, moveLeft:0,
      scenarioStanding:true, scenarioEndTurn:6 * 360 };
    s.armies.push(italianHost, federateHost, amalHost, thracianHost);
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
    restoreInstitutions(s, w);
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
    var institution = s.localInstitutions && s.localInstitutions.ravenna_council;
    if (institution && institution.petitions['realm:federates_476'])
      return FB.localInstitutionConsent(s, 'ravenna_council', actor('federates_476'));
    return !!(deal && deal.civicRecognitionId &&
      FB.political.legitimacy(s, actor('federates_476'),
        { kind:'county', id:'ravenna' }, 'civic_acceptance').some(function (row) {
          return row.id === deal.civicRecognitionId;
        }));
  }
  function cityRights(s, w, issuerId) {
    if (!alive(s, w.civicDelegateId) || s.owner.ravenna !== issuerId ||
        FB.countyReligionShare(s, 'ravenna', 'nicene') < 0.5) return false;
    var rights = FB.localInstitutionRights(s, 'ravenna_council', issuerId);
    if (!rights) return false;
    w.cityRightIds = rights;
    return true;
  }
  function restoreInstitutions(s, w) {
    FB.ensureLocalInstitutions(s, { ravenna_council:w.civicDelegateId,
      rome_senate:w.senatorId, rome_see:w.bishopId,
      ravenna_homoian_see:w.homoianBishopId });
  }
  function civicSettlement(s, deal) {
    return FB.localInstitutionSettle(s, 'ravenna_council', actor('federates_476'),
      { courts:true, protection:true, tolerance:true, contractId:deal.contractId });
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
    if (!t && FB.stories.record(s, 'curialis_track_476')) return;
    if (t && t.result !== 'declined' || s.turn < 90 ||
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
        var church = FB.localInstitutionMediate(s, 'rome_see', actor('federates_476'), 'ravenna');
        w.churchRecognitionId = church && church.id;
        var civic = civicSettlement(s, w);
        w.civicRecognitionId = civic && civic.recognitionId;
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
      if (realm && realm.nonTerritorial) continue;
      if (anchor && s.owner[anchor] !== rid)
        w.displacedCourts[rid] = realm && realm.alive &&
          s.owner[realm.capital] === rid ? realm.capital : 'exiled';
      if (rid === 'italy' && realm && !realm.alive) {
        w.displacedCourts.italy = 'exiled';
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
    if (!w.pressureNoted && s.turn >= 120 && (!t || t.phase !== 'complete')) {
      w.pressureNoted = true;
      news(s, 'news.476.pressure',
        '⚠ Arrears and rival claims sharpen the dispute around Ravenna.', {});
    }
    aiSettlement476(s, w, t);
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
  function validate(record, s) {
    function bad(field) {
      throw new Error(FB.T('Invalid v4 save field at {path}.',
        { path:'state.stories.' + WORLD + '.' + field }));
    }
    if (typeof record.courtAt !== 'string') bad('courtAt');
    if (typeof record.odoacerId !== 'string') bad('odoacerId');
    if (!plain(record.zenoCourt) || typeof record.zenoCourt.provinceId !== 'string' ||
        ['displaced','returned','interrupted','diverted'].indexOf(record.zenoCourt.status) < 0) bad('zenoCourt');
    if (record.railsSchema !== 1 || record.historical !== undefined || record.easternReturn !== undefined) bad('railsSchema');
    var wanted = (FB.bookmark(s.start && s.start.id) || {}).stories || [];
    for (var id of ['zeno_return_476','western_office_476','clovis_syagrius_476',
        'theoderic_italy_476','eastern_africa_476','eastern_italy_476'])
      if (wanted.indexOf(id) >= 0 && !s.stories[id]) bad('railsSchema');
    if (record.displacedCourts !== undefined && !plain(record.displacedCourts))
      bad('displacedCourts');
  }
  FB.story476 = {
    world:world, track:track, actor:actor, person:person, host:host, made:made,
    alive:alive, recognize:recognize, recognizeOrExisting:recognizeOrExisting,
    appointment:appointment, serviceTerms:serviceTerms,
    currentContract:currentContract, hasChurchSupport:hasChurchSupport,
    hasCivicConsent:hasCivicConsent, cityRights:cityRights,
    civicPermission:civicPermission, civicSettlement:civicSettlement, news:news
  };
  FB.stories.register({ id:WORLD, kind:'world', init:init, day:day,
    validate:validate, migrate:migrate, restore:restoreInstitutions });
})();
