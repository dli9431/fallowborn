/* Independent political world stories and the 476 campaign data instances.
   Office claims remain authority records, separate from territorial owners. */
(function () {
  'use strict';
  var X = FB.story476, ZENO = 'zeno_return_476', WEST = 'western_office_476';
  var WEST_REALM = 'italy';
  var CAMPAIGNS = { clovis:'clovis_syagrius_476', theoderic:'theoderic_italy_476',
    africa:'eastern_africa_476', italy:'eastern_italy_476' };
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
  function zenoInit(s) {
    var rec = politicalRecord();
    /* Names are attested, while age, skills and station are gameplay values.
       Old saves do not manufacture missing commanders during restore. */
    function made(def) { return X.made(s, def.name, def.culture, def.religion,
      def.age, def.station, def.role, def.home).id; }
    rec.illusId = made(FBDATA.storyActors476.illus);
    rec.trocundesId = made(FBDATA.storyActors476.trocundes);
    rec.legacy = false;
    return rec;
  }
  function zenoDay(s, rec) {
    if (rec.phase === 'resolved') return;
    var w = X.world(s), track = FB.stories.record(s, 'federate_track_476');
    var sitting = ruler(s, 'byzantium');
    var cause = !X.alive(s, w.zenoId) ? 'claimant_dead' :
      !s.realms.byzantium.alive ? 'court_extinct' :
      !sitting ? 'office_vacant' :
      sitting.id !== w.eastRulerId && sitting.id !== w.zenoId ? 'court_succeeded' :
      !X.alive(s, w.eastRulerId) && (!sitting || sitting.id !== w.zenoId) ? 'issuer_dead' :
      !rec.legacy && (!X.alive(s, rec.illusId) || !X.alive(s, rec.trocundesId)) ? 'commanders_lost' : null;
    if (cause) {
      end(s, rec, 'interrupted', cause); w.zenoCourt.status = 'interrupted';
      FB.news(s, FB.msg('news.476.zeno_interrupted',
        '📜 Zeno’s return is interrupted by the loss of a claimant, commander or sitting court.', {}));
      return;
    }
    if (s.owner.constantinople !== 'byzantium') {
      end(s, rec, 'diverted', 'capital_lost'); w.zenoCourt.status = 'diverted';
      FB.news(s, FB.msg('news.476.zeno_diverted',
        '📜 The eastern court loses Constantinople. Zeno’s original return opportunity closes.', {}));
      return;
    }
    if (sitting.id === w.zenoId) {
      end(s, rec, 'restored', 'already_returned'); w.zenoCourt.status = 'returned'; return;
    }
    var backed = track && track.backedClaimant === 'zeno';
    if (s.turn < (backed ? 150 : 180)) return;
    if (s.turn >= 360) {
      end(s, rec, 'diverted', 'return_window_closed');
      w.zenoCourt.status = 'diverted';
      FB.news(s, FB.msg('news.476.zeno_delayed_outcome',
        '📜 The eastern court’s continuing wars prevent Zeno’s expected return.', {}));
      return;
    }
    if (FB.isRealmAtWar(s, 'byzantium')) return;
    if (!FB.assignRealmRulerCharacter(s, 'byzantium', w.zenoId, { replaceAuthored:true })) return;
    var commissionSource = 'imperial_commission';
    /* Keep Basiliscus's descriptors as historical evidence, but retire the
       stale mandate before the returned issuer grants a fresh commission. */
    for (var old of s.authority.recognitions)
      if (old.source === commissionSource && old.status === 'active' &&
          old.issuer.kind === 'realm' && old.issuer.id === 'byzantium' &&
          old.issuerGeneration !== FB.realmRulerGeneration(s, 'byzantium'))
        FB.authorityRecognitionTransition(s, old.id, 'revoke');
    FB.authorityAppointmentTransition(s, w.eastOfficeId, 'remove');
    var claim = X.recognize(s, 'dynastic_succession', X.actor('byzantium'), X.person(w.zenoId));
    var office = claim && X.appointment(s, 'imperial_office', 'byzantium',
      X.person(w.zenoId), X.actor('byzantium'), claim.id);
    w.eastOfficeId = office && office.id;
    if (backed) {
      var commission = X.recognize(s, commissionSource, X.actor('byzantium'),
        X.actor('federates_476'), X.actor('federates_476'));
      track.imperialRecognitionId = commission && commission.id;
    }
    end(s, rec, 'restored', 'commanders_defected');
    w.zenoCourt.status = 'returned'; s.chars[w.zenoId].homeProvinceId = 'constantinople';
    for (var id of [rec.illusId, rec.trocundesId])
      if (X.alive(s, id)) s.chars[id].homeProvinceId = s.chars[w.zenoId].homeProvinceId;
    FB.news(s, FB.msg('news.476.zeno_returns',
      '🏛 Zeno returns to Constantinople. Basiliscus can no longer issue a fresh imperial commission.', {}));
  }
  FB.stories.register({ id:ZENO, kind:'world', requires:['western_court_476'],
    init:zenoInit, day:zenoDay,
    title:function () { return FB.T('Zeno’s Eastern Return'); },
    intro:function () { return FB.T('Zeno’s court is displaced in Isauria. The living commanders Illus and Trocundes can abandon Basiliscus while Constantinople remains eastern and the court is at peace.'); },
    status:function (s, rec) {
      var names = { restored:FB.T('Zeno returned'), interrupted:FB.T('Return interrupted'),
        diverted:FB.T('The eastern court took another course') };
      return { phase:rec.phase, name:names[rec.result] || FB.T('A displaced claimant'), lines:[] };
    },
    validate:function (rec) {
      validatePolitical(rec, ZENO, ['restored','interrupted','diverted']);
      if (typeof rec.legacy !== 'boolean') bad(ZENO, 'legacy');
      for (var key of ['illusId','trocundesId'])
        if (rec[key] !== null && (typeof rec[key] !== 'string' || !rec[key])) bad(ZENO, key);
      if (!rec.legacy && (!rec.illusId || !rec.trocundesId)) bad(ZENO, 'illusId');
    } });
  var pending = Object.keys(FBDATA.storyCampaigns);
  while (pending.length) {
    var ready = [];
    pending.forEach(function (id) {
      if ((FBDATA.storyCampaigns[id].requires || []).every(function (required) { return !!FB.stories.get(required); })) {
        FB.stories.registerData(FBDATA.storyCampaigns[id]); ready.push(id);
      }
    });
    if (!ready.length) throw new Error('World story declarations have unresolved dependencies.');
    pending = pending.filter(function (id) { return ready.indexOf(id) < 0; });
  }

  function restoreOffice(s, w) {
    if (w.westOfficeId) FB.authorityAppointmentTransition(s, w.westOfficeId, 'remove');
    var claim = X.recognizeOrExisting(s, 'dynastic_succession', X.actor(FB.startRealmId(s, WEST_REALM)), X.person(w.westRulerId));
    var office = claim && X.appointment(s, 'imperial_office', FB.startRealmId(s, WEST_REALM),
      X.person(w.westRulerId), X.actor(FB.startRealmId(s, WEST_REALM)), claim.id);
    if (!office) return false;
    delete w.restoredClaimantId; delete w.restoredCourtId; delete w.restoredOfficeId;
    w.westOfficeId = office.id; w.westernOfficeResolved = 'restored';
    FB.news(s, FB.msg('news.476.office_restored',
      '🏛 Romulus returns to the western office after Ravenna returns to his court.', {}));
    return true;
  }
  X.restoreWestOffice = restoreOffice;
  function westDay(s, rec) {
    var w = X.world(s), t = FB.stories.record(s, 'federate_track_476');
    var result = w.westernOfficeResolved || null, reason = 'reviewed_office';
    /* Loss of the capital removes only the original western appointment.
       A separately recognized Nepos claim does not pretend to own Ravenna. */
    if (s.owner.ravenna !== FB.startRealmId(s, WEST_REALM) && (!w.romulusDeposed || w.westernOfficeResolved === 'restored' && !w.restoredClaimantId)) {
      if (w.westOfficeId) FB.authorityAppointmentTransition(s, w.westOfficeId, 'remove');
      w.romulusDeposed = true;
      if (w.westernOfficeResolved === 'restored' && !w.restoredClaimantId) { w.westernOfficeResolved = false; result = null; }
    }
    if (w.restoredClaimantId && w.restoredOfficeId && w.westernOfficeResolved === 'restored') {
      var liveClaim = X.alive(s, w.restoredClaimantId) &&
        FB.political.offices(s, X.person(w.restoredClaimantId)).some(function (row) {
          return row.ref.appointmentId === w.restoredOfficeId && row.status === 'active';
        });
      if (s.owner.ravenna !== w.restoredCourtId || !liveClaim) {
        if (s.owner.ravenna !== w.restoredCourtId)
          FB.authorityAppointmentTransition(s, w.restoredOfficeId, 'remove');
        result = s.owner.ravenna !== w.restoredCourtId ? 'deposed' : 'interrupted';
        w.westernOfficeResolved = result;
      }
    }
    if (!result && w.romulusDeposed) { result = 'deposed'; reason = 'capital_lost'; }
    // A restored claimant's loss remains its own outcome. The original court
    // must not overwrite that displacement with a separate restoration.
    var independent = (!t || t.role === 'outside') && !w.restoredClaimantId;
    if (independent && w.romulusDeposed && s.owner.ravenna === FB.startRealmId(s, WEST_REALM) &&
        X.alive(s, w.westRulerId) && s.realms[FB.startRealmId(s, WEST_REALM)].alive &&
        w.westernOfficeResolved !== 'restored' && ruler(s, FB.startRealmId(s, WEST_REALM)) &&
        ruler(s, FB.startRealmId(s, WEST_REALM)).id === w.westRulerId && restoreOffice(s, w)) result = 'restored';
    if (!result && rec.phase === 'pending') {
      if (!X.alive(s, w.westRulerId) || !s.realms[FB.startRealmId(s, WEST_REALM)].alive) {
        result = 'interrupted'; reason = 'holder_or_court_lost';
      } else if (ruler(s, FB.startRealmId(s, WEST_REALM)) && ruler(s, FB.startRealmId(s, WEST_REALM)).id !== w.westRulerId) {
        result = 'diverted'; reason = 'court_succeeded';
      } else if (s.turn >= 361) {
        var active = FB.political.offices(s, X.person(w.westRulerId)).some(function (row) {
          return row.ref.appointmentId === w.westOfficeId && row.status === 'active';
        });
        result = active ? 'survived' : 'interrupted'; reason = active ? 'office_retained' : 'mandate_lapsed';
      }
    }
    if (!result || rec.result === result) return;
    rec.history.push({ result:result, turn:s.turn,
      officeId:w.restoredOfficeId || w.westOfficeId || null });
    if (rec.history.length > 12) rec.history.shift();
    end(s, rec, result, reason);
    rec.officeId = w.restoredOfficeId || w.westOfficeId || null;
    if (result === 'deposed') FB.news(s, FB.msg('news.476.office_deposed',
      '📜 Loss of Ravenna displaces the western office. Territorial possession and rival office claims remain separate.', {}));
    if (result === 'survived') FB.news(s, FB.msg('news.476.office_survived',
      '🏛 The western office survives the opening dispute with its living court and mandate.', {}));
    if (result === 'interrupted' || result === 'diverted') FB.news(s, FB.msg('news.476.office_interrupted',
      '📜 The original western office opportunity ends as its holder or court changes.', {}));
  }
  X.syncWestOffice = function (s) {
    var rec = FB.stories.record(s, WEST);
    if (rec) westDay(s, rec);
  };
  /* Detached additive migration. It moves facts, not actors, appointments,
     payments, hosts or wars. Existing terminal outcomes never replay. */
  function migrate(s) {
    var w = s.stories && s.stories.western_court_476;
    if (!w || s.situation476 || w.railsSchema !== undefined) return;
    var h = w.historical || {};
    if (!plain(h)) bad('western_court_476', 'historical');
    if (!s.stories[ZENO]) {
      var z = politicalRecord(), old = w.easternReturn || 'pending';
      if (['pending','delayed','restored','interrupted'].indexOf(old) < 0) bad(ZENO, 'phase');
      z.illusId = null; z.trocundesId = null; z.legacy = true;
      if (old === 'restored' || old === 'interrupted') end(s, z, old, 'legacy_outcome');
      s.stories[ZENO] = z;
    }
    if (w.zenoCourt === undefined) w.zenoCourt = { region:'isauria', provinceId:'ikonion',
      site:'isauria_476', status:s.stories[ZENO].result === 'restored' ? 'returned' : 'displaced' };
    for (var key in CAMPAIGNS) {
      var id = CAMPAIGNS[key], def = FBDATA.storyCampaigns[id];
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
        rec.deadline = moving ? moving.endTurn : rec.startedTurn + def.durationDays;
        rec.actorId = def.actor.character ? w[def.actor.character.field] || null : ruler(s, def.actor.realmId) && ruler(s, def.actor.realmId).id;
        rec.actorGeneration = FB.realmRulerGeneration(s, def.actor.realmId);
        rec.targetOwnerId = war ? war.defender : s.owner[def.target.provinceId];
        if (def.commission) rec.patronGeneration = FB.realmRulerGeneration(s, def.commission.issuerRealmId);
      }
      s.stories[id] = rec;
    }
    if (!s.stories[WEST]) {
      var office = politicalRecord(); office.officeId = w.westOfficeId || null; office.history = [];
      if (w.westernOfficeResolved || w.romulusDeposed)
        end(s, office, w.westernOfficeResolved || 'deposed', 'legacy_outcome');
      s.stories[WEST] = office;
    }
    delete w.historical; delete w.easternReturn; w.railsSchema = 1;
  }
  FB.stories.register({ id:WEST, kind:'world', requires:['western_court_476'],
    init:function (s) { var rec = politicalRecord(); rec.officeId = X.world(s).westOfficeId || null; rec.history = []; return rec; },
    day:westDay, migrate:migrate,
    title:function () { return FB.T('The Western Imperial Office'); },
    intro:function () { return FB.T('Deposition, survival, rival recognition and restoration describe an office. Each mandate depends on living issuers and its authority scope; it grants no county.'); },
    status:function (s, rec) {
      var names = { deposed:FB.T('Western office displaced'), survived:FB.T('Western office survived'),
        restored:FB.T('Western office restored'), nepos:FB.T('Nepos’s western claim'), retired:FB.T('Western office vacant'),
        interrupted:FB.T('Original mandate interrupted'), diverted:FB.T('A different western court') };
      return { phase:rec.phase, name:names[rec.result] || FB.T('A contested western office'), lines:[] };
    },
    validate:function (rec, s) {
      validatePolitical(rec, WEST, ['deposed','survived','restored','nepos','retired','interrupted','diverted']);
      if (rec.officeId !== null && typeof rec.officeId !== 'string') bad(WEST, 'officeId');
      if (!Array.isArray(rec.history) || rec.history.length > 12) bad(WEST, 'history');
      rec.history.forEach(function (row) {
        if (!plain(row) || !Number.isInteger(row.turn) || row.turn < 0 ||
            ['deposed','survived','restored','nepos','retired','interrupted','diverted'].indexOf(row.result) < 0 ||
            row.officeId !== null && typeof row.officeId !== 'string') bad(WEST, 'history');
      });
      if (X.world(s).railsSchema !== 1) bad('western_court_476', 'railsSchema');
      var wanted = (FB.bookmark(s.start && s.start.id) || {}).stories || [];
      for (var id of [ZENO,WEST].concat(Object.keys(CAMPAIGNS).map(function (key) { return CAMPAIGNS[key]; })))
        if (wanted.indexOf(id) >= 0 && !s.stories[id]) bad('western_court_476', 'railsSchema');
    } });
})();
