/* Data-defined conditional campaigns. This story type observes authoritative
   war and migration outcomes; it never transfers a county or creates a host. */
(function () {
  'use strict';
  var PHASES = ['pending','negotiating','started','resolved'];
  var RESULTS = ['won','failed','diverted','interrupted'];
  function plain(row) { return !!row && typeof row === 'object' && !Array.isArray(row); }
  function live(s, rid) { return rid === 'player' ? alive(s, s.player && s.player.charId) : !!(s.realms[rid] && s.realms[rid].alive); }
  function courtLive(s, rid, def) {
    return live(s, rid) && (!def.admission || !!(s.realms[rid] && s.realms[rid].alive));
  }
  function characterId(s, ref) { return FB.stories.resolve(s, ref); }
  function alive(s, id) { return !!(id && s.chars[id] && !s.chars[id].dead); }
  function ruler(s, rid) {
    var actor = FB.political.actor(s, { kind:'realm', id:rid });
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
    if (rec.migrationId && result !== 'won')
      FB.federateInterruptMigration(s, rec.migrationId, reason);
    rec.phase = 'resolved'; rec.result = result; rec.reason = reason;
    rec.outcomeTurn = s.turn;
    // A landless court becomes territorial only after ordinary war has
    // secured the declared objective. This never transfers or teleports land.
    if (result === 'won' && def.settlementForm && !rec.settlementApplied &&
        s.owner[def.target.provinceId] === def.actor.realmId) {
      var realm = s.realms[def.actor.realmId];
      realm.nonTerritorial = false; realm.capital = def.target.provinceId;
      FB.authoritySetGovernment(s, def.actor.realmId, def.settlementForm);
      if (!def.settlement) rec.settlementApplied = true;
    }
    if (result === 'won' && def.settlement && !rec.settlementApplied) {
      var rule = def.settlement, county = def.target.provinceId;
      if (s.owner[county] === def.actor.realmId &&
          FB.countyReligionShare(s, county, rule.faithId) >= rule.minimumShare &&
          FB.localInstitutionMediate(s, rule.churchId,
            { kind:'realm', id:def.actor.realmId }, county) &&
          FB.localInstitutionRights(s, rule.civicId, def.actor.realmId))
        FB.authoritySetGovernment(s, def.actor.realmId, rule.governmentForm);
      rec.settlementApplied = true;
    }
    notice(s, def, result, reason);
  }
  /* Conditions separate permanent divergence from a waitable fact (Clovis
     must inherit naturally). Other wars of either court do not delay it. */
  function conditions(s, def) {
    if (!courtLive(s, def.actor.realmId, def)) return { result:'interrupted', reason:'actor_extinct' };
    var expected = characterId(s, def.actor.character);
    if (def.actor.character && !alive(s, expected)) return { result:'interrupted', reason:'actor_dead' };
    var waiting = !!(expected && ruler(s, def.actor.realmId) !== expected);
    var owner = s.owner[def.target.provinceId];
    if (!owner || !courtLive(s, owner, def)) return { result:'diverted', reason:'target_lost' };
    if (def.target.ownerIds && def.target.ownerIds.indexOf(owner) < 0)
      return { result:'diverted', reason:'target_changed' };
    if (def.target.character) {
      var target = characterId(s, def.target.character);
      if (!alive(s, target)) return { result:'interrupted', reason:'target_dead' };
      if (ruler(s, owner) !== target) return { result:'diverted', reason:'target_succeeded' };
    }
    for (var row of def.conditions || []) {
      if (row.kind === 'owner' && s.owner[row.provinceId] !== row.realmId)
        return { result:'diverted', reason:'capital_lost' };
      if (row.kind === 'ruler') {
        var id = characterId(s, row.character);
        if (!courtLive(s, row.realmId, def) || !alive(s, id))
          return { result:'interrupted', reason:'patron_lost' };
        if (ruler(s, row.realmId) !== id) waiting = true;
      }
      if (row.kind === 'landless' && FB.realmTerritory(s, row.realmId).length)
        return { result:'diverted', reason:'already_settled' };
      if (row.kind === 'host') {
        var army = host(s, row.hostId);
        if (!army || army.realm !== row.realmId || army.men <= 0)
          return { result:'interrupted', reason:'host_lost' };
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
  /* Opted-in declarations use current public courts, never a household's
     possession of one county as evidence of an original court's continuity. */
  function admission(s, def) {
    if (!def.admission) return {allowed:true};
    var rid = def.actor.realmId, enemy = s.owner[def.target.provinceId];
    var out = {allowed:false,reason:'living_courts',cause:{type:def.admission.cause,
      enemy:enemy,target:def.target.provinceId}};
    if (!s.realms[rid] || !s.realms[rid].alive || !s.realms[enemy] || !s.realms[enemy].alive ||
        !alive(s, ruler(s, rid)) || !alive(s, ruler(s, enemy))) return out;
    out.actorReadiness = FB.governments.publicAuthorityReadiness(s, rid);
    // Only the attacking court's readiness matters. A defender, player or
    // not, takes no decision, so a vulnerable government is still attacked.
    if (!out.actorReadiness.allowed) { out.reason = 'public_authority'; return out; }
    out.preview = FB.warDeclarationPreview(s, rid, [out.cause]);
    if (def.mobileReview) {
      out.cause={type:def.admission.cause,target:def.target.provinceId,enemy:enemy};
      var leader=FB.mobile.leader(s,rid);
      out.mobile=leader && FB.mobile.review(s,{realmId:rid,action:'war',actor:{kind:'character',id:leader.id},terms:{causes:[out.cause]}});
      if (!out.mobile || !out.mobile.review.allowed) {out.reason='mobile_consent';return out;}
      out.preview=out.mobile.review.declaration;
    }
    if (!out.preview.valid || out.preview.unlawful) { out.reason = 'ordinary_declaration'; return out; }
    if (FB.sameFaithHeadWarPolicy(s, FB.realmReligionId(s, rid), enemy, def.target.provinceId, true)) {
      out.reason = 'faith_policy'; return out;
    }
    if (rid === 'player') {
      var offered = FB.warCauses(s, false, true).some(function (cause) {
        return cause.type === out.cause.type && cause.enemy === enemy && cause.target === out.cause.target;
      });
      if (!offered) { out.reason = 'ordinary_declaration'; return out; }
      out.costs = FB.warCausePreview(s, out.cause);
    } else {
      var burden = FBDATA.modifiers.aggressive_rule;
      out.costs = {support:(burden.fx.commonVoice || 0) +
        (burden.supportPerStack || 0) * FB.aggressionDeclarationCount(s, rid),days:burden.days,
        enemyStanding:enemy === 'player' ? FB.warEnemyStandingPreview(s, rid) : null};
    }
    out.allowed = true; out.reason = null;
    return out;
  }
  function declare(s, def, check) {
    var rid = def.actor.realmId, cause = check.cause;
    if (def.mobileReview) {
      if (!FB.mobile.commit(s,check.mobile)) return null;
      return FB.ordinaryWarBetween(s,rid,cause.enemy);
    }
    if (rid === 'player') {
      if (!FB.startPlayerWar(s, cause, {confirmAggression:true})) return null;
      return FB.ordinaryWarBetween(s, rid, cause.enemy);
    }
    var owner = cause.enemy === 'player' ? 'player' : rid;
    var war = FB.registerOrdinaryWar(s, owner, {enemy:owner === 'player' ? rid : cause.enemy,
      defending:owner === 'player',target:cause.target,legacy:false,casus:cause,objectives:[cause]});
    if (!war) return null;
    FB.recordWarDeclaration(s, war, check.preview);
    if (owner === 'player') FB.withOrdinaryWar(s, war.id, function () {
      FB.warFooting(s); FB.announcePlayerDefense(s, war);
    });
    return war;
  }
  function commission(s, rec, def) {
    if (!def.commission) return true;
    var rule = def.commission, subject = { kind:'realm', id:def.actor.realmId };
    if (rec.commissionId) return FB.political.legitimacy(s, subject, subject, rule.source)
      .some(function (row) { return row.id === rec.commissionId; });
    var created = FB.authorityRecognize(s, { source:rule.source,
      issuer:{ kind:'realm', id:rule.issuerRealmId }, subject:subject, scope:subject });
    if (!created) created = FB.political.legitimacy(s, subject, subject, rule.source)
      .filter(function (row) { return row.issuer.kind === 'realm' && row.issuer.id === rule.issuerRealmId; })[0];
    if (!created) return false;
    rec.commissionId = created.id;
    return true;
  }
  function migration(s, rec, def) {
    var spec = FBDATA.federateMigrations[def.migrationId];
    var moving = rec.migrationId && FB.political.movingPolity(s, rec.migrationId);
    if (!moving) {
      if (rec.migrationId) { finish(s, rec, def, 'interrupted', 'migration_lost'); return; }
      var created = FB.federateBeginMigration(s,
        Object.assign({}, spec, { endTurn:rec.deadline }));
      if (!created) return;
      rec.migrationId = created.id; rec.phase = 'negotiating';
      FB.stories.observe(s, def.id);
      moving = created;
    }
    if (moving.status === 'settled') { finish(s, rec, def, 'won', 'settled'); return; }
    if (moving.status === 'failed') { finish(s, rec, def, 'failed', moving.failureReason || 'migration_failed'); return; }
    if (!rec.contractId) {
      var offered = FB.federateOfferReplacement(s, spec.templateId, {
        patronRealmId:spec.patronRealmId, federateRealmId:spec.realmId,
        hostId:spec.hostId, recognitionId:rec.commissionId });
      if (!offered) return;
      rec.contractId = offered.id;
      s.authority.migrations.filter(function (row) { return row.id === moving.id; })[0].contractId = offered.id;
    }
    var deal = FB.political.contract(s, rec.contractId);
    if (!deal || ['expired','breached'].indexOf(deal.status) >= 0) {
      finish(s, rec, def, 'interrupted', 'terms_lapsed'); return;
    }
    if (!moving.choice && FB.federateNegotiateContract(s, rec.contractId) &&
        FB.federateRequest(s, moving.id, 'force')) {
      rec.phase = 'started';
      notice(s, def, 'started');
    }
    moving = FB.political.movingPolity(s, moving.id);
    rec.warId = moving.warId;
  }
  function day(s, rec, def) {
    if (rec.phase === 'resolved') return;
    var rid = def.actor.realmId, county = def.target.provinceId;
    if (rec.startedTurn !== null) {
      if (def.mobileReview && (!FB.mobile.leader(s,rid) || FB.mobile.leader(s,rid).id!==rec.actorId ||
          FB.realmRulerGeneration(s,rid)!==rec.actorGeneration)) {
        finish(s,rec,def,'interrupted','authority_lost');return;
      }
      /* Settlement precedes succession checks: a completed award is durable. */
      var moving = rec.migrationId && FB.political.movingPolity(s, rec.migrationId);
      if (moving && moving.status === 'settled') { finish(s, rec, def, 'won', 'settled'); return; }
      if (moving && moving.status === 'failed' &&
          ['campaign_lost','term_ended'].indexOf(moving.failureReason) >= 0) {
        finish(s, rec, def, 'failed', moving.failureReason); return;
      }
      if (!rec.migrationId && rec.warId && s.owner[county] === rid) {
        finish(s, rec, def, 'won', 'objective_held'); return;
      }
      if (!courtLive(s, rid, def) || rec.actorId && !alive(s, rec.actorId) ||
          def.mobileReview && (!FB.mobile.leader(s,rid) || FB.mobile.leader(s,rid).id!==rec.actorId) ||
          rec.actorGeneration !== null && rec.actorGeneration !== FB.realmRulerGeneration(s, rid) ||
          def.commission && rec.patronGeneration !== null && (!live(s, def.commission.issuerRealmId) ||
            !alive(s, ruler(s, def.commission.issuerRealmId)) ||
            rec.patronGeneration !== FB.realmRulerGeneration(s, def.commission.issuerRealmId)) ||
          rec.commissionId && def.commission && !commission(s, rec, def)) {
        finish(s, rec, def, 'interrupted', 'authority_lost'); return;
      }
      if (def.target.character && !alive(s, characterId(s, def.target.character))) {
        finish(s, rec, def, 'interrupted', 'target_dead'); return;
      }
      if (def.target.character && ruler(s, rec.targetOwnerId) !== characterId(s, def.target.character)) {
        finish(s, rec, def, 'interrupted', 'target_succeeded'); return;
      }
      for (var condition of def.conditions || []) {
        if (condition.kind === 'owner' && s.owner[condition.provinceId] !== condition.realmId) {
          finish(s, rec, def, 'diverted', 'capital_lost'); return;
        }
        if (condition.kind === 'host') {
          var army = host(s, condition.hostId);
          if (!army || army.realm !== condition.realmId || army.men <= 0) {
            finish(s, rec, def, 'interrupted', 'host_lost'); return;
          }
        }
      }
      if (s.turn >= rec.deadline) { finish(s, rec, def, 'failed', 'campaign_timeout'); return; }
      if (rec.migrationId) {
        if (s.owner[county] !== rid && s.owner[county] !== rec.targetOwnerId) {
          finish(s, rec, def, 'diverted', 'third_party_control'); return;
        }
        if (rec.warId && !FB.ordinaryWarById(s, rec.warId) && s.owner[county] !== rid) {
          finish(s, rec, def, 'failed', 'campaign_ended'); return;
        }
        migration(s, rec, def); return;
      }
      if (rec.warId) {
        if (s.owner[county] !== rec.targetOwnerId) {
          finish(s, rec, def, 'diverted', 'third_party_control'); return;
        }
        if (!FB.ordinaryWarById(s, rec.warId)) finish(s, rec, def, 'failed', 'campaign_ended');
        return;
      }
    }
    if (closed(s, def)) { finish(s, rec, def, 'diverted', 'window_closed'); return; }
    if (s.date.year < def.firstYear) return;
    if (s.owner[county] === rid) { finish(s, rec, def, 'diverted', 'already_held'); return; }
    var check = conditions(s, def);
    if (check.result) { finish(s, rec, def, check.result, check.reason); return; }
    if (!check.allowed) return;
    /* Campaigns run alongside other wars. One ordinary war per opposing pair:
       admission takes that rule from the declaration preview; others wait. */
    if (!def.admission && FB.ordinaryWarBetween(s, rid, s.owner[county])) return;
    if (aiActor(s, def) && FB.realmAttackCommitments(s, rid) >=
        FB.aiDecisions.parameters(s, rid, 'war').maximumCommitments) return;
    if (playerParty(s, def) && (rec.playerDecision !== 'campaign' ||
        rec.playerDecisionGeneration !== FB.realmRulerGeneration(s, playerRealm(s,def)))) return;
    var admitted = admission(s, def);
    if (!admitted.allowed) return;
    if (!commission(s, rec, def)) return;
    if (def.migrationId) {
      if (rec.startedTurn === null) stamp(s, rec, def);
      migration(s, rec, def); return;
    }
    var war = def.admission ? declare(s, def, admitted) : FB.registerOrdinaryWar(s, rid, { enemy:s.owner[county],
      target:county, legacy:false, casus:{ type:'border', target:county },
      objectives:[{ target:county, type:'border' }] });
    if (!war) return;
    // A defending player is informed exactly as by any other declaration.
    if (!def.admission && war.defender === 'player') FB.withOrdinaryWar(s, war.id, function () {
      FB.warFooting(s); FB.announcePlayerDefense(s, war);
    });
    stamp(s, rec, def);
    rec.warId = war.id; rec.phase = 'started'; notice(s, def, 'started');
  }
  /* The player decides only as actor, mobile actor leader or commission
     issuer. A player who owns the target is informed, never asked. */
  function playerParty(s, def) {
    return !!playerRealm(s,def);
  }
  function playerRealm(s,def) {
    if (playerLeadsActor(s, def)) return def.actor.realmId;
    return def.actor.realmId === 'player' ||
      def.commission && def.commission.issuerRealmId === 'player' ? 'player' : null;
  }
  function playerLeadsActor(s, def) {
    if (!def.mobileReview) return false;
    var leader=FB.mobile.leader(s,def.actor.realmId);
    return !!(leader && leader.id===s.player.charId && !s.player.dead);
  }
  function aiActor(s, def) {
    return def.actor.realmId !== 'player' && !playerLeadsActor(s, def);
  }
  function playerQuote(s, rec, authored, id) {
    var def = FB.stories.definition(s, authored), check = conditions(s, def);
    var admitted = admission(s, def);
    var facts = { phase:rec.phase, decision:rec.playerDecision || null, turn:s.turn,
      date:s.date, generation:FB.realmRulerGeneration(s, playerRealm(s,def) || 'player'),
      actor:ruler(s, def.actor.realmId), target:s.owner[def.target.provinceId],
      actorGeneration:FB.realmRulerGeneration(s, def.actor.realmId),
      patronGeneration:def.commission && FB.realmRulerGeneration(s, def.commission.issuerRealmId),
      check:check, admission:admitted, definition:def, gold:s.player.gold, owner:s.owner[def.target.provinceId],
      wars:[FB.isRealmAtWar(s, def.actor.realmId), FB.isRealmAtWar(s, s.owner[def.target.provinceId])] };
    var allowed = !!(playerParty(s, def) && rec.phase === 'pending' &&
      !rec.playerDecision && !s.player.dead && s.date.year >= def.firstYear && !closed(s, def) &&
      (id === 'leave_campaign' || id === 'face_campaign' && check.allowed && admitted.allowed &&
        (def.admission || !FB.ordinaryWarBetween(s, def.actor.realmId, s.owner[def.target.provinceId]))));
    // The reason stays outside the stamped facts: it only names the blocker.
    return { id:id, allowed:allowed,
      reason:allowed ? admitted.reason || 'campaign_conditions' : quoteReason(s, rec, def, id, check, admitted),
      facts:facts, stamp:JSON.stringify(facts) };
  }
  /* The first unmet condition of a refused quote, in the order the quote
     checks them: party, decision, window, conditions, admission, war pair. */
  function quoteReason(s, rec, def, id, check, admitted) {
    if (!playerParty(s, def)) return 'not_party';
    if (rec.phase !== 'pending' || rec.playerDecision) return 'decided';
    if (s.player.dead) return 'campaign_conditions';
    if (s.date.year < def.firstYear) return 'window_opens';
    if (closed(s, def)) return 'window_closed';
    if (id !== 'face_campaign') return 'campaign_conditions';
    if (check.result) return check.reason;
    if (check.wait) return 'awaiting_ruler';
    if (!admitted.allowed) return admitted.reason;
    if (!def.admission && FB.ordinaryWarBetween(s, def.actor.realmId, s.owner[def.target.provinceId])) return 'pair_war';
    return 'campaign_conditions';
  }
  /* Presentation. Names are live display text for the sheet; saved news
     keeps its own message parameters. */
  var STAGE = 'campaign stage';
  function realmName(s, rid) {
    return rid && s.realms[rid] ? s.realms[rid].name : FB.T('No current court');
  }
  function personName(s, id) { return id && s.chars[id] ? FB.fullName(s.chars[id]) : FB.T('Its ruler'); }
  function names(s, def) {
    var pid = def.target.provinceId;
    return { realm:realmName(s, def.actor.realmId), enemy:realmName(s, s.owner[pid]),
      province:FB.world.byId[pid].name, first:def.firstYear, last:def.lastYear };
  }
  // Attacker and commissioning court decide; a defender or observer is informed.
  function role(s, def) {
    if (def.actor.realmId === 'player' || playerLeadsActor(s, def)) return 'attacker';
    if (def.commission && def.commission.issuerRealmId === 'player') return 'issuer';
    return s.owner[def.target.provinceId] === 'player' ? 'defender' : 'observer';
  }
  function roleName(who) {
    if (who === 'attacker') return FB.T('Attacker');
    if (who === 'issuer') return FB.T('Commissioning court');
    return who === 'defender' ? FB.T('Defender') : FB.T('Observer');
  }
  function awaited(s, def) {
    var expected = characterId(s, def.actor.character);
    if (expected && ruler(s, def.actor.realmId) !== expected) return { characterId:expected, realmId:def.actor.realmId };
    for (var row of def.conditions || []) {
      if (row.kind !== 'ruler') continue;
      var id = characterId(s, row.character);
      if (ruler(s, row.realmId) !== id) return { characterId:id, realmId:row.realmId };
    }
    return null;
  }
  // The condition row behind a permanent reason; the first of its kind if it holds again.
  function conditionRow(s, def, kind) {
    var rows = (def.conditions || []).filter(function (row) { return row.kind === kind; });
    return rows.filter(function (row) {
      if (kind === 'owner') return s.owner[row.provinceId] !== row.realmId;
      if (kind === 'ruler') return !courtLive(s, row.realmId, def) || !alive(s, characterId(s, row.character));
      return true;
    })[0] || rows[0] || null;
  }
  /* Why a campaign closed or failed, as a clause for "Closed: ..." and the
     blocker of a permanent condition. Unknown reasons have no clause. */
  function outcomeClause(s, def, reason, who) {
    var p = names(s, def), row;
    if (reason === 'player_declined') return who === 'issuer' ? FB.T('you withheld the commission') :
      who === 'attacker' ? FB.T('you dropped the claim to {province}', p) : FB.T('the attack was called off');
    if (reason === 'window_closed') return FB.T('the window ended in {last}', p);
    if (reason === 'already_held') return FB.T('{realm} already holds {province}', p);
    if (reason === 'actor_extinct') return FB.T('{realm} has fallen', p);
    if (reason === 'actor_dead') return FB.T('{person} has died', { person:personName(s, characterId(s, def.actor.character)) });
    if (reason === 'target_lost') return FB.T('{province} no longer has a living court', p);
    if (reason === 'target_changed') return FB.T('{province} passed to {enemy}', p);
    if (reason === 'target_dead') return FB.T('{person} has died', { person:personName(s, characterId(s, def.target.character)) });
    if (reason === 'target_succeeded') return FB.T('{person} no longer rules {enemy}',
      { person:personName(s, characterId(s, def.target.character)), enemy:p.enemy });
    if (reason === 'capital_lost' && (row = conditionRow(s, def, 'owner')))
      return FB.T('{court} lost {county}, which this campaign required',
        { court:realmName(s, row.realmId), county:FB.world.byId[row.provinceId].name });
    if (reason === 'patron_lost' && (row = conditionRow(s, def, 'ruler')))
      return FB.T('{person} of {court} is gone', { person:personName(s, characterId(s, row.character)), court:realmName(s, row.realmId) });
    if (reason === 'already_settled' && (row = conditionRow(s, def, 'landless')))
      return FB.T('{court} already holds land', { court:realmName(s, row.realmId) });
    if (reason === 'host_lost' && (row = conditionRow(s, def, 'host')))
      return FB.T('the host of {court} was lost', { court:realmName(s, row.realmId) });
    if (reason === 'authority_lost') return FB.T('a court that began it changed rulers');
    if (reason === 'third_party_control') return FB.T('{province} passed to a third court', p);
    if (reason === 'campaign_timeout') return FB.T('the war passed its time limit without taking {province}', p);
    if (reason === 'campaign_ended') return FB.T('the war ended without taking {province}', p);
    if (reason === 'campaign_lost') return FB.T('the host lost its campaign for {province}', p);
    if (reason === 'term_ended') return FB.T('the service term ended before {province} was taken', p);
    if (reason === 'migration_lost') return FB.T('the migration was lost');
    if (reason === 'terms_lapsed') return FB.T('the service terms lapsed');
    return null;
  }
  /* One specific sentence for each blocking reason: the court, person or
     county involved and what would change it. Unknown reasons return null and
     the shared sheet supplies its fallback. */
  function blockerText(s, def, reason) {
    var p = names(s, def), wait;
    if (reason==='mobile_consent') return FB.T('The current coalition leader needs member assent to this exact war objective. In Mobile coalition, propose war with this target and obtain the members’ decisions before reviewing again. Membership alone grants no command.');
    if (reason === 'public_authority') return FB.T('The court needs a capable current public authority before making this commitment.');
    if (reason === 'ordinary_declaration') {
      var a = admission(s, def);
      return a.preview && a.preview.reason || FB.T('Ordinary war permission, frontier access and a currently offered aggression objective are required.');
    }
    if (reason === 'faith_policy') return FB.T('The ordinary religious policy prevents this declaration.');
    if (reason === 'not_party') return FB.T('{realm} decides this attack, not you.', p);
    if (reason === 'decided') return FB.T('This campaign has already been decided.');
    if (reason === 'window_opens') return FB.T('Opens in {first}.', p);
    if (reason === 'window_closed') return FB.T('The window closed at the end of {last}.', p);
    if (reason === 'awaiting_ruler' && (wait = awaited(s, def)))
      return FB.T('{person} must rule {court} first.', { person:personName(s, wait.characterId), court:realmName(s, wait.realmId) });
    if (reason === 'pair_war') return FB.T('{realm} is already at war with {enemy}. This opens again once that war ends.', p);
    if (reason === 'commitments') return FB.T('{realm} is at its limit of wars.', p);
    if (reason === 'living_courts') return FB.T('{realm} and {enemy} must both have a living ruler.', p);
    var clause = outcomeClause(s, def, reason, role(s, def));
    return clause ? FB.T('The opportunity has closed: {reason}.', { reason:clause }) : null;
  }
  /* The campaign's present state, in the order day() decides it: a short
     state for the card's stage line and one sentence for the Now fact. */
  function progress(s, rec, def, who) {
    var p = names(s, def), rid = def.actor.realmId, county = def.target.provinceId;
    function out(state, text, flags) { return Object.assign({ state:state, text:text }, flags || {}); }
    function closing(reason, failed) {
      var clause = outcomeClause(s, def, reason, who);
      if (failed) return out(FB.TC(STAGE, 'Failed'), clause ? FB.T('Failed: {reason}.', { reason:clause }) :
        FB.T('Failed: the campaign did not take {province}.', p), { closed:true });
      return out(FB.TC(STAGE, 'Closed'), clause ? FB.T('Closed: {reason}.', { reason:clause }) :
        FB.T('Closed: history took another course.'), { closed:true });
    }
    function waiting(reason) {
      var text = blockerText(s, def, reason);
      return out(FB.TC(STAGE, 'Waiting'), text ? FB.T('Waiting: {reason}', { reason:text }) :
        FB.T('Waiting for its conditions to hold.'), { wait:true });
    }
    if (rec.phase === 'resolved') {
      if (rec.result === 'won') return out(FB.TC(STAGE, 'Won'), FB.T('Won: {realm} holds {province}.', p), { closed:true });
      return closing(rec.reason, rec.result === 'failed');
    }
    if (rec.phase === 'negotiating') return out(FB.TC(STAGE, 'Negotiating'),
      FB.T('{realm} is settling its commission and service terms.', p));
    if (rec.phase === 'started') {
      var since = FB.dateAtTurn(s, rec.startedTurn);
      return out(FB.TC(STAGE, 'Underway'), FB.T('War underway since {season} {year}: {realm} against {enemy}.',
        { season:FB.seasonName(since.season), year:since.year, realm:p.realm, enemy:realmName(s, rec.targetOwnerId) }));
    }
    if (closed(s, def)) return closing('window_closed');
    if (s.owner[county] === rid) return closing('already_held');
    var check = conditions(s, def);
    if (check.result) return closing(check.reason);
    if (check.wait) return waiting('awaiting_ruler');
    if (!def.admission && FB.ordinaryWarBetween(s, rid, s.owner[county])) return waiting('pair_war');
    if (aiActor(s, def) && FB.realmAttackCommitments(s, rid) >=
        FB.aiDecisions.parameters(s, rid, 'war').maximumCommitments) return waiting('commitments');
    var admitted = admission(s, def);
    if (!admitted.allowed) return waiting(admitted.reason);
    if (playerParty(s, def)) {
      if (rec.playerDecision === 'campaign') return out(FB.TC(STAGE, 'Approved'),
        FB.T('Approved: war begins on the next day the conditions hold.'));
      return out(FB.TC(STAGE, 'Ready'), who === 'issuer' ? FB.T('Ready once you approve the commission.') :
        FB.T('Ready once you approve.'));
    }
    return out(FB.TC(STAGE, 'Imminent'), FB.T('{realm} may declare war on {enemy} any day now.', p));
  }
  function windowText(s, def) {
    // Game years are 360 days; a duration that is not whole years keeps one decimal.
    return FB.renderMessage(FB.msg('fx.ui.story_campaign_window', { forms:{ select:'plural', param:'years', cases:{
      one:'{first} to {last}, at most {years} year of war once it starts',
      other:'{first} to {last}, at most {years} years of war once it starts' } } },
      { first:def.firstYear, last:def.lastYear, years:Math.round(def.durationDays / 36) / 10 }),
      { state:s, viewer:s.player && s.player.charId });
  }
  /* The shared story status shape (docs/designs/stories.md): name for older
     readers, a one-line stage for the Deeds card, labeled facts for the
     sheet and any further sentences as lines. */
  function campaignStatus(s, rec, def) {
    var who = role(s, def), p = names(s, def), now = progress(s, rec, def, who), lines = [];
    if (who === 'defender' && rec.phase === 'pending' && !now.closed) {
      // A defender is told who may attack and that the attack is not theirs to decide.
      if (now.wait) lines.push(now.text);
      now = { state:now.state,
        text:FB.T('{realm} may declare war on you over {province} until {last}; the attack is theirs to decide.', p) };
    }
    var stage = FB.T('War for {province} · {state}', { province:p.province, state:now.state });
    return { phase:rec.phase, name:stage, stage:stage, lines:lines, facts:[
      [FB.T('Your role'), roleName(who)],
      [FB.T('Objective'), FB.T('{province}, held by {enemy}', p)],
      [FB.T('Window'), windowText(s, def)],
      [FB.T('Now'), now.text]
    ] };
  }
  function validate(rec, id) {
    function bad(field) { throw new Error(FB.T('Invalid v4 save field at {path}.',
      { path:'state.stories.' + id + '.' + field })); }
    if (!plain(rec) || PHASES.indexOf(rec.phase) < 0) bad('phase');
    if (rec.phase === 'resolved' ? RESULTS.indexOf(rec.result) < 0 : rec.result !== null) bad('result');
    for (var key of ['startedTurn','outcomeTurn','deadline','actorGeneration','patronGeneration'])
      if (rec[key] !== null && (!Number.isInteger(rec[key]) || rec[key] < 0)) bad(key);
    for (var field of ['reason','actorId','targetOwnerId','warId','migrationId','commissionId','contractId'])
      if (rec[field] !== null && (typeof rec[field] !== 'string' || !rec[field])) bad(field);
    if (rec.playerDecision !== undefined && [null,'campaign','declined'].indexOf(rec.playerDecision) < 0) bad('playerDecision');
    if (rec.playerDecisionGeneration !== undefined && rec.playerDecisionGeneration !== null &&
        (!Number.isInteger(rec.playerDecisionGeneration) || rec.playerDecisionGeneration < 0)) bad('playerDecisionGeneration');
    if (typeof rec.settlementApplied !== 'boolean') bad('settlementApplied');
    if (rec.phase === 'resolved' && rec.outcomeTurn === null ||
        rec.phase !== 'resolved' && rec.outcomeTurn !== null) bad('outcomeTurn');
    if ((rec.phase === 'started' || rec.phase === 'negotiating') &&
        (rec.startedTurn === null || rec.deadline === null)) bad('startedTurn');
    if (rec.phase === 'started' && !rec.warId) bad('warId');
  }
  function validateAdmission(rec, def, state) {
    if (!def.admission) return;
    function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.',
      {path:'state.stories.' + def.id + '.admission'})); }
    var fields = Object.keys(fresh());
    need(Object.keys(rec).length === fields.length && fields.every(function (key) {
      return Object.prototype.hasOwnProperty.call(rec, key);
    }));
    need(rec.phase !== 'negotiating' && rec.migrationId === null && rec.commissionId === null &&
      rec.contractId === null && rec.patronGeneration === null && rec.settlementApplied === false);
    need(rec.playerDecision === null ? rec.playerDecisionGeneration === null :
      Number.isInteger(rec.playerDecisionGeneration) && rec.playerDecisionGeneration >= 1);
    need(rec.phase !== 'pending' || rec.playerDecision === null && rec.reason === null);
    need(rec.playerDecision !== 'declined' || rec.phase === 'resolved' && rec.reason === 'player_declined');
    need(rec.startedTurn === null ? rec.deadline === null && rec.actorId === null &&
      rec.actorGeneration === null && rec.targetOwnerId === null && rec.warId === null && rec.result !== 'won' && rec.result !== 'failed' :
      rec.phase !== 'pending' && rec.deadline === rec.startedTurn + def.durationDays &&
      !!rec.actorId && Number.isInteger(rec.actorGeneration) && rec.actorGeneration >= 1 && !!rec.targetOwnerId && !!rec.warId);
    if (!state) return;
    // Core identities may be omitted by the wire codec. Expand a detached
    // view, without setup, repair, adoption or observation.
    var s = FB.save.expandedSnapshot(state), effective = FB.stories.definition(s, def);
    need((rec.startedTurn === null || rec.startedTurn <= s.turn) &&
      (rec.outcomeTurn === null || rec.outcomeTurn <= s.turn &&
        (rec.startedTurn === null || rec.outcomeTurn >= rec.startedTurn)));
    if (rec.startedTurn === null) return;
    need(!!s.chars[rec.actorId] && (!effective.target.ownerIds ||
      effective.target.ownerIds.indexOf(rec.targetOwnerId) >= 0));
    var serial = /^war_([1-9][0-9]*)$/.exec(rec.warId);
    need(!!serial && Number(serial[1]) <= s.warSerial);
    var rid = effective.actor.realmId, generation = FB.realmRulerGeneration(s, rid);
    if (s.realms[rid] && s.realms[rid].alive) need(rec.actorGeneration <= generation);
    if (s.realms[rid] && s.realms[rid].alive && rec.actorGeneration === generation && alive(s, ruler(s, rid)))
      need(rec.actorId === ruler(s, rid));
    var war = s.wars && s.wars[rec.warId];
    if (!war) need(!Object.keys(s.wars || {}).some(function (key) {
      var row = s.wars[key];
      return row.status === 'active' && row.attacker === rid && row.defender === rec.targetOwnerId &&
        row.startedTurn === rec.startedTurn && row.objectives && row.objectives.some(function (objective) {
          return objective.target === effective.target.provinceId && objective.type === effective.admission.cause;
        });
    }));
    if (war) need(war.attacker === rid && war.defender === rec.targetOwnerId &&
      war.startedTurn === rec.startedTurn && war.casus && war.casus.type === effective.admission.cause &&
      war.objectives && war.objectives.length === 1 && war.objectives[0].type === effective.admission.cause &&
      war.objectives[0].target === effective.target.provinceId);
  }
  function validateDefinition(def, context, bm) {
    function id(value) { return typeof value === 'string' && !!value; }
    function cast(ref) { return FB.stories.referenceValid(ref, def); }
    if (!def || typeof def.name !== 'string' || typeof def.desc !== 'string' ||
        !plain(def.actor) || typeof def.actor.realmId !== 'string' ||
        !plain(def.target) || typeof def.target.provinceId !== 'string' ||
        !Number.isInteger(def.firstYear) || !Number.isInteger(def.lastYear) || def.lastYear < def.firstYear ||
        !Number.isInteger(def.durationDays) || def.durationDays <= 0 ||
        def.migrationId && !FBDATA.federateMigrations[def.migrationId] ||
        def.settlementForm !== undefined && (!id(def.settlementForm) || !FBDATA.governmentForms[def.settlementForm] || def.migrationId ||
          FBDATA.governmentForms[def.settlementForm].territory !== 'fixed' ||
          !Array.isArray(def.conditions) || !def.conditions.some(function (row) { return plain(row) && row.kind === 'landless' && row.realmId === def.actor.realmId; })) ||
        def.conditions !== undefined && !Array.isArray(def.conditions) ||
        def.target.ownerIds !== undefined && (!Array.isArray(def.target.ownerIds) ||
          !def.target.ownerIds.length || def.target.ownerIds.some(function (id) { return typeof id !== 'string'; })) ||
        def.commission && (!plain(def.commission) || typeof def.commission.source !== 'string' ||
          typeof def.commission.issuerRealmId !== 'string'))
      throw new Error('Invalid campaign story definition.');
    if (def.admission !== undefined) {
      var rule = def.admission;
      if (!plain(rule) || Object.keys(rule).length !== 3 || rule.schema !== 1 ||
          rule.mode !== 'ordinary_declaration' || rule.cause !== 'aggression' ||
          def.commission !== undefined || def.migrationId !== undefined || def.settlement !== undefined || def.settlementForm !== undefined ||
          def.firstDate !== undefined || def.lastDate !== undefined)
        throw new Error('Invalid campaign admission policy.');
      if (bm) {
        var known = function (id) { return (bm.realms || []).some(function (r) { return r.id === id; }); };
        if (!known(def.actor.realmId) || (def.target.ownerIds || []).some(function (id) { return !known(id); }) ||
            !(bm.provinces || []).some(function (p) { return p.id === def.target.provinceId && !p.wasteland; }))
          throw new Error('Unresolved campaign admission party or objective.');
      }
    }
    if (def.mobileReview!==undefined) {
      if (!def.admission || !plain(def.mobileReview) || Object.keys(def.mobileReview).length!==1 || def.mobileReview.schema!==1)
        throw new Error('Invalid campaign mobile review.');
      if (bm) {
        var mobile=(bm.realms || []).filter(function (r) {return r.id===def.actor.realmId;})[0];
        if (!mobile || !mobile.mobile || mobile.mobile.command || mobile.mobile.columns || mobile.mobile.civilianCamps ||
            !FB.governments.resolve(mobile.government).use.succession.mobileLeadership)
          throw new Error('Invalid campaign coalition principal.');
      }
    }
    for (var row of def.conditions || [])
      if (!plain(row) || ['owner','ruler','landless','host'].indexOf(row.kind) < 0 ||
          !id(row.realmId) || row.kind === 'owner' && !id(row.provinceId) ||
          row.kind === 'ruler' && !cast(row.character) || row.kind === 'host' && !id(row.hostId))
        throw new Error('Invalid campaign story condition.');
    if (def.actor.character && !cast(def.actor.character) || def.target.character && !cast(def.target.character))
      throw new Error('A campaign cast reference must name a required story.');
    if (def.migrationId) {
      var moving = FBDATA.federateMigrations[def.migrationId];
      if (moving.realmId !== def.actor.realmId || moving.target !== def.target.provinceId ||
          !def.commission || moving.patronRealmId !== def.commission.issuerRealmId ||
          !(def.conditions || []).some(function (row) {
            return row.kind === 'host' && row.hostId === moving.hostId && row.realmId === moving.realmId;
          })) throw new Error('Campaign and migration parties must match.');
    }
    if (def.settlement && (!plain(def.settlement) || !id(def.settlement.churchId) ||
        !id(def.settlement.civicId) || !id(def.settlement.faithId) ||
        !FBDATA.governmentForms[def.settlement.governmentForm] ||
        !Number.isFinite(def.settlement.minimumShare) || def.settlement.minimumShare < 0 || def.settlement.minimumShare > 1))
      throw new Error('Invalid campaign civic settlement.');
    for (var event in def.news || {})
      if (['started','won','failed','diverted','interrupted'].indexOf(event) < 0 ||
          !plain(def.news[event]) || !/^news\.[a-z0-9_.-]+$/.test(def.news[event].key) || typeof def.news[event].text !== 'string')
        throw new Error('Invalid campaign outcome message.');
  }
  FB.storyCampaign = { fresh:fresh, validate:validate };
  FB.stories.registerType('campaign', function (def) {
    validateDefinition(def);
    return { id:def.id, kind:'world', requires:def.requires || [], init:fresh,
      choiceIds:['face_campaign','leave_campaign'],
      day:function (s, rec) { day(s, rec, FB.stories.definition(s, def)); },
      choices:function (s, rec) {
        var effective = FB.stories.definition(s, def);
        if (!playerParty(s, effective) || rec.phase !== 'pending' || rec.playerDecision ||
            s.date.year < def.firstYear || closed(s, def)) return [];
        // Labels name the action and its object from the declaration and the player's role.
        var p = names(s, effective);
        if (role(s, effective) === 'issuer') return [
          { id:'face_campaign', label:FB.T('Commission {realm} to take {province}', p),
            detail:FB.T('{realm} declares war on {enemy} as soon as the conditions hold. Winning {province} depends on its armies.', p) },
          { id:'leave_campaign', label:FB.T('Withhold the commission'),
            detail:FB.T('{realm} does not attack {province}. The opportunity closes for good.', p) }
        ];
        return [
          { id:'face_campaign', label:FB.T('Approve the war for {province}', p), detail:def.admission ?
            FB.T('War is declared on {enemy} at once. Winning {province} depends on your armies. The declaration’s costs are shown on review.', p) :
            FB.T('War is declared on {enemy} as soon as the conditions hold. Winning {province} depends on your armies.', p) },
          { id:'leave_campaign', label:FB.T('Drop the claim to {province}', p),
            detail:FB.T('No war. The opportunity closes for good.') }
        ];
      },
      quote:function (s, rec, id) { return playerQuote(s, rec, def, id); },
      blocker:function (s, rec, reason) { return blockerText(s, FB.stories.definition(s, def), reason); },
      review:function (s, rec, id, q) {
        if (!def.admission || id !== 'face_campaign') return [];
        if (def.mobileReview) return [FB.T('Declare through the current coalition war review and its exact member assent. No money, fighters or land are granted. The actual host campaigns independently; success and later settlement are uncertain.'),
          FB.T('The opportunity lasts at most {days} days. Your private purse and the coalition public account remain separate.',{days:def.durationDays})];
        var cost = q.facts.admission.costs, aggression = cost.aggression;
        var lines = [FB.T('No payment. The attempt lasts at most {days} days from declaration; an ordinary war may continue afterward. No conquest is guaranteed.', {days:def.durationDays}),
          FB.T('Popular support in every attacking county: {change}, recovering over {days} days.',
            {change:aggression ? aggression.realmSupportChange : cost.support,days:aggression ? aggression.realmSupportDays : cost.days})];
        if (aggression) {
          lines.push(FB.T('Prestige: {change}.', {change:aggression.prestigeChange}));
          ['vassals','foreign'].forEach(function (kind) {
            var groups = {};
            aggression[kind].forEach(function (row) { groups[row.change] = (groups[row.change] || 0) + 1; });
            Object.keys(groups).sort().forEach(function (change) {
              lines.push(kind === 'vassals' ? FB.T('Standing with {count} direct subjects: {change} each.', {count:groups[change],change:Number(change)}) :
                FB.T('Standing with {count} foreign courts: {change} each.', {count:groups[change],change:Number(change)}));
            });
          });
          lines.push(FB.T('Recent aggression multiplies ordinary subject breakaway pressure by {factor}.',
            {factor:aggression.breakawayMultiplier}));
          if (aggression.modifier) lines.push(FB.T('A conquered objective receives {support} Popular support and ordinary tax, levy and unrest penalties for {days} days.',
            {support:aggression.modifier.fx.commonVoice || 0,days:aggression.modifier.days}));
        }
        if (cost.enemyStanding) lines.push(FB.T('War hostility adds a Standing change of {change} with the opposing court, ending at {after}.',
          {change:cost.enemyStanding.change,after:cost.enemyStanding.after}));
        return lines;
      },
      apply:function (s, rec, id, reviewed) {
        var q = playerQuote(s, rec, def, id);
        if (!q.allowed || !reviewed || reviewed.id !== id || reviewed.stamp !== q.stamp) return false;
        rec.playerDecision = id === 'face_campaign' ? 'campaign' : 'declined';
        var effective = FB.stories.definition(s, def);
        rec.playerDecisionGeneration = FB.realmRulerGeneration(s, playerRealm(s,effective));
        if (id === 'leave_campaign') finish(s, rec, effective, 'diverted', 'player_declined');
        else day(s, rec, effective);
        if (def.admission && id === 'face_campaign' && rec.phase === 'pending') {
          rec.playerDecision = null; rec.playerDecisionGeneration = null;
          return false;
        }
        return true;
      },
      validate:function (rec, s) { validate(rec, def.id); validateAdmission(rec, def, s); },
      title:function (s) { return FB.dataText(s, null, def.mobileReview ? 'expeditionStory' : 'storyCampaign', def.id, def, 'name', {}); },
      intro:function (s) { return FB.dataText(s, null, def.mobileReview ? 'expeditionStory' : 'storyCampaign', def.id, def, 'desc', {}); },
      status:function (s, rec) {
        if (rec.phase === 'pending' && s.date.year < def.firstYear) return null;
        return campaignStatus(s, rec, FB.stories.definition(s, def));
      } };
  }, 'js/story_campaign.js', validateDefinition);
})();
