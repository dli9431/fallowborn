/* Ruler justice. Evidence grants a cause; only physical custody grants the
   power to sentence. All projections are read-only and all actors share them. */
(function () {
  'use strict';
  function num(n, fallback) { return typeof n === 'number' && isFinite(n) ? n : fallback; }
  function person(s, id) { return s.chars && s.chars[id]; }
  function live(s, id) { var c = person(s, id); return !!(c && !c.dead); }
  function cruel(c) { return !!(c && c.traits && c.traits.indexOf('cruel') >= 0); }
  function realmOf(s, id) {
    return id === s.player.charId ? (s.player.tier >= 4 ? 'player' : null) :
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
    return realmOf(s, id) || (id === s.player.charId ? 'barony:' + s.player.provinceId : 'character:' + id);
  }
  function authorityMatches(s, actor, key) {
    return key === authorityKey(s, actor) || actor === s.player.charId && s.player.tier >= 3 &&
      key === 'barony:' + s.player.provinceId;
  }
  FB.justiceRulerEligible = function (s, id) {
    if (!s || !s.player || !live(s, id)) return false;
    if (id === s.player.charId) return s.player.tier >= 3 &&
      !!(FB.governanceEligible && FB.governanceEligible(s));
    var rid = realmOf(s, id), r = rid && s.realms[rid];
    return !!(r && r.alive && r.rank >= 1) || person(s, id).role === 'lord';
  };
  FB.justiceCounties = function (s, id) {
    if (!FB.justiceRulerEligible(s, id)) return [];
    var rid = realmOf(s, id);
    if (rid) return FB.realmTerritory(s, rid).slice().sort();
    var pid = id === s.player.charId ? s.player.provinceId : location(s, id);
    return pid ? [pid] : [];
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
  function caseFor(s, actor, target, id) {
    var list = records(s).offenses || [], best = null;
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (row.accusedId !== target || row.closed || !authorityMatches(s, actor, row.authority) ||
          ['testimony', 'material', 'redhanded'].indexOf(row.evidence) < 0 ||
          id && row.id !== id) continue;
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
  FB.justiceArrestProjection = function (s, actor, target, offenseId) {
    var a = person(s, actor), t = person(s, target);
    var counties = FB.justiceCounties(s, actor), offense = caseFor(s, actor, target, offenseId);
    var rid = realmOf(s, target), arid = realmOf(s, actor);
    var targetBaron = target === s.player.charId && s.player.tier === 3;
    var subordinateBaron = targetBaron && !!arid && under(s, s.player.liege, arid);
    var cooldown = (records(s).cooldowns || {})[actor + ':' + target] || 0;
    var blocker = !FB.justiceRulerEligible(s, actor) ? 'ruler' :
      !t || t.dead || actor === target ? 'target' :
      FB.justiceCustodyOf(s, actor) || actor === s.player.charId && s.player.flags.in_prison ? 'confined' :
      FB.justiceCustodyOf(s, target) || target === s.player.charId && s.player.flags.in_prison ? 'already_held' :
      counties.indexOf(location(s, target)) < 0 ? 'outside' :
      (rid && (!arid || rid === arid || !under(s, rid, arid))) ||
      (targetBaron && !subordinateBaron) || (!arid && t && t.role === 'lord') ? 'authority' :
      cooldown > s.turn ? 'cooldown' :
      offenseId && !offense ? 'case' : null;
    return { ready:!blocker, blocker:blocker, actorId:actor, targetId:target,
      offenseId:offense && offense.id, evidence:offense && offense.evidence,
      justified:!!offense, counties:counties, supportCounties:FB.justiceSupportCounties(s, actor), cooldownUntil:cooldown,
      chance:a && t ? FB.clamp(0.60 + 0.02 * (FB.skillOf(a, 'mar') - FB.skillOf(t, 'int')), 0.15, 0.90) : 0,
      attemptSupport:offense ? 0 : -10, captureSupport:offense ? 0 : -10,
      resistance:subordinateBaron || !!rid && !!arid && under(s, rid, arid) };
  };
  function news(s, actor, target, action, effects) {
    var a = person(s, actor), t = person(s, target);
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
  function capture(s, actor, target, offenseId, unjust) {
    var row = FB.captureIntrigue(s, actor, target, 'judicial', realmOf(s, actor));
    if (!row) return null;
    row.authority = authorityKey(s, actor);
    row.endTurn = s.turn + 90;
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
      var top = FB.topRealm(s, rid);
      if (FB.ordinaryWarBetween(s, rid, top)) return;
      r.liege = null;
      territory.forEach(function (pid) { s.owner[pid] = rid; });
      FB.invalidateRealmCache();
      if (FB.mergeRealmTech) FB.mergeRealmTech(s, rid, top);
      if (top === 'player') {
        FB.registerOrdinaryWar(s, 'player', { enemy:rid, target:null, wins:0, losses:0,
          seasons:0, defending:true, casus:{ type:'independence' } });
        FB.warFooting(s);
        FB.announcePlayerDefense(s);
      } else if (s.realms[top]) {
        FB.registerOrdinaryWar(s, top, { enemy:rid, years:0, captures:0, casus:{ type:'independence' } });
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
      var row = capture(s, p.actorId, p.targetId, p.offenseId, !p.justified);
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
  function queue(s, actor, target, kind, offenseId, sentence) {
    var j = ensure(s);
    if (j.pending) return false;
    j.pending = { id:'justice-response-' + j.nextId++, kind:kind, actorId:actor,
      targetId:target, offenseId:offenseId || null, sentence:sentence || null,
      generation:s.generation };
    FB.queueEvent(s, kind === 'arrest' ? 'justice_arrest' : 'justice_hearing', {
      justiceId:j.pending.id, studentId:actor, sentence:sentence || 'imprisonment'
    });
    return true;
  }
  FB.justiceAttemptArrest = function (s, actor, target, offenseId) {
    var p = FB.justiceArrestProjection(s, actor, target, offenseId);
    if (!p.ready) return { ok:false, blocker:p.blocker };
    if (target === s.player.charId && actor !== target && !(FB.game && FB.game.observe)) {
      return { ok:queue(s, actor, target, 'arrest', p.offenseId), pending:true };
    }
    return arrestNow(s, p, false);
  };
  function form(s, actor) {
    var c = person(s, actor), rid = realmOf(s, actor);
    var group = FB.faithGroup(c.religion, s);
    if (/greek|byzant/i.test(c.culture || '') || /byzant/i.test(rid || '')) return 'byzantine';
    if (group === 'muslim') return 'muslim';
    if (group === 'pagan') return 'customary';
    return 'latin';
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
  FB.justicePunishmentProjection = function (s, actor, target, sentence, offenseId) {
    var def = FBDATA.justiceSentences[sentence], row = held(s, actor, target);
    var offense = caseFor(s, actor, target, offenseId), counties = FB.justiceCounties(s, actor);
    var legalForm = live(s, actor) ? form(s, actor) : 'latin';
    var justified = !!(def && (def.level === 0 || offense && offense.severity >= def.level));
    var rid = realmOf(s, target), arid = realmOf(s, actor);
    var localTitle = !!rid && !!arid && rid !== arid && under(s, rid, arid);
    if (target === s.player.charId && s.player.tier === 3) {
      localTitle = !!arid && under(s, s.player.liege, arid) &&
        counties.indexOf(s.player.provinceId) >= 0 && actor !== target;
    }
    var regional = def && (!def.form || def.form === legalForm);
    if (sentence === 'qisas' || sentence === 'diya') regional = legalForm === 'muslim' &&
      !!(offense && offense.kind === 'assassination' && offense.successful);
    var destination = def && def.exile ? exileDestination(s, counties, location(s, target)) : null;
    var pending = records(s).pending;
    var blocker = !def ? 'sentence' : !FB.justiceRulerEligible(s, actor) ? 'ruler' :
      !live(s, target) || actor === target ? 'target' :
      FB.justiceCustodyOf(s, actor) || actor === s.player.charId && s.player.flags.in_prison ? 'confined' :
      !row ? 'custody' : !regional ? 'regional' :
      offenseId && !offense ? 'case' :
      def.forfeit && !localTitle ? 'title' :
      def.exile && !destination ? 'destination' :
      row.sentenceIds && row.sentenceIds.indexOf(sentence) >= 0 && sentence !== 'imprisonment' ? 'already_sentenced' :
      sentence === 'imprisonment' && row.sentenced && row.endTurn > s.turn + 90 ? 'term' : null;
    var station = target === s.player.charId ? FB.playerStation(s) :
      FB.clamp(live(s, target) ? FB.stationOf(person(s, target)) : 0, 0, 4);
    var fine = Math.max(5, Math.round(((offense ? offense.severity : 1) + 3) * [5,8,12,20,30][station]));
    if (sentence === 'ransom') fine = row && row.demand ? row.demand.amount :
      (FBDATA.intrigue.captiveRansoms[station] || 30);
    var amount = def && def.money ? Math.min(fine, live(s, target) ? available(s, target) : 0) : 0;
    var loss = def && !justified ? -def.penalty : 0;
    if (sentence === 'imprisonment' && row && !row.sentenced) loss = Math.min(0, loss + num(row.unjustPaid, 0));
    return { ready:!blocker, blocker:blocker, actorId:actor, targetId:target, sentence:sentence,
      custody:row, offenseId:offense && offense.id, evidence:offense && offense.evidence,
      justified:justified, form:legalForm, amount:amount, fine:fine, counties:counties,
      supportCounties:FB.justiceSupportCounties(s, actor),
      support:loss, destination:destination, titleRealmId:localTitle ? rid : null,
      endTurn:sentence === 'imprisonment' && row ? Math.max(s.turn, row.captureTurn + 360,
        row.sentenced ? row.endTurn + 360 : 0) : null,
      pending:!!(pending && pending.targetId === target) };
  };
  FB.justiceSentenceOptions = function (s, actor, target) {
    return Object.keys(FBDATA.justiceSentences).map(function (id) {
      return FB.justicePunishmentProjection(s, actor, target, id);
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
    if (p.titleRealmId || p.targetId === s.player.charId && s.player.tier === 3) forfeit(s, p);
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
    if (p.sentence === 'monastic_exile') {
      c.career = { profession:'monk' };
      if (c.id === s.player.charId) s.player.profession = 'monk';
    }
    if (FB.invalidateSocialVisit) FB.invalidateSocialVisit(s, c.id);
  }
  FB.justiceApplyPunishment = function (s, actor, target, sentence, offenseId, responseId) {
    var p = FB.justicePunishmentProjection(s, actor, target, sentence, offenseId);
    if (!p.ready) return { ok:false, blocker:p.blocker };
    var j = ensure(s), pending = j.pending;
    if (target === s.player.charId && !(FB.game && FB.game.observe) &&
        (!pending || pending.id !== responseId || pending.kind !== 'sentence' ||
          pending.actorId !== actor || pending.sentence !== sentence)) {
      return { ok:queue(s, actor, target, 'sentence', p.offenseId, sentence), pending:true };
    }
    var def = FBDATA.justiceSentences[sentence], row = p.custody;
    if (def.money && !transfer(s, target, actor, p.amount)) return { ok:false, blocker:'funds' };
    j.pending = null;
    var effects = support(s, p.supportCounties, p.support).concat(standingPenalty(s, actor, p.support));
    effects.push({ type:'system', system:'justice', action:sentence,
      days:p.endTurn ? p.endTurn - s.turn : null, lethal:!!def.kill,
      permanent:!!(def.kill || def.maim || def.forfeit) });
    if (target === s.player.charId && p.amount) effects.push({ type:'gold', amount:-p.amount });
    if (actor === s.player.charId && p.amount) effects.push({ type:'gold', amount:p.amount });
    var offense = caseFor(s, actor, target, p.offenseId);
    if (offense && sentence !== 'release' && sentence !== 'ransom') { offense.closed = true; offense.sentence = sentence; }
    if (sentence === 'pardon') (j.offenses || []).forEach(function (o) {
      if (o.accusedId === target && authorityMatches(s, actor, o.authority)) o.closed = true;
    });
    // Claim the sentence before death/succession and any callbacks can re-enter.
    if (!row.sentenceIds) row.sentenceIds = [];
    row.sentenceIds.push(sentence);
    j.last = { actorId:actor, targetId:target, sentence:sentence, justified:p.justified,
      amount:p.amount, turn:s.turn, impacts:effects };
    news(s, actor, target, sentence, effects);
    FB.noteConduct(s, actor, { cruelty:!p.justified && def.level >= 2 ? 1 : 0, public:true });
    if (def.kill) {
      release(s, row);
      if (target === s.player.charId) FB.game.die(FB.msg('legend.death.justice',
        'Executed while held prisoner by a ruler.', {}), { kind:'sentence', eventId:'justice_hearing' });
      else FB.killChar(s, person(s, target));
    } else if (sentence === 'imprisonment') {
      // Convert identified war or private custody without leaving a second release authority.
      if ((s.intrigue.captives || []).indexOf(row) < 0) s.intrigue.captives.push(row);
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
      if (def.forfeit) forfeit(s, p);
      if (def.maim) {
        FB.addTrait(person(s, target), 'one_eyed');
        FB.addTrait(person(s, target), 'maimed');
        if (target === s.player.charId && s.player.tier >= 3) FB.loseAllLand(s, {});
        else if (realmOf(s, target)) FB.advanceRealmSuccession(s, realmOf(s, target));
      }
      if (def.exile) exile(s, p);
      if (sentence === 'penance') {
        var wallet = target === s.player.charId ? s.player : person(s, target);
        wallet.piety = Math.max(0, num(wallet.piety, 0) - 40);
        wallet.prestige = Math.max(0, num(wallet.prestige, 0) - 20);
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
      row.sentenced = true; row.sentenceIds = ['imprisonment'];
    }
    if (row.source !== 'judicial') return row;
    if (row.captorId === s.player.charId && s.player.dead &&
        (row.authority === 'player' || row.authority === 'barony:' + s.player.provinceId)) return row;
    var key = row.authority || row.captorRealmId;
    if (typeof key !== 'string') return null;
    if (key === 'player' && !(s.realms.player && s.realms.player.alive)) return null;
    var successor = key && key.indexOf('barony:') === 0 ?
      (s.player.tier >= 3 && key === 'barony:' + s.player.provinceId ? person(s, s.player.charId) : null) :
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
        !held(s, j.pending.actorId, j.pending.targetId))) j.pending = null;
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
    var sentence = o.severity >= 3 ? 'execution' : o.severity === 2 ? 'imprisonment' : 'fine';
    queue(s, row.captorId, hearing.accusedId, 'sentence', o.id, sentence);
  };
  function aiSentence(s, actor, target, offense) {
    var choice = offense && offense.severity >= 3 ? 'execution' :
      offense && offense.severity === 2 ? 'imprisonment' : 'fine';
    var legalForm = form(s, actor);
    if (choice === 'execution' && legalForm === 'byzantine') choice = 'blinding_deposition';
    if (choice === 'execution' && legalForm === 'muslim' && offense.successful) choice = 'qisas';
    if (!offense) choice = 'imprisonment';
    var c = person(s, actor), j = ensure(s);
    if (offense && offense.severity < 3 && cruel(c) &&
        !(j.arbitrary[actor] > s.turn) && FB.chance(0.20)) {
      choice = 'execution'; j.arbitrary[actor] = s.turn + 1440;
    }
    return choice;
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
        else if (result.captured) { FB.justiceApplyPunishment(s, id, target, 'imprisonment'); used++; }
      }
      return false;
    });
  };
  function pendingFor(s, ctx) {
    var p = records(s).pending;
    return p && ctx && p.id === ctx.justiceId && p.generation === s.generation &&
      p.targetId === s.player.charId && FB.justiceRulerEligible(s, p.actorId) &&
      (p.kind === 'arrest' ? FB.justiceArrestProjection(s, p.actorId, p.targetId, p.offenseId).ready :
        !!held(s, p.actorId, p.targetId)) ? p : null;
  }
  FB.fns.justice_response_valid = function (s, ctx) { return !!pendingFor(s, ctx); };
  FB.fns.justice_submit = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p) return false;
    if (p.kind === 'sentence') return FB.justiceApplyPunishment(s, p.actorId, p.targetId,
      p.sentence, p.offenseId, p.id).ok;
    ensure(s).pending = null;
    var result = arrestNow(s, FB.justiceArrestProjection(s, p.actorId, p.targetId, p.offenseId), true);
    if (result.captured) queue(s, p.actorId, p.targetId, 'sentence', p.offenseId,
      aiSentence(s, p.actorId, p.targetId, caseFor(s, p.actorId, p.targetId, p.offenseId)));
    ctx.justiceImpacts = result.impacts || [];
    return result.ok;
  };
  FB.fns.justice_resist = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || p.kind !== 'arrest') return false;
    ensure(s).pending = null;
    var result = arrestNow(s, FB.justiceArrestProjection(s, p.actorId, p.targetId, p.offenseId), false);
    if (result.captured) queue(s, p.actorId, p.targetId, 'sentence', p.offenseId,
      aiSentence(s, p.actorId, p.targetId, caseFor(s, p.actorId, p.targetId, p.offenseId)));
    ctx.justiceImpacts = result.impacts || [];
    return result.ok;
  };
  FB.fns.justice_can_pay = function (s, ctx) {
    var p = pendingFor(s, ctx), o = p && caseFor(s, p.actorId, p.targetId, p.offenseId);
    if (!p || p.kind !== 'sentence' || o && o.severity >= 3 && form(s, p.actorId) !== 'muslim' &&
        form(s, p.actorId) !== 'customary') return false;
    var quote = FB.justicePunishmentProjection(s, p.actorId, p.targetId, 'fine', p.offenseId);
    return quote.ready && available(s, p.targetId) >= quote.fine;
  };
  FB.fns.justice_pay = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || !FB.fns.justice_can_pay(s, ctx)) return false;
    p.sentence = 'fine';
    return FB.justiceApplyPunishment(s, p.actorId, p.targetId, 'fine', p.offenseId, p.id).ok;
  };
  FB.fns.justice_plead = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || p.kind !== 'sentence') return false;
    var o = caseFor(s, p.actorId, p.targetId, p.offenseId);
    var strength = o ? ['suspicion','testimony','material','redhanded'].indexOf(o.evidence) : 0;
    var chance = FB.clamp(0.45 + FB.skillOf(person(s, p.targetId), 'dip') * 0.02 - strength * 0.10, 0.05, 0.80);
    if (FB.chance(chance)) p.sentence = 'pardon';
    return FB.justiceApplyPunishment(s, p.actorId, p.targetId, p.sentence, p.offenseId, p.id).ok;
  };
  FB.fns.justice_challenge = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || p.kind !== 'sentence') return false;
    var offense = caseFor(s, p.actorId, p.targetId, p.offenseId);
    var evidence = offense ? ['suspicion','testimony','material','redhanded'].indexOf(offense.evidence) : 0;
    var chance = FB.clamp(0.45 + FB.skillOf(person(s, p.targetId), 'int') * 0.025 - evidence * 0.15, 0.05, 0.80);
    if (FB.chance(chance)) p.sentence = 'pardon';
    return FB.justiceApplyPunishment(s, p.actorId, p.targetId, p.sentence, p.offenseId, p.id).ok;
  };
  FB.fns.justice_can_penance = function (s, ctx) {
    var p = pendingFor(s, ctx), o = p && caseFor(s, p.actorId, p.targetId, p.offenseId);
    return !!(p && p.kind === 'sentence' && o && o.severity <= 2 &&
      form(s, p.actorId) === 'latin' && s.player.piety >= 40);
  };
  FB.fns.justice_penance = function (s, ctx) {
    var p = pendingFor(s, ctx);
    if (!p || !FB.fns.justice_can_penance(s, ctx)) return false;
    p.sentence = 'penance';
    return FB.justiceApplyPunishment(s, p.actorId, p.targetId, 'penance', p.offenseId, p.id).ok;
  };

  function responseImpacts(s, ctx, action) {
    var p = pendingFor(s, ctx);
    if (!p) return [];
    if (p.kind === 'arrest') {
      var a = FB.justiceArrestProjection(s, p.actorId, p.targetId, p.offenseId);
      return [{ type:'system', system:'justice', action:action === 'justice_resist' ? 'resist' : 'custody',
        chance:action === 'justice_resist' ? a.chance : 1, days:90 }];
    }
    var sentence = action === 'justice_pay' ? 'fine' : action === 'justice_penance' ? 'penance' : p.sentence;
    var quote = FB.justicePunishmentProjection(s, p.actorId, p.targetId, sentence, p.offenseId);
    var d = FBDATA.justiceSentences[sentence];
    var out = [{ type:'system', system:'justice', action:sentence, days:quote.endTurn ? quote.endTurn - s.turn : null,
      lethal:!!d.kill, permanent:!!(d.kill || d.maim || d.forfeit),
      variable:action === 'justice_plead' || action === 'justice_challenge' }];
    if (d.money) out.push({ type:'gold', amount:-quote.amount });
    if (sentence === 'penance') out.push({ type:'piety', amount:-40 }, { type:'prestige', amount:-20 });
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
