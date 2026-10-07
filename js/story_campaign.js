/* Data-defined conditional campaigns. This story type observes authoritative
   war and migration outcomes; it never transfers a county or creates a host. */
(function () {
  'use strict';
  var V = FB.stories.tokens;
  var PHASES = ['pending','negotiating',V.started,'resolved'];
  var RESULTS = [V.won,V.failed,V.diverted,V.interrupted];
  function plain(row) { return !!row && typeof row === V.object && !Array.isArray(row); }
  function live(s, rid) { return rid === V.player ? alive(s, s.player && s.player.charId) : !!(s.realms[rid] && s.realms[rid].alive); }
  function characterId(s, ref) { return FB.stories.resolve(s, ref); }
  function alive(s, id) { return !!(id && s.chars[id] && !s.chars[id].dead); }
  function ruler(s, rid) {
    var actor = FB.political.actor(s, { kind:V.realm, id:rid });
    return actor && actor.characterId || null;
  }
  function host(s, id) { return (s.armies || []).filter(function (a) { return a.id === id; })[0] || null; }
  function fresh() {
    return { phase:'pending', result:null, reason:null, startedTurn:null,
      outcomeTurn:null, deadline:null, actorId:null, actorGeneration:null,
      targetOwnerId:null, patronGeneration:null, warId:null, migrationId:null,
      commissionId:null, contractId:null, settlementApplied:false,
      playerDecision:null, playerDecisionGeneration:null };
  }
  function closed(s, def) {
    return s.date.year > def.lastYear || s.date.year === def.lastYear &&
      s.date.season === 3 && s.date.day === 90;
  }
  function notice(s, def, event, reason) {
    var message = def.news && def.news[event];
    if (message) FB.news(s, FB.msg(message.key, message.text, {
      realm:FB.realmNameParam(s, def.actor.realmId),
      province:FB.world.byId[def.target.provinceId].name, reason:reason || '' }));
  }
  function finish(s, rec, def, result, reason) {
    if (rec.phase === 'resolved') return;
    if (rec.migrationId && result !== V.won)
      FB.federateInterruptMigration(s, rec.migrationId, reason);
    rec.phase = 'resolved'; rec.result = result; rec.reason = reason;
    rec.outcomeTurn = s.turn;
    // A landless court becomes territorial only after ordinary war has
    // secured the declared objective. This never transfers or teleports land.
    if (result === V.won && def.settlementForm && !rec.settlementApplied &&
        s.owner[def.target.provinceId] === def.actor.realmId) {
      var realm = s.realms[def.actor.realmId];
      realm.nonTerritorial = false; realm.capital = def.target.provinceId;
      FB.authoritySetGovernment(s, def.actor.realmId, def.settlementForm);
      if (!def.settlement) rec.settlementApplied = true;
    }
    if (result === V.won && def.settlement && !rec.settlementApplied) {
      var rule = def.settlement, county = def.target.provinceId;
      if (s.owner[county] === def.actor.realmId &&
          FB.countyReligionShare(s, county, rule.faithId) >= rule.minimumShare &&
          FB.localInstitutionMediate(s, rule.churchId,
            { kind:V.realm, id:def.actor.realmId }, county) &&
          FB.localInstitutionRights(s, rule.civicId, def.actor.realmId))
        FB.authoritySetGovernment(s, def.actor.realmId, rule.governmentForm);
      rec.settlementApplied = true;
    }
    notice(s, def, result, reason);
  }
  /* Conditions separate permanent divergence from a waitable fact (Clovis
     must inherit naturally, busy courts can finish their existing wars). */
  function conditions(s, def) {
    if (!live(s, def.actor.realmId)) return { result:V.interrupted, reason:'actor_extinct' };
    var expected = characterId(s, def.actor.character);
    if (def.actor.character && !alive(s, expected)) return { result:V.interrupted, reason:'actor_dead' };
    var waiting = !!(expected && ruler(s, def.actor.realmId) !== expected);
    var owner = s.owner[def.target.provinceId];
    if (!owner || !live(s, owner)) return { result:V.diverted, reason:'target_lost' };
    if (def.target.ownerIds && def.target.ownerIds.indexOf(owner) < 0)
      return { result:V.diverted, reason:'target_changed' };
    if (def.target.character) {
      var target = characterId(s, def.target.character);
      if (!alive(s, target)) return { result:V.interrupted, reason:'target_dead' };
      if (ruler(s, owner) !== target) return { result:V.diverted, reason:'target_succeeded' };
    }
    for (var row of def.conditions || []) {
      if (row.kind === V.owner && s.owner[row.provinceId] !== row.realmId)
        return { result:V.diverted, reason:'capital_lost' };
      if (row.kind === V.ruler) {
        var id = characterId(s, row.character);
        if (!live(s, row.realmId) || !alive(s, id))
          return { result:V.interrupted, reason:'patron_lost' };
        if (ruler(s, row.realmId) !== id) waiting = true;
      }
      if (row.kind === V.landless && FB.realmTerritory(s, row.realmId).length)
        return { result:V.diverted, reason:'already_settled' };
      if (row.kind === V.host) {
        var army = host(s, row.hostId);
        if (!army || army.realm !== row.realmId || army.men <= 0)
          return { result:V.interrupted, reason:'host_lost' };
      }
    }
    return waiting ? { wait:true } : { allowed:true };
  }
  function stamp(s, rec, def) {
    rec.startedTurn = s.turn; rec.deadline = s.turn + def.durationDays;
    rec.actorId = ruler(s, def.actor.realmId);
    rec.actorGeneration = FB.realmRulerGeneration(s, def.actor.realmId);
    rec.targetOwnerId = s.owner[def.target.provinceId];
    if (def.commission)
      rec.patronGeneration = FB.realmRulerGeneration(s, def.commission.issuerRealmId);
  }
  function commission(s, rec, def) {
    if (!def.commission) return true;
    var rule = def.commission, subject = { kind:V.realm, id:def.actor.realmId };
    if (rec.commissionId) return FB.political.legitimacy(s, subject, subject, rule.source)
      .some(function (row) { return row.id === rec.commissionId; });
    var created = FB.authorityRecognize(s, { source:rule.source,
      issuer:{ kind:V.realm, id:rule.issuerRealmId }, subject:subject, scope:subject });
    if (!created) created = FB.political.legitimacy(s, subject, subject, rule.source)
      .filter(function (row) { return row.issuer.kind === V.realm && row.issuer.id === rule.issuerRealmId; })[0];
    if (!created) return false;
    rec.commissionId = created.id;
    return true;
  }
  function migration(s, rec, def) {
    var spec = FBDATA.federateMigrations[def.migrationId];
    var moving = rec.migrationId && FB.political.movingPolity(s, rec.migrationId);
    if (!moving) {
      if (rec.migrationId) { finish(s, rec, def, V.interrupted, 'migration_lost'); return; }
      var created = FB.federateBeginMigration(s,
        Object.assign({}, spec, { endTurn:rec.deadline }));
      if (!created) return;
      rec.migrationId = created.id; rec.phase = 'negotiating';
      moving = created;
    }
    if (moving.status === V.settled) { finish(s, rec, def, V.won, V.settled); return; }
    if (moving.status === V.failed) { finish(s, rec, def, V.failed, moving.failureReason || 'migration_failed'); return; }
    if (!rec.contractId) {
      var offered = FB.federateOfferReplacement(s, spec.templateId, {
        patronRealmId:spec.patronRealmId, federateRealmId:spec.realmId,
        hostId:spec.hostId, recognitionId:rec.commissionId });
      if (!offered) return;
      rec.contractId = offered.id;
      s.authority.migrations.filter(function (row) { return row.id === moving.id; })[0].contractId = offered.id;
    }
    var deal = FB.political.contract(s, rec.contractId);
    if (!deal || [V.expired,'breached'].indexOf(deal.status) >= 0) {
      finish(s, rec, def, V.interrupted, 'terms_lapsed'); return;
    }
    if (!moving.choice && FB.federateNegotiateContract(s, rec.contractId) &&
        FB.federateRequest(s, moving.id, 'force')) {
      rec.phase = V.started;
      notice(s, def, V.started);
    }
    moving = FB.political.movingPolity(s, moving.id);
    rec.warId = moving.warId;
  }
  function day(s, rec, def) {
    if (rec.phase === 'resolved') return;
    var rid = def.actor.realmId, county = def.target.provinceId;
    if (rec.startedTurn !== null) {
      /* Settlement precedes succession checks: a completed award is durable. */
      var moving = rec.migrationId && FB.political.movingPolity(s, rec.migrationId);
      if (moving && moving.status === V.settled) { finish(s, rec, def, V.won, V.settled); return; }
      if (moving && moving.status === V.failed &&
          ['campaign_lost','term_ended'].indexOf(moving.failureReason) >= 0) {
        finish(s, rec, def, V.failed, moving.failureReason); return;
      }
      if (!rec.migrationId && rec.warId && s.owner[county] === rid) {
        finish(s, rec, def, V.won, 'objective_held'); return;
      }
      if (!live(s, rid) || rec.actorId && !alive(s, rec.actorId) ||
          rec.actorGeneration !== null && rec.actorGeneration !== FB.realmRulerGeneration(s, rid) ||
          def.commission && rec.patronGeneration !== null && (!live(s, def.commission.issuerRealmId) ||
            !alive(s, ruler(s, def.commission.issuerRealmId)) ||
            rec.patronGeneration !== FB.realmRulerGeneration(s, def.commission.issuerRealmId)) ||
          rec.commissionId && def.commission && !commission(s, rec, def)) {
        finish(s, rec, def, V.interrupted, 'authority_lost'); return;
      }
      if (def.target.character && !alive(s, characterId(s, def.target.character))) {
        finish(s, rec, def, V.interrupted, 'target_dead'); return;
      }
      if (def.target.character && ruler(s, rec.targetOwnerId) !== characterId(s, def.target.character)) {
        finish(s, rec, def, V.interrupted, 'target_succeeded'); return;
      }
      for (var condition of def.conditions || []) {
        if (condition.kind === V.owner && s.owner[condition.provinceId] !== condition.realmId) {
          finish(s, rec, def, V.diverted, 'capital_lost'); return;
        }
        if (condition.kind === V.host) {
          var army = host(s, condition.hostId);
          if (!army || army.realm !== condition.realmId || army.men <= 0) {
            finish(s, rec, def, V.interrupted, 'host_lost'); return;
          }
        }
      }
      if (s.turn >= rec.deadline) { finish(s, rec, def, V.failed, 'campaign_timeout'); return; }
      if (rec.migrationId) {
        if (s.owner[county] !== rid && s.owner[county] !== rec.targetOwnerId) {
          finish(s, rec, def, V.diverted, 'third_party_control'); return;
        }
        if (rec.warId && !FB.ordinaryWarById(s, rec.warId) && s.owner[county] !== rid) {
          finish(s, rec, def, V.failed, 'campaign_ended'); return;
        }
        migration(s, rec, def); return;
      }
      if (rec.warId) {
        if (s.owner[county] !== rec.targetOwnerId) {
          finish(s, rec, def, V.diverted, 'third_party_control'); return;
        }
        if (!FB.ordinaryWarById(s, rec.warId)) finish(s, rec, def, V.failed, 'campaign_ended');
        return;
      }
    }
    if (closed(s, def)) { finish(s, rec, def, V.diverted, 'window_closed'); return; }
    if (s.date.year < def.firstYear) return;
    if (s.owner[county] === rid) { finish(s, rec, def, V.diverted, 'already_held'); return; }
    var check = conditions(s, def);
    if (check.result) { finish(s, rec, def, check.result, check.reason); return; }
    if (!check.allowed || FB.isRealmAtWar(s, rid) || FB.isRealmAtWar(s, s.owner[county])) return;
    if (playerParty(s, def) && (rec.playerDecision !== V.campaign ||
        rec.playerDecisionGeneration !== FB.realmRulerGeneration(s, V.player))) return;
    if (!commission(s, rec, def)) return;
    if (rec.startedTurn === null) stamp(s, rec, def);
    if (def.migrationId) { migration(s, rec, def); return; }
    var war = FB.registerOrdinaryWar(s, rid, { enemy:s.owner[county],
      target:county, legacy:false, casus:{ type:'border', target:county },
      objectives:[{ target:county, type:'border' }] });
    if (!war) return;
    rec.warId = war.id; rec.phase = V.started; notice(s, def, V.started);
  }
  function playerParty(s, def) {
    return def.actor.realmId === V.player || s.owner[def.target.provinceId] === V.player ||
      def.commission && def.commission.issuerRealmId === V.player;
  }
  function playerQuote(s, rec, authored, id) {
    var def = FB.stories.definition(s, authored), check = conditions(s, def);
    var facts = { phase:rec.phase, decision:rec.playerDecision || null, turn:s.turn,
      year:s.date.year, generation:FB.realmRulerGeneration(s, V.player),
      actor:ruler(s, def.actor.realmId), target:s.owner[def.target.provinceId],
      actorGeneration:FB.realmRulerGeneration(s, def.actor.realmId),
      patronGeneration:def.commission && FB.realmRulerGeneration(s, def.commission.issuerRealmId),
      check:check, gold:s.player.gold, owner:s.owner[def.target.provinceId],
      wars:[FB.isRealmAtWar(s, def.actor.realmId), FB.isRealmAtWar(s, s.owner[def.target.provinceId])] };
    return { id:id, allowed:!!(playerParty(s, def) && rec.phase === 'pending' &&
      !rec.playerDecision && !s.player.dead && s.date.year >= def.firstYear && !closed(s, def) &&
      (id === 'leave_campaign' || id === 'face_campaign' && check.allowed && !facts.wars[0] && !facts.wars[1])),
      reason:'campaign_conditions', facts:facts, stamp:JSON.stringify(facts) };
  }
  function validate(rec, id) {
    function bad(field) { throw new Error(FB.T('Invalid v4 save field at {path}.',
      { path:'state.stories.' + id + '.' + field })); }
    if (!plain(rec) || PHASES.indexOf(rec.phase) < 0) bad(V.phase);
    if (rec.phase === 'resolved' ? RESULTS.indexOf(rec.result) < 0 : rec.result !== null) bad(V.result);
    for (var key of ['startedTurn','outcomeTurn','deadline','actorGeneration','patronGeneration'])
      if (rec[key] !== null && (!Number.isInteger(rec[key]) || rec[key] < 0)) bad(key);
    for (var field of [V.reason,'actorId','targetOwnerId','warId','migrationId','commissionId','contractId'])
      if (rec[field] !== null && (typeof rec[field] !== V.string || !rec[field])) bad(field);
    if (rec.playerDecision !== undefined && [null,V.campaign,V.declined].indexOf(rec.playerDecision) < 0) bad('playerDecision');
    if (rec.playerDecisionGeneration !== undefined && rec.playerDecisionGeneration !== null &&
        (!Number.isInteger(rec.playerDecisionGeneration) || rec.playerDecisionGeneration < 0)) bad('playerDecisionGeneration');
    if (typeof rec.settlementApplied !== 'boolean') bad('settlementApplied');
    if (rec.phase === 'resolved' && rec.outcomeTurn === null ||
        rec.phase !== 'resolved' && rec.outcomeTurn !== null) bad('outcomeTurn');
    if ((rec.phase === V.started || rec.phase === 'negotiating') &&
        (rec.startedTurn === null || rec.deadline === null)) bad('startedTurn');
    if (rec.phase === V.started && !rec.warId) bad('warId');
  }
  function validateDefinition(def) {
    function id(value) { return typeof value === V.string && !!value; }
    function cast(ref) { return FB.stories.referenceValid(ref, def); }
    if (!def || typeof def.name !== V.string || typeof def.desc !== V.string ||
        !plain(def.actor) || typeof def.actor.realmId !== V.string ||
        !plain(def.target) || typeof def.target.provinceId !== V.string ||
        !Number.isInteger(def.firstYear) || !Number.isInteger(def.lastYear) || def.lastYear < def.firstYear ||
        !Number.isInteger(def.durationDays) || def.durationDays <= 0 ||
        def.migrationId && !FBDATA.federateMigrations[def.migrationId] ||
        def.settlementForm !== undefined && (!id(def.settlementForm) || !FBDATA.governmentForms[def.settlementForm] || def.migrationId ||
          FBDATA.governmentForms[def.settlementForm].territory !== V.fixed ||
          !Array.isArray(def.conditions) || !def.conditions.some(function (row) { return plain(row) && row.kind === V.landless && row.realmId === def.actor.realmId; })) ||
        def.conditions !== undefined && !Array.isArray(def.conditions) ||
        def.target.ownerIds !== undefined && (!Array.isArray(def.target.ownerIds) ||
          !def.target.ownerIds.length || def.target.ownerIds.some(function (id) { return typeof id !== V.string; })) ||
        def.commission && (!plain(def.commission) || typeof def.commission.source !== V.string ||
          typeof def.commission.issuerRealmId !== V.string))
      throw new Error('Invalid campaign story definition.');
    for (var row of def.conditions || [])
      if (!plain(row) || [V.owner,V.ruler,V.landless,V.host].indexOf(row.kind) < 0 ||
          !id(row.realmId) || row.kind === V.owner && !id(row.provinceId) ||
          row.kind === V.ruler && !cast(row.character) || row.kind === V.host && !id(row.hostId))
        throw new Error('Invalid campaign story condition.');
    if (def.actor.character && !cast(def.actor.character) || def.target.character && !cast(def.target.character))
      throw new Error('A campaign cast reference must name a required story.');
    if (def.migrationId) {
      var moving = FBDATA.federateMigrations[def.migrationId];
      if (moving.realmId !== def.actor.realmId || moving.target !== def.target.provinceId ||
          !def.commission || moving.patronRealmId !== def.commission.issuerRealmId ||
          !(def.conditions || []).some(function (row) {
            return row.kind === V.host && row.hostId === moving.hostId && row.realmId === moving.realmId;
          })) throw new Error('Campaign and migration parties must match.');
    }
    if (def.settlement && (!plain(def.settlement) || !id(def.settlement.churchId) ||
        !id(def.settlement.civicId) || !id(def.settlement.faithId) ||
        !FBDATA.governmentForms[def.settlement.governmentForm] ||
        !Number.isFinite(def.settlement.minimumShare) || def.settlement.minimumShare < 0 || def.settlement.minimumShare > 1))
      throw new Error('Invalid campaign civic settlement.');
    for (var event in def.news || {})
      if ([V.started,V.won,V.failed,V.diverted,V.interrupted].indexOf(event) < 0 ||
          !plain(def.news[event]) || !/^news\.[a-z0-9_.-]+$/.test(def.news[event].key) || typeof def.news[event].text !== V.string)
        throw new Error('Invalid campaign outcome message.');
  }
  FB.storyCampaign = { fresh:fresh, validate:validate };
  FB.stories.registerType(V.campaign, function (def) {
    validateDefinition(def);
    for (var event in def.news || {}) {
      var msg = def.news[event]; FB.registerMessage(msg.key, { text:msg.text });
    }
    return { id:def.id, kind:V.world, requires:def.requires || [], init:fresh,
      day:function (s, rec) { day(s, rec, FB.stories.definition(s, def)); },
      choices:function (s, rec) {
        var effective = FB.stories.definition(s, def);
        if (!playerParty(s, effective) || rec.phase !== 'pending' || rec.playerDecision ||
            s.date.year < def.firstYear || closed(s, def)) return [];
        return [
          { id:'face_campaign', label:FB.T('Face the campaign'), detail:FB.T('Authorize this political opportunity to proceed through ordinary war and its existing conditions. No territory is awarded by this decision.') },
          { id:'leave_campaign', label:FB.T('Use ordinary diplomacy instead'), detail:FB.T('Close this historical opportunity without a declaration, commission or payment. Neighboring courts retain their ordinary political choices.') }
        ];
      },
      quote:function (s, rec, id) { return playerQuote(s, rec, def, id); },
      blocker:function () { return FB.T('The campaign needs its living rulers, current territory, date window and peaceful courts. Review the opportunity again when those conditions hold.'); },
      apply:function (s, rec, id, reviewed) {
        var q = playerQuote(s, rec, def, id);
        if (!q.allowed || !reviewed || reviewed.id !== id || reviewed.stamp !== q.stamp) return false;
        rec.playerDecision = id === 'face_campaign' ? V.campaign : V.declined;
        rec.playerDecisionGeneration = FB.realmRulerGeneration(s, V.player);
        var effective = FB.stories.definition(s, def);
        if (id === 'leave_campaign') finish(s, rec, effective, V.diverted, 'player_declined');
        else day(s, rec, effective);
        return true;
      },
      validate:function (rec) { validate(rec, def.id); },
      title:function (s) { return FB.dataText(s, null, 'storyCampaign', def.id, def, V.name, {}); },
      intro:function (s) { return FB.dataText(s, null, 'storyCampaign', def.id, def, V.desc, {}); },
      status:function (s, rec) {
        if (rec.phase === 'pending' && s.date.year < def.firstYear) return null;
        var names = { pending:playerParty(s, FB.stories.definition(s, def)) && !rec.playerDecision
            ? FB.T('Awaiting your decision') : FB.T('Awaiting the courts'), negotiating:FB.T('Commission and service terms'),
          started:FB.T('Campaign underway'), won:FB.T('Objective secured'), failed:FB.T('Campaign ended'),
          diverted:FB.T('History took another course'), interrupted:FB.T('Political opportunity interrupted') };
        return { phase:rec.phase, name:names[rec.result || rec.phase],
          lines:[FB.T('Territory depends on the campaign’s armies and any agreed settlement.')] };
      } };
  }, 'js/story_campaign.js', validateDefinition);
})();
