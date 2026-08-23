/* Fallowborn — elections, durable privileges, and collective demands.
   Existing county modifiers, guild-monopoly contracts, obligations, and
   Council seats remain the mechanical ledgers. This module records the legal
   terms around them and owns the bounded election and demand workflows. It
   also owns the crown-side royal policy machinery (religious tolerance and
   settlement, `institution:'crown'` entries in data/policies.js): proclaimed
   levels, per-family yearly cooldowns, standing county-modifier effects, and
   the mistreatment wiring of persecution and unlawful revocation. */
window.FB = window.FB || {};

(function () {
  'use strict';

  var GUILD_ORDER = { none:0, member:1, master:2, officer:3, guildmaster:4 };
  var HISTORY_LIMIT = 24;
  var MISTREATMENT_DAYS = 2880;

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  function compareId(a, b) {
    a = String(a);
    b = String(b);
    return a < b ? -1 : (a > b ? 1 : 0);
  }

  function finite(value, fallback) {
    var number = Number(value);
    return isFinite(number) ? number : fallback;
  }

  function playerChar(state) {
    return state && state.chars && state.chars[state.player.charId];
  }

  function electionDef(id) {
    var def = FBDATA.elections && FBDATA.elections[id];
    return def && typeof def === 'object' && !Array.isArray(def) ? def : null;
  }
  FB.electionDef = electionDef;

  FB.electionList = function () {
    var out = [];
    var defs = FBDATA.elections || {};
    for (var id in defs) {
      if (!own(defs, id) || !electionDef(id)) continue;
      out.push({ id:id, def:defs[id] });
    }
    out.sort(function (a, b) {
      return finite(a.def.order, 99) - finite(b.def.order, 99) ||
        compareId(a.id, b.id);
    });
    return out;
  };

  function privilegeDef(id) {
    var def = FBDATA.privileges && FBDATA.privileges[id];
    return def && typeof def === 'object' && !Array.isArray(def) ? def : null;
  }
  FB.privilegeDef = privilegeDef;

  FB.privilegeList = function () {
    var out = [];
    var defs = FBDATA.privileges || {};
    for (var id in defs) {
      if (!own(defs, id) || !privilegeDef(id)) continue;
      out.push({ id:id, def:defs[id] });
    }
    out.sort(function (a, b) {
      return finite(a.def.order, 99) - finite(b.def.order, 99) ||
        compareId(a.id, b.id);
    });
    return out;
  };

  function demandDef(id) {
    var def = FBDATA.collectiveDemands && FBDATA.collectiveDemands[id];
    return def && typeof def === 'object' && !Array.isArray(def) ? def : null;
  }

  function electionStore(state, create) {
    var store = state && state.elections;
    if ((!store || typeof store !== 'object' || Array.isArray(store)) && create) {
      store = state.elections = {};
    }
    if (!store || typeof store !== 'object' || Array.isArray(store)) return null;
    if (create) {
      if (!store.guildScopes || typeof store.guildScopes !== 'object' ||
          Array.isArray(store.guildScopes)) store.guildScopes = {};
      if (!store.councilTerms || typeof store.councilTerms !== 'object' ||
          Array.isArray(store.councilTerms)) store.councilTerms = {};
      if (!store.cooldowns || typeof store.cooldowns !== 'object' ||
          Array.isArray(store.cooldowns)) store.cooldowns = {};
      if (!Array.isArray(store.history)) store.history = [];
      if (!own(store, 'active')) store.active = null;
    }
    return store;
  }

  function guildScopeKey(profession, provinceId) {
    return String(profession || '') + '@' + String(provinceId || '');
  }

  function guildScope(state, profession, provinceId, create) {
    var store = electionStore(state, create);
    if (!store || !profession || !provinceId) return null;
    var key = guildScopeKey(profession, provinceId);
    var scope = store.guildScopes && store.guildScopes[key];
    if ((!scope || typeof scope !== 'object' || Array.isArray(scope)) && create) {
      scope = store.guildScopes[key] = {
        profession:profession, provinceId:provinceId, offices:{}
      };
    }
    if (!scope) return null;
    if (create && (!scope.offices || typeof scope.offices !== 'object' ||
        Array.isArray(scope.offices))) scope.offices = {};
    return scope;
  }

  function validTerm(term) {
    return !!(term && typeof term === 'object' && !Array.isArray(term) &&
      (term.holderKind === 'character' || term.holderKind === 'realm' ||
       term.holderKind === 'abstract') &&
      typeof term.holderId === 'string' && term.holderId &&
      isFinite(Number(term.startTurn)) && isFinite(Number(term.endTurn)) &&
      Number(term.endTurn) > Number(term.startTurn));
  }

  function termRecord(kind, id, state, days, electionId) {
    return {
      holderKind:kind,
      holderId:id,
      startTurn:state.turn,
      endTurn:state.turn + Math.max(1, Math.round(finite(days, 1440))),
      electionId:electionId || null
    };
  }

  function guildCurrentScope(state, c) {
    var career = c && FB.careerOf ? FB.careerOf(state, c) : null;
    return career && state.player.provinceId ? {
      key:guildScopeKey(career.profession, state.player.provinceId),
      profession:career.profession,
      provinceId:state.player.provinceId,
      career:career
    } : null;
  }

  function downgradeGuildHolder(state, term, office, scope) {
    if (!term || term.holderKind !== 'character') return;
    var c = state.chars[term.holderId];
    if (!c || c.dead || !FB.careerOf) return;
    var career = FB.careerOf(state, c);
    if (!career || career.profession !== scope.profession) return;
    if (office === 'guildmaster' && career.guildRank === 'guildmaster') {
      var officer = scope.offices.officer;
      career.guildRank = validTerm(officer) &&
        officer.holderKind === 'character' && officer.holderId === c.id &&
        state.turn < officer.endTurn ? 'officer' : 'master';
    } else if (office === 'officer' && career.guildRank === 'officer') {
      career.guildRank = 'master';
    }
    if (c.id === state.player.charId && FB.syncPlayerCareer) {
      FB.syncPlayerCareer(state);
    }
  }

  function expireGuildTerms(state, store, silent) {
    for (var key in store.guildScopes) {
      if (!own(store.guildScopes, key)) continue;
      var scope = store.guildScopes[key];
      if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
          typeof scope.profession !== 'string' ||
          typeof scope.provinceId !== 'string' ||
          !FB.world.byId[scope.provinceId]) {
        delete store.guildScopes[key];
        continue;
      }
      if (!scope.offices || typeof scope.offices !== 'object' ||
          Array.isArray(scope.offices)) scope.offices = {};
      for (var officeIndex = 0; officeIndex < 2; officeIndex++) {
        var office = officeIndex ? 'guildmaster' : 'officer';
        var term = scope.offices[office];
        if (!term) continue;
        var valid = validTerm(term);
        if (valid && term.holderKind === 'character') {
          var holder = state.chars[term.holderId];
          var current = holder && !holder.dead ? guildCurrentScope(state, holder) : null;
          valid = !!(current && current.key === key);
        }
        if (valid && state.turn < Number(term.endTurn)) continue;
        downgradeGuildHolder(state, term, office, scope);
        delete scope.offices[office];
        if (!silent && term && term.holderKind === 'character' &&
            state.chars[term.holderId]) {
          FB.news(state, FB.msg('news.election.guild_term_ended',
            '🏅 {name}’s term in guild office ends; the bench is vacant again.',
            { name:state.chars[term.holderId].name }));
        }
      }
      if (!scope.offices.officer && !scope.offices.guildmaster) {
        delete store.guildScopes[key];
      }
    }
  }

  function grandfatherGuildTerms(state, store) {
    if (!FB.householdWorkers || !FB.careerOf) return;
    /* Cheap probe before the household-wide character scans: an officer rank
       only ever exists on an already-created career record (elections set it
       together with the term record, repairs never invent one), so a raw
       peek at career.guildRank finds every day the full pass could act on.
       The pass itself is unchanged and idempotent when nothing needs
       backfilling. */
    var anyOfficer = false;
    for (var probeId in state.chars) {
      var probeChar = state.chars[probeId];
      var probeCareer = probeChar && probeChar.career;
      if (probeCareer && GUILD_ORDER[probeCareer.guildRank] >= GUILD_ORDER.officer) {
        anyOfficer = true;
        break;
      }
    }
    if (!anyOfficer) return;
    var workers = FB.householdWorkers(state);
    for (var i = 0; i < workers.length; i++) {
      var c = workers[i];
      if (!c || c.dead) continue;
      var current = guildCurrentScope(state, c);
      var career = current && current.career;
      if (!career || GUILD_ORDER[career.guildRank] < GUILD_ORDER.officer) continue;
      var scope = guildScope(state, career.profession,
        current.provinceId, true);
      if (!scope.offices.officer) {
        scope.offices.officer = termRecord('character', c.id, state,
          1440, 'legacy_officer');
      }
      if (career.guildRank === 'guildmaster' && !scope.offices.guildmaster) {
        scope.offices.guildmaster = termRecord('character', c.id, state,
          1800, 'legacy_guildmaster');
        scope.offices.officer.endTurn = Math.max(
          scope.offices.officer.endTurn,
          scope.offices.guildmaster.endTurn);
      }
    }
  }

  function activeOfficeConfirmationRecord(state) {
    var records = state && Array.isArray(state.privileges)
      ? state.privileges : [];
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      if (record && record.defId === 'office_confirmation' &&
          (!isFinite(Number(record.endTurn)) || state.turn < record.endTurn)) {
        return record;
      }
    }
    return null;
  }

  function electiveCouncilSeatIds(state) {
    var record = activeOfficeConfirmationRecord(state);
    var def = record && privilegeDef(record.defId);
    var seats = def && def.effect && def.effect.seats;
    return Array.isArray(seats) ? seats.slice() : [];
  }

  FB.electiveCouncilSeatIds = electiveCouncilSeatIds;
  FB.councilSeatRequiresConfirmation = function (state, seatId) {
    return electiveCouncilSeatIds(state).indexOf(seatId) >= 0;
  };

  function councilElectionDefinition(seatId) {
    return seatId === 'treasurer' ? 'council_treasurer_confirmation' :
      (seatId === 'constable' ? 'council_constable_confirmation' : null);
  }

  function ensureCouncilTerms(state, store) {
    var seats = electiveCouncilSeatIds(state);
    var council = state.council;
    if (!council || !council.seats) return;
    for (var i = 0; i < seats.length; i++) {
      var seatId = seats[i];
      var holderId = council.seats[seatId];
      var term = store.councilTerms[seatId];
      if (term && (!validTerm(term) || term.holderKind !== 'realm' ||
          term.holderId !== holderId)) delete store.councilTerms[seatId];
      if (holderId && !store.councilTerms[seatId]) {
        var def = electionDef(councilElectionDefinition(seatId));
        store.councilTerms[seatId] = termRecord('realm', holderId, state,
          def && def.termDays, 'charter_incumbent');
      }
    }
    for (var key in store.councilTerms) {
      if (!own(store.councilTerms, key)) continue;
      if (seats.indexOf(key) < 0) delete store.councilTerms[key];
    }
  }

  function expireCouncilTerms(state, store, silent) {
    var council = state.council;
    for (var seatId in store.councilTerms) {
      if (!own(store.councilTerms, seatId)) continue;
      var term = store.councilTerms[seatId];
      var valid = validTerm(term) && term.holderKind === 'realm' &&
        council && council.seats && council.seats[seatId] === term.holderId &&
        state.realms[term.holderId] && state.realms[term.holderId].alive &&
        state.realms[term.holderId].liege === 'player';
      if (valid && state.turn < term.endTurn) continue;
      if (council && council.seats &&
          council.seats[seatId] === (term && term.holderId)) {
        council.seats[seatId] = null;
      }
      delete store.councilTerms[seatId];
      if (!silent && term && state.realms[term.holderId]) {
        FB.news(state, FB.msg('news.election.council_term_ended',
          { forms:{ select:'value', param:'office', cases:{
            treasurer:'🏛 The protected term of {ruler} ends; the Treasury awaits a new nominee.',
            constable:'🏛 The protected term of {ruler} ends; the Constabulary awaits a new nominee.',
            other:'🏛 The protected term of {ruler} ends; the office awaits a new nominee.'
          } } }, {
            ruler:state.realms[term.holderId].ruler.name, office:seatId
          }));
      }
    }
  }

  function cooldownKey(kind, office, candidateId) {
    return kind + ':' + office + ':' + candidateId;
  }

  function cooldownRemaining(state, kind, office, candidateId) {
    var store = electionStore(state, false);
    var end = store && store.cooldowns &&
      Number(store.cooldowns[cooldownKey(kind, office, candidateId)]);
    return isFinite(end) ? Math.max(0, Math.ceil(end - state.turn)) : 0;
  }

  function setCooldown(state, kind, office, candidateId, days) {
    var store = electionStore(state, true);
    store.cooldowns[cooldownKey(kind, office, candidateId)] =
      state.turn + Math.max(1, Math.round(finite(days, 360)));
  }

  function activeElectionValid(state, active) {
    var def = active && electionDef(active.definitionId);
    if (!def || !active.id || active.kind !== def.kind ||
        active.office !== def.office || !isFinite(Number(active.startedTurn)) ||
        !isFinite(Number(active.expiresTurn))) return false;
    if (active.kind === 'guild') {
      var c = state.chars[active.candidateId];
      var current = c && !c.dead ? guildCurrentScope(state, c) : null;
      return !!(current && current.profession === active.profession &&
        !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) &&
        current.provinceId === active.scopeId);
    }
    if (active.kind === 'council') {
      var realm = state.realms[active.nomineeRealmId];
      return !!(state.player.tier >= 6 && realm && realm.alive &&
        realm.liege === 'player' &&
        !(FB.intrigueRealmRulerCaptive &&
          FB.intrigueRealmRulerCaptive(state, active.nomineeRealmId)) &&
        realm.ruler && isFinite(Number(active.nomineeGeneration)) &&
        Number(realm.ruler.generation || 0) ===
          Number(active.nomineeGeneration) &&
        FB.councilSeatRequiresConfirmation(state, active.office));
    }
    return false;
  }

  function archiveElection(state, record) {
    var store = electionStore(state, true);
    store.history.push(record);
    if (store.history.length > HISTORY_LIMIT) {
      store.history.splice(0, store.history.length - HISTORY_LIMIT);
    }
  }

  function expireActiveElection(state, store, silent) {
    var active = store.active;
    if (!active) return;
    if (activeElectionValid(state, active) &&
        state.turn < Number(active.expiresTurn)) return;
    var def = electionDef(active.definitionId);
    if (def) {
      setCooldown(state, active.kind, active.office,
        active.kind === 'guild' ? active.candidateId : active.nomineeRealmId,
        def.defeatCooldownDays);
    }
    archiveElection(state, {
      id:active.id, definitionId:active.definitionId, kind:active.kind,
      office:active.office, candidateId:active.candidateId || null,
      nomineeRealmId:active.nomineeRealmId || null,
      nomineeGeneration:active.nomineeGeneration === undefined
        ? null : active.nomineeGeneration,
      resolvedTurn:state.turn, result:'expired'
    });
    store.active = null;
    if (!silent) {
      FB.news(state, FB.msg('news.election.expired',
        '🗳 The election campaign expires without a recorded vote.', {}));
    }
  }

  function repairElectionStore(state, silent, skipLegacyOfficers) {
    var store = electionStore(state, true);
    for (var key in store.cooldowns) {
      if (!own(store.cooldowns, key) ||
          !isFinite(Number(store.cooldowns[key])) ||
          Number(store.cooldowns[key]) <= state.turn) {
        delete store.cooldowns[key];
      }
    }
    store.history = store.history.filter(function (row) {
      return !!(row && typeof row === 'object' && !Array.isArray(row) &&
        typeof row.id === 'string' && electionDef(row.definitionId));
    });
    if (store.history.length > HISTORY_LIMIT) {
      store.history.splice(0, store.history.length - HISTORY_LIMIT);
    }
    expireGuildTerms(state, store, silent);
    if (!skipLegacyOfficers) grandfatherGuildTerms(state, store);
    expireCouncilTerms(state, store, silent);
    ensureCouncilTerms(state, store);
    expireActiveElection(state, store, silent);
    return store;
  }

  function baseGuildElectionStatus(state, c, definitionId) {
    var def = electionDef(definitionId);
    var career = c && FB.careerOf ? FB.careerOf(state, c) : null;
    var current = c && guildCurrentScope(state, c);
    var missing = [];
    if (!def || !career || !current || !FBDATA.careers[career.profession] ||
        !FBDATA.careers[career.profession].guild) {
      return { ready:false, missing:[FB.T('No valid guild electorate is available.')] };
    }
    if (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) {
      missing.push(FB.T('A captive cannot seek a new guild office.'));
    }
    if (c.id === state.player.charId && state.player.tier >= 3) {
      missing.push(FB.T('A landed ruler keeps the calling as biography and cannot seek a local guild office.'));
    }
    if (GUILD_ORDER[career.guildRank] < GUILD_ORDER[def.requiredRank]) {
      missing.push(FB.T('Requires guild rank {rank}.', {
        rank:FB.guildTitle({ guildRank:def.requiredRank })
      }));
    }
    var stewardship = FB.skillOf(c, 'ste');
    if (stewardship < finite(def.stewardship, 0)) {
      missing.push(FB.T('Stewardship {needed} (now {current})', {
        needed:def.stewardship, current:stewardship
      }));
    }
    if (career.profession === 'merchant' && finite(def.merchantLearning, 0)) {
      var learning = FB.skillOf(c, 'lea');
      if (!c.traits || c.traits.indexOf('literate') < 0) {
        missing.push(FB.T('Lettered'));
      }
      if (learning < def.merchantLearning) {
        missing.push(FB.T('Learning {needed} (now {current})', {
          needed:def.merchantLearning, current:learning
        }));
      }
    }
    if (state.player.prestige < finite(def.prestige, 0)) {
      missing.push(FB.T('{needed} prestige (now {current})', {
        needed:def.prestige, current:Math.floor(state.player.prestige)
      }));
    }
    if (career.guildStanding < finite(def.guildStanding, 0)) {
      missing.push(FB.T('Guild Standing {needed} (now {current})', {
        needed:def.guildStanding,
        current:Math.round(career.guildStanding || 0)
      }));
    }
    if (state.player.gold < finite(def.nominationCost, 0)) {
      missing.push(FB.T('{money:gold} in nomination expenses', {
        gold:def.nominationCost
      }));
    }
    var store = electionStore(state, false);
    if (store && store.active) {
      missing.push(FB.T('Another election campaign is already active.'));
    }
    var cooldown = cooldownRemaining(state, 'guild', def.office, c.id);
    if (cooldown) {
      missing.push(FB.T('Future candidacy cooldown: {days} days remain.', {
        days:cooldown
      }));
    }
    var scope = guildScope(state, career.profession,
      state.player.provinceId, false);
    var term = scope && scope.offices && scope.offices[def.office];
    if (validTerm(term) && state.turn < term.endTurn) {
      missing.push(FB.T('The office is not vacant; the current term has {days} days remaining.', {
        days:Math.ceil(term.endTurn - state.turn)
      }));
    }
    if (def.office === 'guildmaster') {
      var officer = scope && scope.offices && scope.offices.officer;
      if (!validTerm(officer) || officer.holderKind !== 'character' ||
          officer.holderId !== c.id || state.turn >= officer.endTurn) {
        missing.push(FB.T('The candidate must hold a current guild-officer term.'));
      } else if (state.turn - officer.startTurn <
          finite(def.minimumOfficeDays, 0)) {
        missing.push(FB.T('Requires {days} days of service as an officer; {remaining} remain.', {
          days:def.minimumOfficeDays,
          remaining:def.minimumOfficeDays - (state.turn - officer.startTurn)
        }));
      }
    }
    return {
      ready:!missing.length,
      definitionId:definitionId,
      def:def,
      candidate:c,
      career:career,
      profession:career.profession,
      scopeId:current.provinceId,
      office:def.office,
      cost:finite(def.nominationCost, 0),
      termDays:finite(def.termDays, 1440),
      missing:missing,
      vacancy:!(validTerm(term) && state.turn < term.endTurn)
    };
  }

  FB.guildElectionStatus = function (state, c, office) {
    var id = office === 'guildmaster' ? 'guildmaster' : 'guild_officer';
    return baseGuildElectionStatus(state, c, id);
  };

  FB.guildElectionStep = function (state, c, step) {
    if (!step || (step.to !== 'officer' && step.to !== 'guildmaster')) return step;
    var status = FB.guildElectionStatus(state, c, step.to);
    var out = {};
    for (var key in step) if (own(step, key)) out[key] = step[key];
    out.election = true;
    out.definitionId = status.definitionId;
    out.cost = status.cost;
    out.termDays = status.termDays;
    out.need = finite(status.def.stewardship, 0);
    out.prestige = finite(status.def.prestige, 0);
    out.learning = status.career.profession === 'merchant'
      ? finite(status.def.merchantLearning, 0) : 0;
    out.lettered = !out.learning ||
      (c.traits && c.traits.indexOf('literate') >= 0);
    out.missing = status.missing;
    out.blocked = !status.ready;
    out.vacancy = status.vacancy;
    return out;
  };

  FB.beginGuildElection = function (state, c, office) {
    var status = FB.guildElectionStatus(state, c, office);
    if (!status.ready) return false;
    var store = electionStore(state, true);
    state.player.gold -= status.cost;
    store.active = {
      id:'election:' + status.definitionId + ':' + state.turn + ':' + c.id,
      definitionId:status.definitionId,
      kind:'guild', office:status.office,
      candidateId:c.id, profession:status.profession,
      scopeId:status.scopeId,
      startedTurn:state.turn,
      expiresTurn:state.turn + Math.max(1,
        Math.round(finite(status.def.campaignDays, 90))),
      tacticId:null
    };
    FB.news(state, FB.msg('news.election.guild_begins',
      '🗳 {name} enters the election for {office}; the nomination purse is spent.', {
        name:c.name,
        office:FB.dataParam('election', status.definitionId, 'name')
      }));
    return store.active;
  };

  FB.activeElection = function (state) {
    var store = electionStore(state, false);
    var active = store && store.active;
    return activeElectionValid(state, active) && state.turn < active.expiresTurn
      ? active : null;
  };

  FB.activeElectionForCharacter = function (state, cid) {
    var active = FB.activeElection(state);
    return active && active.kind === 'guild' && active.candidateId === cid
      ? active : null;
  };

  FB.activeCouncilElection = function (state, seatId) {
    var active = FB.activeElection(state);
    return active && active.kind === 'council' &&
      (!seatId || active.office === seatId) ? active : null;
  };

  function electionCandidateFacts(state, active) {
    if (active.kind === 'guild') {
      var c = state.chars[active.candidateId];
      var career = c && FB.careerOf(state, c);
      return {
        id:c.id, name:FB.fullName(c), characterId:c.id,
        standing:finite(career && career.guildStanding, 0),
        stewardship:FB.skillOf(c, 'ste'),
        diplomacy:FB.skillOf(c, 'dip'),
        martial:FB.skillOf(c, 'mar'),
        prestige:finite(state.player.prestige, 0),
        rank:0
      };
    }
    var realm = state.realms[active.nomineeRealmId];
    var snapshot = FB.realmRulerCharacterSnapshot
      ? FB.realmRulerCharacterSnapshot(state, active.nomineeRealmId) : null;
    return {
      id:active.nomineeRealmId,
      name:realm && realm.ruler ? realm.ruler.name : active.nomineeRealmId,
      realmId:active.nomineeRealmId,
      standing:FB.standingOf(state, {
        kind:'realm', id:active.nomineeRealmId
      }),
      stewardship:snapshot ? FB.skillOf(snapshot, 'ste') :
        finite(realm && realm.ruler && realm.ruler.ste, 6),
      diplomacy:snapshot ? FB.skillOf(snapshot, 'dip') :
        finite(realm && realm.ruler && realm.ruler.dip, 6),
      martial:snapshot ? FB.skillOf(snapshot, 'mar') :
        finite(realm && realm.ruler && realm.ruler.mar, 6),
      prestige:finite(state.player.prestige, 0),
      rank:finite(realm && realm.rank, 1)
    };
  }

  function electorateChance(state, active, def, electorate, facts) {
    var chance = finite(electorate.base, 0.4);
    var standingBase = active.kind === 'guild' ? 50 : 0;
    chance += (facts.standing - standingBase) *
      finite(electorate.standingRate, 0);
    chance += (facts.stewardship - 8) *
      finite(electorate.stewardshipRate, 0);
    chance += (facts.diplomacy - 6) *
      finite(electorate.diplomacyRate, 0);
    chance += (facts.martial - 6) *
      finite(electorate.martialRate, 0);
    chance += Math.max(-0.15, Math.min(0.15,
      (facts.prestige - 50) * finite(electorate.prestigeRate, 0)));
    chance += facts.rank * finite(electorate.rankRate, 0);
    var tactic = active.tacticId && def.tactics && def.tactics[active.tacticId];
    if (tactic && tactic.support) {
      chance += finite(tactic.support[electorate.id], 0);
    }
    return FB.clamp(chance, 0.10, 0.90);
  }

  FB.electionForecast = function (state, election) {
    var active = election || FB.activeElection(state);
    var def = active && electionDef(active.definitionId);
    if (!active || !def) return null;
    var facts = electionCandidateFacts(state, active);
    var electorates = [];
    var totalWeight = 0;
    var expected = 0;
    var defs = Array.isArray(def.electorates) ? def.electorates : [];
    for (var i = 0; i < defs.length; i++) {
      var electorate = defs[i];
      if (!electorate || typeof electorate.id !== 'string') continue;
      var weight = Math.max(1, Math.round(finite(electorate.weight, 1)));
      var chance = electorateChance(state, active, def, electorate, facts);
      totalWeight += weight;
      expected += chance * weight;
      electorates.push({
        id:electorate.id,
        index:i,
        weight:weight,
        supportChance:chance
      });
    }
    var candidateShare = totalWeight ? expected / totalWeight : 0;
    var candidates = [{
      id:facts.id, kind:active.kind === 'guild' ? 'character' : 'realm',
      characterId:facts.characterId || null,
      realmId:facts.realmId || null,
      support:candidateShare
    }];
    var rivals = Array.isArray(def.rivals) ? def.rivals : [];
    var remainder = Math.max(0, 1 - candidateShare);
    for (i = 0; i < rivals.length; i++) {
      var portion = rivals.length === 1 ? remainder :
        (i === 0 ? remainder * 0.6 : remainder * 0.4 / (rivals.length - 1));
      candidates.push({ id:rivals[i].id, kind:'abstract',
        definitionIndex:i, support:portion });
    }
    return {
      electionId:active.id,
      definitionId:active.definitionId,
      kind:active.kind,
      office:active.office,
      candidate:facts,
      candidates:candidates,
      electorates:electorates,
      totalWeight:totalWeight,
      majority:Math.floor(totalWeight / 2) + 1,
      expectedSupport:candidateShare,
      tacticId:active.tacticId,
      startedTurn:active.startedTurn,
      expiresTurn:active.expiresTurn,
      termDays:finite(def.termDays, 1440)
    };
  };

  FB.electionTacticStatus = function (state, tacticId) {
    var active = FB.activeElection(state);
    var def = active && electionDef(active.definitionId);
    var tactic = def && def.tactics && def.tactics[tacticId];
    var missing = [];
    if (!active || !tactic) return { ready:false, missing:[FB.T('No such election tactic is available.')] };
    if (active.tacticId) missing.push(FB.T('The campaign has already chosen its one election tactic.'));
    if (state.player.gold < finite(tactic.gold, 0)) {
      missing.push(FB.T('Requires {money:gold}; you have {money:current}.', {
        gold:tactic.gold, current:Math.floor(state.player.gold)
      }));
    }
    if (active.kind === 'guild' && finite(tactic.guildStanding, 0)) {
      var career = FB.careerOf(state, state.chars[active.candidateId]);
      if (!career || career.guildStanding < tactic.guildStanding) {
        missing.push(FB.T('Requires {standing} Guild Standing; currently {current}.', {
          standing:tactic.guildStanding,
          current:Math.round(career && career.guildStanding || 0)
        }));
      }
    }
    if (active.kind === 'council' && finite(tactic.authority, 0) &&
        (!state.council || finite(state.council.authority, 0) < tactic.authority)) {
      missing.push(FB.T('Requires {authority} Crown Authority; currently {current}.', {
        authority:tactic.authority,
        current:Math.round(state.council && state.council.authority || 0)
      }));
    }
    return {
      ready:!missing.length,
      tacticId:tacticId,
      gold:finite(tactic.gold, 0),
      guildStanding:finite(tactic.guildStanding, 0),
      authority:finite(tactic.authority, 0),
      missing:missing
    };
  };

  FB.chooseElectionTactic = function (state, tacticId) {
    var status = FB.electionTacticStatus(state, tacticId);
    var active = FB.activeElection(state);
    if (!active || !status.ready) return false;
    state.player.gold -= status.gold;
    if (status.guildStanding) {
      var career = FB.careerOf(state, state.chars[active.candidateId]);
      career.guildStanding -= status.guildStanding;
    }
    if (status.authority && FB.councilAuthority) {
      FB.councilAuthority(state, -status.authority);
    }
    active.tacticId = tacticId;
    active.tacticTurn = state.turn;
    return true;
  };

  function abstractWinner(def, forecast) {
    var rivals = Array.isArray(def.rivals) ? def.rivals : [];
    if (!rivals.length) return 'opposition';
    var winner = rivals[0];
    var best = -1;
    for (var i = 1; i < forecast.candidates.length; i++) {
      if (forecast.candidates[i].support > best) {
        best = forecast.candidates[i].support;
        winner = rivals[forecast.candidates[i].definitionIndex] || winner;
      }
    }
    return winner.id;
  }

  function resolveGuildElection(state, active, def, won, forecast, winnerId) {
    var c = state.chars[active.candidateId];
    var career = FB.careerOf(state, c);
    var scope = guildScope(state, active.profession, active.scopeId, true);
    var term = termRecord(won ? 'character' : 'abstract',
      won ? c.id : winnerId, state, def.termDays, active.id);
    scope.offices[active.office] = term;
    if (won) {
      career.guildRank = active.office;
      career.guildStanding = Math.min(
        finite(FBDATA.balance.guildStandingMax, 100),
        finite(career.guildStanding, 0) +
          (active.office === 'guildmaster' ? 25 : 20));
      if (active.office === 'officer') state.player.prestige += 8;
      else {
        state.player.prestige += 20;
        var officer = scope.offices.officer;
        if (!validTerm(officer) || officer.holderKind !== 'character' ||
            officer.holderId !== c.id) {
          scope.offices.officer = termRecord('character', c.id, state,
            def.termDays, active.id);
        } else {
          officer.endTurn = Math.max(officer.endTurn, term.endTurn);
        }
      }
      if (c.id === state.player.charId) state.player.flags.guild_member = 1;
      FB.news(state, FB.msg('news.election.guild_won',
        { forms:{ select:'value', param:'rank', cases:{
          officer:'🏅 {name} wins the guild election and begins a fixed term as an officer.',
          guildmaster:'🏅 {name} wins the guild election and begins a fixed term as guildmaster.',
          other:'🏅 {name} wins the guild election and begins a fixed term.'
        } } }, { name:c.name, rank:active.office }));
    } else {
      setCooldown(state, 'guild', active.office, c.id,
        def.defeatCooldownDays);
      FB.news(state, FB.msg('news.election.guild_lost',
        '🗳 {name} loses the guild election; another candidate holds the office for the term.', {
          name:c.name
        }));
    }
    if (c.id === state.player.charId && FB.syncPlayerCareer) {
      FB.syncPlayerCareer(state);
    }
    return term;
  }

  function resolveCouncilElection(state, active, def, won) {
    var store = electionStore(state, true);
    if (won && FB.councilAppoint) {
      var result = FB.councilAppoint(state, active.office,
        active.nomineeRealmId, { confirmed:true });
      if (!result) won = false;
    }
    if (won) {
      store.councilTerms[active.office] = termRecord('realm',
        active.nomineeRealmId, state, def.termDays, active.id);
      var realm = state.realms[active.nomineeRealmId];
      FB.news(state, FB.msg('news.election.council_confirmed',
        '🏛 The chartered council confirms {ruler} for a protected term.', {
          ruler:realm && realm.ruler ? realm.ruler.name : active.nomineeRealmId
        }));
    } else {
      setCooldown(state, 'council', active.office,
        active.nomineeRealmId, def.defeatCooldownDays);
      FB.news(state, FB.msg('news.election.council_rejected',
        '🗳 The chartered council rejects the crown’s nominee; the existing holder or vacancy remains.', {}));
    }
    return won;
  }

  FB.resolveElection = function (state) {
    var active = FB.activeElection(state);
    var def = active && electionDef(active.definitionId);
    if (!active || !def || !active.tacticId) return false;
    var forecast = FB.electionForecast(state, active);
    var outcomes = {};
    var support = 0;
    for (var i = 0; i < forecast.electorates.length; i++) {
      var electorate = forecast.electorates[i];
      var backed = FB.rng() < electorate.supportChance;
      outcomes[electorate.id] = backed ? 'support' : 'oppose';
      if (backed) support += electorate.weight;
    }
    var won = support >= forecast.majority;
    var winnerId = won ? forecast.candidate.id : abstractWinner(def, forecast);
    var originalWon = won;
    if (active.kind === 'guild') {
      resolveGuildElection(state, active, def, won, forecast, winnerId);
    } else {
      won = resolveCouncilElection(state, active, def, won);
      if (!won && originalWon) winnerId = 'installation_failed';
    }
    var result = {
      id:active.id,
      definitionId:active.definitionId,
      kind:active.kind,
      office:active.office,
      candidateId:active.candidateId || null,
      nomineeRealmId:active.nomineeRealmId || null,
      nomineeGeneration:active.nomineeGeneration === undefined
        ? null : active.nomineeGeneration,
      profession:active.profession || null,
      scopeId:active.scopeId || null,
      tacticId:active.tacticId,
      outcomes:outcomes,
      supportWeight:support,
      totalWeight:forecast.totalWeight,
      majority:forecast.majority,
      passed:!!won,
      winnerId:winnerId,
      resolvedTurn:state.turn,
      result:won ? 'won' : 'lost'
    };
    archiveElection(state, result);
    electionStore(state, true).active = null;
    return result;
  };

  FB.withdrawElection = function (state) {
    var active = FB.activeElection(state);
    var def = active && electionDef(active.definitionId);
    if (!active || !def) return false;
    setCooldown(state, active.kind, active.office,
      active.kind === 'guild' ? active.candidateId : active.nomineeRealmId,
      Math.max(180, Math.round(finite(def.defeatCooldownDays, 360) / 2)));
    var result = {
      id:active.id, definitionId:active.definitionId, kind:active.kind,
      office:active.office, candidateId:active.candidateId || null,
      nomineeRealmId:active.nomineeRealmId || null,
      nomineeGeneration:active.nomineeGeneration === undefined
        ? null : active.nomineeGeneration,
      resolvedTurn:state.turn, result:'withdrawn'
    };
    archiveElection(state, result);
    electionStore(state, true).active = null;
    return result;
  };

  FB.councilAppointmentStatus = function (state, seatId, rid) {
    var requires = FB.councilSeatRequiresConfirmation(state, seatId);
    var definition = requires
      ? electionDef(councilElectionDefinition(seatId)) : null;
    var realm = rid && state.realms[rid];
    var missing = [];
    if (!FB.councilSeat || !FB.councilSeat(seatId, state)) {
      missing.push(FB.T('That great office does not exist.'));
    }
    if (!realm || !realm.alive || realm.liege !== 'player') {
      missing.push(FB.T('The nominee must be a living direct vassal.'));
    }
    var store = electionStore(state, false);
    if (requires && store && store.active) {
      missing.push(FB.T('Another election campaign is already active.'));
    }
    var term = store && store.councilTerms && store.councilTerms[seatId];
    var holder = state.council && state.council.seats &&
      state.council.seats[seatId];
    var terms = store && store.councilTerms || {};
    for (var protectedSeatId in terms) {
      if (!own(terms, protectedSeatId) || protectedSeatId === seatId) continue;
      var protectedTerm = terms[protectedSeatId];
      if (validTerm(protectedTerm) && protectedTerm.holderId === rid &&
          state.turn < protectedTerm.endTurn) {
        missing.push(FB.T('The nominee already holds another protected great office.'));
      }
    }
    if (requires && validTerm(term) && holder === term.holderId &&
        holder !== rid && state.turn < term.endTurn) {
      missing.push(FB.T('The confirmed holder has {days} protected days remaining.', {
        days:Math.ceil(term.endTurn - state.turn)
      }));
    }
    var cooldown = requires && rid
      ? cooldownRemaining(state, 'council', seatId, rid) : 0;
    if (cooldown) missing.push(FB.T('This nominee cannot stand again for {days} days.', {
      days:cooldown
    }));
    var cost = finite(definition && definition.nominationCost, 0);
    if (requires && state.player.gold < cost) {
      missing.push(FB.T('Requires {money:gold} in nomination expenses.', {
        gold:cost
      }));
    }
    return {
      ready:!missing.length,
      requiresConfirmation:requires,
      direct:!requires,
      seatId:seatId,
      nomineeRealmId:rid,
      cost:cost,
      term:validTerm(term) ? term : null,
      missing:missing
    };
  };

  FB.beginCouncilConfirmation = function (state, seatId, rid) {
    var status = FB.councilAppointmentStatus(state, seatId, rid);
    var definitionId = councilElectionDefinition(seatId);
    var def = electionDef(definitionId);
    if (!status.ready || !status.requiresConfirmation || !def) return false;
    var store = electionStore(state, true);
    state.player.gold -= status.cost;
    store.active = {
      id:'election:' + definitionId + ':' + state.turn + ':' + rid,
      definitionId:definitionId,
      kind:'council', office:seatId,
      nomineeRealmId:rid,
      nomineeGeneration:finite(state.realms[rid].ruler &&
        state.realms[rid].ruler.generation, 0),
      startedTurn:state.turn,
      expiresTurn:state.turn + Math.max(1,
        Math.round(finite(def.campaignDays, 60))),
      tacticId:null
    };
    return store.active;
  };

  FB.councilDismissalStatus = function (state, seatId) {
    var holder = state.council && state.council.seats &&
      state.council.seats[seatId];
    if (!holder) return { ready:false, reason:FB.T('The office is vacant.') };
    var store = electionStore(state, false);
    var term = store && store.councilTerms && store.councilTerms[seatId];
    if (FB.councilSeatRequiresConfirmation(state, seatId) &&
        validTerm(term) && term.holderId === holder && state.turn < term.endTurn) {
      return {
        ready:false,
        reason:FB.T('The charter protects this holder for {days} more days.', {
          days:Math.ceil(term.endTurn - state.turn)
        }),
        term:term
      };
    }
    return { ready:true, reason:null, term:validTerm(term) ? term : null };
  };

  function privilegeStore(state, create) {
    var records = state && state.privileges;
    if (!Array.isArray(records) && create) records = state.privileges = [];
    return Array.isArray(records) ? records : [];
  }

  function privilegeRecordId(effectKind, effectId, scopeId) {
    return 'privilege:' + effectKind + ':' + effectId + ':' + scopeId;
  }

  function upsertPrivilege(state, next) {
    var records = privilegeStore(state, true);
    for (var i = 0; i < records.length; i++) {
      if (records[i] && records[i].id === next.id) {
        var grantedTurn = records[i].grantedTurn;
        records[i] = next;
        if (isFinite(Number(grantedTurn))) records[i].grantedTurn = grantedTurn;
        return records[i];
      }
    }
    records.push(next);
    return next;
  }

  function modifierPrivilegeDefinition(modifierId, sourceEventId, preferredId) {
    if (preferredId && privilegeDef(preferredId)) return preferredId;
    var candidates = [];
    var defs = FBDATA.privileges || {};
    for (var id in defs) {
      if (!own(defs, id)) continue;
      var def = privilegeDef(id);
      if (!def || !def.effect || def.effect.kind !== 'modifier' ||
          def.effect.id !== modifierId) continue;
      candidates.push({ id:id, def:def });
    }
    candidates.sort(function (a, b) {
      var aMatch = Array.isArray(a.def.sourceEvents) &&
        a.def.sourceEvents.indexOf(sourceEventId) >= 0;
      var bMatch = Array.isArray(b.def.sourceEvents) &&
        b.def.sourceEvents.indexOf(sourceEventId) >= 0;
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
      var aSpecific = Array.isArray(a.def.sourceEvents);
      var bSpecific = Array.isArray(b.def.sourceEvents);
      if (aSpecific !== bSpecific) return aSpecific ? 1 : -1;
      return finite(a.def.order, 99) - finite(b.def.order, 99) ||
        compareId(a.id, b.id);
    });
    return candidates.length ? candidates[0].id : null;
  }

  function modifierRecord(state, modifierId, pid) {
    var records = FB.countyModifierRecords
      ? FB.countyModifierRecords(state, pid) : [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].id === modifierId) return records[i];
    }
    return null;
  }

  function inferredGrantor(state, sourceEventId) {
    if (sourceEventId && sourceEventId.indexOf('parliament_') === 0 &&
        state.player.liege) return { type:'realm', id:state.player.liege };
    if (sourceEventId && sourceEventId.indexOf('council_') === 0) {
      return { type:'realm', id:'player' };
    }
    return { type:state.player.tier >= 3 ? 'realm' : 'local',
      id:state.player.tier >= 3 ? 'player' : null };
  }

  FB.recordModifierPrivilege = function (state, modifierId, pid, options) {
    options = options || {};
    var sourceEventId = options.sourceEventId || null;
    var defId = modifierPrivilegeDefinition(modifierId, sourceEventId,
      options.privilegeDefId);
    var def = defId && privilegeDef(defId);
    var effectRecord = def && modifierRecord(state, modifierId, pid);
    if (!def || !effectRecord) return null;
    var grantor = options.grantor || inferredGrantor(state, sourceEventId);
    var holderType = def.holderTypes && def.holderTypes.indexOf('faith') >= 0
      ? 'faith' : 'county';
    var province = FB.world.byId[pid];
    var holderId = holderType === 'faith'
      ? (province && province.religion) || (playerChar(state) || {}).religion
      : pid;
    var next = {
      id:privilegeRecordId('modifier', modifierId, pid),
      defId:defId,
      holderType:holderType,
      holderId:holderId || pid,
      grantorType:grantor.type || 'realm',
      grantorId:grantor.id || null,
      scopeType:'county', scopeId:pid,
      sourceType:options.sourceType || (sourceEventId ? 'event' : 'legacy'),
      sourceId:options.sourceId || sourceEventId || null,
      effectKind:'modifier', effectId:modifierId,
      grantedTurn:state.turn,
      revocationRule:def.revocation || 'protected_term'
    };
    if (isFinite(Number(effectRecord.endTurn))) {
      next.endTurn = Number(effectRecord.endTurn);
    }
    return upsertPrivilege(state, next);
  };

  FB.removePrivilegeForModifier = function (state, modifierId, pid) {
    var records = privilegeStore(state, false);
    var id = privilegeRecordId('modifier', modifierId, pid);
    for (var i = records.length - 1; i >= 0; i--) {
      if (records[i] && records[i].id === id) records.splice(i, 1);
    }
  };

  function monopolyPrivilegeRecord(state, slot, contract) {
    var holderType = slot === 'outgoing' ? 'guild' : 'house';
    var holderId = slot === 'outgoing'
      ? 'local_guild:' + contract.profession + ':' + contract.scopeId
      : state.player.charId;
    var scopeType = contract.scope === 'province' ? 'county' : 'realm';
    return {
      id:'privilege:guild_monopoly:' + contract.contractId,
      defId:'guild_monopoly',
      holderType:holderType, holderId:holderId,
      grantorType:contract.grantorKind === 'realm' ||
        contract.grantorKind === 'player' ? 'realm' : 'local',
      grantorId:contract.grantorId || null,
      scopeType:scopeType,
      scopeId:contract.scopeId,
      sourceType:'charter', sourceId:contract.contractId,
      effectKind:'guild_monopoly', effectId:contract.contractId,
      grantedTurn:contract.startTurn,
      endTurn:contract.endTurn,
      revocationRule:'term_only',
      profession:contract.profession,
      monopolySlot:slot,
      enterpriseBonus:finite(contract.enterpriseBonus, 0),
      taxBonus:finite(contract.taxBonus, 0),
      rulerFee:finite(contract.rulerFee, 0),
      popularOpinion:finite(contract.popularOpinion, 0)
    };
  }

  function consentPrivilegeRecord(state) {
    return {
      id:'privilege:obligation:revocationConsent:' + state.player.liege,
      defId:'consent_of_estates',
      holderType:'institution', holderId:'estates:' + state.player.liege,
      grantorType:'realm', grantorId:state.player.liege,
      scopeType:'realm', scopeId:state.player.liege,
      sourceType:'law', sourceId:'revocation_consent',
      effectKind:'obligation', effectId:'revocationConsent',
      grantedTurn:state.turn,
      revocationRule:'estates_vote'
    };
  }

  function privilegeEffectStillActive(state, record) {
    if (record.effectKind === 'modifier') {
      return !!modifierRecord(state, record.effectId, record.scopeId);
    }
    if (record.effectKind === 'guild_monopoly') {
      return !!(FB.guildMonopolyByContract &&
        FB.guildMonopolyByContract(state, record.effectId));
    }
    if (record.effectKind === 'obligation') {
      var realm = state.realms[record.scopeId];
      return !!(state.player.liege === record.scopeId && realm &&
        realm.obl && realm.obl.revocationConsent);
    }
    if (record.effectKind === 'council_confirmation') {
      return state.player.tier >= 6 && record.scopeId === 'player';
    }
    return false;
  }

  function repairPrivileges(state, skipLegacyModifiers) {
    var records = privilegeStore(state, true);
    var repaired = [];
    var seen = {};
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      if (!record || typeof record !== 'object' || Array.isArray(record) ||
          typeof record.id !== 'string' || !privilegeDef(record.defId) ||
          typeof record.holderType !== 'string' ||
          typeof record.scopeType !== 'string' ||
          typeof record.scopeId !== 'string' ||
          (isFinite(Number(record.endTurn)) &&
           Number(record.endTurn) <= state.turn) ||
          !privilegeEffectStillActive(state, record) || seen[record.id]) {
        continue;
      }
      seen[record.id] = 1;
      repaired.push(record);
    }
    state.privileges = repaired;

    /* Add/remove modifier APIs maintain privilege provenance live. The full
       county sweep is only for load-time legacy repair, not every daily tick. */
    if (!skipLegacyModifiers) {
      var county = state.modifiers && state.modifiers.county || {};
      for (var pid in county) {
        if (!own(county, pid)) continue;
        var modifierRecords = FB.countyModifierRecords
          ? FB.countyModifierRecords(state, pid) : [];
        for (i = 0; i < modifierRecords.length; i++) {
          var modifier = modifierRecords[i];
          var existingId = privilegeRecordId('modifier', modifier.id, pid);
          if (!seen[existingId]) {
            var added = FB.recordModifierPrivilege(state, modifier.id, pid, {
              sourceEventId:modifier.sourceEventId || null,
              sourceType:modifier.sourceEventId ? 'event' : 'legacy'
            });
            if (added) seen[existingId] = 1;
          }
        }
      }
    }
    if (FB.ensureGuildMonopolies) {
      var slots = FB.ensureGuildMonopolies(state);
      for (var slotIndex = 0; slotIndex < 2; slotIndex++) {
        var slot = slotIndex ? 'outgoing' : 'incoming';
        var contract = FB.guildMonopolyActive(state, slot);
        if (contract) upsertPrivilege(state,
          monopolyPrivilegeRecord(state, slot, contract));
      }
    }
    var liege = state.player.liege && state.realms[state.player.liege];
    if (liege && liege.obl && liege.obl.revocationConsent) {
      upsertPrivilege(state, consentPrivilegeRecord(state));
    }
    return state.privileges;
  }

  FB.privilegeSummary = function (state) {
    var records = privilegeStore(state, false).filter(function (record) {
      return !!(record && privilegeDef(record.defId) &&
        (!isFinite(Number(record.endTurn)) || state.turn < record.endTurn));
    }).map(function (record) {
      return {
        id:record.id,
        defId:record.defId,
        holderType:record.holderType,
        holderId:record.holderId,
        grantorType:record.grantorType,
        grantorId:record.grantorId,
        scopeType:record.scopeType,
        scopeId:record.scopeId,
        sourceType:record.sourceType,
        sourceId:record.sourceId,
        effectKind:record.effectKind,
        effectId:record.effectId,
        grantedTurn:record.grantedTurn,
        endTurn:isFinite(Number(record.endTurn)) ? record.endTurn : null,
        remainingDays:isFinite(Number(record.endTurn))
          ? Math.max(0, Math.ceil(record.endTurn - state.turn)) : null,
        revocationRule:record.revocationRule,
        profession:record.profession || null,
        monopolySlot:record.monopolySlot || null,
        enterpriseBonus:finite(record.enterpriseBonus, 0),
        taxBonus:finite(record.taxBonus, 0),
        rulerFee:finite(record.rulerFee, 0),
        popularOpinion:finite(record.popularOpinion, 0)
      };
    });
    records.sort(function (a, b) {
      var ad = privilegeDef(a.defId) || {};
      var bd = privilegeDef(b.defId) || {};
      return finite(ad.order, 99) - finite(bd.order, 99) ||
        compareId(a.id, b.id);
    });
    return records;
  };

  FB.hasPrivilege = function (state, defId, scopeId) {
    var summary = FB.privilegeSummary(state);
    for (var i = 0; i < summary.length; i++) {
      if (summary[i].defId === defId &&
          (!scopeId || summary[i].scopeId === scopeId)) return true;
    }
    return false;
  };

  FB.privilegeGrantStatus = function (state, defId) {
    var def = privilegeDef(defId);
    if (!def || !def.effect) {
      return {
        ready:false,
        reason:FB.T('That privilege is not recognized.'),
        missingTech:[]
      };
    }
    var technology = FB.techRequirementStatus
      ? FB.techRequirementStatus(state, def.requiresTech) : {
          ready:!def.requiresTech || FB.techRequirementMet(state, def.requiresTech),
          requirements:[], missing:[]
        };
    if (!technology.ready) {
      return {
        ready:false,
        techLocked:true,
        requiredTech:technology.requirements,
        missingTech:technology.missing,
        reason:FB.techRequirementReason
          ? FB.techRequirementReason(state, def.requiresTech) : ''
      };
    }
    return { ready:true, reason:'', missingTech:[] };
  };

  FB.grantPrivilege = function (state, defId, options) {
    options = options || {};
    var def = privilegeDef(defId);
    if (!def || !def.effect) return false;
    var status = FB.privilegeGrantStatus(state, defId);
    if (!status.ready && !options.grandfathered) return false;
    var effect = def.effect;
    if (effect.kind === 'modifier') {
      var pid = options.scopeId || state.player.provinceId;
      if (!pid || !FB.addModifier(state, effect.id, pid, {
          sourceEventId:options.sourceId || null,
          privilegeDefId:defId,
          sourceType:options.sourceType || 'grant',
          grantor:options.grantor || { type:'realm', id:'player' }
        })) return false;
      return FB.recordModifierPrivilege(state, effect.id, pid, {
        sourceEventId:options.sourceId || null,
        privilegeDefId:defId,
        sourceType:options.sourceType || 'grant',
        sourceId:options.sourceId || null,
        grantor:options.grantor || { type:'realm', id:'player' }
      });
    }
    if (effect.kind === 'obligation' && state.player.liege) {
      var realm = state.realms[state.player.liege];
      if (!realm) return false;
      realm.obl = realm.obl || {};
      realm.obl.revocationConsent = true;
      return upsertPrivilege(state, consentPrivilegeRecord(state));
    }
    if (effect.kind === 'council_confirmation' && state.player.tier >= 6) {
      var record = {
        id:'privilege:council_confirmation:office_confirmation:player',
        defId:defId,
        holderType:'institution', holderId:'council:player',
        grantorType:options.grantorType || 'realm',
        grantorId:options.grantorId || 'player',
        scopeType:'realm', scopeId:'player',
        sourceType:options.sourceType || 'charter',
        sourceId:options.sourceId || null,
        effectKind:'council_confirmation', effectId:defId,
        grantedTurn:state.turn,
        revocationRule:def.revocation || 'council_consent'
      };
      upsertPrivilege(state, record);
      ensureCouncilTerms(state, electionStore(state, true));
      return record;
    }
    return false;
  };

  FB.privilegeRevocationStatus = function (state, recordId) {
    var record = null;
    var records = privilegeStore(state, false);
    for (var i = 0; i < records.length; i++) {
      if (records[i] && records[i].id === recordId) record = records[i];
    }
    if (!record) return { ready:false, reason:FB.T('That privilege is no longer active.') };
    if (record.effectKind !== 'modifier') {
      return { ready:false, reason:FB.T('This charter cannot be revoked unilaterally through this authority.') };
    }
    var local = record.scopeId === state.player.provinceId ||
      (state.player.provs || []).indexOf(record.scopeId) >= 0;
    if (state.player.tier < 3 || !local) {
      return { ready:false, reason:FB.T('The privilege lies outside your present territorial authority.') };
    }
    return {
      ready:true,
      unlawful:true,
      record:record,
      reason:FB.T('Revoking before the protected term ends is unlawful and organizes opposition.')
    };
  };

  FB.revokePrivilege = function (state, recordId) {
    var status = FB.privilegeRevocationStatus(state, recordId);
    if (!status.ready || !status.record) return false;
    var record = status.record;
    if (!FB.removeModifier(state, record.effectId, record.scopeId,
        { notice:true })) return false;
    FB.removePrivilegeForModifier(state, record.effectId, record.scopeId);
    state.player.pop = FB.clamp((state.player.pop || 0) - 10, -100, 100);
    FB.notePoliticalMistreatment(state, 'unlawful_privilege_revocation', {
      privilegeId:record.defId, scopeId:record.scopeId
    });
    if (record.holderType === 'faith') {
      FB.notePoliticalMistreatment(state, 'religious_persecution', {
        privilegeId:record.defId, scopeId:record.scopeId
      });
    }
    FB.addCollectiveOpposition(state,
      record.holderType === 'faith' ? 'faith' : 'commons',
      record.defId, 1);
    FB.news(state, FB.msg('news.privilege.revoked_unlawfully',
      '✊ A protected privilege is revoked before its term; organized opposition hardens.', {}));
    return true;
  };

  function demandStore(state, create) {
    var store = state && state.collectiveDemands;
    if ((!store || typeof store !== 'object' || Array.isArray(store)) && create) {
      store = state.collectiveDemands = {};
    }
    if (!store || typeof store !== 'object' || Array.isArray(store)) return null;
    if (create) {
      if (!own(store, 'pending')) store.pending = null;
      if (!store.lastYears || typeof store.lastYears !== 'object' ||
          Array.isArray(store.lastYears)) store.lastYears = {};
      if (!store.opposition || typeof store.opposition !== 'object' ||
          Array.isArray(store.opposition)) store.opposition = {};
      if (!Array.isArray(store.mistreatment)) store.mistreatment = [];
    }
    return store;
  }

  FB.notePoliticalMistreatment = function (state, kind, details) {
    var store = demandStore(state, true);
    if (typeof kind !== 'string' || !kind) return false;
    var record = { kind:kind, turn:state.turn };
    details = details || {};
    for (var key in details) {
      if (own(details, key) && (typeof details[key] === 'string' ||
          typeof details[key] === 'number' || typeof details[key] === 'boolean')) {
        record[key] = details[key];
      }
    }
    store.mistreatment.push(record);
    store.mistreatment = store.mistreatment.filter(function (item) {
      return item && isFinite(Number(item.turn)) &&
        state.turn - Number(item.turn) <= MISTREATMENT_DAYS;
    }).slice(-24);
    return record;
  };

  function recentMistreatment(state, kind) {
    var store = demandStore(state, false);
    var rows = store && Array.isArray(store.mistreatment)
      ? store.mistreatment : [];
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].kind === kind &&
          state.turn - finite(rows[i].turn, -Infinity) <= MISTREATMENT_DAYS) {
        out.push(rows[i]);
      }
    }
    return out;
  }

  FB.addCollectiveOpposition = function (state, constituency, privilegeId, amount) {
    var store = demandStore(state, true);
    var current = store.opposition[constituency];
    var level = current && finite(current.level, 0) || 0;
    store.opposition[constituency] = {
      constituency:constituency,
      privilegeId:privilegeId || null,
      level:FB.clamp(level + Math.max(1, Math.round(finite(amount, 1))), 1, 5),
      lastTurn:state.turn,
      lastYear:state.date.year
    };
    return store.opposition[constituency];
  };

  function demandResult(pressure, scopeId, reasons) {
    return pressure > 0 ? {
      pressure:Math.round(pressure), scopeId:scopeId,
      reasons:reasons || []
    } : false;
  }

  FB.fns = FB.fns || {};
  FB.fns.collective_demand_commons = function (state) {
    var pid = state.player.provinceId;
    var voice = FB.popEffective ? FB.popEffective(state) : state.player.pop || 0;
    if (!pid || voice > -20 || FB.hasPrivilege(state, 'confirmed_custom', pid)) {
      return false;
    }
    return demandResult(-voice + 10, pid,
      [{ id:'common_voice', value:voice }]);
  };

  FB.fns.collective_demand_tax = function (state) {
    var pid = state.player.provinceId;
    var taxes = recentMistreatment(state, 'extraordinary_tax');
    if (!pid || !taxes.length || FB.hasPrivilege(state, 'tax_concession', pid)) {
      return false;
    }
    var voice = FB.popEffective ? FB.popEffective(state) : state.player.pop || 0;
    return demandResult(35 + taxes.length * 12 + Math.max(0, -voice), pid,
      [{ id:'extraordinary_tax', value:taxes.length },
       { id:'common_voice', value:voice }]);
  };

  FB.fns.collective_demand_guild = function (state) {
    var pid = state.player.provinceId;
    if (!pid || !FB.hasModifier || !FB.hasModifier(state, 'contested_tolls', pid) ||
        FB.hasPrivilege(state, 'market_charter', pid)) return false;
    return demandResult(45 + Math.max(0, -(state.player.pop || 0)), pid,
      [{ id:'contested_tolls', value:1 }]);
  };

  FB.fns.collective_demand_sanctuary = function (state) {
    var pid = state.player.provinceId;
    var persecution = recentMistreatment(state, 'religious_persecution');
    var burden = pid && FB.hasModifier &&
      (FB.hasModifier(state, 'muster_burden', pid) ||
       FB.hasModifier(state, 'settlement_grudge', pid));
    if ((!burden && !persecution.length) ||
        FB.hasPrivilege(state, 'sanctuary', pid) ||
        FB.hasPrivilege(state, 'levy_exemption', pid)) return false;
    return demandResult(38 + persecution.length * 15 +
      Math.max(0, -(state.player.pop || 0)), pid,
      [{ id:'coercive_local_burden', value:burden ? 1 : 0 },
       { id:'religious_persecution', value:persecution.length }]);
  };

  FB.fns.collective_demand_magnates = function (state) {
    if (state.player.tier < 6 || FB.hasPrivilege(state, 'office_confirmation', 'player')) {
      return false;
    }
    var vassals = FB.playerVassals ? FB.playerVassals(state) : [];
    if (!vassals.length) return false;
    var total = 0;
    for (var i = 0; i < vassals.length; i++) {
      total += FB.standingOf(state, { kind:'realm', id:vassals[i] });
    }
    var average = total / vassals.length;
    var authority = state.council ? finite(state.council.authority, 50) : 50;
    var aggression = FB.aggressiveWarHistory
      ? FB.aggressiveWarHistory(state).length : 0;
    var revocations = recentMistreatment(state, 'revocation').length +
      recentMistreatment(state, 'unlawful_privilege_revocation').length;
    var pressure = Math.max(0, -average - 5) +
      Math.max(0, authority - 65) + aggression * 18 + revocations * 15;
    if (pressure < 35) return false;
    return demandResult(pressure, 'player', [
      { id:'vassal_standing', value:average },
      { id:'crown_authority', value:authority },
      { id:'aggressive_wars', value:aggression },
      { id:'revocations', value:revocations }
    ]);
  };

  FB.collectiveDemandCandidates = function (state) {
    var out = [];
    var defs = FBDATA.collectiveDemands || {};
    var store = demandStore(state, false);
    for (var id in defs) {
      if (!own(defs, id)) continue;
      var def = demandDef(id);
      if (!def || state.player.tier < finite(def.minTier, 0) ||
          state.player.tier > finite(def.maxTier, 7)) continue;
      var privilegeStatus = FB.privilegeGrantStatus
        ? FB.privilegeGrantStatus(state, def.privilege) : { ready:true };
      if (!privilegeStatus.ready) continue;
      var lastYear = store && store.lastYears &&
        Number(store.lastYears[id]);
      if (isFinite(lastYear) && state.date.year - lastYear <
          Math.max(1, Math.round(finite(def.cooldownYears, 3)))) continue;
      var gate = def.gate && FB.fns[def.gate];
      var result = gate ? gate(state) : false;
      if (!result || typeof result !== 'object') continue;
      var opposition = store && store.opposition &&
        store.opposition[def.constituency];
      out.push({
        id:id, def:def, pressure:finite(result.pressure, 0) +
          (opposition ? finite(opposition.level, 0) * 10 : 0),
        scopeId:result.scopeId || state.player.provinceId,
        reasons:Array.isArray(result.reasons) ? result.reasons : []
      });
    }
    out.sort(function (a, b) {
      return b.pressure - a.pressure ||
        finite(a.def.order, 99) - finite(b.def.order, 99) ||
        compareId(a.id, b.id);
    });
    return out;
  };

  function pendingDemandValid(state, pending) {
    var def = pending && demandDef(pending.definitionId);
    return !!(def && pending.id && pending.privilegeId === def.privilege &&
      pending.constituency === def.constituency &&
      isFinite(Number(pending.demandedTurn)) &&
      typeof pending.scopeId === 'string' &&
      (!pending.protagonistId || pending.protagonistId ===
        state.player.charId) &&
      (!pending.polityId || pending.polityId ===
        (state.player.liege || 'player')));
  }

  function repairDemandStore(state) {
    var store = demandStore(state, true);
    store.mistreatment = store.mistreatment.filter(function (record) {
      return !!(record && typeof record.kind === 'string' &&
        isFinite(Number(record.turn)) &&
        state.turn - Number(record.turn) <= MISTREATMENT_DAYS);
    }).slice(-24);
    if (store.pending && store.pending.technologyApproved === undefined) {
      store.pending.technologyApproved = true;
    }
    if (store.pending && !pendingDemandValid(state, store.pending)) {
      store.pending = null;
    }
    for (var key in store.lastYears) {
      if (!own(store.lastYears, key) || !demandDef(key) ||
          !isFinite(Number(store.lastYears[key]))) delete store.lastYears[key];
    }
    for (key in store.opposition) {
      if (!own(store.opposition, key)) continue;
      var row = store.opposition[key];
      if (!row || typeof row !== 'object' || !isFinite(Number(row.level)) ||
          !isFinite(Number(row.lastTurn))) delete store.opposition[key];
    }
    return store;
  }

  FB.collectiveDemandSummary = function (state) {
    var store = demandStore(state, false);
    var pending = store && pendingDemandValid(state, store.pending)
      ? store.pending : null;
    var opposition = [];
    var rows = store && store.opposition || {};
    for (var id in rows) {
      if (!own(rows, id)) continue;
      opposition.push({
        constituency:id,
        privilegeId:rows[id].privilegeId || null,
        level:finite(rows[id].level, 1),
        lastTurn:finite(rows[id].lastTurn, 0)
      });
    }
    opposition.sort(function (a, b) {
      return b.level - a.level || compareId(a.constituency, b.constituency);
    });
    return { pending:pending, opposition:opposition };
  };

  function queueCollectiveDemand(state) {
    var store = demandStore(state, true);
    if (store.pending || FB.activeElection(state)) return null;
    var candidates = FB.collectiveDemandCandidates(state);
    if (!candidates.length) return null;
    var selected = candidates[0];
    var def = selected.def;
    store.pending = {
      id:'demand:' + selected.id + ':' + state.turn,
      definitionId:selected.id,
      privilegeId:def.privilege,
      constituency:def.constituency,
      scopeId:String(selected.scopeId),
      polityId:state.player.liege || 'player',
      protagonistId:state.player.charId,
      demandedTurn:state.turn,
      demandedYear:state.date.year,
      pressure:selected.pressure,
      reasons:selected.reasons,
      technologyApproved:true
    };
    FB.queueEvent(state, 'collective_privilege_demand', {
      demandId:store.pending.id,
      definitionId:selected.id,
      privilegeId:def.privilege,
      constituency:def.constituency,
      locationId:String(selected.scopeId),
      privilege:FB.dataParam('privilege', def.privilege, 'name')
    });
    return store.pending;
  }

  FB.fns.collective_demand_valid = function (state, ctx) {
    var store = demandStore(state, false);
    var pending = store && store.pending;
    return !!(pendingDemandValid(state, pending) && ctx &&
      ctx.demandId === pending.id &&
      ctx.definitionId === pending.definitionId &&
      ctx.privilegeId === pending.privilegeId);
  };

  function demandHolder(state, pending) {
    if (pending.privilegeId === 'office_confirmation') {
      return { type:'institution', id:'council:player' };
    }
    if (pending.privilegeId === 'sanctuary') {
      var province = FB.world.byId[pending.scopeId];
      return { type:'faith', id:(province && province.religion) ||
        (playerChar(state) || {}).religion };
    }
    return { type:'county', id:pending.scopeId };
  }

  function acceptDemand(state, ctx) {
    var store = demandStore(state, true);
    var pending = store.pending;
    if (!FB.fns.collective_demand_valid(state, ctx)) return false;
    var holder = demandHolder(state, pending);
    var granted = FB.grantPrivilege(state, pending.privilegeId, {
      scopeId:pending.scopeId,
      holderType:holder.type,
      holderId:holder.id,
      grantor:{ type:'realm', id:'player' },
      sourceType:'demand', sourceId:pending.id,
      grandfathered:pending.technologyApproved !== false
    });
    if (!granted) return false;
    state.player.pop = FB.clamp((state.player.pop || 0) + 6, -100, 100);
    if (pending.constituency === 'magnates') {
      var vassals = FB.playerVassals(state);
      for (var i = 0; i < vassals.length; i++) {
        FB.adjustStanding(state, { kind:'realm', id:vassals[i] }, 8,
          'collective_demand:accepted');
      }
      if (FB.councilAuthority) FB.councilAuthority(state, -10);
    }
    store.lastYears[pending.definitionId] = state.date.year;
    delete store.opposition[pending.constituency];
    store.pending = null;
    return true;
  }

  function refuseDemand(state, ctx, softened) {
    var store = demandStore(state, true);
    var pending = store.pending;
    if (!FB.fns.collective_demand_valid(state, ctx)) return false;
    var loss = softened ? 4 : 8;
    state.player.pop = FB.clamp((state.player.pop || 0) - loss, -100, 100);
    if (pending.constituency === 'magnates') {
      var vassals = FB.playerVassals(state);
      for (var i = 0; i < vassals.length; i++) {
        FB.adjustStanding(state, { kind:'realm', id:vassals[i] },
          softened ? -5 : -10, 'collective_demand:refused');
      }
      if (FB.councilAuthority) FB.councilAuthority(state, softened ? 3 : 6);
    }
    FB.addCollectiveOpposition(state, pending.constituency,
      pending.privilegeId, softened ? 1 : 2);
    store.lastYears[pending.definitionId] = state.date.year;
    store.pending = null;
    return true;
  }

  FB.fns.collective_demand_accept = function (state, ctx) {
    return acceptDemand(state, ctx);
  };
  FB.fns.collective_demand_compromise = function (state, ctx) {
    return acceptDemand(state, ctx);
  };
  FB.fns.collective_demand_refuse = function (state, ctx) {
    return refuseDemand(state, ctx, false);
  };
  FB.fns.collective_demand_negotiation_failed = function (state, ctx) {
    return refuseDemand(state, ctx, true);
  };

  /* ---------- royal policy (religious tolerance & settlement) ----------
     Crown-side `institution:'crown'` entries in the shared policy catalog
     (data/policies.js): standing laws the sovereign player (tier 6+)
     proclaims directly — no Estates campaign, no bloc vote. Only the current
     level id and proclamation stamps are saved (`state.realmPolicies`);
     effects are derived from the catalog. Standing county effects ride
     ordinary county modifiers maintained by FB.realmPolicySync — a
     proclamation never rewrites a county's faith or moves a population
     record. See docs/designs/council.md. */

  function realmPolicyEntryList() {
    var out = [];
    var defs = FBDATA.policies || {};
    for (var id in defs) {
      if (!own(defs, id)) continue;
      var def = defs[id];
      if (!def || typeof def !== 'object' || Array.isArray(def) ||
          def.institution !== 'crown' ||
          !Array.isArray(def.levels) || !def.levels.length) continue;
      out.push({ id:id, def:def });
    }
    out.sort(function (a, b) {
      return finite(a.def.order, 99) - finite(b.def.order, 99) ||
        compareId(a.id, b.id);
    });
    return out;
  }
  FB.realmPolicyList = realmPolicyEntryList;

  function realmPolicyLevelDef(def, levelId) {
    var levels = def && Array.isArray(def.levels) ? def.levels : [];
    for (var i = 0; i < levels.length; i++) {
      if (levels[i] && levels[i].id === levelId) return levels[i];
    }
    return null;
  }

  function realmPolicyLevelIndex(def, levelId) {
    var levels = def && Array.isArray(def.levels) ? def.levels : [];
    for (var i = 0; i < levels.length; i++) {
      if (levels[i] && levels[i].id === levelId) return i;
    }
    return -1;
  }

  function realmPolicyDefaultLevel(def) {
    return realmPolicyLevelDef(def, def.defaultLevel)
      ? def.defaultLevel : def.levels[0].id;
  }

  function realmPolicyStore(state, create) {
    var store = state && state.realmPolicies;
    if ((!store || typeof store !== 'object' || Array.isArray(store)) &&
        create) {
      store = state.realmPolicies = {};
    }
    return store && typeof store === 'object' && !Array.isArray(store)
      ? store : null;
  }

  /* Heal the saved levels: unknown policies drop out, and a missing or
     unknown level falls back to the def's declared default — old saves get
     the customary level on first sight, with no save-version bump. */
  function repairRealmPolicies(state) {
    var store = realmPolicyStore(state, true);
    var entries = realmPolicyEntryList();
    var valid = {};
    for (var i = 0; i < entries.length; i++) {
      var id = entries[i].id;
      var def = entries[i].def;
      var record = store[id];
      if (!record || typeof record !== 'object' || Array.isArray(record) ||
          !realmPolicyLevelDef(def, record.level)) {
        record = store[id] = { level:realmPolicyDefaultLevel(def) };
      }
      record.setTurn = isFinite(Number(record.setTurn))
        ? Number(record.setTurn) : 0;
      record.setYear = isFinite(Number(record.setYear))
        ? Number(record.setYear) : 0;
      valid[id] = record;
    }
    for (var key in store) {
      if (own(store, key) && !valid[key]) delete store[key];
    }
    return store;
  }

  FB.realmPolicyActive = function (state) {
    return !!(state && state.player && !state.player.dead &&
      state.player.tier >= 6 &&
      FB.isPlayerSovereign && FB.isPlayerSovereign(state));
  };

  FB.realmPolicyRecord = function (state, policyId) {
    var store = realmPolicyStore(state, false);
    return (store && store[policyId]) || null;
  };

  FB.realmPolicyLevelId = function (state, policyId) {
    var record = FB.realmPolicyRecord(state, policyId);
    if (record && typeof record.level === 'string') return record.level;
    var entries = realmPolicyEntryList();
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === policyId) {
        return realmPolicyDefaultLevel(entries[i].def);
      }
    }
    return null;
  };

  /* Directly held counties whose faith lies outside the realm's fold —
     anything short of 'same' or 'in_fold' counts as a minority community.
     Read-only; policy never rewrites a county's faith. */
  FB.realmPolicyMinorityCounties = function (state) {
    var out = [];
    if (!state || !state.player || !FB.realmReligionId ||
        !FB.faithRelation) return out;
    var religion = FB.realmReligionId(state, 'player');
    if (!religion) return out;
    var provs = Array.isArray(state.player.provs) ? state.player.provs : [];
    for (var i = 0; i < provs.length; i++) {
      var province = FB.world.byId[provs[i]];
      if (!province || !province.religion) continue;
      var relation = FB.faithRelation(state, religion, province.religion);
      if (relation !== 'same' && relation !== 'in_fold') out.push(provs[i]);
    }
    out.sort(compareId);
    return out;
  };

  function realmPolicyManagedModifierIds(entries) {
    var ids = {};
    for (var i = 0; i < entries.length; i++) {
      var levels = entries[i].def.levels;
      for (var j = 0; j < levels.length; j++) {
        if (levels[j] && typeof levels[j].modifier === 'string' &&
            FBDATA.modifiers && FBDATA.modifiers[levels[j].modifier]) {
          ids[levels[j].modifier] = true;
        }
      }
    }
    return ids;
  }

  /* Maintain the standing county effects of proclaimed royal policy. Policy
     modifier ids belong to this system alone, so the county pass can remove
     lapsed records (a lost county, a changed level, a lost crown) without
     touching any other modifier. Additions stay silent; the proclamation
     itself carries the Chronicle notice. */
  FB.realmPolicySync = function (state) {
    if (!state || !state.player || !FB.world || !FB.world.byId) return;
    var entries = realmPolicyEntryList();
    if (!entries.length) return;
    var managed = realmPolicyManagedModifierIds(entries);
    var desired = {};
    if (FB.realmPolicyActive(state)) {
      var minority = null;
      for (var i = 0; i < entries.length; i++) {
        var def = entries[i].def;
        var level = realmPolicyLevelDef(def,
          FB.realmPolicyLevelId(state, entries[i].id));
        if (!level || !managed[level.modifier]) continue;
        var targets;
        if (level.modifierScope === 'minority') {
          if (!minority) minority = FB.realmPolicyMinorityCounties(state);
          targets = minority;
        } else {
          targets = Array.isArray(state.player.provs)
            ? state.player.provs : [];
        }
        var pids = {};
        for (var t = 0; t < targets.length; t++) pids[targets[t]] = true;
        desired[level.modifier] = {
          pids:pids,
          privilege:typeof level.privilege === 'string'
            ? level.privilege : null
        };
      }
    }
    var county = state.modifiers && state.modifiers.county || {};
    for (var pid in county) {
      if (!own(county, pid)) continue;
      var list = county[pid];
      if (!Array.isArray(list)) continue;
      for (var j = list.length - 1; j >= 0; j--) {
        var id = list[j] && list[j].id;
        if (managed[id] && (!desired[id] || !desired[id].pids[pid])) {
          FB.removeModifier(state, id, pid);
        }
      }
    }
    for (var modifierId in desired) {
      if (!own(desired, modifierId)) continue;
      for (pid in desired[modifierId].pids) {
        if (!own(desired[modifierId].pids, pid)) continue;
        if (!FB.hasModifier(state, modifierId, pid)) {
          FB.addModifier(state, modifierId, pid, {
            silent:true,
            sourceEventId:'realm_policy_' + modifierId,
            sourceType:'law',
            privilegeDefId:desired[modifierId].privilege || undefined,
            grantor:{ type:'realm', id:'player' }
          });
        }
      }
    }
  };

  function realmPolicyFamilyName(family) {
    switch (family) {
      case 'faith': return FB.T('faith');
      case 'settlement': return FB.T('settlement');
      default: return FB.T('policy');
    }
  }

  function realmPolicyProtectedDays() {
    return Math.max(1, Math.round(finite(
      FBDATA.balance.realmPolicyProtectedWorshipDays, 1440)));
  }

  /* The shared read-only gate for Governance and the royal-policy sheet:
     exact blocked reasons, the proclamation cost, and the protected-term
     warning when leaving a chartered level early. */
  FB.realmPolicyStatus = function (state, policyId, levelId) {
    var entries = realmPolicyEntryList();
    var def = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === policyId) def = entries[i].def;
    }
    if (!def) {
      return { ready:false, reason:FB.T('That royal policy is not recognized.') };
    }
    var level = realmPolicyLevelDef(def, levelId);
    if (!level) {
      return { ready:false,
        reason:FB.T('That level is not part of this policy.') };
    }
    var currentId = FB.realmPolicyLevelId(state, policyId);
    if (levelId === currentId) {
      return { ready:false, current:true,
        reason:FB.T('This is already the standing policy.') };
    }
    if (!FB.realmPolicyActive(state)) {
      return { ready:false, reason:FB.T(
        'Royal policy requires a crowned sovereign ruling a realm of their own.') };
    }
    if (!def.emergency && def.family) {
      var store = realmPolicyStore(state, false) || {};
      for (var otherIndex = 0; otherIndex < entries.length; otherIndex++) {
        var other = entries[otherIndex];
        if (other.def.family !== def.family) continue;
        var otherRecord = store[other.id];
        if (otherRecord && Number(otherRecord.setYear) === state.date.year) {
          return { ready:false, reason:FB.T(
            'The crown has already settled {family} policy this year.', {
              family:realmPolicyFamilyName(def.family)
            }) };
        }
      }
    }
    var cost = isFinite(Number(def.cost)) ? Number(def.cost) :
      finite(FBDATA.balance.realmPolicyChangeCost, 20);
    if (state.player.gold < cost) {
      return { ready:false, reason:FB.T(
        'Requires {money:cost}; you have {money:current}.', {
          cost:cost, current:Math.floor(state.player.gold)
        }) };
    }
    var warning = null;
    var record = FB.realmPolicyRecord(state, policyId);
    var currentLevel = realmPolicyLevelDef(def, currentId);
    if (currentLevel && currentLevel.protectedTerm && record &&
        state.turn < Number(record.setTurn) + realmPolicyProtectedDays()) {
      warning = {
        levelId:currentId,
        days:Math.ceil(Number(record.setTurn) +
          realmPolicyProtectedDays() - state.turn)
      };
    }
    return { ready:true, reason:'', cost:cost, warning:warning };
  };

  function realmPolicyFoldReactions(state, enact) {
    var religion = FB.realmReligionId && FB.realmReligionId(state, 'player');
    if (!religion) return;
    var sameFold = finite(enact.sameFold, 0);
    var otherFold = finite(enact.otherFold, 0);
    if (sameFold || otherFold) {
      for (var rid in state.realms) {
        if (!own(state.realms, rid) || rid === 'player') continue;
        var realm = state.realms[rid];
        if (!realm || !realm.alive) continue;
        if (FB.topRealm(state, rid) !== rid) continue; // sovereign courts only
        var foreignReligion = FB.realmReligionId(state, rid);
        var inFold = !!(foreignReligion &&
          FB.faithInFold(state, religion, foreignReligion));
        var amount = inFold ? sameFold : otherFold;
        if (amount) {
          FB.adjustStanding(state, { kind:'realm', id:rid }, amount,
            'realm_policy:faith');
        }
      }
    }
    var vassalSame = finite(enact.vassalSameFaith, 0);
    var vassalOther = finite(enact.vassalOtherFaith, 0);
    if (vassalSame || vassalOther) {
      var vassals = FB.playerVassals ? FB.playerVassals(state) : [];
      for (var i = 0; i < vassals.length; i++) {
        var vassalReligion = FB.realmReligionId(state, vassals[i]);
        var sameFoldVassal = !!(vassalReligion &&
          FB.faithInFold(state, religion, vassalReligion));
        var vassalAmount = sameFoldVassal ? vassalSame : vassalOther;
        if (vassalAmount) {
          FB.adjustStanding(state, { kind:'realm', id:vassals[i] },
            vassalAmount, 'realm_policy:faith');
        }
      }
    }
    var headFaith = finite(enact.headFaith, 0);
    if (headFaith && FB.religiousHeadOf) {
      var head = FB.religiousHeadOf(state, religion);
      if (head && head.id && head.id !== 'player') {
        FB.adjustStanding(state, { kind:'realm', id:head.id }, headFaith,
          'realm_policy:clergy');
      }
    }
  }

  FB.realmPolicyProclaim = function (state, policyId, levelId) {
    var status = FB.realmPolicyStatus(state, policyId, levelId);
    if (!status.ready) return false;
    var store = repairRealmPolicies(state);
    var entries = realmPolicyEntryList();
    var def = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === policyId) def = entries[i].def;
    }
    var level = realmPolicyLevelDef(def, levelId);
    var record = store[policyId];
    var oldLevel = realmPolicyLevelDef(def, record.level);
    /* Withdrawing a protected charter before its term mirrors the unlawful
       privilege-revocation path: Common Voice falls, the mistreatment roll
       records it, and the faith constituency organizes. */
    if (oldLevel && oldLevel.protectedTerm &&
        state.turn < Number(record.setTurn) + realmPolicyProtectedDays()) {
      state.player.pop = FB.clamp((state.player.pop || 0) - 10, -100, 100);
      FB.notePoliticalMistreatment(state, 'unlawful_privilege_revocation', {
        policyId:policyId, levelId:record.level
      });
      if (oldLevel.privilege) {
        FB.addCollectiveOpposition(state, 'faith', oldLevel.privilege, 1);
      }
    }
    state.player.gold -= status.cost;
    var enact = level.onEnact || {};
    if (enact.piety) {
      state.player.piety = Math.max(0, state.player.piety + enact.piety);
    }
    if (enact.prestige) state.player.prestige += enact.prestige;
    if (enact.pop) {
      state.player.pop = FB.clamp((state.player.pop || 0) + enact.pop,
        -100, 100);
    }
    if (enact.authority && FB.councilAuthority) {
      FB.councilAuthority(state, enact.authority);
    }
    if (typeof enact.mistreatment === 'string' && enact.mistreatment) {
      FB.notePoliticalMistreatment(state, enact.mistreatment, {
        policyId:policyId, levelId:levelId
      });
    }
    realmPolicyFoldReactions(state, enact);
    store[policyId] = {
      level:levelId, setTurn:state.turn, setYear:state.date.year
    };
    FB.realmPolicySync(state);
    FB.news(state, FB.msg('news.realmpolicy.proclaimed',
      '👑 Royal policy proclaimed — {policy} now stands at {level}.',
      {
        policy:FB.dataParam('policy', policyId, 'name'),
        level:FB.dataParam('policy', policyId,
          'levels.' + realmPolicyLevelIndex(def, levelId) + '.name')
      }));
    return true;
  };

  /* Locale-neutral, RNG-free projection for Governance and the royal-policy
     sheet; opening those surfaces never heals or writes simulation state. */
  FB.realmPolicySummary = function (state) {
    var entries = realmPolicyEntryList();
    var policies = [];
    for (var i = 0; i < entries.length; i++) {
      var id = entries[i].id;
      var def = entries[i].def;
      var record = FB.realmPolicyRecord(state, id);
      var currentId = FB.realmPolicyLevelId(state, id);
      var levels = [];
      for (var j = 0; j < def.levels.length; j++) {
        var level = def.levels[j];
        levels.push({
          id:level.id, index:j,
          current:level.id === currentId,
          status:FB.realmPolicyStatus(state, id, level.id)
        });
      }
      policies.push({
        id:id,
        family:def.family || null,
        currentId:currentId,
        currentIndex:realmPolicyLevelIndex(def, currentId),
        setYear:record ? Number(record.setYear) : null,
        levels:levels
      });
    }
    return {
      active:FB.realmPolicyActive(state),
      changeCost:finite(FBDATA.balance.realmPolicyChangeCost, 20),
      protectedDays:realmPolicyProtectedDays(),
      minorityCountyIds:FB.realmPolicyMinorityCounties(state),
      policies:policies
    };
  };

  /* The least-developed directly held county below its cap, deterministically
     (development, then county id), or null when no county can still grow. */
  function leastDevelopedHeldCounty(state) {
    if (!state.dev || !FB.devCap) return null;
    var provs = Array.isArray(state.player.provs)
      ? state.player.provs.slice() : [];
    provs.sort(compareId);
    var target = null;
    var bestDev = Infinity;
    for (var i = 0; i < provs.length; i++) {
      var pid = provs[i];
      if (state.dev[pid] === undefined) continue;
      var cap = Math.max(1, Number(FB.devCap(state, pid)) || 10);
      var dev = Number(state.dev[pid]);
      if (isFinite(dev) && dev < cap && dev < bestDev) {
        bestDev = dev;
        target = pid;
      }
    }
    return target;
  }

  /* Season tick (main.js): the piety trickle of the tolerance law and the
     settler development growth of Encouraged Settlement. */
  FB.realmPolicySeason = function (state) {
    if (!FB.realmPolicyActive(state)) return;
    var entries = realmPolicyEntryList();
    for (var i = 0; i < entries.length; i++) {
      var level = realmPolicyLevelDef(entries[i].def,
        FB.realmPolicyLevelId(state, entries[i].id));
      if (!level) continue;
      if (level.seasonPiety) {
        state.player.piety = Math.max(0,
          state.player.piety + level.seasonPiety);
      }
      if (level.developmentGrowth && FB.changeCountyDevelopment) {
        var growthChance = finite(
          FBDATA.balance.realmPolicySettlementDevChance, 0.25);
        if (growthChance > 0 && FB.chance(growthChance)) {
          var target = leastDevelopedHeldCounty(state);
          if (target) {
            FB.changeCountyDevelopment(state, target, 1, 'policy_settlement');
          }
        }
      }
    }
  };

  /* Yearly (FB.institutionsYearly): sustained persecution is sustained
     mistreatment — one note a year keeps the sanctuary-claim pressure alive
     for exactly as long as the policy stands. */
  FB.realmPolicyYearly = function (state) {
    if (!FB.realmPolicyActive(state)) return;
    if (FB.realmPolicyLevelId(state, 'religious_tolerance') === 'persecution' &&
        FB.realmPolicyMinorityCounties(state).length) {
      FB.notePoliticalMistreatment(state, 'religious_persecution', {
        policyId:'religious_tolerance', sustained:true
      });
    }
  };

  /* The player realm's research-rate factor from standing royal policy
     (read by FB.techResearchRate in js/technology.js). */
  FB.realmPolicyResearchFactor = function (state, realmId) {
    if (realmId !== 'player' || !FB.realmPolicyActive(state)) return 0;
    var factor = 0;
    var entries = realmPolicyEntryList();
    for (var i = 0; i < entries.length; i++) {
      var level = realmPolicyLevelDef(entries[i].def,
        FB.realmPolicyLevelId(state, entries[i].id));
      if (level && level.researchFactor) factor += level.researchFactor;
    }
    return factor;
  };

  /* The migration-draw shift royal settlement policy gives player-owned
     counties (read by FB.countyMigrationAttraction in js/population.js); the
     conserved migration itself is untouched. */
  FB.realmPolicySettlementAttraction = function (state) {
    if (!FB.realmPolicyActive(state)) return 0;
    var entries = realmPolicyEntryList();
    for (var i = 0; i < entries.length; i++) {
      var level = realmPolicyLevelDef(entries[i].def,
        FB.realmPolicyLevelId(state, entries[i].id));
      if (level && level.migrationAttraction) {
        return Number(level.migrationAttraction) || 0;
      }
    }
    return 0;
  };

  /* ---------- royal policy event helpers ---------- */

  FB.fns.realm_policy_persecution_due = function (state) {
    return FB.realmPolicyActive(state) &&
      FB.realmPolicyLevelId(state, 'religious_tolerance') === 'persecution' &&
      FB.realmPolicyMinorityCounties(state).length > 0;
  };
  FB.fns.realm_policy_encouraged_settlement_due = function (state) {
    return FB.realmPolicyActive(state) &&
      FB.realmPolicyLevelId(state, 'settlement_policy') === 'encouraged_settlement' &&
      Array.isArray(state.player.provs) && state.player.provs.length > 0;
  };
  FB.fns.realm_policy_protected_worship_due = function (state) {
    return FB.realmPolicyActive(state) &&
      FB.realmPolicyLevelId(state, 'religious_tolerance') === 'protected_worship' &&
      FB.realmPolicyMinorityCounties(state).length > 0;
  };

  function adjustForeignFold(state, amount, source) {
    var religion = FB.realmReligionId && FB.realmReligionId(state, 'player');
    if (!religion || !amount) return;
    for (var rid in state.realms) {
      if (!own(state.realms, rid) || rid === 'player') continue;
      var realm = state.realms[rid];
      if (!realm || !realm.alive || FB.topRealm(state, rid) !== rid) continue;
      var foreignReligion = FB.realmReligionId(state, rid);
      if (foreignReligion && !FB.faithInFold(state, religion, foreignReligion)) {
        FB.adjustStanding(state, { kind:'realm', id:rid }, amount, source);
      }
    }
  }

  FB.fns.realm_policy_persecution_noted = function (state) {
    FB.notePoliticalMistreatment(state, 'religious_persecution', {
      policyId:'religious_tolerance', source:'event'
    });
  };
  FB.fns.realm_policy_settlers_welcome = function (state) {
    var target = leastDevelopedHeldCounty(state);
    if (target && FB.changeCountyDevelopment) {
      FB.changeCountyDevelopment(state, target, 1, 'policy_settlement');
    }
  };
  FB.fns.realm_policy_settlers_employ = function (state) {
    if (FB.addResearch) FB.addResearch(state, 8, 'player');
  };
  FB.fns.realm_policy_refugees_welcome = function (state) {
    adjustForeignFold(state, 3, 'realm_policy:refugees_welcomed');
  };
  FB.fns.realm_policy_refugees_refused = function (state) {
    adjustForeignFold(state, -2, 'realm_policy:refugees_refused');
  };

  var dailyRepairState = null;

  FB.ensureInstitutions = function (state, options) {
    if (!state || !state.player) return null;
    options = options || {};
    /* Royal-policy records and their standing county modifiers repair before
       the privilege roll, so protected-worship records are discovered against
       the modifiers the sync just maintained. */
    repairRealmPolicies(state);
    FB.realmPolicySync(state);
    repairPrivileges(state, !!options.skipLegacyRepairs);
    var elections = repairElectionStore(state, !!options.silent,
      !!options.skipLegacyRepairs);
    var demands = repairDemandStore(state);
    if (!options.skipLegacyRepairs) dailyRepairState = state;
    return { elections:elections, privileges:state.privileges, demands:demands };
  };

  FB.institutionsDay = function (state) {
    var skipLegacyRepairs = dailyRepairState === state;
    var result = FB.ensureInstitutions(state, {
      skipLegacyRepairs:skipLegacyRepairs
    });
    dailyRepairState = state;
    return result;
  };

  FB.institutionsYearly = function (state) {
    FB.ensureInstitutions(state);
    if (FB.realmPolicyYearly) FB.realmPolicyYearly(state);
    return queueCollectiveDemand(state);
  };
})();
