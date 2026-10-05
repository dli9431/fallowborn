/* Data-defined conditional campaigns. This story type observes authoritative
   war and migration outcomes; it never transfers a county or creates a host. */
(function () {
  'use strict';
  var PHASES = ['pending','negotiating','started','resolved'];
  var RESULTS = ['won','failed','diverted','interrupted'];
  function plain(row) { return !!row && typeof row === 'object' && !Array.isArray(row); }
  function live(s, rid) { return rid === 'player' ? alive(s, s.player && s.player.charId) : !!(s.realms[rid] && s.realms[rid].alive); }
  function characterId(s, ref) {
    if (typeof ref === 'string') return ref;
    var rec = ref && FB.stories.record(s, ref.storyId);
    return rec && rec[ref.field] || null;
  }
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
      commissionId:null, contractId:null, settlementApplied:false };
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
     must inherit naturally, busy courts can finish their existing wars). */
  function conditions(s, def) {
    if (!live(s, def.actor.realmId)) return { result:'interrupted', reason:'actor_extinct' };
    var expected = characterId(s, def.actor.character);
    if (def.actor.character && !alive(s, expected)) return { result:'interrupted', reason:'actor_dead' };
    var waiting = !!(expected && ruler(s, def.actor.realmId) !== expected);
    var owner = s.owner[def.target.provinceId];
    if (!owner || !live(s, owner)) return { result:'diverted', reason:'target_lost' };
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
        if (!live(s, row.realmId) || !alive(s, id))
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
      moving = created;
    }
    if (moving.status === 'settled') { finish(s, rec, def, 'won', 'settled'); return; }
    if (moving.status === 'failed') { finish(s, rec, def, 'failed', moving.failureReason || 'migration_failed'); return; }
    if (!rec.contractId) {
      var offered = FB.authorityOfferContractTemplate(s, spec.templateId, {
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
      if (!live(s, rid) || rec.actorId && !alive(s, rec.actorId) ||
          rec.actorGeneration !== null && rec.actorGeneration !== FB.realmRulerGeneration(s, rid) ||
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
    if (!check.allowed || FB.isRealmAtWar(s, rid) || FB.isRealmAtWar(s, s.owner[county])) return;
    if (!commission(s, rec, def)) return;
    if (rec.startedTurn === null) stamp(s, rec, def);
    if (def.migrationId) { migration(s, rec, def); return; }
    var war = FB.registerOrdinaryWar(s, rid, { enemy:s.owner[county],
      target:county, legacy:false, casus:{ type:'border', target:county },
      objectives:[{ target:county, type:'border' }] });
    if (!war) return;
    rec.warId = war.id; rec.phase = 'started'; notice(s, def, 'started');
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
    if (typeof rec.settlementApplied !== 'boolean') bad('settlementApplied');
    if (rec.phase === 'resolved' && rec.outcomeTurn === null ||
        rec.phase !== 'resolved' && rec.outcomeTurn !== null) bad('outcomeTurn');
    if ((rec.phase === 'started' || rec.phase === 'negotiating') &&
        (rec.startedTurn === null || rec.deadline === null)) bad('startedTurn');
    if (rec.phase === 'started' && !rec.warId) bad('warId');
  }
  function validateDefinition(def) {
    function id(value) { return typeof value === 'string' && !!value; }
    function cast(ref) {
      return id(ref) || plain(ref) && id(ref.storyId) && id(ref.field) &&
        (def.requires || []).indexOf(ref.storyId) >= 0;
    }
    if (!def || typeof def.name !== 'string' || typeof def.desc !== 'string' ||
        !plain(def.actor) || typeof def.actor.realmId !== 'string' ||
        !plain(def.target) || typeof def.target.provinceId !== 'string' ||
        !Number.isInteger(def.firstYear) || !Number.isInteger(def.lastYear) || def.lastYear < def.firstYear ||
        !Number.isInteger(def.durationDays) || def.durationDays <= 0 ||
        def.migrationId && !FBDATA.federateMigrations[def.migrationId] ||
        def.conditions !== undefined && !Array.isArray(def.conditions) ||
        def.target.ownerIds !== undefined && (!Array.isArray(def.target.ownerIds) ||
          !def.target.ownerIds.length || def.target.ownerIds.some(function (id) { return typeof id !== 'string'; })) ||
        def.commission && (!plain(def.commission) || typeof def.commission.source !== 'string' ||
          typeof def.commission.issuerRealmId !== 'string'))
      throw new Error('Invalid campaign story definition.');
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
    for (var event in def.news || {}) {
      var msg = def.news[event]; FB.registerMessage(msg.key, { text:msg.text });
    }
    return { id:def.id, kind:'world', requires:def.requires || [], init:fresh,
      day:function (s, rec) { day(s, rec, def); },
      validate:function (rec) { validate(rec, def.id); },
      title:function (s) { return FB.dataText(s, null, 'storyCampaign', def.id, def, 'name', {}); },
      intro:function (s) { return FB.dataText(s, null, 'storyCampaign', def.id, def, 'desc', {}); },
      status:function (s, rec) {
        if (rec.phase === 'pending' && s.date.year < def.firstYear) return null;
        var names = { pending:FB.T('Awaiting the courts'), negotiating:FB.T('Commission and service terms'),
          started:FB.T('Campaign underway'), won:FB.T('Objective secured'), failed:FB.T('Campaign ended'),
          diverted:FB.T('History took another course'), interrupted:FB.T('Political opportunity interrupted') };
        return { phase:rec.phase, name:names[rec.result || rec.phase],
          lines:[FB.T('Territory depends on the campaign’s armies and any agreed settlement.')] };
      } };
  });
})();
