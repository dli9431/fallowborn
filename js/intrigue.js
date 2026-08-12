/* Fallowborn — hostile intrigue. One player plot remains the only personal
   scheme slot; this layer adds exact targets, methods, accomplices, bounded AI
   schemes, captivity, leverage, conduct, evidence, and lawful hearings. */
window.FB = window.FB || {};

(function () {
  'use strict';

  var HOSTILE_IDS = [
    'assassination', 'abduction', 'blackmail', 'fabricated_charge', 'sabotage'
  ];
  var EVIDENCE = ['suspicion', 'testimony', 'material', 'redhanded'];

  function own(o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
  }

  function finite(value, fallback) {
    value = Number(value);
    return isFinite(value) ? value : fallback;
  }

  function copy(source) {
    var out = {};
    source = source || {};
    for (var key in source) if (own(source, key)) out[key] = source[key];
    return out;
  }

  function defOf(id) {
    var def = FBDATA.plots && FBDATA.plots[id];
    return def && def.hostile ? def : null;
  }

  function character(state, id) {
    return id && state.chars && state.chars[id] || null;
  }

  function actorCharacter(state, actorId) {
    return character(state, actorId);
  }

  function rulerGeneration(state, rid) {
    if (rid === 'player') return finite(state.generation, 1);
    if (FB.realmRulerGeneration) return FB.realmRulerGeneration(state, rid);
    var r = state.realms && state.realms[rid];
    return r && r.ruler ? finite(r.ruler.generation, 1) : 1;
  }

  function actorGeneration(state, actorId, rid) {
    if (actorId === state.player.charId) return finite(state.generation, 1);
    rid = rid || (FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, actorId));
    return rid ? rulerGeneration(state, rid) : 1;
  }

  function topRealm(state, rid) {
    return rid && FB.topRealm ? FB.topRealm(state, rid) : rid;
  }

  function residence(state, c) {
    return c && FB.characterResidence ? FB.characterResidence(state, c) : null;
  }

  function characterSovereign(state, c) {
    if (!c || c.dead) return null;
    if (c.id === state.player.charId) return FB.playerRealmId(state);
    var reigning = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, c);
    if (reigning) return topRealm(state, reigning);
    var pid = residence(state, c);
    return pid && state.owner ? topRealm(state, state.owner[pid]) : null;
  }

  function actorSovereign(state, actorId, actorRealmId) {
    if (actorId === state.player.charId) return FB.playerRealmId(state);
    if (actorRealmId) return topRealm(state, actorRealmId);
    return characterSovereign(state, actorCharacter(state, actorId));
  }

  function methodOf(def, methodId) {
    var methods = def && def.methods || [];
    for (var i = 0; i < methods.length; i++) {
      if (methods[i].id !== methodId) continue;
      var method = {};
      var profiles = FBDATA.intrigue && FBDATA.intrigue.methodProfiles || {};
      var profile = profiles[methods[i].profile] || {};
      for (var profileKey in profile) {
        if (own(profile, profileKey)) method[profileKey] = profile[profileKey];
      }
      for (var methodKey in methods[i]) {
        if (own(methods[i], methodKey)) method[methodKey] = methods[i][methodKey];
      }
      return method;
    }
    return null;
  }

  function targetCharacter(state, context) {
    return character(state, context && context.characterId);
  }

  function targetStation(state, context) {
    var target = targetCharacter(state, context);
    if (target) return FB.clamp(FB.stationOf(target), 0, 4);
    var pid = context && context.pid;
    var rid = pid && state.owner && state.owner[pid];
    var realm = rid && state.realms && state.realms[rid];
    return FB.clamp(realm && realm.tier !== undefined ? realm.tier - 1 : 1,
      0, 4);
  }

  function methodCost(state, def, context, method) {
    if (!method || !method.stationCost) return 0;
    return 5 + 5 * targetStation(state, context);
  }

  function recordMatchesActor(state, record) {
    if (!record || !character(state, record.actorId) ||
        character(state, record.actorId).dead) return false;
    return Number(record.actorGeneration) ===
      actorGeneration(state, record.actorId, record.actorRealmId);
  }

  function liveCharacterId(state, id) {
    var c = character(state, id);
    return !!(c && !c.dead);
  }

  function normalizeCaptive(state, record) {
    if (!record || typeof record !== 'object' ||
        !liveCharacterId(state, record.captiveId) ||
        !liveCharacterId(state, record.captorId)) return null;
    var captorRealm = record.captorRealmId ||
      (FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, record.captorId)) || null;
    if (Number(record.captorGeneration) !==
        actorGeneration(state, record.captorId, captorRealm)) return null;
    var ransomTable = FBDATA.intrigue.captiveRansoms || [5,10,20,40,80];
    var captiveStation = Math.floor(FB.clamp(finite(FB.stationOf(
      character(state, record.captiveId)), 0), 0, 4));
    var fallbackRansom = Math.max(0, finite(ransomTable[captiveStation], 0));
    return {
      captiveId:record.captiveId,
      captorId:record.captorId,
      captorRealmId:captorRealm,
      captorGeneration:Number(record.captorGeneration),
      source:typeof record.source === 'string' ? record.source : 'abduction',
      captureTurn:Math.max(0, finite(record.captureTurn, state.turn)),
      demand:record.demand && typeof record.demand === 'object'
        ? { amount:Math.max(0, finite(record.demand.amount, fallbackRansom)),
            turn:Math.max(0, finite(record.demand.turn, state.turn)) }
        : { amount:fallbackRansom, turn:state.turn }
    };
  }

  function normalizeLeverage(state, record) {
    if (!record || typeof record !== 'object' ||
        !liveCharacterId(state, record.actorId) ||
        !liveCharacterId(state, record.targetId) ||
        record.actorId === record.targetId ||
        finite(record.endTurn, 0) <= state.turn ||
        (record.foothold && !footholdValid(state,
          character(state, record.targetId), record.foothold))) return null;
    if (Number(record.actorGeneration) !==
        actorGeneration(state, record.actorId, record.actorRealmId)) return null;
    return {
      actorId:record.actorId,
      actorRealmId:record.actorRealmId || null,
      actorGeneration:Number(record.actorGeneration),
      targetId:record.targetId,
      source:typeof record.source === 'string' ? record.source : 'blackmail',
      createdTurn:Math.max(0, finite(record.createdTurn, state.turn)),
      endTurn:Math.max(state.turn + 1, finite(record.endTurn, state.turn + 1)),
      foothold:record.foothold && typeof record.foothold === 'object'
        ? copy(record.foothold) : null
    };
  }

  FB.ensureIntrigue = function (state) {
    if (!state || !state.player || !state.chars) return null;
    var intrigue = state.intrigue;
    if (!intrigue || typeof intrigue !== 'object' || Array.isArray(intrigue)) {
      intrigue = state.intrigue = {};
    }
    if (!Array.isArray(intrigue.aiSchemes)) intrigue.aiSchemes = [];
    if (!Array.isArray(intrigue.captives)) intrigue.captives = [];
    if (!Array.isArray(intrigue.leverage)) intrigue.leverage = [];
    if (!intrigue.cooldowns || typeof intrigue.cooldowns !== 'object' ||
        Array.isArray(intrigue.cooldowns)) intrigue.cooldowns = {};
    intrigue.nextId = Math.max(1, Math.floor(finite(intrigue.nextId, 1)));
    intrigue.startYear = isFinite(Number(intrigue.startYear))
      ? Math.floor(Number(intrigue.startYear)) : null;
    intrigue.startsThisYear = FB.clamp(Math.floor(finite(
      intrigue.startsThisYear, 0)), 0, 2);
    intrigue.playerFacingStartsThisYear = FB.clamp(Math.floor(finite(
      intrigue.playerFacingStartsThisYear, 0)), 0, 1);
    var repairedCooldowns = {};
    for (var cooldownId in intrigue.cooldowns) {
      if (!liveCharacterId(state, cooldownId)) continue;
      var cooldownYear = Math.floor(finite(intrigue.cooldowns[cooldownId], 0));
      if (cooldownYear > 0) repairedCooldowns[cooldownId] = cooldownYear;
    }
    intrigue.cooldowns = repairedCooldowns;
    var aiActors = {}, aiMajorTargets = {};
    var maxAi = FB.clamp(Math.floor(finite(
      FBDATA.intrigue.maxAiSchemes, 6)), 0, 6);
    intrigue.aiSchemes = intrigue.aiSchemes.filter(function (record) {
      var def = record && defOf(record.schemeId);
      if (!def || !Array.isArray(def.methods) || !def.methods.length ||
          !recordMatchesActor(state, record) ||
          record.warningStatus === 'cancelled' || aiActors[record.actorId] ||
          !FB.intrigueTargetValid(state, def, record.context,
            record.actorId, record.actorRealmId)) return false;
      var majorKey = (record.schemeId === 'assassination' ||
        record.schemeId === 'abduction') && record.context.characterId;
      if (majorKey && aiMajorTargets[majorKey]) return false;
      aiActors[record.actorId] = 1;
      if (majorKey) aiMajorTargets[majorKey] = 1;
      return true;
    }).slice(0, maxAi);
    var aiRecordIds = {};
    for (var schemeIndex = 0; schemeIndex < intrigue.aiSchemes.length;
        schemeIndex++) {
      var repairedScheme = intrigue.aiSchemes[schemeIndex];
      repairedScheme.context = FB.intrigueTargetContext(state,
        defOf(repairedScheme.schemeId), repairedScheme.context,
        repairedScheme.actorId, repairedScheme.actorRealmId);
      repairedScheme.power = Math.max(0, finite(repairedScheme.power, 0));
      repairedScheme.startedTurn = Math.max(0,
        finite(repairedScheme.startedTurn, state.turn));
      if (!repairedScheme.recordId || aiRecordIds[repairedScheme.recordId]) {
        repairedScheme.recordId = 'ai-' + intrigue.nextId++;
      }
      aiRecordIds[repairedScheme.recordId] = 1;
      repairedScheme.playerFacing = !!repairedScheme.playerFacing;
      if (!methodOf(defOf(repairedScheme.schemeId), repairedScheme.methodId)) {
        repairedScheme.methodId = defOf(repairedScheme.schemeId).methods[0].id;
      }
      if (repairedScheme.warningStatus !== 'pending' &&
          repairedScheme.warningStatus !== 'answered' &&
          repairedScheme.warningStatus !== 'cancelled') {
        repairedScheme.warningStatus = null;
      }
    }
    var captiveSeen = {}, abductionCaptors = {};
    intrigue.captives = intrigue.captives.map(function (record) {
      return normalizeCaptive(state, record);
    }).filter(function (record) {
      if (!record || captiveSeen[record.captiveId]) return false;
      if (record.source === 'abduction' && abductionCaptors[record.captorId]) {
        return false;
      }
      captiveSeen[record.captiveId] = 1;
      if (record.source === 'abduction') abductionCaptors[record.captorId] = 1;
      return true;
    });
    var leverageActors = {};
    intrigue.leverage = intrigue.leverage.map(function (record) {
      return normalizeLeverage(state, record);
    }).filter(function (record) {
      if (!record || leverageActors[record.actorId]) return false;
      leverageActors[record.actorId] = 1;
      return true;
    });
    for (var id in state.chars) {
      var c = state.chars[id];
      if (!c || c.conduct === undefined) continue;
      if (!c.conduct || typeof c.conduct !== 'object' ||
          Array.isArray(c.conduct)) c.conduct = {};
      c.conduct.schemes = FB.clamp(Math.floor(finite(c.conduct.schemes, 0)), 0, 3);
      c.conduct.deceit = FB.clamp(Math.floor(finite(c.conduct.deceit, 0)), -3, 3);
      c.conduct.cruelty = FB.clamp(Math.floor(finite(c.conduct.cruelty, 0)), -3, 3);
    }
    for (var aiIndex = 0; aiIndex < intrigue.aiSchemes.length; aiIndex++) {
      var aiScheme = intrigue.aiSchemes[aiIndex];
      var aid = aiScheme.accomplice && aiScheme.accomplice.characterId;
      var helper = aid && character(state, aid);
      if (!helper || helper.dead || unavailableThroughCaptivity(state, helper) ||
          characterSovereign(state, helper) !== actorSovereign(state,
            aiScheme.actorId, aiScheme.actorRealmId)) {
        aiScheme.accomplice = null;
      } else {
        aiScheme.accomplice = {
          characterId:aid, accepted:true,
          compelled:!!aiScheme.accomplice.compelled
        };
      }
    }
    var playerCaptivity = null;
    for (var captiveIndex = 0; captiveIndex < intrigue.captives.length;
        captiveIndex++) {
      if (intrigue.captives[captiveIndex].captiveId === state.player.charId) {
        playerCaptivity = intrigue.captives[captiveIndex];
        break;
      }
    }
    if (playerCaptivity) {
      state.player.flags.in_prison = 1;
      state.player.flags.intrigue_captive = 1;
    } else if (state.player.flags.intrigue_captive) {
      delete state.player.flags.intrigue_captive;
      delete state.player.flags.in_prison;
    }
    var hearing = intrigue.hearing;
    if (hearing && (typeof hearing !== 'object' ||
        hearing.accusedId !== state.player.charId ||
        Number(hearing.accusedGeneration) !== Number(state.generation) ||
        !defOf(hearing.plotId) || EVIDENCE.indexOf(hearing.evidence) < 1 ||
        typeof hearing.id !== 'string' || !hearing.id)) {
      intrigue.hearing = null;
    } else if (hearing) {
      hearing.accusedGeneration = Number(state.generation);
      hearing.context = hearing.context &&
        typeof hearing.context === 'object' && !Array.isArray(hearing.context)
        ? copy(hearing.context) : {};
      hearing.targetId = hearing.targetId ||
        hearing.context.characterId || null;
      hearing.accompliceId = liveCharacterId(state, hearing.accompliceId)
        ? hearing.accompliceId : null;
      hearing.severity = FB.clamp(Math.floor(finite(hearing.severity, 1)),
        1, 4);
      hearing.successful = !!hearing.successful;
      if (!hearing.authority || (hearing.authority !== 'player' &&
          !(state.realms && state.realms[hearing.authority] &&
            state.realms[hearing.authority].alive))) {
        hearing.authority = FB.playerRealmId(state) || 'player';
      }
    }
    if (intrigue.legalCustody &&
        (!liveCharacterId(state, intrigue.legalCustody.characterId) ||
          finite(intrigue.legalCustody.endTurn, 0) <= state.turn)) {
      if (intrigue.legalCustody.characterId === state.player.charId) {
        delete state.player.flags.intrigue_legal_custody;
        if (!playerCaptivity) delete state.player.flags.in_prison;
      }
      intrigue.legalCustody = null;
    } else if (intrigue.legalCustody &&
        intrigue.legalCustody.characterId === state.player.charId) {
      intrigue.legalCustody.endTurn = Math.max(state.turn + 1,
        finite(intrigue.legalCustody.endTurn, state.turn + 1));
      intrigue.legalCustody.authority =
        intrigue.legalCustody.authority || null;
      state.player.flags.in_prison = 1;
      state.player.flags.intrigue_legal_custody = 1;
    }
    if (!intrigue.legalCustody && state.player.flags.intrigue_legal_custody) {
      delete state.player.flags.intrigue_legal_custody;
      if (!playerCaptivity) delete state.player.flags.in_prison;
    }
    return intrigue;
  };

  function intrigueForRead(state) {
    var intrigue = state && state.intrigue;
    if (!intrigue || !Array.isArray(intrigue.aiSchemes) ||
        !Array.isArray(intrigue.captives) ||
        !Array.isArray(intrigue.leverage)) {
      intrigue = FB.ensureIntrigue(state);
    }
    return intrigue;
  }

  FB.intrigueCaptivityOf = function (state, captiveId) {
    var intrigue = intrigueForRead(state);
    if (!intrigue) return null;
    for (var i = 0; i < intrigue.captives.length; i++) {
      if (intrigue.captives[i].captiveId === captiveId) return intrigue.captives[i];
    }
    return null;
  };

  FB.intrigueCaptiveOf = function (state, captorId) {
    var intrigue = intrigueForRead(state);
    if (!intrigue) return null;
    for (var i = 0; i < intrigue.captives.length; i++) {
      if (intrigue.captives[i].captorId === captorId &&
          intrigue.captives[i].source === 'abduction') return intrigue.captives[i];
    }
    return null;
  };

  function rawCaptivityOf(state, captiveId) {
    var list = state.intrigue && Array.isArray(state.intrigue.captives)
      ? state.intrigue.captives : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].captiveId === captiveId) return list[i];
    }
    return null;
  }

  function rawCaptiveOf(state, captorId) {
    var list = state.intrigue && Array.isArray(state.intrigue.captives)
      ? state.intrigue.captives : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].captorId === captorId &&
          list[i].source === 'abduction') return list[i];
    }
    return null;
  }

  function rawLeverageOf(state, actorId) {
    var list = state.intrigue && Array.isArray(state.intrigue.leverage)
      ? state.intrigue.leverage : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].actorId === actorId) return list[i];
    }
    return null;
  }

  FB.intrigueLeverageOf = function (state, actorId) {
    var intrigue = intrigueForRead(state);
    if (!intrigue) return null;
    for (var i = 0; i < intrigue.leverage.length; i++) {
      if (intrigue.leverage[i].actorId !== actorId) continue;
      if (finite(intrigue.leverage[i].endTurn, 0) <= state.turn) {
        intrigue = FB.ensureIntrigue(state);
        for (var repairedIndex = 0;
            repairedIndex < intrigue.leverage.length; repairedIndex++) {
          if (intrigue.leverage[repairedIndex].actorId === actorId) {
            return intrigue.leverage[repairedIndex];
          }
        }
        return null;
      }
      return intrigue.leverage[i];
    }
    return null;
  };

  FB.intrigueRealmRulerCaptive = function (state, rid) {
    var ruler = rid === 'player' ? character(state, state.player.charId) :
      (FB.realmRulerCharacterSnapshot && FB.realmRulerCharacterSnapshot(state, rid));
    return !!(ruler && FB.intrigueCaptivityOf(state, ruler.id));
  };

  function politicalFoothold(state, c) {
    if (!c || c.dead) return null;
    if (c.restorationRight) {
      return { kind:'restoration', realmId:c.restorationRight.realmId || null,
        createdTurn:finite(c.restorationRight.createdTurn, 0) };
    }
    if (FB.retainerRecord) {
      var retainer = FB.retainerRecord(state, c.id);
      if (retainer) return { kind:'office', office:retainer.office,
        startedTurn:finite(retainer.startedTurn, 0) };
    }
    if (state.council && state.council.seats) {
      var rid = FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, c);
      if (rid) {
        for (var seat in state.council.seats) {
          if (state.council.seats[seat] === rid) {
            return { kind:'council', seat:seat, realmId:rid,
              rulerGeneration:rulerGeneration(state, rid) };
          }
        }
      }
    }
    var ruling = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, c);
    if (ruling) {
      var realm = state.realms[ruling];
      return { kind:'landed', realmId:ruling,
        liegeId:realm && realm.liege || null,
        rulerGeneration:rulerGeneration(state, ruling) };
    }
    if (c.claimRealmId || c.claimId) {
      return { kind:'claim', realmId:c.claimRealmId || c.claimId };
    }
    return null;
  }

  function footholdValid(state, c, foothold) {
    var current = politicalFoothold(state, c);
    if (!current || !foothold || current.kind !== foothold.kind) return false;
    var exactKeys = ['realmId', 'office', 'seat', 'rulerGeneration',
      'startedTurn', 'createdTurn', 'liegeId'];
    for (var i = 0; i < exactKeys.length; i++) {
      var key = exactKeys[i];
      if (own(foothold, key) && current[key] !== foothold[key]) return false;
    }
    return true;
  }

  function blackmailEligible(state, c) {
    if (FB.ageOf(c, state.date.year) < 12) return false;
    var standing = FB.standingOf ? FB.standingOf(state,
      { kind:'character', id:c.id }) : finite(c.opinion, 0);
    var reputation = false;
    var traits = c.traits || [];
    for (var traitIndex = 0; traitIndex < traits.length; traitIndex++) {
      var trait = FBDATA.traits && FBDATA.traits[traits[traitIndex]];
      if (trait && trait['class'] === 'reputation') {
        reputation = true;
        break;
      }
    }
    var related = !!(c.spouseId || c.fatherId || c.motherId ||
      c.childrenIds && c.childrenIds.length || finite(c.opinion, 0) ||
      c.opinions && Object.keys(c.opinions).length);
    for (var role in (state.roles || {})) {
      if (state.roles[role] === c.id) related = true;
    }
    return Math.abs(standing) >= 10 || reputation || related ||
      !!politicalFoothold(state, c) ||
      finite(c.wealth, 0) > 0;
  }

  function unavailableThroughCaptivity(state, c) {
    if (!c) return false;
    if (rawCaptivityOf(state, c.id)) return true;
    if (state.intrigue && state.intrigue.legalCustody &&
        state.intrigue.legalCustody.characterId === c.id) return true;
    return c.id === state.player.charId &&
      !!(state.player.flags && state.player.flags.in_prison);
  }

  function countyTargetOptions(state, actorId, actorRealmId) {
    var out = [], seen = {};
    var sovereign = actorSovereign(state, actorId, actorRealmId);
    if (!sovereign || !state.owner) return out;
    function add(pid, foreign) {
      if (!pid || seen[pid] || !FB.world.byId[pid]) return;
      seen[pid] = 1;
      var owner = topRealm(state, state.owner[pid]);
      var realm = owner && state.realms[owner];
      out.push({
        context:{ pid:pid, targetSovereign:owner },
        label:FB.world.byId[pid].name,
        desc:foreign ? FB.T('Foreign border county held by {realm}', {
          realm:realm ? realm.name : FB.T('another realm')
        }) : FB.T('County inside your sovereign realm'),
        icon:'🔥', group:foreign ? 'foreign' : 'realm',
        provinceId:pid, realmId:owner
      });
    }
    for (var pid in state.owner) {
      if (topRealm(state, state.owner[pid]) === sovereign) add(pid, false);
    }
    for (pid in state.owner) {
      if (topRealm(state, state.owner[pid]) !== sovereign) continue;
      var adjacent = FB.world.adj && FB.world.adj[pid] || {};
      for (var next in adjacent) {
        if (topRealm(state, state.owner[next]) !== sovereign) add(next, true);
      }
    }
    out.sort(function (a, b) {
      return a.group.localeCompare(b.group) || a.label.localeCompare(b.label) ||
        a.context.pid.localeCompare(b.context.pid);
    });
    return out;
  }

  function characterTargetOptions(state, def, actorId, actorRealmId) {
    var out = [];
    var actor = actorCharacter(state, actorId);
    var sovereign = actorSovereign(state, actorId, actorRealmId);
    var actorHasCaptive = rawCaptiveOf(state, actorId);
    var actorHasLeverage = rawLeverageOf(state, actorId);
    if (!actor || actor.dead || !sovereign) return out;
    for (var id in state.chars) {
      var c = state.chars[id];
      if (!c || c.dead || c.id === actorId || characterSovereign(state, c) !== sovereign) continue;
      if (def.outcome === 'captive' &&
          (actorHasCaptive || unavailableThroughCaptivity(state, c))) continue;
      if (def.outcome === 'leverage' &&
          (actorHasLeverage || !blackmailEligible(state, c))) continue;
      var foothold = def.outcome === 'foothold' ? politicalFoothold(state, c) : null;
      if (def.outcome === 'foothold' && !foothold) continue;
      var home = residence(state, c);
      var pr = home && FB.world.byId[home];
      var ruling = FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, c);
      var context = {
        characterId:c.id,
        targetSovereign:sovereign,
        residenceId:home || null
      };
      if (ruling) {
        context.realmId = ruling;
        context.rulerGeneration = rulerGeneration(state, ruling);
      }
      if (foothold) context.foothold = foothold;
      out.push({
        context:context,
        label:FB.fullName(c),
        desc:FB.T('{station} · {residence}', {
          station:FB.stationName(FB.stationOf(c)),
          residence:pr ? pr.name : FB.T('unknown residence')
        }),
        icon:'🕸', group:ruling ? 'rulers' :
          (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id)
            ? 'household' : 'court'),
        characterId:c.id, realmId:ruling || sovereign
      });
    }
    out.sort(function (a, b) {
      return a.group.localeCompare(b.group) || a.label.localeCompare(b.label) ||
        a.context.characterId.localeCompare(b.context.characterId);
    });
    return out;
  }

  FB.intrigueTargetOptions = function (state, def, actorId, actorRealmId) {
    if (!def || !def.hostile) return [];
    actorId = actorId || state.player.charId;
    return def.target === 'intrigue_county'
      ? countyTargetOptions(state, actorId, actorRealmId)
      : characterTargetOptions(state, def, actorId, actorRealmId);
  };

  function sameTarget(expected, actual) {
    if (!expected || !actual) return false;
    var keys = ['characterId', 'pid', 'targetSovereign', 'realmId',
      'rulerGeneration'];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (expected[key] !== undefined && expected[key] !== actual[key]) return false;
    }
    if (expected.foothold && !actual.foothold) return false;
    if (expected.foothold) {
      for (var footholdKey in expected.foothold) {
        if (expected.foothold[footholdKey] !== actual.foothold[footholdKey]) {
          return false;
        }
      }
    }
    return true;
  }

  function directCharacterContext(state, def, context, actorId,
    actorRealmId) {
    var actor = actorCharacter(state, actorId);
    var c = targetCharacter(state, context);
    var sovereign = actorSovereign(state, actorId, actorRealmId);
    if (!actor || actor.dead || !c || c.dead || c.id === actorId ||
        characterSovereign(state, c) !== sovereign) return null;
    if (def.outcome === 'captive' && (rawCaptiveOf(state, actorId) ||
        unavailableThroughCaptivity(state, c))) return null;
    if (def.outcome === 'leverage' && (rawLeverageOf(state, actorId) ||
        !blackmailEligible(state, c))) return null;
    var foothold = def.outcome === 'foothold' ? politicalFoothold(state, c) : null;
    if (def.outcome === 'foothold' && !foothold) return null;
    var home = residence(state, c);
    var ruling = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, c);
    var current = {
      characterId:c.id, targetSovereign:sovereign,
      residenceId:home || null
    };
    if (ruling) {
      current.realmId = ruling;
      current.rulerGeneration = rulerGeneration(state, ruling);
    }
    if (foothold) current.foothold = foothold;
    return sameTarget(context, current) ? current : null;
  }

  function directCountyContext(state, context, actorId, actorRealmId) {
    var pid = context && context.pid;
    var sovereign = actorSovereign(state, actorId, actorRealmId);
    if (!pid || !sovereign || !state.owner || !FB.world.byId[pid]) return null;
    var owner = topRealm(state, state.owner[pid]);
    var allowed = owner === sovereign;
    if (!allowed) {
      var adjacent = FB.world.adj && FB.world.adj[pid] || {};
      for (var next in adjacent) {
        if (topRealm(state, state.owner[next]) === sovereign) {
          allowed = true;
          break;
        }
      }
    }
    if (!allowed) {
      for (var ownedPid in state.owner) {
        if (topRealm(state, state.owner[ownedPid]) === sovereign &&
            FB.world.adj && FB.world.adj[ownedPid] &&
            FB.world.adj[ownedPid][pid]) {
          allowed = true;
          break;
        }
      }
    }
    var current = { pid:pid, targetSovereign:owner };
    return allowed && sameTarget(context, current) ? current : null;
  }

  FB.intrigueTargetContext = function (state, def, context, actorId, actorRealmId) {
    actorId = actorId || state.player.charId;
    if (!def || !def.hostile || !context) return null;
    if (def.target === 'intrigue_character' && context.characterId) {
      return directCharacterContext(state, def, context, actorId, actorRealmId);
    }
    if (def.target === 'intrigue_county' && context.pid) {
      return directCountyContext(state, context, actorId, actorRealmId);
    }
    var options = FB.intrigueTargetOptions(state, def, actorId, actorRealmId);
    for (var i = 0; i < options.length; i++) {
      if (sameTarget(options[i].context, context)) return copy(options[i].context);
    }
    return null;
  };

  FB.intrigueTargetValid = function (state, def, context, actorId, actorRealmId) {
    return !!FB.intrigueTargetContext(state, def, context, actorId, actorRealmId);
  };

  FB.intrigueMethodOptions = function (state, plotId, context) {
    var def = defOf(plotId);
    var out = [];
    if (!def || !FB.intrigueTargetValid(state, def, context)) return out;
    var methods = Array.isArray(def.methods) ? def.methods : [];
    for (var i = 0; i < methods.length; i++) {
      var method = methodOf(def, methods[i].id);
      if (!method || typeof method.id !== 'string' || !method.id) continue;
      out.push({ id:method.id, def:method,
        cost:methodCost(state, def, context, method) });
    }
    return out;
  };

  FB.intrigueSchemesForTarget = function (state, characterId) {
    var out = [];
    var actor = character(state, state && state.player && state.player.charId);
    if (!actor || actor.dead || FB.ageOf(actor, state.date.year) < 16) return out;
    for (var i = 0; i < HOSTILE_IDS.length; i++) {
      var def = defOf(HOSTILE_IDS[i]);
      if (!def || def.target !== 'intrigue_character') continue;
      var options = FB.intrigueTargetOptions(state, def);
      var exact = null;
      for (var j = 0; j < options.length; j++) {
        if (options[j].characterId === characterId) {
          exact = copy(options[j].context);
          break;
        }
      }
      if (exact) out.push({ id:HOSTILE_IDS[i], def:def, context:exact });
    }
    return out;
  };

  FB.intrigueAssetsAvailable = function (state) {
    if (!state || !state.player) return false;
    return !!(state.player.plot && defOf(state.player.plot.id)) ||
      !!FB.intrigueCaptiveOf(state, state.player.charId) ||
      !!FB.intrigueCaptivityOf(state, state.player.charId) ||
      !!FB.intrigueLeverageOf(state, state.player.charId);
  };

  function traitAccompliceMotive(c) {
    var traits = c && c.traits || [];
    var score = 0;
    if (traits.indexOf('deceitful') >= 0) score += 0.10;
    if (traits.indexOf('ambitious') >= 0 || traits.indexOf('greedy') >= 0) score += 0.05;
    if (traits.indexOf('cruel') >= 0 || traits.indexOf('wrathful') >= 0) score += 0.05;
    if (traits.indexOf('honest') >= 0) score -= 0.10;
    if (traits.indexOf('kind') >= 0 || traits.indexOf('patient') >= 0) score -= 0.05;
    return FB.clamp(score, -0.20, 0.20);
  }

  function accompliceHostility(state, c, target) {
    if (!c || !target) return 0;
    if (state.roles && state.roles.rival === target.id) return 0.20;
    var opinion = finite(target.opinion, 0);
    if (c.opinions && c.opinions[target.id] !== undefined) {
      opinion = finite(c.opinions[target.id], opinion);
    }
    return opinion <= -25 ? 0.20 : 0;
  }

  function standingTowardActor(state, c, actor, actorRealmId) {
    if (!c || !actor) return 0;
    if (actor.id === state.player.charId && FB.standingOf) {
      return FB.standingOf(state, { kind:'character', id:c.id });
    }
    if (c.opinions && c.opinions[actor.id] !== undefined) {
      return finite(c.opinions[actor.id], 0);
    }
    var fromRealm = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, c);
    var toRealm = actorRealmId || (FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, actor));
    if (fromRealm && toRealm && FB.rulerRegard) {
      return FB.rulerRegard(state, fromRealm, toRealm);
    }
    return finite(c.opinion, 0);
  }

  function acceptanceChance(state, actor, c, target, paid, actorRealmId) {
    var standing = standingTowardActor(state, c, actor, actorRealmId);
    return FB.clamp(0.35 + standing / 200 +
      accompliceHostility(state, c, target) + traitAccompliceMotive(c) +
      (paid ? 0.20 : 0), 0.05, 0.95);
  }

  function refusalLeakChance(state, actor, c, target) {
    var traits = c && c.traits || [];
    var chance = 0.25;
    if (traits.indexOf('honest') >= 0) chance += 0.12;
    if (traits.indexOf('kind') >= 0) chance += 0.08;
    if (traits.indexOf('zealous') >= 0) chance += 0.08;
    if (target && (c.spouseId === target.id || target.spouseId === c.id ||
        c.fatherId === target.id || c.motherId === target.id ||
        target.fatherId === c.id || target.motherId === c.id ||
        c.fatherId && c.fatherId === target.fatherId ||
        c.motherId && c.motherId === target.motherId)) chance += 0.15;
    chance -= FB.skillOf(actor, 'int') * 0.01;
    return FB.clamp(chance, 0.05, 0.75);
  }

  function accompliceOptions(state, plotId, context, paid, actorId,
    actorRealmId) {
    var def = defOf(plotId), out = [];
    var actor = character(state, actorId);
    var target = targetCharacter(state, context);
    if (!def || !def.accomplice || !actor) return out;
    var sovereign = actorSovereign(state, actor.id, actorRealmId);
    for (var id in state.chars) {
      var c = state.chars[id];
      if (!c || c.dead || c.id === actor.id || c.id === (target && target.id) ||
          FB.ageOf(c, state.date.year) < 12 ||
          unavailableThroughCaptivity(state, c) ||
          characterSovereign(state, c) !== sovereign) continue;
      out.push({
        characterId:c.id, label:FB.fullName(c),
        acceptance:acceptanceChance(state, actor, c, target, paid,
          actorRealmId),
        leak:refusalLeakChance(state, actor, c, target),
        intrigue:FB.skillOf(c, 'int'),
        sameResidence:!!(residence(state, c) && context &&
          residence(state, c) === context.residenceId)
      });
    }
    out.sort(function (a, b) {
      return b.acceptance - a.acceptance || a.label.localeCompare(b.label) ||
        a.characterId.localeCompare(b.characterId);
    });
    return out;
  }

  FB.intrigueAccompliceOptions = function (state, plotId, context, paid) {
    return accompliceOptions(state, plotId, context, paid,
      state.player.charId, null);
  };

  function councilIntrigueBonus(state, actorId) {
    if (actorId !== state.player.charId || !FB.councilBonus) return 0;
    return finite(FB.councilBonus(state, 'plot'), 0);
  }

  function accompliceBonus(state, accomplice) {
    if (!accomplice || !accomplice.accepted) return 0;
    var c = character(state, accomplice.characterId);
    return c && !c.dead ? 0.05 + Math.min(0.10, FB.skillOf(c, 'int') * 0.01) : 0;
  }

  FB.intriguePreview = function (state, plotId, context, methodId,
    accompliceId, paid, options) {
    options = options || {};
    var def = defOf(plotId);
    var actorId = options.actorId || state.player.charId;
    var actorRealmId = options.actorRealmId || null;
    var actor = actorCharacter(state, actorId);
    var validContext = def && FB.intrigueTargetContext(state, def, context,
      actorId, actorRealmId);
    var method = def && methodOf(def, methodId);
    if (!def || !actor || actor.dead || !validContext || !method) return null;
    var target = targetCharacter(state, validContext);
    var actorInt = FB.skillOf(actor, 'int');
    var targetInt = target ? FB.skillOf(target, 'int') : 0;
    var targetStanding = target
      ? standingTowardActor(state, target, actor, actorRealmId) : 0;
    var success = finite(def.baseChance, 0.25) + actorInt * 0.035 -
      targetInt * 0.02 + targetStanding / 500 + finite(method.success, 0) +
      councilIntrigueBonus(state, actorId);
    if (actor.traits && actor.traits.indexOf('schemer') >= 0) success += 0.05;
    var accomplice = accompliceId && character(state, accompliceId);
    var acceptance = null, leak = null, sameResidence = false;
    if (accomplice && !accomplice.dead) {
      acceptance = acceptanceChance(state, actor, accomplice, target, paid,
        actorRealmId);
      leak = refusalLeakChance(state, actor, accomplice, target);
      if (options.accepted) {
        success += 0.05 + Math.min(0.10, FB.skillOf(accomplice, 'int') * 0.01);
      }
      var targetResidence = target ? residence(state, target) :
        validContext.residenceId;
      sameResidence = !!(residence(state, accomplice) && targetResidence &&
        residence(state, accomplice) === targetResidence);
    }
    success += finite(options.successModifier, 0);
    var progressSkill = actorInt +
      (method.martial ? FB.skillOf(actor, 'mar') : 0);
    var progress = (2 + progressSkill / 3) / 90 * finite(method.progress, 1);
    if (options.accepted && sameResidence) progress *= 1.25;
    var remaining = Math.max(0, finite(def.need, 1) - finite(options.power, 0));
    var exposure = FB.clamp(12 + finite(method.discovery, 0) +
      finite(options.discoveryModifier, 0) + (options.compelled ? 10 : 0), 0, 95);
    return {
      plotId:plotId, context:validContext, methodId:methodId,
      success:FB.clamp(success, 0.05, 0.90),
      days:Math.max(1, Math.ceil(remaining / Math.max(0.001, progress))),
      dailyProgress:progress,
      cost:methodCost(state, def, validContext, method) + (paid ? 10 : 0),
      exposure:exposure,
      accompliceAcceptance:acceptance,
      refusalLeak:leak,
      sameResidence:sameResidence
    };
  };

  function clearPlayerPlot(state) {
    state.player.plot = null;
    if (FB.validateFocus) FB.validateFocus(state);
  }

  function queuePlayerHearing(state, plot, evidence, successful) {
    var intrigue = FB.ensureIntrigue(state);
    var target = targetCharacter(state, plot.context);
    if (evidence === 'suspicion') {
      applySuspicionDamage(state, plot);
      FB.news(state, FB.msg('news.intrigue.suspicion',
        '🕸 Suspicion of {plot} damages a relationship, but no hearing can proceed.',
        { plot:FB.dataParam('plot', plot.id) }));
      return;
    }
    var severity = FB.intrigueOffenseSeverity(state, plot.id, plot.context,
      successful);
    var id = 'hearing-' + intrigue.nextId++;
    intrigue.hearing = {
      id:id, accusedId:state.player.charId,
      accusedGeneration:state.generation, targetId:target && target.id || null,
      accompliceId:plot.accomplice && plot.accomplice.characterId || null,
      plotId:plot.id, context:copy(plot.context), evidence:evidence,
      severity:severity, successful:!!successful,
      authority:FB.intrigueAuthority(state, target && target.id, plot.context)
    };
    var projection = FB.intrigueSentenceProjection(state, intrigue.hearing);
    FB.queueEvent(state, 'intrigue_hearing', {
      hearingId:id, studentId:target && target.id || null,
      pid:plot.context.pid || null,
      targetKind:target ? 'person' : (plot.context.pid ? 'county' : 'other'),
      sentence:projection && projection.outcome || 'other',
      fine:projection && projection.fine || 0
    });
  }

  function evidenceForAttempt(successful, leak) {
    if (leak) return FB.chance(0.35) ? 'material' : 'testimony';
    var roll = FB.rng();
    if (!successful && roll < 0.20) return 'redhanded';
    if (roll < 0.45) return 'material';
    if (roll < 0.75) return 'testimony';
    return 'suspicion';
  }

  function applySuspicionDamage(state, scheme) {
    var actorId = scheme.actorId || state.player.charId;
    var actor = character(state, actorId);
    var target = targetCharacter(state, scheme.context);
    if (!actor || !target) return;
    if (actorId === state.player.charId && FB.adjustStanding) {
      FB.adjustStanding(state, { kind:'character', id:target.id }, -25,
        'intrigue:suspicion');
      if (state.roles && state.roles.rival === target.id && FB.changeRivalHeat) {
        FB.changeRivalHeat(state, 15);
      }
      return;
    }
    var actorRealm = scheme.actorRealmId || (FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, actor));
    var targetRealm = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, target);
    if (actorRealm && targetRealm && FB.adjustRulerRegard) {
      FB.adjustRulerRegard(state, targetRealm, actorRealm, -25,
        'intrigue:suspicion');
    } else {
      if (!target.opinions || typeof target.opinions !== 'object' ||
          Array.isArray(target.opinions)) target.opinions = {};
      target.opinions[actorId] = FB.clamp(finite(
        target.opinions[actorId], 0) - 25, -100, 100);
    }
    if (target.id === state.player.charId && FB.startRivalry &&
        (!state.roles.rival || state.roles.rival === actorId)) {
      FB.startRivalry(state, actor, 'npc', 'intrigue_suspicion', null);
    }
  }

  FB.beginIntriguePlot = function (state, plotId, context, methodId,
    accompliceId, paid) {
    var def = defOf(plotId);
    var me = character(state, state.player.charId);
    if (!def || !me || me.dead || FB.ageOf(me, state.date.year) < 16 ||
        state.player.plot ||
        state.player.flags.in_prison || FB.intrigueCaptivityOf(state, me.id)) return false;
    var validContext = FB.intrigueTargetContext(state, def, context);
    var preview = validContext && FB.intriguePreview(state, plotId,
      validContext, methodId, accompliceId, paid);
    if (!preview || state.player.gold < preview.cost) return false;
    var accomplice = null;
    if (accompliceId) {
      var c = character(state, accompliceId);
      var eligible = FB.intrigueAccompliceOptions(state, plotId,
        validContext, paid).some(function (option) {
          return option.characterId === accompliceId;
        });
      if (!c || c.dead || !eligible) return false;
    }
    state.player.gold -= preview.cost;
    if (accompliceId) {
      c = character(state, accompliceId);
      var accepted = FB.chance(preview.accompliceAcceptance);
      if (accepted) {
        accomplice = { characterId:c.id, accepted:true, compelled:false };
      } else if (FB.chance(preview.refusalLeak)) {
        var leaked = { id:plotId, context:validContext,
          methodId:methodId, accomplice:null };
        FB.noteConduct(state, state.player.charId, { deceit:1,
          cruelty:plotId === 'assassination' || plotId === 'abduction' ||
            plotId === 'sabotage' ? 1 : 0 });
        queuePlayerHearing(state, leaked, evidenceForAttempt(false, true), false);
        FB.news(state, FB.msg('news.intrigue.accomplice_leak',
          '🕸 A refused accomplice exposes the proposed {plot}.', {
            plot:FB.dataParam('plot', plotId)
          }));
        return false;
      } else {
        FB.news(state, FB.msg('news.intrigue.accomplice_refused',
          '🕸 The proposed accomplice refuses, but keeps silent. The plot proceeds alone.', {}));
      }
    }
    state.player.plot = {
      id:plotId, power:0, context:validContext, methodId:methodId,
      accomplice:accomplice, paidAccomplice:!!paid, sprung:false,
      actorGeneration:state.generation
    };
    if (state.player.focus !== 'scheming') {
      state.player.focusBack = state.player.focus;
      state.player.focus = 'scheming';
    }
    FB.news(state, FB.msg('news.intrigue.begins',
      '🕸 A hostile scheme is set in motion: {plot}.', {
        plot:FB.dataParam('plot', plotId)
      }));
    return true;
  };

  function accompliceStillValid(state, plot, actorId, actorRealmId) {
    var record = plot.accomplice;
    if (!record || !record.accepted) return null;
    var c = character(state, record.characterId);
    if (!c || c.dead || unavailableThroughCaptivity(state, c) ||
        characterSovereign(state, c) !== actorSovereign(state, actorId,
          actorRealmId)) {
      plot.accomplice = null;
      return null;
    }
    return c;
  }

  FB.intrigueTickPlayerPlot = function (state) {
    var plot = state.player.plot;
    var def = plot && defOf(plot.id);
    if (!plot || !def) return false;
    var me = character(state, state.player.charId);
    if (!me || me.dead || state.player.flags.in_prison ||
        !FB.intrigueTargetValid(state, def, plot.context)) {
      clearPlayerPlot(state);
      FB.news(state, FB.msg('news.intrigue.target_lost',
        '🕸 The hostile scheme ends because its exact target or plotter is no longer available.', {}));
      return true;
    }
    var accomplice = accompliceStillValid(state, plot, me.id, null);
    var preview = FB.intriguePreview(state, plot.id, plot.context,
      plot.methodId, accomplice && accomplice.id, false, {
        accepted:!!accomplice, compelled:!!(plot.accomplice && plot.accomplice.compelled),
        power:plot.power,
        discoveryModifier:finite(plot.discoveryModifier, 0)
      });
    if (!preview) {
      clearPlayerPlot(state);
      return true;
    }
    plot.power += preview.dailyProgress;
    if (!plot.sprung && FB.chance(preview.exposure / 100 / 360)) {
      plot.sprung = true;
      queuePlayerHearing(state, plot, evidenceForAttempt(false, false), false);
      clearPlayerPlot(state);
      return true;
    }
    if (plot.power >= def.need && !plot.sprung) {
      plot.sprung = true;
      FB.resolveIntrigueScheme(state, plot, { playerActor:true });
      clearPlayerPlot(state);
    }
    return true;
  };

  FB.abandonIntriguePlot = function (state) {
    var plot = state && state.player && state.player.plot;
    if (!plot || !defOf(plot.id)) return false;
    FB.noteConduct(state, state.player.charId, { deceit:-1, cruelty:-1 });
    clearPlayerPlot(state);
    FB.news(state, FB.msg('news.intrigue.abandoned',
      '🕊 The hostile scheme is abandoned before it can be sprung.', {}));
    return true;
  };

  FB.noteConduct = function (state, cid, changes) {
    var c = character(state, cid);
    if (!c || c.dead) return null;
    changes = changes || {};
    if (!c.conduct || typeof c.conduct !== 'object' || Array.isArray(c.conduct)) {
      c.conduct = { schemes:0, deceit:0, cruelty:0 };
    }
    c.conduct.schemes = FB.clamp(finite(c.conduct.schemes, 0) +
      finite(changes.schemes, 0), 0, 3);
    c.conduct.deceit = FB.clamp(finite(c.conduct.deceit, 0) +
      finite(changes.deceit, 0), -3, 3);
    c.conduct.cruelty = FB.clamp(finite(c.conduct.cruelty, 0) +
      finite(changes.cruelty, 0), -3, 3);
    if (c.conduct.schemes >= 3) FB.addTrait(c, 'schemer');
    if (c.conduct.deceit >= 3) FB.addTrait(c, 'deceitful');
    if (c.conduct.deceit <= -3) FB.addTrait(c, 'honest');
    if (c.conduct.cruelty >= 3) FB.addTrait(c, 'cruel');
    if (c.conduct.cruelty <= -3) FB.addTrait(c, 'kind');
    if (changes.public) {
      if (changes.murderer) FB.addTrait(c, 'murderer');
      if (changes.abductor) FB.addTrait(c, 'abductor');
      if (changes.traitor) FB.addTrait(c, 'traitor');
    }
    return c.conduct;
  };

  function actorKinTarget(state, actor, target) {
    if (!actor || !target) return false;
    if (actor.spouseId === target.id || target.spouseId === actor.id) return true;
    if (actor.id === state.player.charId && FB.kinOf) {
      return !!FB.kinOf(state).byId[target.id];
    }
    return actor.fatherId === target.id || actor.motherId === target.id ||
      target.fatherId === actor.id || target.motherId === actor.id ||
      (actor.fatherId && actor.fatherId === target.fatherId) ||
      (actor.motherId && actor.motherId === target.motherId);
  }

  function playerRelevantCharacter(state, c) {
    if (!c) return false;
    if (c.id === state.player.charId ||
        FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id)) {
      return true;
    }
    for (var role in (state.roles || {})) {
      if (state.roles[role] === c.id) return true;
    }
    return !!(state.player.socialAttention &&
      state.player.socialAttention[c.id]);
  }

  function captivityPlayerRelevant(state, record) {
    if (FB.game && FB.game.observe) return true;
    var captive = record && character(state, record.captiveId);
    var captor = record && character(state, record.captorId);
    return playerRelevantCharacter(state, captive) ||
      playerRelevantCharacter(state, captor) ||
      characterSovereign(state, captive) === FB.playerRealmId(state) ||
      characterSovereign(state, captor) === FB.playerRealmId(state);
  }

  function releaseCaptiveRecord(state, record, reason) {
    var intrigue = FB.ensureIntrigue(state);
    var index = -1;
    for (var i = 0; record && i < intrigue.captives.length; i++) {
      var current = intrigue.captives[i];
      if (current.captiveId === record.captiveId &&
          current.captorId === record.captorId &&
          current.source === record.source) {
        index = i;
        break;
      }
    }
    if (index >= 0) intrigue.captives.splice(index, 1);
    if (record.captiveId === state.player.charId) {
      delete state.player.flags.intrigue_captive;
      delete state.player.flags.in_prison;
      state.eventQueue = (state.eventQueue || []).filter(function (item) {
        return item.id !== 'intrigue_captive_ransom';
      });
    }
    if (reason && captivityPlayerRelevant(state, record)) {
      FB.news(state, reason);
    }
  }

  FB.captureIntrigue = function (state, captorId, captiveId, source,
    captorRealmId) {
    var intrigue = FB.ensureIntrigue(state);
    var captor = character(state, captorId), captive = character(state, captiveId);
    if (!intrigue || !captor || captor.dead || !captive || captive.dead ||
        captorId === captiveId || FB.intrigueCaptivityOf(state, captiveId) ||
        unavailableThroughCaptivity(state, captive) ||
        (source === 'abduction' && FB.intrigueCaptiveOf(state, captorId))) return null;
    var ransomTable = FBDATA.intrigue.captiveRansoms || [5,10,20,40,80];
    var captiveStation = Math.floor(FB.clamp(finite(
      FB.stationOf(captive), 0), 0, 4));
    var amount = Math.max(0, finite(ransomTable[captiveStation], 0));
    var record = {
      captiveId:captiveId, captorId:captorId,
      captorRealmId:captorRealmId ||
        (FB.realmIdForRulerCharacter &&
          FB.realmIdForRulerCharacter(state, captor)) || null,
      captorGeneration:actorGeneration(state, captorId, captorRealmId),
      source:source || 'abduction', captureTurn:state.turn,
      demand:{ amount:amount, turn:state.turn }
    };
    intrigue.captives.push(record);
    if (captiveId === state.player.charId) {
      state.player.flags.in_prison = 1;
      state.player.flags.intrigue_captive = 1;
      clearPlayerPlot(state);
      FB.queueEvent(state, 'intrigue_captive_ransom', {
        captiveId:captiveId, captorId:captorId,
        captorGeneration:record.captorGeneration, ransom:amount
      });
    }
    intrigue.aiSchemes = intrigue.aiSchemes.filter(function (scheme) {
      return scheme.actorId !== captiveId;
    });
    return record;
  };

  function createLeverage(state, actorId, targetId, source, actorRealmId) {
    var intrigue = FB.ensureIntrigue(state);
    if (FB.intrigueLeverageOf(state, actorId)) return null;
    var record = {
      actorId:actorId, actorRealmId:actorRealmId || null,
      actorGeneration:actorGeneration(state, actorId, actorRealmId),
      targetId:targetId, source:source || 'blackmail',
      createdTurn:state.turn,
      endTurn:state.turn + finite(FBDATA.intrigue.leverageDays, 720),
      foothold:politicalFoothold(state, character(state, targetId))
    };
    intrigue.leverage.push(record);
    return record;
  }

  function removeFoothold(state, c, foothold) {
    if (!c || !footholdValid(state, c, foothold)) return false;
    if (foothold.kind === 'restoration') {
      delete c.restorationRight;
      return true;
    }
    if (foothold.kind === 'office' && FB.removeRetainer) {
      FB.removeRetainer(state, c.id, 'intrigue');
      return true;
    }
    if (foothold.kind === 'council' && state.council && state.council.seats) {
      state.council.seats[foothold.seat] = null;
      return true;
    }
    if (foothold.kind === 'claim') {
      delete c.claimRealmId;
      delete c.claimId;
      return true;
    }
    if (foothold.kind === 'landed') {
      var realm = state.realms[foothold.realmId];
      if (realm && realm.liege) {
        realm.favor = FB.clamp(finite(realm.favor, 0) - 25, -100, 100);
        return true;
      }
    }
    return false;
  }

  function schemeOutcome(state, scheme, successful) {
    if (!successful) return false;
    var actor = character(state, scheme.actorId || state.player.charId);
    var target = targetCharacter(state, scheme.context);
    if (scheme.id === 'assassination') {
      if (!target || target.dead) return false;
      var kinslayer = actorKinTarget(state, actor, target);
      if (target.id === state.player.charId && FB.game && FB.game.die) {
        FB.game.die(FB.msg('legend.death.intrigue',
          'Killed by a hidden hand in a successful assassination.', {}), {
            kind:'intrigue', eventId:'assassination'
          });
      } else if (FB.killChar) {
        FB.killChar(state, target);
      }
      if (kinslayer) FB.addTrait(actor, 'kinslayer');
      return true;
    }
    if (scheme.id === 'abduction') {
      return !!(target && FB.captureIntrigue(state, actor.id, target.id,
        'abduction', scheme.actorRealmId));
    }
    if (scheme.id === 'blackmail') {
      return !!(target && createLeverage(state, actor.id, target.id,
        'blackmail', scheme.actorRealmId));
    }
    if (scheme.id === 'fabricated_charge') {
      return !!(target && (removeFoothold(state, target,
        scheme.context.foothold || politicalFoothold(state, target)) ||
        (function () {
          var rid = FB.realmIdForRulerCharacter &&
            FB.realmIdForRulerCharacter(state, target);
          var r = rid && state.realms[rid];
          if (r && r.liege) {
            r.favor = FB.clamp(finite(r.favor, 0) - 25, -100, 100);
            return true;
          }
          if (FB.adjustStanding) {
            FB.adjustStanding(state, { kind:'character', id:target.id }, -25,
              'intrigue:false_charge');
            return true;
          }
          return false;
        })()));
    }
    if (scheme.id === 'sabotage') {
      return !!(scheme.context.pid && FB.addModifier &&
        FB.addModifier(state, 'covert_sabotage', scheme.context.pid,
          { sourceEventId:'intrigue_sabotage' }));
    }
    return false;
  }

  function targetPlayerRelevant(state, scheme) {
    var target = targetCharacter(state, scheme.context);
    return playerRelevantCharacter(state, target);
  }

  function reportScheme(state, scheme, success, exposed) {
    var target = targetCharacter(state, scheme.context);
    var relevant = FB.game.observe || targetPlayerRelevant(state, scheme) ||
      playerRelevantCharacter(state, character(state, scheme.actorId)) ||
      actorSovereign(state, scheme.actorId, scheme.actorRealmId) ===
        FB.playerRealmId(state) ||
      scheme.context.targetSovereign === FB.playerRealmId(state);
    if (!relevant) return;
    var key = success
      ? (exposed ? 'news.intrigue.resolved.success_exposed' :
        'news.intrigue.resolved.success_secret')
      : (exposed ? 'news.intrigue.resolved.failure_exposed' :
        'news.intrigue.resolved.failure_secret');
    var fallback = success
      ? (exposed ? '🕸 A {plot} against {target} succeeds and is exposed.' :
        '🕸 A {plot} against {target} succeeds in secret.')
      : (exposed ? '🕸 A {plot} against {target} fails and is exposed.' :
        '🕸 A {plot} against {target} fails without revealing its author.');
    FB.news(state, FB.msg(key, fallback, {
      plot:FB.dataParam('plot', scheme.id),
      target:target ? FB.fullName(target) :
        (FB.world.byId[scheme.context.pid] || {}).name || ''
    }));
  }

  FB.resolveIntrigueScheme = function (state, scheme, options) {
    options = options || {};
    var actorId = scheme.actorId || state.player.charId;
    var accomplice = accompliceStillValid(state, scheme, actorId,
      scheme.actorRealmId);
    var preview = FB.intriguePreview(state, scheme.id, scheme.context,
      scheme.methodId, accomplice && accomplice.id, false, {
        actorId:actorId, actorRealmId:scheme.actorRealmId,
        accepted:!!accomplice,
        compelled:!!(scheme.accomplice && scheme.accomplice.compelled),
        successModifier:finite(scheme.successModifier, 0),
        discoveryModifier:finite(scheme.discoveryModifier, 0),
        power:scheme.power
      });
    if (!preview) return false;
    var success = options.success !== undefined ? !!options.success :
      FB.chance(preview.success);
    success = schemeOutcome(state, {
      id:scheme.id, context:scheme.context, actorId:actorId,
      actorRealmId:scheme.actorRealmId
    }, success);
    var exposed = options.exposed !== undefined ? !!options.exposed :
      FB.chance(FB.clamp(preview.exposure / 100 + (success ? -0.05 : 0.15),
        0.05, 0.95));
    var evidence = exposed ? evidenceForAttempt(success, false) : null;
    var violent = scheme.id === 'assassination' || scheme.id === 'abduction' ||
      scheme.id === 'sabotage';
    FB.noteConduct(state, actorId, {
      schemes:success ? 1 : 0, deceit:1, cruelty:violent ? 1 : 0,
      public:false
    });
    if (accomplice) FB.noteConduct(state, accomplice.id, {
      schemes:success ? 1 : 0, deceit:1, cruelty:violent ? 1 : 0,
      public:false
    });
    if (options.playerActor && exposed) {
      queuePlayerHearing(state, scheme, evidence, success);
    } else if (!options.playerActor && exposed) {
      FB.intrigueAutoSentence(state, scheme, evidence, success);
    }
    reportScheme(state, scheme, success, exposed);
    return success;
  };

  FB.intrigueOffenseSeverity = function (state, plotId, context, successful) {
    var base = plotId === 'blackmail' || plotId === 'sabotage' ? 1 :
      (plotId === 'fabricated_charge' || plotId === 'abduction' ? 2 :
        (successful ? 4 : 3));
    var target = targetCharacter(state, context);
    var rid = target && FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, target);
    var sacred = target && (target.role === 'priest' || target.bishopric ||
      target.papalOffice);
    var heir = target && (target.royalLine || target.claimRealmId);
    if (rid || sacred || heir) base++;
    return FB.clamp(base, 1, 4);
  };

  FB.intrigueAuthority = function (state, targetId, context) {
    var target = character(state, targetId);
    var ruling = target && FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, target);
    var realm = ruling && state.realms[ruling];
    var authority = ruling
      ? (realm && realm.liege ? realm.liege : topRealm(state, ruling)) : null;
    var pid = context && (context.residenceId || context.pid) ||
      residence(state, target);
    if (!authority && pid && state.owner) authority = state.owner[pid];
    if (!authority) authority = context && context.targetSovereign ||
      characterSovereign(state, target);
    return authority || FB.playerRealmId(state) || 'player';
  };

  function authorityCharacter(state, authorityId) {
    if (!authorityId) return null;
    if (authorityId === 'player') return character(state, state.player.charId);
    return FB.realmRulerCharacterSnapshot &&
      FB.realmRulerCharacterSnapshot(state, authorityId) ||
      (FB.materializeRealmRuler &&
        FB.materializeRealmRuler(state, authorityId)) || null;
  }

  function legalForm(state, authorityId, target) {
    var rid = authorityId === 'player' ? FB.playerRealmId(state) : authorityId;
    var religion = rid && FB.realmReligionId ? FB.realmReligionId(state, rid) :
      target && target.religion;
    var group = religion && FB.faithGroup ? FB.faithGroup(religion, state) : '';
    var culture = target && target.culture || '';
    if (group === 'muslim') return 'muslim';
    if (group === 'pagan') return 'customary';
    if (/greek|byzant/i.test(culture) || /byzant/i.test(String(rid))) {
      return 'byzantine';
    }
    return 'latin';
  }

  FB.intrigueSentenceProjection = function (state, hearing) {
    if (!hearing) return null;
    var target = character(state, hearing.targetId);
    var form = legalForm(state, hearing.authority, target);
    var evidence = Math.max(0, EVIDENCE.indexOf(hearing.evidence));
    var severity = FB.clamp(finite(hearing.severity, 1), 1, 4);
    var accused = character(state, hearing.accusedId);
    var station = accused && accused.id !== state.player.charId
      ? FB.clamp(FB.stationOf(accused), 0, 4) : FB.playerStation(state);
    var fine = Math.max(5, Math.round((severity + evidence + 1) *
      [5, 8, 12, 20, 30][station]));
    var result = { form:form, fine:fine, sacred:false, outcome:'compensation' };
    if (target && (target.role === 'priest' || target.bishopric ||
        target.papalOffice)) result.sacred = true;
    if (severity === 1) result.outcome = 'compensation';
    else if (severity === 2) result.outcome = result.sacred ? 'penance' : 'prison';
    else if (severity === 3) result.outcome = form === 'byzantine'
      ? 'monastic_exile' : (form === 'customary' ? 'outlawry' : 'forfeiture');
    else if (form === 'byzantine') result.outcome = 'blinding_deposition';
    else if (form === 'muslim') result.outcome = 'qisas';
    else result.outcome = 'execution';
    return result;
  };

  function authorityTargeted(state, hearing) {
    var target = character(state, hearing && hearing.targetId);
    var rid = target && FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, target);
    if (!rid && hearing && hearing.context) rid = hearing.context.realmId;
    var realm = rid && state.realms && state.realms[rid];
    return !!(rid && (rid === state.player.liege || realm && !realm.liege));
  }

  function publicConductForHearing(state, hearing) {
    FB.noteConduct(state, hearing.accusedId, {
      public:true,
      murderer:hearing.successful && hearing.plotId === 'assassination',
      abductor:hearing.successful && hearing.plotId === 'abduction',
      traitor:authorityTargeted(state, hearing)
    });
    if (hearing.accompliceId) FB.noteConduct(state, hearing.accompliceId, {
      public:true,
      murderer:hearing.successful && hearing.plotId === 'assassination',
      abductor:hearing.successful && hearing.plotId === 'abduction',
      traitor:authorityTargeted(state, hearing)
    });
    var projection = FB.intrigueSentenceProjection(state, hearing);
    var accused = character(state, hearing.accusedId);
    if (projection && projection.sacred && accused) {
      if (accused.id === state.player.charId) {
        state.player.piety = Math.max(0, state.player.piety - 20);
      } else if (accused.piety !== undefined) {
        accused.piety = Math.max(0, finite(accused.piety, 0) - 20);
      }
      if (hearing.severity >= 3 && FB.faithHasSystem &&
          FB.faithHasSystem(accused.religion, 'papacy', state)) {
        FB.addTrait(accused, 'excommunicated');
        if (accused.id === state.player.charId && FB.ensureLegacyPapalSentence) {
          FB.ensureLegacyPapalSentence(state);
        }
      }
    }
  }

  function clearHearing(state) {
    var intrigue = FB.ensureIntrigue(state);
    intrigue.hearing = null;
  }

  function applyPlayerSentence(state, hearing, projection) {
    var p = state.player;
    publicConductForHearing(state, hearing);
    if (projection.outcome === 'compensation') {
      p.gold = Math.max(0, p.gold - Math.min(p.gold, projection.fine));
    } else if (projection.outcome === 'penance') {
      p.piety = Math.max(0, p.piety - 40);
      p.prestige = Math.max(0, p.prestige - 20);
    } else if (projection.outcome === 'prison') {
      p.flags.in_prison = 1;
      state.intrigue.legalCustody = {
        characterId:p.charId, authority:hearing.authority,
        endTurn:state.turn + 360
      };
      p.flags.intrigue_legal_custody = 1;
      clearPlayerPlot(state);
    } else if (projection.outcome === 'forfeiture' ||
        projection.outcome === 'outlawry' ||
        projection.outcome === 'monastic_exile') {
      if (FB.loseAllLand) FB.loseAllLand(state, { flee:true });
      p.prestige = Math.max(0, p.prestige - 50);
    } else if (projection.outcome === 'blinding_deposition') {
      FB.addTrait(character(state, p.charId), 'one_eyed');
      FB.addTrait(character(state, p.charId), 'maimed');
      if (FB.loseAllLand) FB.loseAllLand(state, { flee:true });
    } else if (projection.outcome === 'execution' || projection.outcome === 'qisas') {
      if (FB.game && FB.game.die) FB.game.die(FB.msg(
        'legend.death.intrigue_sentence',
        'Executed after conviction for a hostile scheme.', {}), {
          kind:'sentence', eventId:'intrigue_hearing'
        });
    }
    clearHearing(state);
  }

  FB.intrigueAutoSentence = function (state, scheme, evidence, successful) {
    var accused = character(state, scheme.actorId);
    if (!accused || accused.dead) return false;
    if (evidence === 'suspicion') {
      applySuspicionDamage(state, scheme);
      return true;
    }
    var hearing = {
      accusedId:accused.id, targetId:scheme.context.characterId || null,
      plotId:scheme.id, context:copy(scheme.context), evidence:evidence,
      severity:FB.intrigueOffenseSeverity(state, scheme.id, scheme.context,
        successful), successful:successful,
      authority:FB.intrigueAuthority(state, scheme.context.characterId,
        scheme.context)
    };
    var projection = FB.intrigueSentenceProjection(state, hearing);
    FB.noteConduct(state, accused.id, {
      public:true,
      murderer:successful && scheme.id === 'assassination',
      abductor:successful && scheme.id === 'abduction',
      traitor:authorityTargeted(state, hearing)
    });
    if (scheme.accomplice && scheme.accomplice.characterId) {
      FB.noteConduct(state, scheme.accomplice.characterId, {
        public:true,
        murderer:successful && scheme.id === 'assassination',
        abductor:successful && scheme.id === 'abduction',
        traitor:authorityTargeted(state, hearing)
      });
    }
    if (projection.sacred) {
      if (accused.piety !== undefined) {
        accused.piety = Math.max(0, finite(accused.piety, 0) - 20);
      }
      if (hearing.severity >= 3 && FB.faithHasSystem &&
          FB.faithHasSystem(accused.religion, 'papacy', state)) {
        FB.addTrait(accused, 'excommunicated');
      }
    }
    if (projection.outcome === 'execution' || projection.outcome === 'qisas') {
      if (FB.killChar) FB.killChar(state, accused);
    } else if (projection.outcome === 'blinding_deposition') {
      FB.addTrait(accused, 'one_eyed');
      FB.addTrait(accused, 'maimed');
      var rid = FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, accused);
      if (rid && FB.advanceRealmSuccession) FB.advanceRealmSuccession(state, rid);
    } else if (projection.outcome === 'prison') {
      var custodian = authorityCharacter(state, hearing.authority);
      if (!custodian || custodian.id === accused.id) {
        custodian = character(state, hearing.targetId);
      }
      if (custodian && custodian.id !== accused.id) {
        FB.captureIntrigue(state, custodian.id, accused.id, 'legal',
          hearing.authority);
      }
    } else if (projection.outcome === 'forfeiture' ||
        projection.outcome === 'outlawry' ||
        projection.outcome === 'monastic_exile') {
      rid = FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, accused);
      if (rid && FB.advanceRealmSuccession) FB.advanceRealmSuccession(state, rid);
    } else if (projection.outcome === 'compensation') {
      accused.wealth = Math.max(0, finite(accused.wealth, 0) - projection.fine);
    } else if (projection.outcome === 'penance') {
      accused.piety = Math.max(0, finite(accused.piety, 0) - 20);
    }
    return true;
  };

  FB.intrigueRansomCaptive = function (state, captorId) {
    var record = FB.intrigueCaptiveOf(state, captorId || state.player.charId);
    if (!record || record.captorId !== state.player.charId) return false;
    state.player.gold += record.demand.amount;
    releaseCaptiveRecord(state, record, FB.msg('news.intrigue.ransom_received',
      '⛓ A captive is released after ransom is paid.', {}));
    FB.noteConduct(state, state.player.charId, { deceit:-1, cruelty:-1 });
    return true;
  };

  FB.intrigueReleaseForLeverage = function (state, captorId) {
    var record = FB.intrigueCaptiveOf(state, captorId || state.player.charId);
    if (!record || record.captorId !== state.player.charId ||
        FB.intrigueLeverageOf(state, state.player.charId)) return false;
    createLeverage(state, state.player.charId, record.captiveId,
      'release', null);
    releaseCaptiveRecord(state, record, FB.msg('news.intrigue.release_leverage',
      '✉ A captive is released under a binding private obligation.', {}));
    return true;
  };

  FB.intrigueReleaseMercifully = function (state, captorId) {
    var record = FB.intrigueCaptiveOf(state, captorId || state.player.charId);
    if (!record || record.captorId !== state.player.charId) return false;
    releaseCaptiveRecord(state, record, FB.msg('news.intrigue.release_mercy',
      '🕊 A captive is released without terms.', {}));
    FB.noteConduct(state, state.player.charId, { deceit:-1, cruelty:-2 });
    return true;
  };

  FB.canUseIntrigueLeverage = function (state, actorId, action) {
    var record = FB.intrigueLeverageOf(state, actorId);
    if (!record) return false;
    var target = character(state, record.targetId);
    if (action === 'payment') return true;
    if (action === 'accomplice') {
      var scheme = actorId === state.player.charId ? state.player.plot :
        (state.intrigue.aiSchemes.filter(function (candidate) {
          return candidate.actorId === actorId;
        })[0] || null);
      var schemeId = scheme && (scheme.id || scheme.schemeId);
      return !!(scheme && defOf(schemeId) && !scheme.accomplice &&
        target.id !== scheme.context.characterId &&
        !FB.intrigueCaptivityOf(state, target.id) &&
        characterSovereign(state, target) === actorSovereign(state, actorId,
          scheme.actorRealmId));
    }
    if (action === 'expose') return footholdValid(state, target,
      record.foothold);
    return false;
  };

  FB.useIntrigueLeverage = function (state, actorId, action) {
    var intrigue = FB.ensureIntrigue(state);
    var record = FB.intrigueLeverageOf(state, actorId);
    if (!record || !FB.canUseIntrigueLeverage(state, actorId, action)) {
      return false;
    }
    var target = character(state, record.targetId);
    var used = false;
    if (action === 'payment') {
      var ransomTable = FBDATA.intrigue.captiveRansoms || [5,10,20,40,80];
      var targetStation = Math.floor(FB.clamp(finite(
        FB.stationOf(target), 0), 0, 4));
      var amount = Math.max(0, finite(ransomTable[targetStation], 0));
      if (actorId === state.player.charId) state.player.gold += amount;
      else character(state, actorId).wealth = Math.max(0,
        finite(character(state, actorId).wealth, 0) + amount);
      used = true;
    } else if (action === 'accomplice') {
      var active = actorId === state.player.charId ? state.player.plot :
        intrigue.aiSchemes.filter(function (candidate) {
          return candidate.actorId === actorId;
        })[0];
      active.accomplice = {
        characterId:target.id, accepted:true, compelled:true
      };
      used = true;
    } else if (action === 'expose') {
      used = removeFoothold(state, target, record.foothold);
    }
    if (used) intrigue.leverage = intrigue.leverage.filter(function (current) {
      return current.actorId !== actorId;
    });
    return used;
  };

  function aiSchemeMethod(def) {
    var methods = def.methods || [];
    return methods.length
      ? methodOf(def, methods[FB.ri(0, methods.length - 1)].id) : null;
  }

  function aiAccompliceAttempt(state, candidate, schemeId, target) {
    var options = accompliceOptions(state, schemeId, target.context, false,
      candidate.actor.id, candidate.rid);
    if (!options.length || !FB.chance(0.40)) {
      return { accomplice:null, leaked:false };
    }
    var option = options[0];
    if (FB.chance(option.acceptance)) {
      return { accomplice:{ characterId:option.characterId,
        accepted:true, compelled:false }, leaked:false };
    }
    return { accomplice:null, leaked:FB.chance(option.leak) };
  }

  function aiTraitWeight(actor, aim) {
    var traits = actor && actor.traits || [];
    var weight = 1;
    if (traits.indexOf('cruel') >= 0 || traits.indexOf('deceitful') >= 0 ||
        traits.indexOf('wrathful') >= 0 || traits.indexOf('ambitious') >= 0 ||
        traits.indexOf('greedy') >= 0) weight += 0.6;
    if (aim === 'expand_realm' || aim === 'amass_wealth' ||
        aim === 'strengthen_crown') weight += 0.5;
    if (traits.indexOf('kind') >= 0 || traits.indexOf('honest') >= 0 ||
        traits.indexOf('content') >= 0 || traits.indexOf('patient') >= 0 ||
        aim === 'keep_peace') weight *= 0.15;
    return weight;
  }

  function aiTargetPool(state, actor, rid, plotId) {
    var def = defOf(plotId);
    return FB.intrigueTargetOptions(state, def, actor.id, rid);
  }

  function duplicateMajorTarget(intrigue, plotId, context) {
    if (plotId !== 'assassination' && plotId !== 'abduction') return false;
    for (var i = 0; i < intrigue.aiSchemes.length; i++) {
      var other = intrigue.aiSchemes[i];
      if ((other.schemeId === 'assassination' || other.schemeId === 'abduction') &&
          other.context.characterId === context.characterId) return true;
    }
    return false;
  }

  FB.intrigueAgencyYearly = function (state) {
    var intrigue = FB.ensureIntrigue(state);
    var maxSchemes = Math.min(6, Math.max(0, Math.floor(finite(
      FBDATA.intrigue.maxAiSchemes, 6))));
    if (!intrigue || intrigue.aiSchemes.length >= maxSchemes) return;
    var year = state.date.year;
    if (intrigue.startYear !== year) {
      intrigue.startYear = year;
      intrigue.startsThisYear = 0;
      intrigue.playerFacingStartsThisYear = 0;
    }
    var annualLimit = Math.min(2, Math.max(0, Math.floor(finite(
      FBDATA.intrigue.aiStartsPerYear, 2))));
    var playerFacingLimit = Math.min(1, Math.max(0, Math.floor(finite(
      FBDATA.intrigue.aiPlayerFacingPerYear, 1))));
    var remaining = annualLimit -
      finite(intrigue.startsThisYear, 0);
    if (remaining <= 0) return;
    var candidates = [];
    for (var rid in state.realms) {
      var realm = state.realms[rid];
      if (!realm || !realm.alive || realm.liege || rid === 'player' ||
          FB.intrigueRealmRulerCaptive(state, rid)) continue;
      var actor = FB.realmRulerCharacterSnapshot &&
        FB.realmRulerCharacterSnapshot(state, rid);
      if (!actor || actor.dead || intrigue.cooldowns[actor.id] > year ||
          intrigue.aiSchemes.some(function (scheme) {
            return scheme.actorId === actor.id;
          })) continue;
      var aim = state.agency && state.agency.rulerAims &&
        state.agency.rulerAims[rid] && state.agency.rulerAims[rid].id;
      var weight = aiTraitWeight(actor, aim);
      if (weight < 0.25 || !FB.chance(Math.min(0.80, weight * 0.25))) continue;
      candidates.push({ rid:rid, actor:actor, weight:weight });
    }
    candidates.sort(function (a, b) {
      return b.weight - a.weight || a.rid.localeCompare(b.rid);
    });
    for (var ci = 0; ci < candidates.length && remaining > 0 &&
        intrigue.aiSchemes.length < maxSchemes;
        ci++) {
      var candidate = candidates[ci];
      var schemeIds = HOSTILE_IDS.slice();
      if (candidate.actor.traits.indexOf('greedy') >= 0) {
        schemeIds = ['blackmail', 'sabotage', 'fabricated_charge',
          'abduction', 'assassination'];
      } else if (candidate.actor.traits.indexOf('cruel') >= 0 ||
          candidate.actor.traits.indexOf('wrathful') >= 0) {
        schemeIds = ['assassination', 'abduction', 'sabotage',
          'fabricated_charge', 'blackmail'];
      }
      var chosen = null;
      for (var si = 0; si < schemeIds.length && !chosen; si++) {
        var pool = aiTargetPool(state, candidate.actor, candidate.rid,
          schemeIds[si]);
        for (var ti = 0; ti < pool.length; ti++) {
          var playerFacing = pool[ti].characterId &&
            (pool[ti].characterId === state.player.charId ||
              FB.isHouseholdCharacter &&
                FB.isHouseholdCharacter(state, pool[ti].characterId));
          if (playerFacing && intrigue.playerFacingStartsThisYear >=
              playerFacingLimit) continue;
          if (duplicateMajorTarget(intrigue, schemeIds[si], pool[ti].context)) continue;
          chosen = { schemeId:schemeIds[si], target:pool[ti],
            playerFacing:playerFacing };
          break;
        }
      }
      if (!chosen) continue;
      var def = defOf(chosen.schemeId), method = aiSchemeMethod(def);
      if (!method) continue;
      var helperAttempt = aiAccompliceAttempt(state, candidate,
        chosen.schemeId, chosen.target);
      if (helperAttempt.leaked) {
        var leakedScheme = {
          id:chosen.schemeId, actorId:candidate.actor.id,
          actorRealmId:candidate.rid, context:copy(chosen.target.context),
          methodId:method.id, accomplice:null
        };
        var leakedEvidence = evidenceForAttempt(false, true);
        FB.noteConduct(state, candidate.actor.id, { deceit:1,
          cruelty:chosen.schemeId === 'assassination' ||
            chosen.schemeId === 'abduction' || chosen.schemeId === 'sabotage'
            ? 1 : 0 });
        FB.intrigueAutoSentence(state, leakedScheme, leakedEvidence, false);
        reportScheme(state, leakedScheme, false, true);
        intrigue.cooldowns[candidate.actor.id] = year +
          finite(FBDATA.intrigue.aiActorCooldownYears, 4);
        intrigue.startsThisYear++;
        if (chosen.playerFacing) intrigue.playerFacingStartsThisYear++;
        remaining--;
        continue;
      }
      intrigue.aiSchemes.push({
        recordId:'ai-' + intrigue.nextId++, schemeId:chosen.schemeId,
        actorId:candidate.actor.id, actorRealmId:candidate.rid,
        actorGeneration:actorGeneration(state, candidate.actor.id,
          candidate.rid), context:copy(chosen.target.context),
        methodId:method.id, power:0, startedTurn:state.turn,
        accomplice:helperAttempt.accomplice,
        playerFacing:!!chosen.playerFacing, warningStatus:null
      });
      intrigue.cooldowns[candidate.actor.id] = year +
        finite(FBDATA.intrigue.aiActorCooldownYears, 4);
      intrigue.startsThisYear++;
      if (chosen.playerFacing) intrigue.playerFacingStartsThisYear++;
      remaining--;
    }
  };

  function aiWarningNeeded(state, scheme) {
    return scheme.playerFacing &&
      (scheme.schemeId === 'assassination' || scheme.schemeId === 'abduction');
  }

  function queueAiWarning(state, scheme) {
    scheme.warningStatus = 'pending';
    FB.queueEvent(state, 'intrigue_warning', {
      schemeRecordId:scheme.recordId,
      actorGeneration:scheme.actorGeneration,
      studentId:scheme.context.characterId
    });
  }

  function removeAiScheme(state, scheme) {
    var list = FB.ensureIntrigue(state).aiSchemes;
    var index = list.indexOf(scheme);
    if (index >= 0) list.splice(index, 1);
  }

  FB.intrigueSeason = function (state) {
    var intrigue = FB.ensureIntrigue(state);
    if (!intrigue) return;
    var captives = intrigue.captives.slice();
    for (var i = 0; i < captives.length; i++) {
      var record = captives[i];
      var captive = character(state, record.captiveId);
      var captor = character(state, record.captorId);
      if (!captive || captive.dead || !captor || captor.dead) continue;
      var escape = FB.clamp(0.08 + FB.skillOf(captive, 'int') * 0.01 -
        FB.skillOf(captor, 'int') * 0.005, 0.03, 0.25);
      if (FB.chance(escape)) {
        releaseCaptiveRecord(state, record, FB.msg('news.intrigue.escape',
          '⛓ A captive escapes confinement and returns to freedom.', {}));
      }
    }
    var leverage = intrigue.leverage.slice();
    for (i = 0; i < leverage.length; i++) {
      var leverageRecord = leverage[i];
      if (leverageRecord.actorId === state.player.charId) continue;
      var leverageAction = FB.canUseIntrigueLeverage(state,
        leverageRecord.actorId, 'expose') ? 'expose' :
        (FB.canUseIntrigueLeverage(state, leverageRecord.actorId,
          'accomplice') ? 'accomplice' : 'payment');
      FB.useIntrigueLeverage(state, leverageRecord.actorId, leverageAction);
    }
    var schemes = intrigue.aiSchemes.slice();
    for (i = 0; i < schemes.length; i++) {
      var scheme = schemes[i], def = defOf(scheme.schemeId);
      if (!def || !recordMatchesActor(state, scheme) ||
          FB.intrigueCaptivityOf(state, scheme.actorId) ||
          !FB.intrigueTargetValid(state, def, scheme.context,
            scheme.actorId, scheme.actorRealmId)) {
        removeAiScheme(state, scheme);
        continue;
      }
      var helper = accompliceStillValid(state, scheme, scheme.actorId,
        scheme.actorRealmId);
      var preview = FB.intriguePreview(state, scheme.schemeId, scheme.context,
        scheme.methodId, helper && helper.id, false, {
          actorId:scheme.actorId, actorRealmId:scheme.actorRealmId,
          accepted:!!helper,
          successModifier:finite(scheme.successModifier, 0),
          discoveryModifier:finite(scheme.discoveryModifier, 0),
          power:scheme.power
        });
      if (!preview) {
        removeAiScheme(state, scheme);
        continue;
      }
      scheme.power += preview.dailyProgress * 90;
      if (scheme.power < def.need) continue;
      if (aiWarningNeeded(state, scheme) && !scheme.warningStatus &&
          !FB.game.observe) {
        queueAiWarning(state, scheme);
        continue;
      }
      if (scheme.warningStatus === 'pending') continue;
      FB.resolveIntrigueScheme(state, {
        id:scheme.schemeId, context:scheme.context,
        methodId:scheme.methodId, actorId:scheme.actorId,
        actorRealmId:scheme.actorRealmId, power:scheme.power,
        accomplice:scheme.accomplice,
        successModifier:scheme.successModifier,
        discoveryModifier:scheme.discoveryModifier
      }, { playerActor:false });
      removeAiScheme(state, scheme);
    }
  };

  FB.intrigueDay = function (state) {
    var intrigue = intrigueForRead(state);
    if (!intrigue) return;
    if (state.player.flags.in_prison && state.player.plot) clearPlayerPlot(state);
    for (var leverageIndex = intrigue.leverage.length - 1;
        leverageIndex >= 0; leverageIndex--) {
      var repairedLeverage = normalizeLeverage(state,
        intrigue.leverage[leverageIndex]);
      if (repairedLeverage) intrigue.leverage[leverageIndex] = repairedLeverage;
      else intrigue.leverage.splice(leverageIndex, 1);
    }
    if (intrigue.legalCustody && intrigue.legalCustody.endTurn <= state.turn) {
      if (intrigue.legalCustody.characterId === state.player.charId) {
        delete state.player.flags.intrigue_legal_custody;
        delete state.player.flags.in_prison;
      }
      intrigue.legalCustody = null;
    }
  };

  FB.intrigueCharacterDied = function (state, c) {
    var intrigue = FB.ensureIntrigue(state);
    if (!intrigue || !c) return;
    var records = intrigue.captives.slice();
    for (var i = 0; i < records.length; i++) {
      if (records[i].captiveId === c.id) releaseCaptiveRecord(state, records[i]);
      else if (records[i].captorId === c.id) releaseCaptiveRecord(state,
        records[i], FB.msg('news.intrigue.captor_died',
          '⛓ A captor’s death ends the confinement.', {}));
    }
    intrigue.leverage = intrigue.leverage.filter(function (record) {
      return record.actorId !== c.id && record.targetId !== c.id;
    });
    intrigue.aiSchemes = intrigue.aiSchemes.filter(function (scheme) {
      if (scheme.actorId === c.id || scheme.context.characterId === c.id) return false;
      if (scheme.accomplice && scheme.accomplice.characterId === c.id) {
        scheme.accomplice = null;
      }
      return true;
    });
    var plot = state.player.plot;
    if (plot && defOf(plot.id)) {
      if (plot.context.characterId === c.id) clearPlayerPlot(state);
      else if (plot.accomplice && plot.accomplice.characterId === c.id) {
        plot.accomplice = null;
      }
    }
  };

  FB.intriguePlayerSuccession = function (state, formerId, heirId) {
    var priorCaptives = state.intrigue && Array.isArray(state.intrigue.captives)
      ? state.intrigue.captives.slice() : [];
    var intrigue = FB.ensureIntrigue(state);
    if (!intrigue) return;
    for (var captiveIndex = 0; captiveIndex < priorCaptives.length;
        captiveIndex++) {
      var record = priorCaptives[captiveIndex];
      var current = null;
      for (var currentIndex = 0; record &&
          currentIndex < intrigue.captives.length; currentIndex++) {
        if (intrigue.captives[currentIndex].captiveId === record.captiveId &&
            intrigue.captives[currentIndex].captorId === formerId) {
          current = intrigue.captives[currentIndex];
          break;
        }
      }
      if (current) {
        releaseCaptiveRecord(state, current, FB.msg(
          'news.intrigue.captor_succession',
          '⛓ A captor’s succession ends the confinement.', {}));
      }
    }
    intrigue.leverage = intrigue.leverage.filter(function (record) {
      return record.actorId !== formerId;
    });
    var captive = FB.intrigueCaptivityOf(state, heirId);
    if (captive) {
      state.player.flags.in_prison = 1;
      state.player.flags.intrigue_captive = 1;
    }
  };

  FB.intrigueRealmSuccession = function (state, rid) {
    var intrigue = FB.ensureIntrigue(state);
    if (!intrigue) return;
    var records = intrigue.captives.slice();
    for (var i = 0; i < records.length; i++) {
      if (records[i].captorRealmId === rid &&
          records[i].captorGeneration !== rulerGeneration(state, rid)) {
        releaseCaptiveRecord(state, records[i], FB.msg(
          'news.intrigue.captor_succession',
          '⛓ A captor’s succession ends the confinement.', {}));
      }
    }
    FB.ensureIntrigue(state);
  };

  function warningScheme(state, ctx) {
    var list = FB.ensureIntrigue(state).aiSchemes;
    for (var i = 0; i < list.length; i++) {
      if (list[i].recordId === ctx.schemeRecordId &&
          Number(list[i].actorGeneration) === Number(ctx.actorGeneration) &&
          list[i].warningStatus === 'pending') return list[i];
    }
    return null;
  }

  FB.fns = FB.fns || {};

  FB.fns.intrigue_warning_valid = function (state, ctx) {
    return !!warningScheme(state, ctx);
  };

  FB.fns.intrigue_warning_investigate = function (state, ctx) {
    var scheme = warningScheme(state, ctx);
    if (!scheme) return false;
    var me = character(state, state.player.charId);
    if (FB.chance(FB.clamp(0.35 + FB.skillOf(me, 'int') * 0.025,
        0.10, 0.85))) {
      scheme.successModifier = finite(scheme.successModifier, 0) - 0.15;
      scheme.identified = true;
      var actor = character(state, scheme.actorId);
      FB.news(state, FB.msg('news.intrigue.warning_identified',
        '🕸 The investigation identifies {name} as the plotter.', {
          name:actor ? FB.fullName(actor) : ''
        }));
    }
    scheme.warningStatus = 'answered';
    return true;
  };

  FB.fns.intrigue_warning_security = function (state, ctx) {
    var scheme = warningScheme(state, ctx);
    if (!scheme) return false;
    scheme.successModifier = finite(scheme.successModifier, 0) - 0.20;
    scheme.discoveryModifier = finite(scheme.discoveryModifier, 0) + 10;
    scheme.identified = true;
    scheme.warningStatus = 'answered';
    var actor = character(state, scheme.actorId);
    FB.news(state, FB.msg('news.intrigue.security_identified',
      '🛡 The hired security traces the preparations to {name}.', {
        name:actor ? FB.fullName(actor) : ''
      }));
    return true;
  };

  FB.fns.intrigue_warning_countertrap = function (state, ctx) {
    var scheme = warningScheme(state, ctx);
    if (!scheme) return false;
    var me = character(state, state.player.charId);
    var actor = character(state, scheme.actorId);
    var chance = FB.clamp(0.35 + FB.skillOf(me, 'int') * 0.025 -
      FB.skillOf(actor, 'int') * 0.015, 0.10, 0.80);
    if (FB.chance(chance)) {
      scheme.warningStatus = 'cancelled';
      scheme.identified = true;
      removeAiScheme(state, scheme);
      FB.intrigueAutoSentence(state, {
        id:scheme.schemeId, actorId:scheme.actorId,
        actorRealmId:scheme.actorRealmId, context:scheme.context,
        accomplice:scheme.accomplice
      }, 'redhanded', false);
      FB.news(state, FB.msg('news.intrigue.countertrap_caught',
        '🕸 The counter-trap catches {name}’s agents red-handed and ends the attempt.', {
          name:actor ? FB.fullName(actor) : ''
        }));
    } else {
      scheme.successModifier = finite(scheme.successModifier, 0) + 0.10;
      scheme.warningStatus = 'answered';
    }
    return true;
  };

  FB.fns.intrigue_warning_ignore = function (state, ctx) {
    var scheme = warningScheme(state, ctx);
    if (!scheme) return false;
    scheme.warningStatus = 'answered';
    return true;
  };

  function activeHearing(state, ctx) {
    var hearing = FB.ensureIntrigue(state).hearing;
    return hearing && hearing.id === ctx.hearingId &&
      hearing.accusedId === state.player.charId &&
      hearing.accusedGeneration === state.generation ? hearing : null;
  }

  FB.fns.intrigue_hearing_valid = function (state, ctx) {
    return !!activeHearing(state, ctx);
  };

  FB.fns.intrigue_hearing_can_pay = function (state, ctx) {
    var hearing = activeHearing(state, ctx);
    var projection = hearing && FB.intrigueSentenceProjection(state, hearing);
    return !!(projection && state.player.gold >= projection.fine &&
      (hearing.severity <= 2 || projection.form === 'muslim' ||
        projection.form === 'customary'));
  };

  FB.fns.intrigue_hearing_can_penance = function (state, ctx) {
    var hearing = activeHearing(state, ctx);
    var projection = hearing && FB.intrigueSentenceProjection(state, hearing);
    return !!(projection && (projection.sacred || hearing.severity <= 2) &&
      state.player.piety >= 20);
  };

  FB.fns.intrigue_hearing_can_resist = function (state, ctx) {
    return !!(activeHearing(state, ctx) && state.player.liege &&
      state.player.tier >= 3 && !state.player.war);
  };

  FB.fns.intrigue_hearing_challenge = function (state, ctx) {
    var hearing = activeHearing(state, ctx);
    if (!hearing) return false;
    var evidence = Math.max(0, EVIDENCE.indexOf(hearing.evidence));
    var me = character(state, state.player.charId);
    var chance = FB.clamp(0.45 + FB.skillOf(me, 'int') * 0.025 -
      evidence * 0.15, 0.05, 0.80);
    if (FB.chance(chance)) {
      FB.noteConduct(state, me.id, { deceit:1 });
      clearHearing(state);
    } else {
      applyPlayerSentence(state, hearing,
        FB.intrigueSentenceProjection(state, hearing));
    }
    return true;
  };

  FB.fns.intrigue_hearing_pay = function (state, ctx) {
    var hearing = activeHearing(state, ctx);
    if (!hearing) return false;
    var projection = FB.intrigueSentenceProjection(state, hearing);
    if (!FB.fns.intrigue_hearing_can_pay(state, ctx)) return false;
    state.player.gold -= projection.fine;
    publicConductForHearing(state, hearing);
    FB.noteConduct(state, state.player.charId, { deceit:-1 });
    clearHearing(state);
    return true;
  };

  FB.fns.intrigue_hearing_penance = function (state, ctx) {
    var hearing = activeHearing(state, ctx);
    if (!hearing) return false;
    state.player.piety = Math.max(0, state.player.piety - 20);
    state.player.prestige = Math.max(0, state.player.prestige - 15);
    publicConductForHearing(state, hearing);
    FB.noteConduct(state, state.player.charId, { deceit:-1, cruelty:-1 });
    clearHearing(state);
    return true;
  };

  FB.fns.intrigue_hearing_submit = function (state, ctx) {
    var hearing = activeHearing(state, ctx);
    if (!hearing) return false;
    FB.noteConduct(state, state.player.charId, { deceit:-1,
      cruelty:hearing.successful && (hearing.plotId === 'assassination' ||
        hearing.plotId === 'abduction') ? -1 : 0 });
    applyPlayerSentence(state, hearing,
      FB.intrigueSentenceProjection(state, hearing));
    return true;
  };

  FB.fns.intrigue_hearing_flee = function (state, ctx) {
    var hearing = activeHearing(state, ctx);
    if (!hearing) return false;
    publicConductForHearing(state, hearing);
    if (FB.loseAllLand) FB.loseAllLand(state, { flee:true });
    clearHearing(state);
    return true;
  };

  FB.fns.intrigue_hearing_resist = function (state, ctx) {
    var hearing = activeHearing(state, ctx);
    if (!hearing || !FB.fns.attainder_resist) return false;
    publicConductForHearing(state, hearing);
    FB.fns.attainder_resist(state);
    clearHearing(state);
    return true;
  };

  function playerRansom(state, ctx) {
    var record = FB.intrigueCaptivityOf(state, state.player.charId);
    return record && record.captorId === ctx.captorId &&
      record.captorGeneration === Number(ctx.captorGeneration) ? record : null;
  }

  FB.fns.intrigue_captive_ransom_valid = function (state, ctx) {
    return !!playerRansom(state, ctx);
  };

  FB.fns.intrigue_captive_ransom_can_pay = function (state, ctx) {
    var record = playerRansom(state, ctx);
    return !!(record && state.player.gold >= record.demand.amount);
  };

  FB.fns.intrigue_captive_ransom_pay = function (state, ctx) {
    var record = playerRansom(state, ctx);
    if (!record || state.player.gold < record.demand.amount) return false;
    state.player.gold -= record.demand.amount;
    releaseCaptiveRecord(state, record, FB.msg('news.intrigue.ransom_paid',
      '⛓ The ransom is paid and the captive returns home.', {}));
    return true;
  };

  FB.payIntrigueRansom = function (state) {
    var record = FB.intrigueCaptivityOf(state, state.player.charId);
    if (!record || !record.demand || state.player.gold < record.demand.amount) {
      return false;
    }
    state.player.gold -= record.demand.amount;
    releaseCaptiveRecord(state, record, FB.msg('news.intrigue.ransom_paid',
      '⛓ The ransom is paid and the captive returns home.', {}));
    return true;
  };

  FB.fns.intrigue_captive_ransom_refuse = function (state, ctx) {
    return !!playerRansom(state, ctx);
  };
})();
