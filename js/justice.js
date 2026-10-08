/* Ruler justice. Evidence grants a cause; only physical custody grants the
   power to sentence. All projections are read-only and all actors share them. */
(function () {
  'use strict';
  function num(n, fallback) { return typeof n === 'number' && isFinite(n) ? n : fallback; }
  function person(s, id) { return s.chars && s.chars[id]; }
  function live(s, id) { var c = person(s, id); return !!(c && !c.dead); }
  function cruel(c) { return !!(c && c.traits && c.traits.indexOf('cruel') >= 0); }
  function realmOf(s, id) {
    return id === s.player.charId ? (FB.station.rulesRealm(s.player, s) ? 'player' : null) :
      FB.realmIdForRulerCharacter(s, id);
  }
  function ruler(s, rid) {
    return rid === 'player' ? person(s, s.player.charId) :
      FB.realmRulerCharacterSnapshot(s, rid);
  }
  function under(s, child, parent) {
    var seen = {};
    while (child && !seen[child]) {
      if (child === parent) return true;
      seen[child] = true;
      child = child === 'player' ? s.player.liege :
        s.realms[child] && s.realms[child].liege;
    }
    return false;
  }
  function location(s, id) {
    if (id === s.player.charId) {
      return s.player.travel && s.player.travel.currentId || s.player.provinceId;
    }
    var c = person(s, id);
    return c && FB.characterResidence(s, c);
  }
  function records(s) { return s.justice || {}; }
  function ensure(s) {
    var j = s.justice;
    if (!j || typeof j !== 'object' || Array.isArray(j)) j = s.justice = {};
    if (!Array.isArray(j.offenses)) j.offenses = [];
    if (!j.cooldowns || typeof j.cooldowns !== 'object' || Array.isArray(j.cooldowns)) j.cooldowns = {};
    if (!j.arbitrary || typeof j.arbitrary !== 'object' || Array.isArray(j.arbitrary)) j.arbitrary = {};
    if (!j.exiles || typeof j.exiles !== 'object' || Array.isArray(j.exiles)) j.exiles = {};
    j.nextId = Math.max(1, Math.floor(num(j.nextId, 1)));
    return j;
  }
  function authorityKey(s, id) {
    return realmOf(s, id) || (id === s.player.charId && FB.station.mayAdministerJustice(s.player, s)
      ? 'barony:' + s.player.provinceId : 'character:' + id);
  }
  function authorityMatches(s, actor, key) {
    return key === authorityKey(s, actor) || actor === s.player.charId && FB.station.mayAdministerJustice(s.player, s) &&
      key === 'barony:' + s.player.provinceId;
  }
  FB.justiceRulerEligible = function (s, id) {
    if (!s || !s.player || !live(s, id)) return false;
    if (id === s.player.charId) return FB.station.mayAdministerJustice(s.player, s) &&
      !!(FB.governanceEligible && FB.governanceEligible(s)) ||
      FB.political.grantedCounties(s, { kind:'character', id:id }, 'peace').length > 0;
    var rid = realmOf(s, id), r = rid && s.realms[rid];
    return !!(r && r.alive && FB.realmRank.isTerritorial(r, s)) || person(s, id).role === 'lord' ||
      FB.political.grantedCounties(s, { kind:'character', id:id }, 'peace').length > 0;
  };
  FB.justiceCounties = function (s, id) {
    if (!FB.justiceRulerEligible(s, id)) return [];
    var rid = realmOf(s, id);
    var counties = rid ? FB.realmTerritory(s, rid).slice() : [];
    if (!rid && (id === s.player.charId && FB.station.mayAdministerJustice(s.player, s) ||
        person(s, id).role === 'lord')) {
      var pid = id === s.player.charId ? s.player.provinceId : location(s, id);
      if (pid) counties.push(pid);
    }
    FB.political.grantedCounties(s, { kind:'character', id:id }, 'peace').forEach(function (pid) {
      if (counties.indexOf(pid) < 0) counties.push(pid);
    });
    return counties.sort();
  };
  // Political jurisdiction includes vassals; local popularity belongs to the holder.
  FB.justiceSupportCounties = function (s, id) {
    if (!FB.justiceRulerEligible(s, id)) return [];
    var rid = realmOf(s, id);
    return rid ? FB.realmHeldCounties(s, rid).slice().sort() : FB.justiceCounties(s, id);
  };
  // No repair here: a sheet must neither materialize rulers nor change saves.
  FB.justiceCustodyOf = function (s, id) {
    var rows = s.intrigue && s.intrigue.captives || [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.captiveId !== id || !live(s, id) || !live(s, row.captorId)) continue;
      if (row.source === 'judicial' && num(row.endTurn, 0) <= s.turn) return null;
      return row;
    }
    if (id !== s.player.charId || !s.player.flags.in_prison) return null;
    var legal = s.intrigue && s.intrigue.legalCustody;
    var rid = legal && legal.endTurn > s.turn ? legal.authority : null;
    var war = s.player.captiveWarId && FB.ordinaryWarById ? FB.ordinaryWarById(s, s.player.captiveWarId) : null;
    if (!rid && war) rid = war.enemy;
    var c = rid && ruler(s, rid);
    return c && !c.dead ? { captiveId:id, captorId:c.id, captorRealmId:rid,
      source:legal ? 'legacy_legal' : 'war', captureTurn:num(s.player.captiveTurn, s.turn),
      warId:war && war.id, endTurn:legal && legal.endTurn } : null;
  };
  function held(s, actor, target) {
    var row = FB.justiceCustodyOf(s, target);
    return row && row.captorId === actor ? row : null;
  }
  function caseFor(s, actor, target, id, courtKind) {
    courtKind = courtKind || (held(s, actor, target) || {}).courtKind;
    var list = records(s).offenses || [], best = null;
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (row.accusedId !== target || row.closed || !authorityMatches(s, actor, row.authority) ||
          id && row.id !== id) continue;
      var law = FB.justiceTradition(s, actor, courtKind,
        { accusedId:target, otherPartyId:row.victimId }).definition;
      var evidence = law && law.justification && law.justification.evidence || [];
      if (evidence.indexOf(row.evidence) < 0) continue;
      if (!best || row.severity > best.severity || row.severity === best.severity &&
          row.kind === 'assassination' && row.successful &&
          !(best.kind === 'assassination' && best.successful)) best = row;
    }
    return best;
  }
  FB.justiceOffenseFor = caseFor;
  FB.justiceRecordOffense = function (s, actor, target, kind, evidence, successful, victimId, sourceId) {
    if (!FB.justiceRulerEligible(s, actor) || !live(s, target) || actor === target ||
        ['assassination','abduction','fabricated_charge','sabotage','blackmail','rebellion'].indexOf(kind) < 0 ||
        ['testimony', 'material', 'redhanded'].indexOf(evidence) < 0) return null;
    var j = ensure(s), key = authorityKey(s, actor);
    var source = sourceId || kind + ':' + target + ':' + (victimId || '') + ':' + s.turn;
    for (var i = 0; i < j.offenses.length; i++) {
      if (j.offenses[i].sourceId === source && j.offenses[i].authority === key) return j.offenses[i];
    }
    var severity = kind === 'assassination' || kind === 'rebellion' ? 3 :
      kind === 'abduction' || kind === 'fabricated_charge' ? 2 : 1;
    var row = { id:'justice-' + j.nextId++, sourceId:source, authority:key,
      actorId:actor, accusedId:target, victimId:victimId || null, kind:kind,
      evidence:evidence, successful:!!successful, severity:severity, turn:s.turn, closed:false };
    j.offenses.push(row);
    return row;
  };
  FB.justiceExposeScheme = function (s, scheme, evidence, successful) {
    var ctx = scheme.context || {}, victim = person(s, ctx.characterId);
    var actor = victim && FB.justiceRulerEligible(s, victim.id) ? victim : null;
    if (!actor && victim && FB.isHouseholdCharacter(s, victim.id) &&
        FB.justiceRulerEligible(s, s.player.charId)) actor = person(s, s.player.charId);
    if (!actor) {
      var pid = ctx.pid || victim && location(s, victim.id);
      var rid = pid && (s.holder[pid] || s.owner[pid]);
      actor = rid && (ruler(s, rid) || !scheme.repair && FB.materializeRealmRuler(s, rid));
    }
    if (!actor) return null;
    var offense = FB.justiceRecordOffense(s, actor.id, scheme.actorId || s.player.charId,
      scheme.id, evidence, successful, victim && victim.id,
      scheme.recordId || null);
    if (offense) FB.noteConduct(s, offense.accusedId, { public:true,
      murderer:successful && scheme.id === 'assassination',
      abductor:successful && scheme.id === 'abduction' });
    var accomplice = scheme.accomplice && scheme.accomplice.characterId;
    if (offense && live(s, accomplice)) {
      FB.justiceRecordOffense(s, actor.id, accomplice, scheme.id, evidence, successful,
        victim && victim.id, offense.sourceId + ':accomplice');
      FB.noteConduct(s, accomplice, { public:true,
        murderer:successful && scheme.id === 'assassination', abductor:successful && scheme.id === 'abduction' });
    }
    return offense;
  };
  FB.justiceRecordRebellion = function (s, authorityRealm, rebelId, sourceId) {
    var a = ruler(s, authorityRealm) || FB.materializeRealmRuler(s, authorityRealm);
    return a && FB.justiceRecordOffense(s, a.id, rebelId, 'rebellion', 'redhanded', true, a.id, sourceId);
  };
  /* A concluded rising settles its rebellion cases before the courts of the
     realms it was fought against, and of their lieges: a renewed oath is the
     settlement, and won independence leaves nothing to prosecute. Other
     crimes stay open. Returns the number of cases closed. */
  FB.justiceSettleRebellion = function (s, accusedId, realmIds) {
    var j = s.justice, courts = {}, closed = 0;
    if (!j || !Array.isArray(j.offenses)) return 0;
    (realmIds || []).forEach(function (rid) {
      var seen = {};
      while (rid && !seen[rid]) {
        seen[rid] = true; courts[rid] = true;
        rid = rid === 'player' ? s.player.liege : s.realms[rid] && s.realms[rid].liege;
      }
    });
    j.offenses.forEach(function (o) {
      if (o.closed || o.kind !== 'rebellion' || o.accusedId !== accusedId || !courts[o.authority]) return;
      o.closed = true; o.settled = 'peace'; closed++;
    });
    return closed;
  };
  function available(s, id) {
    if (id === s.player.charId) return Math.max(0, num(s.player.gold, 0));
    var rid = realmOf(s, id);
    return rid ? FB.treasuryAvailable(s, rid) : Math.max(0, num(person(s, id).wealth, 0));
  }
  function transfer(s, fromId, toId, amount) {
    if (amount === 0) return true;
    var from = FB.treasuryCharacterRealm(s, fromId), to = FB.treasuryCharacterRealm(s, toId);
    if (from && from === to) return false;
    if (!FB.treasuryTransfer(s, from, to, amount)) return false;
    if (!from) person(s, fromId).wealth = available(s, fromId) - amount;
    if (!to) person(s, toId).wealth = available(s, toId) + amount;
    return true;
  }
  function support(s, counties, amount) {
    var effects = [];
    counties.forEach(function (pid) {
      var before = FB.countySupportBase(s, pid);
      FB.adjustCountySupport(s, pid, amount);
      effects.push({ type:'commonVoice', pid:pid, amount:FB.countySupportBase(s, pid) - before });
    });
    return effects;
  }
  FB.justiceStandingProjection = function (s, actor, supportLoss) {
    var rid = realmOf(s, actor) || (actor === s.player.charId ? 'player' : null);
    var amount = supportLoss < 0 ? -Math.ceil(Math.abs(supportLoss) / 2) : 0;
    if (!rid || !amount) return [];
    var liege = rid === 'player' ? s.player.liege : s.realms[rid] && s.realms[rid].liege;
    return Object.keys(s.realms).sort().filter(function (other) {
      return other !== rid && s.realms[other].alive &&
        (other === liege || under(s, other, rid));
    }).map(function (other) {
      var before = FB.rulerRegard(s, other, rid);
      return { realmId:other, actorRealmId:rid, before:before,
        after:FB.clamp(before + amount, -100, 100), amount:amount };
    });
  };
  function standingPenalty(s, actor, supportLoss) {
    return FB.justiceStandingProjection(s, actor, supportLoss).map(function (row) {
      FB.adjustRulerRegard(s, row.realmId, row.actorRealmId, row.amount, 'justice:unjust_punishment');
      return { type:'justiceStanding', realmId:row.realmId, actorRealmId:row.actorRealmId,
        amount:FB.rulerRegard(s, row.realmId, row.actorRealmId) - row.before };
    });
  }
  /* Resisting a landed subordinate becomes a rising against the sovereign.
     A truce with that crown binds its courts as well, so no such arrest is
     attempted until it expires. Returns the truce expiry turn, or 0. */
  function arrestTruce(s, target, rid) {
    var rebel = target === s.player.charId ? 'player' : rid;
    var liege = rebel === 'player' ? s.player.liege : rebel && s.realms[rebel] && s.realms[rebel].liege;
    if (!liege) return 0;
    return FB.truceExpiry(s, rebel, FB.topRealm(s, liege)) || FB.truceExpiry(s, rebel, liege);
  }
  FB.justiceArrestProjection = function (s, actor, target, offenseId, courtKind) {
    var a = person(s, actor), t = person(s, target);
    var counties = FB.justiceCounties(s, actor), offense = caseFor(s, actor, target, offenseId, courtKind);
    var rid = realmOf(s, target), arid = realmOf(s, actor);
    var targetBaron = target === s.player.charId && FB.station.isBaron(s.player, s);
    var subordinateBaron = targetBaron && !!arid && under(s, s.player.liege, arid);
    var resistance = subordinateBaron || !!rid && !!arid && under(s, rid, arid);
    var truce = resistance ? arrestTruce(s, target, rid) : 0;
    var cooldown = (records(s).cooldowns || {})[actor + ':' + target] || 0;
    var blocker = !FB.justiceRulerEligible(s, actor) ? 'ruler' :
      !procedure(s, actor, 'arrest', courtKind, target, offenseId) ? 'procedure' :
      !t || t.dead || actor === target ? 'target' :
      FB.justiceCustodyOf(s, actor) || actor === s.player.charId && s.player.flags.in_prison ? 'confined' :
      FB.justiceCustodyOf(s, target) || target === s.player.charId && s.player.flags.in_prison ? 'already_held' :
      !FB.political.permission(s, { kind:'character', id:actor }, 'arrest',
        { provinceId:location(s, target) }).allowed ? 'outside' :
      (rid && (!arid || rid === arid || !under(s, rid, arid))) ||
      (targetBaron && !subordinateBaron) || (!arid && t && t.role === 'lord') ? 'authority' :
      truce ? 'truce' :
      cooldown > s.turn ? 'cooldown' :
      offenseId && !offense ? 'case' : null;
    return { ready:!blocker, blocker:blocker, courtKind:courtKind || 'secular', actorId:actor, targetId:target,
      offenseId:offense && offense.id, evidence:offense && offense.evidence,
      justified:!!offense, counties:counties, supportCounties:FB.justiceSupportCounties(s, actor), cooldownUntil:cooldown,
      truceUntil:truce,
      chance:a && t ? FB.clamp(0.60 + 0.02 * (FB.skillOf(a, 'mar') - FB.skillOf(t, 'int')), 0.15, 0.90) : 0,
      attemptSupport:offense ? 0 : -10, captureSupport:offense ? 0 : -10,
      resistance:resistance };
  };
  function news(s, actor, target, action, effects) {
    var a = person(s, actor), t = person(s, target);
    // Existing Chronicle selector keys are a compatibility allowlist, not dispatch.
    var legacy = ['release','pardon','ransom','fine','penance','imprisonment','exile',
      'forfeiture','monastic_exile','blinding_deposition','diya','qisas','execution'];
    if (FBDATA.justiceSentences[action] && legacy.indexOf(action) < 0) {
      FB.news(s, FB.msg('news.justice.sentence', '{ruler}: {sentence} - {target}.', {
        ruler:a ? FB.fullName(a) : '', target:t ? FB.fullName(t) : '',
        sentence:{ $data:'justiceSentence', id:action, path:'name' }
      }), { outcomeImpacts:effects || [] });
      return;
    }
    FB.news(s, FB.msg('news.justice.action', '{ruler}: {action} — {target}.', {
      ruler:a ? FB.fullName(a) : '', target:t ? FB.fullName(t) : '',
      action:FB.messageParam(FB.msg('news.justice.action_name', { forms:{ select:'value', param:'action', cases:{
        arrest:'Taken into custody', arrest_failed:'Arrest resisted', expired:'Released at the end of custody',
        escape:'Escaped custody', release:'Released', pardon:'Pardoned and released', fine:'Fined and released',
        penance:'Sentenced to public penance', imprisonment:'Sentenced to imprisonment', exile:'Exiled',
        forfeiture:'Titles and lands forfeited', monastic_exile:'Sentenced to monastic exile',
        blinding_deposition:'Blinded and deposed', diya:'Blood compensation accepted', qisas:'Executed under qisas',
        execution:'Executed', ransom:'Ransomed and released', other:'Released'
      } } }, { action:action }))
    }), { outcomeImpacts:effects || [] });
  }
  function release(s, row) {
    var list = s.intrigue && s.intrigue.captives || [];
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].captiveId === row.captiveId && list[i].captorId === row.captorId) list.splice(i, 1);
    }
    var j = ensure(s);
    if (j.pending && j.pending.targetId === row.captiveId) j.pending = null;
    if (row.captiveId === s.player.charId) {
      if (s.intrigue) { s.intrigue.legalCustody = null; s.intrigue.hearing = null; }
      delete s.player.flags.in_prison;
      delete s.player.flags.intrigue_captive;
      delete s.player.flags.intrigue_legal_custody;
      delete s.player.captiveWarId;
      delete s.player.captiveTurn;
    }
  }
  FB.justiceReleaseCustody = release;
  FB.justiceInitializeCaptive = function (s, row) {
    if (row.source !== 'judicial') return;
    row.authority = authorityKey(s, row.captorId);
    row.endTurn = s.turn + 90;
    row.offenseId = null; row.unjustPaid = 0;
    row.sentenced = false; row.sentenceIds = [];
  };
  function capture(s, actor, target, offenseId, unjust, courtKind) {
    var row = FB.captureIntrigue(s, actor, target, 'judicial', realmOf(s, actor));
    if (!row) return null;
    row.authority = authorityKey(s, actor);
    row.endTurn = s.turn + 90;
    row.courtKind = courtKind || 'secular';
    row.offenseId = offenseId || null;
    row.unjustPaid = unjust ? 20 : 0;
    row.sentenced = false;
    row.sentenceIds = [];
    return row;
  }
  function resist(s, p) {
    if (!p.resistance) return;
    var rid = realmOf(s, p.targetId), arid = realmOf(s, p.actorId);
    if (p.targetId === s.player.charId) {
      if (FB.fns.attainder_resist) FB.fns.attainder_resist(s);
    } else if (rid && arid) {
      var r = s.realms[rid], territory = FB.realmTerritory(s, rid).slice();
      var top = FB.topRealm(s, rid), formerLiege = r.liege;
      if (FB.ordinaryWarBetween(s, rid, top)) return;
      r.liege = null;
      territory.forEach(function (pid) { s.owner[pid] = rid; });
      FB.invalidateRealmCache();
      if (FB.mergeRealmTech) FB.mergeRealmTech(s, rid, top);
      if (top === 'player') {
        FB.registerOrdinaryWar(s, 'player', { enemy:rid, target:null, wins:0, losses:0,
          seasons:0, defending:true, casus:{ type:'independence', rebel:rid,
            formerLiege:formerLiege, rebelCharId:p.targetId } });
        FB.warFooting(s);
        FB.announcePlayerDefense(s);
      } else if (s.realms[top]) {
        FB.registerOrdinaryWar(s, top, { enemy:rid, years:0, captures:0,
          casus:{ type:'independence', rebel:rid, formerLiege:formerLiege, rebelCharId:p.targetId } });
      }
    }
    FB.justiceRecordOffense(s, p.actorId, p.targetId, 'rebellion', 'redhanded', true,
      p.actorId, 'arrest-resistance:' + p.actorId + ':' + p.targetId + ':' + s.turn);
  }
  function arrestNow(s, p, submit) {
    var j = ensure(s);
    if (!p.ready) return { ok:false, blocker:p.blocker };
    var effects = support(s, p.supportCounties, p.attemptSupport).concat(standingPenalty(s, p.actorId, p.attemptSupport));
    var caught = submit || FB.chance(p.chance);
    if (caught) {
      var row = capture(s, p.actorId, p.targetId, p.offenseId, !p.justified, p.courtKind);
      if (!row) return { ok:false, blocker:'already_held' };
      effects = effects.concat(support(s, p.supportCounties, p.captureSupport), standingPenalty(s, p.actorId, p.captureSupport));
      news(s, p.actorId, p.targetId, 'arrest', effects);
    } else {
      j.cooldowns[p.actorId + ':' + p.targetId] = s.turn + 90;
      resist(s, p);
      news(s, p.actorId, p.targetId, 'arrest_failed', effects);
    }
    return { ok:true, captured:caught, impacts:effects };
  }
  function distributionSentence(s, actor, target, sentence, offenseId, courtKind) {
    if (!FB.platform.isCrazyGames || ['death','corporal'].indexOf(kind(sentence)) < 0) return sentence;
    return sentenceOfKind(s, actor, target, 'custody', offenseId, courtKind) || null;
  }
  function queue(s, actor, target, kind, offenseId, sentence, courtKind) {
    courtKind = courtKind || (held(s, actor, target) || {}).courtKind || 'secular';
    sentence = distributionSentence(s, actor, target, sentence, offenseId, courtKind);
    if (kind === 'sentence' && !sentence) return false;
    var def = FBDATA.justiceSentences[sentence];
    var required = kind === 'arrest' ? 'arrest' : def && def.kind === 'ransom' ? 'ransom' :
      def && def.forgive ? 'pardon' : def && def.kind === 'pardon' ? null : 'hearing';
    if (required && !procedure(s, actor, required, courtKind, target, offenseId)) return false;
    var j = ensure(s);
    if (j.pending) return false;
    j.pending = { id:'justice-response-' + j.nextId++, kind:kind, actorId:actor,
      targetId:target, offenseId:offenseId || null, sentence:sentence || null,
      generation:s.generation, courtKind:courtKind };
    FB.queueEvent(s, kind === 'arrest' ? 'justice_arrest' : 'justice_hearing', {
      justiceId:j.pending.id, studentId:actor, sentence:sentence || null
    });
    return true;
  }
  FB.justiceAttemptArrest = function (s, actor, target, offenseId, courtKind) {
    var p = FB.justiceArrestProjection(s, actor, target, offenseId, courtKind);
    if (!p.ready) return { ok:false, blocker:p.blocker };
    if (target === s.player.charId && actor !== target && !(FB.game && FB.game.observe)) {
      return { ok:queue(s, actor, target, 'arrest', p.offenseId, null, p.courtKind), pending:true };
    }
    return arrestNow(s, p, false);
  };
  // Secular government declarations precede faith. Religious courts use faith only.
  FB.justiceTradition = function (s, actor, courtKind, parties) {
    var c = person(s, actor), rid = realmOf(s, actor);
    if (!c) return { id:null, definition:null, source:null };
    var id = FB.faithValue(s, c.religion, 'legalTradition').value || FBDATA.faithDefaults.legalTradition, source = 'faith';
    if (courtKind !== 'religious') {
      var formId = FB.station.context(c, s).formId;
      var government = FBDATA.governmentForms[formId];
      var declaration = government && government.legalTradition;
      var secular = typeof declaration === 'string' ? declaration : declaration &&
        (declaration.realms && declaration.realms[rid] ||
         declaration.cultures && declaration.cultures[c.culture] || declaration.default);
      if (secular && secular !== 'faith') { id = secular; source = 'government'; }
      var identityRealm = rid || (parties && parties.accusedId &&
        FB.settlementCountyHolder(s, location(s, parties.accusedId)));
      var identity = identityRealm && FB.political.governingIdentity(s, identityRealm);
      if (identity && identity.legalIdentityId) {
        id = identity.legalIdentityId; source = 'elite';
        var law = FBDATA.legalTraditions[id], jurisdiction = law && law.jurisdiction;
        var accused = parties && person(s, parties.accusedId);
        var other = parties && person(s, parties.otherPartyId);
        if (jurisdiction && accused && identity.justicePolicy === 'personal') {
          var first = jurisdiction.cultures[accused.culture];
          var second = other && jurisdiction.cultures[other.culture];
          if (other && first !== second) {
            id = jurisdiction.mixed; source = 'mixed';
          } else if (first) { id = first; source = 'personal'; }
        }
      }
    }
    return { id:id, definition:Object.prototype.hasOwnProperty.call(FBDATA.legalTraditions, id) ?
      FBDATA.legalTraditions[id] : null, source:source,
      assessorId:source === 'mixed' && jurisdiction ? jurisdiction.assessor || null : null };
  };
  FB.validateLegalTraditions = function (tables, sentences, forms) {
    tables = tables || FBDATA.legalTraditions;
    sentences = sentences || FBDATA.justiceSentences;
    forms = forms || FBDATA.governmentForms;
    var errors = [], kinds = ['custody','fine','penance','corporal','exile','death','pardon','ransom','forfeiture'];
    function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
    function fault(path) { errors.push(FB.T('Invalid legal definition {id}.', { id:path })); }
    function integer(n, min, max) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n >= min && n <= max; }
    function reference(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(tables, id); }
    if (!plain(tables) || !plain(sentences) || !plain(forms)) { fault('tables'); return errors; }
    Object.keys(sentences).forEach(function (id) {
      var d = sentences[id];
      if (!/^[a-z][a-z0-9_]*$/.test(id) || !plain(d) || kinds.indexOf(d.kind) < 0 ||
          typeof d.name !== 'string' || !d.name || typeof d.desc !== 'string' ||
          !integer(d.level, 0, 3) || typeof d.penalty !== 'number' || !isFinite(d.penalty) || d.penalty < 0) { fault('sentence.' + id); return; }
      ['termDays','extensionWindow','pietyCost','prestigeCost'].forEach(function (key) {
        if (d[key] !== undefined && !integer(d[key], key === 'termDays' ? 1 : 0, 100000)) fault('sentence.' + id + '.' + key);
      });
      ['closesCase','forgive'].forEach(function (key) {
        if (d[key] !== undefined && typeof d[key] !== 'boolean') fault('sentence.' + id + '.' + key);
      });
      if (d.forgive && d.kind !== 'pardon' || d.careerRole !== undefined &&
          (d.kind !== 'exile' || typeof d.careerRole !== 'string' || !FB.roleCareer(d.careerRole))) fault('sentence.' + id);
    });
    Object.keys(tables).forEach(function (id) {
      var t = tables[id], seen = Object.create(null);
      if (!/^[a-z][a-z0-9_]*$/.test(id) || !plain(t) || typeof t.name !== 'string' || !t.name ||
          !Array.isArray(t.sentences) || !t.sentences.length || !plain(t.procedures) ||
          !plain(t.justification) || !plain(t.ai)) { fault(id); return; }
      t.sentences.forEach(function (sid) {
        if (typeof sid !== 'string' || !Object.prototype.hasOwnProperty.call(sentences, sid) || seen[sid]) fault(id + '.sentences');
        seen[sid] = true;
      });
      ['arrest','hearing','ransom','pardon'].forEach(function (key) {
        if (typeof t.procedures[key] !== 'boolean') fault(id + '.procedures.' + key);
      });
      ['compensationMaxSeverity','penanceMaxSeverity'].forEach(function (key) {
        if (!integer(t.procedures[key], 0, 3)) fault(id + '.procedures.' + key);
      });
      var e = t.justification.evidence;
      if (!Array.isArray(e) || !e.length || e.some(function (value) {
        return ['testimony','material','redhanded'].indexOf(value) < 0;
      })) fault(id + '.justification.evidence');
      var rules = t.justification.sentences;
      if (rules !== undefined && !plain(rules)) fault(id + '.justification.sentences');
      else Object.keys(rules || {}).forEach(function (sid) {
        var rule = rules[sid];
        if (!seen[sid] || !plain(rule)) { fault(id + '.justification.' + sid); return; }
        if (rule.level !== undefined && !integer(rule.level, 0, 3) ||
            rule.successful !== undefined && typeof rule.successful !== 'boolean' ||
            rule.offenseKinds !== undefined && (!Array.isArray(rule.offenseKinds) || !rule.offenseKinds.length ||
              rule.offenseKinds.some(function (value) {
                return ['assassination','abduction','fabricated_charge','sabotage','blackmail','rebellion'].indexOf(value) < 0;
              }))) fault(id + '.justification.' + sid);
      });
      ['minor','serious','severe','arbitrary','excessive'].forEach(function (band) {
        if (!Array.isArray(t.ai[band]) || t.ai[band].some(function (sid) { return !seen[sid]; })) fault(id + '.ai.' + band);
      });
      if (t.jurisdiction !== undefined) {
        var j = t.jurisdiction;
        if (!plain(j) || !plain(j.cultures) || !reference(j.mixed) ||
            j.assessor !== undefined && !reference(j.assessor)) fault(id + '.jurisdiction');
        else Object.keys(j.cultures).forEach(function (culture) {
          if (!Object.prototype.hasOwnProperty.call(FBDATA.cultures, culture) ||
              !reference(j.cultures[culture])) fault(id + '.jurisdiction.' + culture);
        });
      }
    });
    Object.keys(forms).forEach(function (id) {
      var declaration = forms[id] && forms[id].legalTradition;
      if (declaration === undefined) return; // Older forms intentionally inherit faith.
      if (typeof declaration === 'string') { if (declaration !== 'faith' && !reference(declaration)) fault('government.' + id); return; }
      if (!plain(declaration) || declaration.default !== 'faith' && !reference(declaration.default)) { fault('government.' + id); return; }
      ['cultures','realms'].forEach(function (key) {
        var values = declaration[key];
        if (values === undefined) return;
        if (!plain(values)) { fault('government.' + id + '.' + key); return; }
        Object.keys(values).forEach(function (value) { if (!reference(values[value])) fault('government.' + id + '.' + key + '.' + value); });
      });
    });
    return errors;
  };
  function courtParties(s, actor, target, offenseId, courtKind) {
    var best = caseFor(s, actor, target, offenseId, courtKind);
    return { accusedId:target, otherPartyId:best && best.victimId };
  }
  function tradition(s, actor, courtKind, target, offenseId) {
    return FB.justiceTradition(s, actor, courtKind, courtParties(s, actor, target, offenseId, courtKind)).definition;
  }
  function kind(id) { return FBDATA.justiceSentences[id] && FBDATA.justiceSentences[id].kind; }
  function sentenceAllowed(t, id, offense) {
    if (!t || t.sentences.indexOf(id) < 0) return false;
    var rule = t.justification && t.justification.sentences && t.justification.sentences[id];
    return !rule || !rule.offenseKinds && rule.successful === undefined ||
      !!(offense && (!rule.offenseKinds || rule.offenseKinds.indexOf(offense.kind) >= 0) &&
      (rule.successful === undefined || rule.successful === offense.successful));
  }
  function procedure(s, actor, name, courtKind, target, offenseId) {
    var t = tradition(s, actor, courtKind, target, offenseId);
    return !!(t && t.procedures && t.procedures[name]);
  }
  function sentenceOfKind(s, actor, target, wanted, offenseId, courtKind) {
    var t = tradition(s, actor, courtKind, target, offenseId);
    var ids = t && t.sentences || [];
    for (var i = 0; i < ids.length; i++) if (kind(ids[i]) === wanted &&
        FB.justicePunishmentProjection(s, actor, target, ids[i], offenseId, courtKind).ready) return ids[i];
    return null;
  }
  function exileDestination(s, counties, origin) {
    var queue = origin ? [origin] : counties.slice(), seen = {};
    for (var i = 0; i < queue.length; i++) {
      var pid = queue[i];
      if (seen[pid]) continue;
      seen[pid] = true;
      if (counties.indexOf(pid) < 0 && s.owner[pid] && !FB.world.byId[pid].wasteland) return pid;
      Object.keys(FB.world.adj[pid] || {}).sort().forEach(function (next) {
        if (!seen[next]) queue.push(next);
      });
    }
    return null;
  }
  FB.justicePunishmentProjection = function (s, actor, target, sentence, offenseId, courtKind) {
    courtKind = courtKind || (held(s, actor, target) || {}).courtKind || 'secular';
    sentence = distributionSentence(s, actor, target, sentence, offenseId, courtKind);
    var def = FBDATA.justiceSentences[sentence], row = held(s, actor, target);
    var offense = caseFor(s, actor, target, offenseId, courtKind), counties = FB.justiceCounties(s, actor);
    var legal = FB.justiceTradition(s, actor, courtKind, courtParties(s, actor, target, offenseId, courtKind)), t = legal.definition, sentenceKind = def && def.kind;
    var rule = t && t.justification && t.justification.sentences && t.justification.sentences[sentence];
    var level = rule && rule.level !== undefined ? rule.level : def && def.level;
    var justified = !!(def && (level === 0 || offense && offense.severity >= level));
    var rid = realmOf(s, target), arid = realmOf(s, actor);
    var localTitle = !!rid && !!arid && rid !== arid && under(s, rid, arid);
    if (target === s.player.charId && FB.station.isBaron(s.player, s)) {
      localTitle = !!arid && under(s, s.player.liege, arid) &&
        counties.indexOf(s.player.provinceId) >= 0 && actor !== target;
    }
    var regional = def && sentenceAllowed(t, sentence, offense);
    var needs = sentenceKind === 'ransom' ? 'ransom' : def && def.forgive ? 'pardon' :
      sentenceKind !== 'pardon' ? 'hearing' : null;
    var destination = sentenceKind === 'exile' ? exileDestination(s, counties, location(s, target)) : null;
    var pending = records(s).pending;
    var blocker = !def ? 'sentence' : !FB.justiceRulerEligible(s, actor) ? 'ruler' :
      !live(s, target) || actor === target ? 'target' :
      FB.justiceCustodyOf(s, actor) || actor === s.player.charId && s.player.flags.in_prison ? 'confined' :
      !row ? 'custody' : !regional ? 'regional' :
      needs && !procedure(s, actor, needs, courtKind, target, offenseId) ? 'procedure' :
      offenseId && !offense ? 'case' :
      sentenceKind === 'forfeiture' && !localTitle ? 'title' :
      sentenceKind === 'exile' && !destination ? 'destination' :
      row.sentenceIds && row.sentenceIds.indexOf(sentence) >= 0 && sentenceKind !== 'custody' ? 'already_sentenced' :
      sentenceKind === 'custody' && row.sentenced && row.endTurn > s.turn + num(def.extensionWindow, 90) ? 'term' : null;
    var station = target === s.player.charId ? FB.playerStation(s) :
      FB.clamp(live(s, target) ? FB.stationOf(person(s, target)) : 0, 0, 4);
    var fine = Math.max(5, Math.round(((offense ? offense.severity : 1) + 3) * [5,8,12,20,30][station]));
    if (sentenceKind === 'ransom') fine = row && row.demand ? row.demand.amount :
      (FBDATA.intrigue.captiveRansoms[station] || 30);
    var amount = def && ['fine','ransom'].indexOf(sentenceKind) >= 0 ? Math.min(fine, live(s, target) ? available(s, target) : 0) : 0;
    var loss = def && !justified ? -def.penalty : 0;
    if (sentenceKind === 'custody' && row && !row.sentenced) loss = Math.min(0, loss + num(row.unjustPaid, 0));
    return { ready:!blocker, blocker:blocker, actorId:actor, targetId:target, sentence:sentence,
      custody:row, offenseId:offense && offense.id, evidence:offense && offense.evidence,
      justified:justified, level:level, form:legal.id, traditionId:legal.id, courtKind:courtKind, amount:amount, fine:fine, counties:counties,
      courtSource:legal.source, assessorId:legal.assessorId,
      supportCounties:FB.justiceSupportCounties(s, actor),
      support:loss, destination:destination, titleRealmId:localTitle ? rid : null,
      endTurn:sentenceKind === 'custody' && row ? Math.max(s.turn, row.captureTurn + num(def.termDays, 360),
        row.sentenced ? row.endTurn + num(def.termDays, 360) : 0) : null,
      pending:!!(pending && pending.targetId === target) };
  };
  FB.justiceSentenceOptions = function (s, actor, target, courtKind) {
    courtKind = courtKind || (held(s, actor, target) || {}).courtKind || 'secular';
    var t = tradition(s, actor, courtKind, target);
    return (t && t.sentences || []).filter(function (id) {
      return !FB.platform.isCrazyGames || ['death','corporal'].indexOf(kind(id)) < 0;
    }).map(function (id) {
      return FB.justicePunishmentProjection(s, actor, target, id, null, courtKind);
    }).filter(function (p) { return p.blocker !== 'regional'; });
  };
  function removeOffices(s, id) {
    var c = person(s, id);
    if (FB.removeRetainer && FB.retainerRecord(s, id)) FB.removeRetainer(s, id, 'dismissed');
    if (FB.unassignEnterpriseWorker) FB.unassignEnterpriseWorker(s, id);
    if (FB.socialAttentionWithdraw) FB.socialAttentionWithdraw(s, id, true);
    if (s.council && s.council.seats) Object.keys(s.council.seats).forEach(function (key) {
      var seat = s.council.seats[key];
      if (seat === id || seat === realmOf(s, id) || seat && seat.characterId === id) s.council.seats[key] = null;
    });
    if (c) {
      delete c.office;
      if (c.role === 'lord') delete c.role;
      Object.keys(s.roles || {}).forEach(function (role) {
        if (s.roles[role] === id) delete s.roles[role];
      });
    }
  }
  function forfeit(s, p) {
    if (p.targetId === s.player.charId) { FB.loseAllLand(s, {}); return; }
    var rid = p.titleRealmId, receiver = realmOf(s, p.actorId);
    if (!rid || !receiver) return;
    removeOffices(s, p.targetId);
    FB.escheatRealm(s, rid, { silent:true, recipientId:receiver });
  }
  function exile(s, p) {
    removeOffices(s, p.targetId);
    if (p.titleRealmId || p.targetId === s.player.charId && FB.station.isBaron(s.player, s)) forfeit(s, p);
    var c = person(s, p.targetId);
    if (p.targetId === s.player.charId) {
      s.player.travel = null;
      s.player.provinceId = p.destination;
      ['lord','steward','priest','friend','notable'].forEach(function (role) { delete s.roles[role]; });
      if (FB.localCouncilValidate) FB.localCouncilValidate(s, false);
      FB.changePlayerLiege(s, null, 'justice:exile');
      if (FB.localFolkArrive) FB.localFolkArrive(s, p.destination);
      if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(s);
      if (FB.map) { FB.map.playerProv = p.destination; FB.map.request(); }
    } else {
      if (s.provChars) Object.keys(s.provChars).forEach(function (pid) {
        s.provChars[pid] = s.provChars[pid].filter(function (id) { return id !== c.id; });
      });
      c.homeProvinceId = p.destination;
      if (s.provChars) {
        if (!s.provChars[p.destination]) s.provChars[p.destination] = [];
        s.provChars[p.destination].push(c.id);
      }
    }
    ensure(s).exiles[c.id] = { counties:p.counties.slice(), destination:p.destination, endTurn:s.turn + 1800 };
    if (FB.noteLifeEvent) FB.noteLifeEvent(s, c.id, 'exile', {});
    var careerRole = FBDATA.justiceSentences[p.sentence].careerRole;
    if (careerRole) {
      c.career = { profession:FB.roleCareer(careerRole) };
      if (c.id === s.player.charId) s.player.profession = c.career.profession;
    }
    if (FB.invalidateSocialVisit) FB.invalidateSocialVisit(s, c.id);
  }
  FB.justiceApplyPunishment = function (s, actor, target, sentence, offenseId, responseId, courtKind) {
    courtKind = courtKind || (held(s, actor, target) || {}).courtKind || 'secular';
    sentence = distributionSentence(s, actor, target, sentence, offenseId, courtKind);
    var p = FB.justicePunishmentProjection(s, actor, target, sentence, offenseId, courtKind);
    if (!p.ready) return { ok:false, blocker:p.blocker };
    var j = ensure(s), pending = j.pending;
    if (target === s.player.charId && !(FB.game && FB.game.observe) &&
        (!pending || pending.id !== responseId || pending.kind !== 'sentence' ||
          pending.actorId !== actor || pending.sentence !== sentence)) {
      return { ok:queue(s, actor, target, 'sentence', p.offenseId, sentence, courtKind), pending:true };
    }
    var def = FBDATA.justiceSentences[sentence], row = p.custody;
    var pietyBefore = target === s.player.charId ? num(s.player.piety, 0) : 0;
    var prestigeBefore = target === s.player.charId ? num(s.player.prestige, 0) : 0;
    if (['fine','ransom'].indexOf(def.kind) >= 0 && !transfer(s, target, actor, p.amount)) return { ok:false, blocker:'funds' };
    j.pending = null;
    var effects = support(s, p.supportCounties, p.support).concat(standingPenalty(s, actor, p.support));
    effects.push({ type:'system', system:'justice', action:sentence,
      days:p.endTurn ? p.endTurn - s.turn : null, lethal:def.kind === 'death',
      permanent:['death','corporal','forfeiture'].indexOf(def.kind) >= 0 });
    if (target === s.player.charId && p.amount) effects.push({ type:'gold', amount:-p.amount });
    if (actor === s.player.charId && p.amount) effects.push({ type:'gold', amount:p.amount });
    var offense = caseFor(s, actor, target, p.offenseId, courtKind);
    if (offense && def.closesCase !== false) { offense.closed = true; offense.sentence = sentence; }
    if (def.forgive) (j.offenses || []).forEach(function (o) {
      if (o.accusedId === target && authorityMatches(s, actor, o.authority)) o.closed = true;
    });
    // Claim the sentence before death/succession and any callbacks can re-enter.
    if (!row.sentenceIds) row.sentenceIds = [];
    row.sentenceIds.push(sentence);
    if (target === s.player.charId && def.kind === 'penance') {
      effects.push({ type:'piety', amount:-Math.min(pietyBefore, num(def.pietyCost, 40)) },
        { type:'prestige', amount:-Math.min(prestigeBefore, num(def.prestigeCost, 20)) });
    }
    if (offense && p.justified && def.closesCase !== false && courtKind === 'secular' &&
        FB.authorityJudgment) {
      var judicialRealm = realmOf(s, actor);
      FB.authorityJudgment(s, judicialRealm ? { kind:'realm', id:judicialRealm } :
        { kind:'character', id:actor }, location(s, target), offense.id);
    }
    j.last = { actorId:actor, targetId:target, sentence:sentence, justified:p.justified,
      amount:p.amount, turn:s.turn, impacts:effects };
    news(s, actor, target, sentence, effects);
    FB.noteConduct(s, actor, { cruelty:!p.justified && p.level >= 2 ? 1 : 0, public:true });
    if (def.kind === 'death') {
      release(s, row);
      if (target === s.player.charId) FB.game.die(FB.msg('legend.death.justice',
        'Executed while held prisoner by a ruler.', {}), { kind:'sentence', eventId:'justice_hearing' });
      else FB.killChar(s, person(s, target));
    } else if (def.kind === 'custody') {
      // Convert identified war or private custody without leaving a second release authority.
      if ((s.intrigue.captives || []).indexOf(row) < 0) s.intrigue.captives.push(row);
      row.courtKind = courtKind;
      row.source = 'judicial'; row.authority = authorityKey(s, actor);
      row.captorGeneration = actor === s.player.charId ? s.generation : FB.realmRulerGeneration(s, realmOf(s, actor));
      row.endTurn = p.endTurn; row.sentenced = true; row.offenseId = null; row.unjustPaid = 0;
      if (target === s.player.charId) {
        s.intrigue.legalCustody = null;
        delete s.player.captiveWarId;
        s.player.flags.intrigue_captive = 1;
      }
      if (row.endTurn <= s.turn) release(s, row);
    } else {
      if (def.kind === 'forfeiture') forfeit(s, p);
      if (def.kind === 'corporal') {
        FB.addTrait(person(s, target), 'one_eyed');
        FB.addTrait(person(s, target), 'maimed');
        var deposedRealm = realmOf(s, target);
        if (deposedRealm === 'player' && FB.governmentSelection && FB.governmentSelection.profile(s, deposedRealm)) {
          var removal = FB.governmentSelection.quote(s, deposedRealm, { action:'open', cause:'lawful_removal', actor:{ kind:'realm', id:deposedRealm } });
          if (removal.allowed) FB.governmentSelection.apply(s, removal);
        } else if (target === s.player.charId && FB.station.isLanded(s.player, s)) FB.loseAllLand(s, {});
        else if (deposedRealm) FB.advanceRealmSuccession(s, deposedRealm, { cause:'lawful_removal' });
      }
      if (def.kind === 'exile') exile(s, p);
      if (def.kind === 'penance') {
        var wallet = target === s.player.charId ? s.player : person(s, target);
        wallet.piety = Math.max(0, num(wallet.piety, 0) - num(def.pietyCost, 40));
        wallet.prestige = Math.max(0, num(wallet.prestige, 0) - num(def.prestigeCost, 20));
      }
      release(s, row);
    }
    return { ok:true, impacts:effects, sentence:sentence };
  };
  FB.justiceExileBlocks = function (s, id, pid) {
    var row = (records(s).exiles || {})[id];
    return !!(row && row.endTurn > s.turn && row.counties.indexOf(pid) >= 0);
  };
  FB.justiceRepairCaptive = function (s, row) {
    if (row.source === 'legal') {
      row.source = 'judicial';
      row.authority = row.captorRealmId || authorityKey(s, row.captorId);
      row.endTurn = num(row.captureTurn, s.turn) + 360;
      row.sentenced = true; row.sentenceIds = Object.keys(FBDATA.justiceSentences).filter(function (id) { return kind(id) === 'custody'; }).slice(0, 1);
    }
    if (row.source !== 'judicial') return row;
    row.courtKind = row.courtKind === 'religious' ? 'religious' : 'secular';
    if (row.captorId === s.player.charId && s.player.dead &&
        (row.authority === 'player' || row.authority === 'barony:' + s.player.provinceId)) return row;
    var key = row.authority || row.captorRealmId;
    if (typeof key !== 'string') return null;
    if (key === 'player' && !(s.realms.player && s.realms.player.alive)) return null;
    var successor = key && key.indexOf('barony:') === 0 ?
      (FB.station.mayAdministerJustice(s.player, s) && key === 'barony:' + s.player.provinceId ? person(s, s.player.charId) : null) :
      key && key.indexOf('character:') === 0 ? person(s, key.slice(10)) : key && ruler(s, key);
    if (!successor || successor.dead || !FB.justiceRulerEligible(s, successor.id)) return null;
    row.captorId = successor.id;
    row.captorRealmId = realmOf(s, successor.id);
    row.captorGeneration = successor.id === s.player.charId ? s.generation :
      row.captorRealmId ? FB.realmRulerGeneration(s, row.captorRealmId) : 1;
    return row;
  };
  FB.justiceDay = function (s) {
    if (!s.justice && !(s.intrigue && (s.intrigue.captives || []).some(function (r) { return r.source === 'judicial'; }))) return;
    var j = ensure(s), list = s.intrigue && s.intrigue.captives || [];
    list.slice().forEach(function (row) {
      if (row.source !== 'judicial') return;
      if (!FB.justiceRepairCaptive(s, row) || !live(s, row.captiveId) || row.endTurn <= s.turn) {
        release(s, row);
        if (live(s, row.captiveId)) news(s, row.captorId, row.captiveId, 'expired');
      }
    });
    Object.keys(j.cooldowns).forEach(function (id) { if (j.cooldowns[id] <= s.turn) delete j.cooldowns[id]; });
    Object.keys(j.arbitrary).forEach(function (id) { if (!live(s, id) || j.arbitrary[id] <= s.turn) delete j.arbitrary[id]; });
    Object.keys(j.exiles).forEach(function (id) { if (!live(s, id) || j.exiles[id].endTurn <= s.turn) delete j.exiles[id]; });
    j.offenses = j.offenses.filter(function (o) {
      return live(s, o.accusedId) && (!o.closed || o.turn + 1440 > s.turn);
    });
    if (j.pending && (!FB.justiceRulerEligible(s, j.pending.actorId) || !live(s, j.pending.targetId) ||
        j.pending.generation !== s.generation || j.pending.kind === 'sentence' &&
        !FB.justicePunishmentProjection(s, j.pending.actorId, j.pending.targetId, j.pending.sentence,
          j.pending.offenseId, j.pending.courtKind).ready)) j.pending = null;
  };
  FB.ensureJustice = function (s) {
    if (s.intrigue && s.intrigue.hearing) FB.justiceImportHearing(s, s.intrigue.hearing);
    if (!s.justice) return;
    var j = ensure(s), seen = {};
    j.offenses = j.offenses.filter(function (o) {
      if (!o || typeof o.id !== 'string' || seen[o.id] || !live(s, o.accusedId) ||
          typeof o.authority !== 'string' || !o.authority ||
          ['testimony','material','redhanded'].indexOf(o.evidence) < 0 ||
          ['assassination','abduction','fabricated_charge','sabotage','blackmail','rebellion'].indexOf(o.kind) < 0) return false;
      seen[o.id] = true;
      o.severity = o.kind === 'assassination' || o.kind === 'rebellion' ? 3 :
        o.kind === 'abduction' || o.kind === 'fabricated_charge' ? 2 : 1;
      o.turn = Math.max(0, num(o.turn, s.turn)); o.closed = !!o.closed;
      return true;
    });
    Object.keys(j.exiles).forEach(function (id) {
      var e = j.exiles[id];
      if (!e || !Array.isArray(e.counties) || !FB.world.byId[e.destination] ||
          !isFinite(e.endTurn)) delete j.exiles[id];
    });
    if (j.pending && (typeof j.pending.id !== 'string' ||
        ['arrest','sentence'].indexOf(j.pending.kind) < 0 ||
        j.pending.kind === 'sentence' && !FBDATA.justiceSentences[j.pending.sentence])) j.pending = null;
    FB.justiceDay(s);
  };
  FB.justiceImportHearing = function (s, hearing) {
    s.intrigue.hearing = null;
    var o = FB.justiceExposeScheme(s, { id:hearing.plotId, actorId:hearing.accusedId,
      context:hearing.context || {}, recordId:hearing.id, repair:true }, hearing.evidence, hearing.successful);
    var row = FB.justiceCustodyOf(s, hearing.accusedId);
    if (!row || !FB.justiceRulerEligible(s, row.captorId) || !o ||
        !authorityMatches(s, row.captorId, o.authority)) return;
    // Repair is deterministic: retain the severity, without making an AI cruelty roll.
    var sentence = preferredSentence(s, row.captorId, hearing.accusedId, o);
    if (sentence) queue(s, row.captorId, hearing.accusedId, 'sentence', o.id, sentence);
  };
  function preferredSentence(s, actor, target, offense, excessive) {
    var courtKind = (held(s, actor, target) || {}).courtKind;
    var t = tradition(s, actor, courtKind, target, offense && offense.id);
    if (!t) return null;
    var band = excessive ? 'excessive' : !offense ? 'arbitrary' :
      offense.severity >= 3 ? 'severe' : offense.severity === 2 ? 'serious' : 'minor';
    var ids = (t.ai && t.ai[band] || []).concat(t.sentences);
    for (var i = 0; i < ids.length; i++) {
      // Unsafe choices are replaced by this court's custody sentence in restricted distributions.
      var id = distributionSentence(s, actor, target, ids[i], offense && offense.id, courtKind);
      if (id && FB.justicePunishmentProjection(s, actor, target, id, offense && offense.id, courtKind).ready) return id;
    }
    return null;
  }
  function aiSentence(s, actor, target, offense) {
    var c = person(s, actor), j = ensure(s), excessive = false;
    if (offense && offense.severity < 3 && cruel(c) &&
        !(j.arbitrary[actor] > s.turn) && FB.chance(0.20)) {
      excessive = true; j.arbitrary[actor] = s.turn + 1440;
    }
    return preferredSentence(s, actor, target, offense, excessive);
  }
  FB.justiceSeason = function (s) {
    FB.justiceDay(s);
    var j = ensure(s), stamp = Math.floor(s.turn / 90);
    if (j.lastSeason === stamp) return;
    j.lastSeason = stamp;
    var used = 0, playerFacing = false;
    var prisoners = (s.intrigue && s.intrigue.captives || []).slice().sort(function (a, b) {
      return a.captiveId.localeCompare(b.captiveId);
    });
    prisoners.forEach(function (row) {
      if (used >= 2 || row.captorId === s.player.charId || row.sentenced ||
          row.source !== 'judicial' || j.pending && j.pending.targetId === row.captiveId ||
          row.captiveId === s.player.charId && playerFacing) return;
      var offense = caseFor(s, row.captorId, row.captiveId);
      var result = FB.justiceApplyPunishment(s, row.captorId, row.captiveId,
        aiSentence(s, row.captorId, row.captiveId, offense), offense && offense.id);
      if (result.ok) { used++; if (row.captiveId === s.player.charId) playerFacing = true; }
    });
    j.offenses.slice().sort(function (a, b) { return a.id.localeCompare(b.id); }).forEach(function (o) {
      if (used >= 1 || o.closed) return;
      var a = o.authority.indexOf('barony:') === 0 ? person(s, s.player.charId) :
        o.authority.indexOf('character:') === 0 ? person(s, o.actorId) : ruler(s, o.authority);
      if (!a || a.id === s.player.charId || o.accusedId === s.player.charId && (playerFacing || j.pending)) return;
      var result = FB.justiceAttemptArrest(s, a.id, o.accusedId, o.id);
      if (result.ok) {
        used++;
        if (o.accusedId === s.player.charId) playerFacing = true;
        else if (result.captured) {
          FB.justiceApplyPunishment(s, a.id, o.accusedId, aiSentence(s, a.id, o.accusedId, o), o.id);
          used++;
        }
      }
    });
    if (used >= 2) return;
    Object.keys(s.chars).sort().some(function (id) {
      if (used >= 1) return true;
      var c = person(s, id);
      if (id === s.player.charId || !FB.justiceRulerEligible(s, id) || !cruel(c) ||
          j.arbitrary[id] > s.turn || !FB.chance(0.10)) return false;
      var target = c.rivalId || (s.roles.rival === id ? s.player.charId : null);
      if (!target || target === s.player.charId && (playerFacing || j.pending)) return false;
      var result = FB.justiceAttemptArrest(s, id, target);
      if (result.ok) {
        used++; j.arbitrary[id] = s.turn + 1440;
        if (target === s.player.charId) playerFacing = true;
        else if (result.captured) { FB.justiceApplyPunishment(s, id, target, aiSentence(s, id, target, null)); used++; }
      }
      return false;
    });
  };
  function pendingFor(s, ctx) {
    var p = records(s).pending;
    return p && ctx && p.id === ctx.justiceId && p.generation === s.generation &&
      p.targetId === s.player.charId && FB.justiceRulerEligible(s, p.actorId) &&
      (p.kind === 'arrest' ? FB.justiceArrestProjection(s, p.actorId, p.targetId, p.offenseId, p.courtKind).ready :
        FB.justicePunishmentProjection(s, p.actorId, p.targetId, p.sentence, p.offenseId, p.courtKind).ready) ? p : null;
  }
  // Display parameters stay live across queued hearings and restored saves.
  FB.justiceHearingParams = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || p.kind !== 'sentence') return {};
    var quote = FB.justicePunishmentProjection(s, p.actorId, p.targetId, p.sentence, p.offenseId, p.courtKind);
    var def = FBDATA.justiceSentences[quote.sentence];
    return {
      sentenceKind:def.kind,
      sentenceName:{ $data:'justiceSentence', id:quote.sentence, path:'name' },
      sentenceTermDays:num(def.termDays, 360),
      sentenceRemainingDays:quote.endTurn === null ? 0 : Math.max(0, quote.endTurn - s.turn),
      sentenceCustodyMode:quote.custody.sentenced ? 'extension' : 'initial',
      sentenceAmount:quote.amount,
      sentencePietyCost:num(def.pietyCost, 40),
      sentencePrestigeCost:num(def.prestigeCost, 20)
    };
  };
  FB.fns.justice_response_valid = function (s, ctx) { return !!pendingFor(s, ctx); };
  FB.fns.justice_submit = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p) return false;
    if (p.kind === 'sentence') return FB.justiceApplyPunishment(s, p.actorId, p.targetId,
      p.sentence, p.offenseId, p.id, p.courtKind).ok;
    ensure(s).pending = null;
    var result = arrestNow(s, FB.justiceArrestProjection(s, p.actorId, p.targetId, p.offenseId, p.courtKind), true);
    if (result.captured) queue(s, p.actorId, p.targetId, 'sentence', p.offenseId,
      aiSentence(s, p.actorId, p.targetId, caseFor(s, p.actorId, p.targetId, p.offenseId)));
    ctx.justiceImpacts = result.impacts || [];
    return result.ok;
  };
  FB.fns.justice_resist = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || p.kind !== 'arrest') return false;
    ensure(s).pending = null;
    var result = arrestNow(s, FB.justiceArrestProjection(s, p.actorId, p.targetId, p.offenseId, p.courtKind), false);
    if (result.captured) queue(s, p.actorId, p.targetId, 'sentence', p.offenseId,
      aiSentence(s, p.actorId, p.targetId, caseFor(s, p.actorId, p.targetId, p.offenseId)));
    ctx.justiceImpacts = result.impacts || [];
    return result.ok;
  };
  function responseSentence(s, p, wanted) {
    return p && sentenceOfKind(s, p.actorId, p.targetId, wanted, p.offenseId, p.courtKind);
  }
  FB.fns.justice_can_pay = function (s, ctx) {
    var p = pendingFor(s, ctx), o = p && caseFor(s, p.actorId, p.targetId, p.offenseId, p.courtKind);
    var t = p && tradition(s, p.actorId, p.courtKind, p.targetId, p.offenseId), id = responseSentence(s, p, 'fine');
    if (!p || p.kind !== 'sentence' || !id || o && o.severity > t.procedures.compensationMaxSeverity) return false;
    var quote = FB.justicePunishmentProjection(s, p.actorId, p.targetId, id, p.offenseId, p.courtKind);
    return quote.ready && available(s, p.targetId) >= quote.fine;
  };
  FB.fns.justice_pay = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || !FB.fns.justice_can_pay(s, ctx)) return false;
    p.sentence = responseSentence(s, p, 'fine');
    return FB.justiceApplyPunishment(s, p.actorId, p.targetId, p.sentence, p.offenseId, p.id, p.courtKind).ok;
  };
  FB.fns.justice_plead = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || p.kind !== 'sentence') return false;
    var o = caseFor(s, p.actorId, p.targetId, p.offenseId);
    var strength = o ? ['suspicion','testimony','material','redhanded'].indexOf(o.evidence) : 0;
    var chance = FB.clamp(0.45 + FB.skillOf(person(s, p.targetId), 'dip') * 0.02 - strength * 0.10, 0.05, 0.80);
    var mercy = responseSentence(s, p, 'pardon');
    if (FB.chance(chance) && mercy) {
      var t = tradition(s, p.actorId, p.courtKind, p.targetId, p.offenseId);
      mercy = t.sentences.filter(function (id) { return FBDATA.justiceSentences[id].forgive &&
        FB.justicePunishmentProjection(s, p.actorId, p.targetId, id, p.offenseId, p.courtKind).ready; })[0];
      if (mercy) p.sentence = mercy;
    }
    return FB.justiceApplyPunishment(s, p.actorId, p.targetId, p.sentence, p.offenseId, p.id, p.courtKind).ok;
  };
  FB.fns.justice_challenge = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || p.kind !== 'sentence') return false;
    var offense = caseFor(s, p.actorId, p.targetId, p.offenseId);
    var evidence = offense ? ['suspicion','testimony','material','redhanded'].indexOf(offense.evidence) : 0;
    var chance = FB.clamp(0.45 + FB.skillOf(person(s, p.targetId), 'int') * 0.025 - evidence * 0.15, 0.05, 0.80);
    var mercy = responseSentence(s, p, 'pardon');
    if (FB.chance(chance) && mercy) {
      var t = tradition(s, p.actorId, p.courtKind, p.targetId, p.offenseId);
      mercy = t.sentences.filter(function (id) { return FBDATA.justiceSentences[id].forgive &&
        FB.justicePunishmentProjection(s, p.actorId, p.targetId, id, p.offenseId, p.courtKind).ready; })[0];
      if (mercy) p.sentence = mercy;
    }
    return FB.justiceApplyPunishment(s, p.actorId, p.targetId, p.sentence, p.offenseId, p.id, p.courtKind).ok;
  };
  FB.fns.justice_can_penance = function (s, ctx) {
    var p = pendingFor(s, ctx), o = p && caseFor(s, p.actorId, p.targetId, p.offenseId, p.courtKind);
    var t = p && tradition(s, p.actorId, p.courtKind, p.targetId, p.offenseId), id = responseSentence(s, p, 'penance');
    return !!(p && p.kind === 'sentence' && o && id && o.severity <= t.procedures.penanceMaxSeverity &&
      s.player.piety >= num(FBDATA.justiceSentences[id].pietyCost, 40));
  };
  FB.fns.justice_penance = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || !FB.fns.justice_can_penance(s, ctx)) return false;
    p.sentence = responseSentence(s, p, 'penance');
    return FB.justiceApplyPunishment(s, p.actorId, p.targetId, p.sentence, p.offenseId, p.id, p.courtKind).ok;
  };

  function responseImpacts(s, ctx, action) {
    var p = pendingFor(s, ctx);
    if (!p) return [];
    if (p.kind === 'arrest') {
      var a = FB.justiceArrestProjection(s, p.actorId, p.targetId, p.offenseId, p.courtKind);
      return [{ type:'system', system:'justice', action:action === 'justice_resist' ? 'resist' : 'custody',
        chance:action === 'justice_resist' ? a.chance : 1, days:90 }];
    }
    var sentence = action === 'justice_pay' ? responseSentence(s, p, 'fine') :
      action === 'justice_penance' ? responseSentence(s, p, 'penance') : p.sentence;
    var quote = FB.justicePunishmentProjection(s, p.actorId, p.targetId, sentence, p.offenseId, p.courtKind);
    var d = FBDATA.justiceSentences[sentence];
    if (!d) return [];
    var out = [{ type:'system', system:'justice', action:sentence, days:quote.endTurn ? quote.endTurn - s.turn : null,
      lethal:d.kind === 'death', permanent:['death','corporal','forfeiture'].indexOf(d.kind) >= 0,
      variable:action === 'justice_plead' || action === 'justice_challenge' }];
    if (['fine','ransom'].indexOf(d.kind) >= 0) out.push({ type:'gold', amount:-quote.amount });
    if (d.kind === 'penance') out.push({ type:'piety', amount:-num(d.pietyCost, 40) },
      { type:'prestige', amount:-num(d.prestigeCost, 20) });
    return out;
  }
  ['justice_submit','justice_resist','justice_pay','justice_plead','justice_challenge','justice_penance'].forEach(function (action) {
    FB.eventImpactAdapters[action] = {
      preview:function (s, ctx) { return responseImpacts(s, ctx, action); },
      capture:function (s, ctx) { return { pending:records(s).pending && records(s).pending.id,
        last:records(s).last }; },
      report:function (s, before, ctx) {
        var last = records(s).last;
        if (last && before && last !== before.last && last.targetId === s.player.charId) {
          return last.impacts || [];
        }
        return ctx.justiceImpacts || [];
      }
    };
  });
})();
