/* Fallowborn — durable political blocs for the player's relevant court.
   Only allegiance and live motion commitments are saved. Court membership,
   influence, interests, postures, probabilities, tallies, and localized
   explanations are deterministic projections. */
window.FB = window.FB || {};

(function () {
  'use strict';

  var MAGNATE_PREFIX = 'magnate:';
  var INDEPENDENT_PREFIX = 'independent:';
  var MOTIONS = { redress:1, scutage:1 };

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  function compareId(a, b) {
    a = String(a);
    b = String(b);
    return a < b ? -1 : (a > b ? 1 : 0);
  }

  function blocDef(id) {
    var defs = FBDATA.politicalBlocs || {};
    return defs[id] || null;
  }

  function threshold(id, fallback) {
    var def = blocDef(id);
    var value = Number(def && def.affiliationThreshold);
    return isFinite(value) ? value : fallback;
  }

  function realmTerritory(state, rid) {
    if (rid === 'player') {
      if (state.realms.player && state.realms.player.alive) {
        return FB.realmTerritory(state, 'player').slice();
      }
      return [];
    }
    return FB.realmTerritory(state, rid).slice();
  }

  function directlyHeld(state, rid) {
    if (rid === 'player') {
      return state.realms.player && state.realms.player.alive
        ? (state.player.provs || []).slice() : [];
    }
    return FB.realmHeldCounties(state, rid).slice();
  }

  function councilSeatId(state, polityId, houseId) {
    if (polityId !== 'player' || houseId === 'player' ||
        !state.council || !state.council.seats) return null;
    var seats = FB.councilSeats ? FB.councilSeats() : [];
    for (var i = 0; i < seats.length; i++) {
      if (state.council.seats[seats[i].id] === houseId) return seats[i].id;
    }
    return null;
  }

  function houseStanding(state, polityId, houseId, rulerHouseId) {
    if (houseId === rulerHouseId) return 100;
    if (houseId === 'player') {
      return polityId === state.player.liege
        ? FB.standingOf(state, { kind:'realm', id:polityId }) : 0;
    }
    if (polityId === 'player') {
      return FB.standingOf(state, { kind:'realm', id:houseId });
    }
    var realm = state.realms[houseId];
    return realm && isFinite(Number(realm.favor)) ? Number(realm.favor) : 0;
  }

  function houseTrait(state, houseId) {
    if (houseId === 'player') {
      var me = state.chars[state.player.charId];
      return me && me.traits && me.traits.length ? me.traits[0] : null;
    }
    var realm = state.realms[houseId];
    var rulerCharacter = FB.realmRulerCharacterSnapshot
      ? FB.realmRulerCharacterSnapshot(state, houseId) : null;
    if (rulerCharacter && rulerCharacter.traits &&
        rulerCharacter.traits.length) return rulerCharacter.traits[0];
    return realm && realm.ruler ? realm.ruler.trait || null : null;
  }

  function houseMartial(state, houseId) {
    if (houseId === 'player') {
      var player = state.chars[state.player.charId];
      return FB.skillSnapshot
        ? FB.skillSnapshot(state, player, 'mar')
        : FB.skillOf(player, 'mar');
    }
    var realm = state.realms[houseId];
    var rulerCharacter = FB.realmRulerCharacterSnapshot
      ? FB.realmRulerCharacterSnapshot(state, houseId) : null;
    if (rulerCharacter) {
      return FB.skillSnapshot
        ? FB.skillSnapshot(state, rulerCharacter, 'mar')
        : FB.skillOf(rulerCharacter, 'mar');
    }
    return realm && realm.ruler && isFinite(Number(realm.ruler.mar))
      ? Number(realm.ruler.mar) : 0;
  }

  function makeHouse(state, polityId, rulerHouseId, houseId) {
    var player = houseId === 'player';
    var realm = player ? state.realms.player : state.realms[houseId];
    var me = state.chars[state.player.charId];
    var capital = realm && FB.world.byId[realm.capital];
    var held = directlyHeld(state, houseId);
    var territory = realmTerritory(state, houseId);
    var rulerCharacter = !player && FB.realmRulerCharacterSnapshot
      ? FB.realmRulerCharacterSnapshot(state, houseId) : null;
    var rank = player
      ? Math.max(0, state.player.tier - 3)
      : Math.max(0, Number(realm && realm.rank) || 0);
    var seatId = councilSeatId(state, polityId, houseId);
    var influence = 1 + rank * 2 + held.length +
      Math.floor(Math.max(0, territory.length - held.length) / 2) +
      (seatId ? 1 : 0);
    var culture = player ? (me && me.culture) :
      (rulerCharacter && rulerCharacter.culture) ||
      (realm && realm.ruler && realm.ruler.culture) ||
      (capital && capital.culture) || null;
    var religion = player ? (me && me.religion) :
      (rulerCharacter && rulerCharacter.religion) ||
      (FB.realmReligionId ? FB.realmReligionId(state, houseId) :
        (realm && realm.religion)) || null;
    return {
      id:houseId,
      realmId:player && !(realm && realm.alive) ? null : houseId,
      isPlayer:player,
      isRuler:houseId === rulerHouseId,
      name:player
        ? ((me && me.dyn) || (realm && realm.name) ||
          (me && me.name) || houseId)
        : realm.name,
      rulerName:player
        ? (me ? FB.fullName(me) : '')
        : (rulerCharacter
          ? FB.fullName(rulerCharacter)
          : (realm.ruler ? realm.ruler.name : realm.name)),
      rulerCharacterId:player
        ? (me && me.id) : (rulerCharacter && rulerCharacter.id),
      rank:rank,
      culture:culture,
      religion:religion,
      traitId:houseTrait(state, houseId),
      martial:houseMartial(state, houseId),
      standing:houseStanding(state, polityId, houseId, rulerHouseId),
      councilSeatId:seatId,
      directlyHeldCountyIds:held.sort(compareId),
      territoryCountyIds:territory.sort(compareId),
      influence:Math.max(1, influence)
    };
  }

  /* The court is deliberately direct: ruler, direct vassal houses, and the
     player's house when sworn there. Empty placeholders, remote sovereign
     trees, and generated realms without a ruler or territory never enter. */
  FB.politicalCourt = function (state) {
    if (!state || !state.player || !state.realms ||
        state.player.dead || state.player.tier < 3 ||
        (FB.game && FB.game.observe)) return null;
    var polityId = state.player.liege || (
      state.realms.player && state.realms.player.alive ? 'player' : null);
    var polity = polityId && state.realms[polityId];
    if (!polityId || !polity || !polity.alive ||
        (polityId !== 'player' && !polity.ruler)) return null;
    var rulerHouseId = polityId;
    var ids = [rulerHouseId];
    for (var rid in state.realms) {
      if (!own(state.realms, rid) || rid === 'player') continue;
      var realm = state.realms[rid];
      if (!realm || !realm.alive || !realm.ruler ||
          realm.liege !== polityId || !realmTerritory(state, rid).length) {
        continue;
      }
      ids.push(rid);
    }
    if (state.player.liege === polityId && ids.indexOf('player') < 0) {
      ids.push('player');
    }
    ids = ids.filter(function (id, index) {
      return ids.indexOf(id) === index;
    });
    ids.sort(function (a, b) {
      if (a === rulerHouseId) return -1;
      if (b === rulerHouseId) return 1;
      if (a === 'player') return 1;
      if (b === 'player') return -1;
      return compareId(a, b);
    });
    var houses = [];
    for (var i = 0; i < ids.length; i++) {
      houses.push(makeHouse(state, polityId, rulerHouseId, ids[i]));
    }
    return {
      polityId:polityId,
      rulerHouseId:rulerHouseId,
      playerHouseId:'player',
      houses:houses
    };
  };

  function courtHouseMap(court) {
    var out = {};
    for (var i = 0; i < court.houses.length; i++) {
      out[court.houses[i].id] = court.houses[i];
    }
    return out;
  }

  function reason(id, value, extra) {
    var out = { id:id, value:value };
    extra = extra || {};
    for (var key in extra) if (own(extra, key)) out[key] = extra[key];
    return out;
  }

  function crownInterest(state, court, house) {
    var reasons = [];
    if (house.isRuler) {
      reasons.push(reason('ruler_house', 100));
      return { score:100, reasons:reasons };
    }
    var score = 0;
    var standing = house.standing;
    var standingScore = standing >= 40 ? 45 :
      (standing >= 20 ? 30 : (standing >= 0 ? 15 :
        (standing >= -20 ? 5 : -20)));
    score += standingScore;
    reasons.push(reason('standing', standingScore, {
      standing:standing
    }));
    if (house.councilSeatId) {
      score += 35;
      reasons.push(reason('council_office', 35, {
        councilSeatId:house.councilSeatId
      }));
    }
    var ruler = courtHouseMap(court)[court.rulerHouseId];
    if (ruler && ruler.religion && house.religion === ruler.religion) {
      score += 12;
      reasons.push(reason('shared_faith', 12));
    }
    var traitScores = {
      content:20, humble:15, patient:12, honest:12, kind:10,
      ambitious:-20, proud:-10, deceitful:-10, cynical:-8
    };
    var traitScore = traitScores[house.traitId] || 0;
    if (house.traitId === 'zealous' && ruler &&
        ruler.religion === house.religion) traitScore = 10;
    if (traitScore) {
      score += traitScore;
      reasons.push(reason('temperament', traitScore, {
        traitId:house.traitId
      }));
    }
    return { score:score, reasons:reasons };
  }

  function playerCommerce(state) {
    var me = state.chars[state.player.charId];
    var career = me && me.career;
    var guildRanks = {
      member:25, master:35, officer:40, guildmaster:45
    };
    var reasons = [];
    var guildRank = career && career.guildRank;
    if ((!guildRank || guildRank === 'none') &&
        state.player.flags && state.player.flags.guild_member) {
      guildRank = 'member';
    }
    var score = guildRanks[guildRank] || 0;
    if (score) {
      reasons.push(reason('guild_membership', score, {
        guildRank:guildRank
      }));
    }
    var monopolies = state.player.guildMonopolies;
    var monopolyCount = 0;
    if (monopolies && monopolies.incoming) monopolyCount++;
    if (monopolies && monopolies.outgoing) monopolyCount++;
    if (monopolyCount) {
      var monopolyScore = monopolyCount * 30;
      score += monopolyScore;
      reasons.push(reason('monopolies', monopolyScore, {
        count:monopolyCount
      }));
    }
    var enterprises = Array.isArray(state.player.enterprises)
      ? state.player.enterprises.length : 0;
    if (enterprises) {
      var enterpriseScore = Math.min(30, enterprises * 10);
      score += enterpriseScore;
      reasons.push(reason('enterprises', enterpriseScore, {
        count:enterprises
      }));
    }
    var investments = state.economy && Array.isArray(state.economy.investments)
      ? state.economy.investments : [];
    var activeTrade = 0;
    for (var i = 0; i < investments.length; i++) {
      if (investments[i] && investments[i].status === 'active' &&
          (!investments[i].kind ||
           investments[i].kind === 'trade_partnership' ||
           investments[i].kind === 'trade_venture')) activeTrade++;
    }
    if (activeTrade) {
      var tradeScore = Math.min(25, activeTrade * 10);
      score += tradeScore;
      reasons.push(reason('trade_contracts', tradeScore, {
        count:activeTrade
      }));
    }
    return { score:score, reasons:reasons };
  }

  function commercialCountyInterest(state, house) {
    if (!FB.countyModifierSnapshot) return { score:0, reasons:[] };
    var count = 0;
    var ids = ['market_charter', 'contested_tolls', 'roads_patrolled'];
    for (var i = 0; i < house.territoryCountyIds.length; i++) {
      var records = FB.countyModifierSnapshot(
        state, house.territoryCountyIds[i]);
      for (var j = 0; j < records.length; j++) {
        if (ids.indexOf(records[j].id) >= 0) {
          count++;
          break;
        }
      }
    }
    var score = Math.min(40, count * 12);
    return {
      score:score,
      reasons:score ? [reason('commercial_counties', score, {
        count:count
      })] : []
    };
  }

  function mercantileInterest(state, house) {
    var out = house.isPlayer
      ? playerCommerce(state) : { score:0, reasons:[] };
    var counties = commercialCountyInterest(state, house);
    out.score += counties.score;
    out.reasons = out.reasons.concat(counties.reasons);
    return out;
  }

  function housesAdjacent(a, b) {
    var bSet = {};
    var i;
    for (i = 0; i < b.territoryCountyIds.length; i++) {
      bSet[b.territoryCountyIds[i]] = 1;
    }
    for (i = 0; i < a.territoryCountyIds.length; i++) {
      var adjacent = FB.world.adj[a.territoryCountyIds[i]] || {};
      for (var pid in adjacent) if (bSet[pid]) return true;
    }
    return false;
  }

  function storedBlocId(stored, houseId) {
    var entry = stored && stored[houseId];
    return typeof entry === 'string' ? entry :
      (entry && typeof entry.blocId === 'string' ? entry.blocId : null);
  }

  function chooseMagnateLeaders(court, crown, mercantile, stored) {
    var byId = courtHouseMap(court);
    var leaders = [];
    for (var houseId in stored || {}) {
      var blocId = storedBlocId(stored, houseId);
      if (!blocId || blocId.indexOf(MAGNATE_PREFIX) !== 0) continue;
      var leaderId = blocId.slice(MAGNATE_PREFIX.length);
      if (leaderId !== court.rulerHouseId && byId[leaderId] &&
          storedBlocId(stored, leaderId) === blocId &&
          leaders.indexOf(leaderId) < 0) leaders.push(leaderId);
    }
    leaders.sort(function (a, b) {
      return byId[b].influence - byId[a].influence ||
        compareId(a, b);
    });
    if (leaders.length > 2) leaders.length = 2;
    var candidates = court.houses.filter(function (house) {
      return !house.isRuler && leaders.indexOf(house.id) < 0 &&
        crown[house.id].score < threshold('crown', 35) &&
        mercantile[house.id].score < threshold('mercantile', 30);
    });
    candidates.sort(function (a, b) {
      return b.influence - a.influence || compareId(a.id, b.id);
    });
    while (leaders.length < 2 && candidates.length) {
      leaders.push(candidates.shift().id);
    }
    return leaders;
  }

  function magnateInterest(house, leader) {
    var reasons = [];
    if (house.id === leader.id) {
      reasons.push(reason('magnate_leader', 60, {
        leaderHouseId:leader.id
      }));
      return { score:60, reasons:reasons };
    }
    var score = 0;
    if (house.culture && leader.culture === house.culture) {
      score += 16;
      reasons.push(reason('shared_culture', 16, {
        leaderHouseId:leader.id
      }));
    }
    if (house.religion && leader.religion === house.religion) {
      score += 14;
      reasons.push(reason('shared_faith', 14, {
        leaderHouseId:leader.id
      }));
    }
    if (housesAdjacent(house, leader)) {
      score += 18;
      reasons.push(reason('adjacent_lands', 18, {
        leaderHouseId:leader.id
      }));
    }
    var rankScore = leader.rank * 5;
    if (rankScore) {
      score += rankScore;
      reasons.push(reason('leader_rank', rankScore, {
        leaderHouseId:leader.id,
        rank:leader.rank
      }));
    }
    return { score:score, reasons:reasons };
  }

  function evaluateCourt(state, court, stored) {
    var crown = {};
    var mercantile = {};
    var i;
    for (i = 0; i < court.houses.length; i++) {
      var house = court.houses[i];
      crown[house.id] = crownInterest(state, court, house);
      mercantile[house.id] = mercantileInterest(state, house);
    }
    var leaderIds = chooseMagnateLeaders(
      court, crown, mercantile, stored || {});
    var byId = courtHouseMap(court);
    var interests = {};
    for (i = 0; i < court.houses.length; i++) {
      var member = court.houses[i];
      var options = {
        crown:crown[member.id],
        mercantile:mercantile[member.id]
      };
      for (var j = 0; j < leaderIds.length; j++) {
        options[MAGNATE_PREFIX + leaderIds[j]] =
          magnateInterest(member, byId[leaderIds[j]]);
      }
      options[INDEPENDENT_PREFIX + member.id] = {
        score:0,
        reasons:[reason('no_strong_allegiance', 0)]
      };
      interests[member.id] = options;
    }
    return {
      interests:interests,
      magnateLeaderIds:leaderIds
    };
  }

  function candidateAllowed(blocId, option) {
    if (!option) return false;
    if (blocId === 'crown') {
      return option.score >= threshold('crown', 35);
    }
    if (blocId === 'mercantile') {
      return option.score >= threshold('mercantile', 30);
    }
    if (blocId.indexOf(MAGNATE_PREFIX) === 0) {
      return option.score >= threshold('magnate', 30);
    }
    return blocId.indexOf(INDEPENDENT_PREFIX) === 0;
  }

  function bestAllegiance(house, evaluation) {
    var options = evaluation.interests[house.id];
    if (house.isRuler && options.crown) return 'crown';
    /* Crown office/favor and concrete commercial constituencies are direct
       commitments. Once their threshold is met they take precedence over a
       stronger ambient magnate affinity; the latter remains the scored
       fallback for houses without either institutional alignment. */
    if (candidateAllowed('crown', options.crown)) return 'crown';
    if (candidateAllowed('mercantile', options.mercantile)) {
      return 'mercantile';
    }
    var bestId = INDEPENDENT_PREFIX + house.id;
    var bestScore = 0;
    var ids = Object.keys(options).sort(compareId);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (!candidateAllowed(id, options[id])) continue;
      if (options[id].score > bestScore ||
          (options[id].score === bestScore && compareId(id, bestId) < 0)) {
        bestId = id;
        bestScore = options[id].score;
      }
    }
    return bestId;
  }

  function validAllegiance(house, blocId, evaluation) {
    if (!blocId || !evaluation.interests[house.id] ||
        !evaluation.interests[house.id][blocId]) return false;
    if (house.isRuler) return blocId === 'crown';
    if (blocId === 'mercantile') {
      return evaluation.interests[house.id][blocId].score > 0;
    }
    if (blocId === 'crown') {
      return evaluation.interests[house.id][blocId].score > 0;
    }
    if (blocId.indexOf(MAGNATE_PREFIX) === 0) {
      return evaluation.interests[house.id][blocId].score > 0;
    }
    return blocId === INDEPENDENT_PREFIX + house.id;
  }

  function affiliationEntry(blocId, year) {
    return { blocId:blocId, reviewedYear:year };
  }

  function allegianceReviewYear(entry, fallback) {
    var value = entry && typeof entry === 'object' &&
      !Array.isArray(entry) ? Number(entry.reviewedYear) : NaN;
    return isFinite(value) ? value : fallback;
  }

  function initialAllegiances(court, evaluation, year) {
    var out = {};
    for (var i = 0; i < court.houses.length; i++) {
      var house = court.houses[i];
      out[house.id] = affiliationEntry(
        bestAllegiance(house, evaluation), year);
    }
    return out;
  }

  function reconcileAllegiances(state, politics, court, annualReview) {
    var old = politics.allegiances || {};
    var evaluation = evaluateCourt(state, court, old);
    var next = {};
    var pending = !!politics.pendingMotion;
    for (var i = 0; i < court.houses.length; i++) {
      var house = court.houses[i];
      var oldId = storedBlocId(old, house.id);
      var bestId = bestAllegiance(house, evaluation);
      var chosen = oldId;
      if (!validAllegiance(house, oldId, evaluation)) {
        chosen = bestId;
      } else if (annualReview && !pending && bestId !== oldId) {
        var currentScore = evaluation.interests[house.id][oldId].score;
        var bestScore = evaluation.interests[house.id][bestId].score;
        if (bestScore >= currentScore + 25) chosen = bestId;
      }
      next[house.id] = affiliationEntry(chosen,
        annualReview ? state.date.year :
          allegianceReviewYear(old[house.id],
            pending ? state.date.year - 1 : state.date.year));
    }
    politics.allegiances = next;
    return evaluation;
  }

  function pendingValid(state, court, pending) {
    return !!(pending && MOTIONS[pending.motionId] &&
      pending.id && pending.polityId === court.polityId &&
      isFinite(Number(pending.startedTurn)) &&
      isFinite(Number(pending.expiresTurn)) &&
      (pending.result ||
       state.turn < Number(pending.expiresTurn)) &&
      state.player.liege === court.polityId &&
      state.player.tier >= 3 && state.player.tier <= 5);
  }

  function repairPendingRecord(pending) {
    if (!pending) return true;
    if (!pending.pledges || typeof pending.pledges !== 'object' ||
        Array.isArray(pending.pledges)) pending.pledges = {};
    for (var blocId in pending.pledges) {
      if (pending.pledges[blocId] !== 'support' &&
          pending.pledges[blocId] !== 'oppose') {
        delete pending.pledges[blocId];
      }
    }
    if (!pending.lobby || typeof pending.lobby !== 'object' ||
        Array.isArray(pending.lobby)) {
      pending.lobby = { used:false, blocId:null, success:null };
    } else {
      pending.lobby.used = !!pending.lobby.used;
      if (!pending.lobby.used) {
        pending.lobby.blocId = null;
        pending.lobby.success = null;
      } else {
        if (typeof pending.lobby.blocId !== 'string') return false;
        if (pending.lobby.success !== true &&
            pending.lobby.success !== false) pending.lobby.success = false;
      }
    }
    if (pending.result === undefined) pending.result = null;
    if (pending.result !== null) {
      if (!pending.result || typeof pending.result !== 'object' ||
          Array.isArray(pending.result) ||
          typeof pending.result.passed !== 'boolean' ||
          !pending.result.outcomes ||
          typeof pending.result.outcomes !== 'object' ||
          Array.isArray(pending.result.outcomes) ||
          !isFinite(Number(pending.result.talliedTurn))) return false;
      for (blocId in pending.result.outcomes) {
        if (pending.result.outcomes[blocId] !== 'support' &&
            pending.result.outcomes[blocId] !== 'oppose') return false;
      }
    }
    return true;
  }

  FB.repairPolitics = function (state, opts) {
    if (!state || !state.player) return null;
    opts = opts || {};
    var court = FB.politicalCourt(state);
    var politics = state.politics;
    if (!politics || typeof politics !== 'object' ||
        Array.isArray(politics)) {
      politics = state.politics = {
        polityId:null, allegiances:{}, pendingMotion:null
      };
    }
    if (!politics.allegiances ||
        typeof politics.allegiances !== 'object' ||
        Array.isArray(politics.allegiances)) politics.allegiances = {};
    delete politics.reviewYear;
    if (!court) {
      politics.polityId = null;
      politics.allegiances = {};
      politics.pendingMotion = null;
      return politics;
    }
    if (politics.polityId !== court.polityId) {
      politics.polityId = court.polityId;
      politics.allegiances = {};
      politics.pendingMotion = null;
    }
    if (politics.pendingMotion &&
        (!repairPendingRecord(politics.pendingMotion) ||
         !pendingValid(state, court, politics.pendingMotion) ||
         (!politics.pendingMotion.result &&
          state.turn >= Number(politics.pendingMotion.expiresTurn)))) {
      politics.pendingMotion = null;
    }
    var annualDue = !!opts.annual;
    if (!annualDue) {
      for (var houseId in politics.allegiances) {
        if (allegianceReviewYear(
            politics.allegiances[houseId], state.date.year - 1) !==
            state.date.year) {
          annualDue = true;
          break;
        }
      }
    }
    var annual = annualDue && !politics.pendingMotion;
    var evaluation = evaluateCourt(state, court, politics.allegiances);
    if (!Object.keys(politics.allegiances).length) {
      politics.allegiances = initialAllegiances(
        court, evaluation, state.date.year);
    } else {
      reconcileAllegiances(state, politics, court, annual);
    }
    return politics;
  };
  FB.ensurePolitics = FB.repairPolitics;

  FB.politicsDay = function (state) {
    return FB.repairPolitics(state);
  };

  FB.politicsYearly = function (state) {
    return FB.repairPolitics(state, { annual:true });
  };

  function snapshotAllegiances(state, court) {
    var stored = state.politics &&
      state.politics.polityId === court.polityId &&
      state.politics.allegiances &&
      typeof state.politics.allegiances === 'object'
      ? state.politics.allegiances : {};
    var evaluation = evaluateCourt(state, court, stored);
    var initial = initialAllegiances(court, evaluation, state.date.year);
    var out = {};
    for (var i = 0; i < court.houses.length; i++) {
      var house = court.houses[i];
      var savedId = storedBlocId(stored, house.id);
      out[house.id] = validAllegiance(house, savedId, evaluation)
        ? savedId : initial[house.id].blocId;
    }
    return { ids:out, evaluation:evaluation };
  }

  function archetypeOf(blocId) {
    if (blocId === 'crown' || blocId === 'mercantile') return blocId;
    if (blocId.indexOf(MAGNATE_PREFIX) === 0) return 'magnate';
    return 'independent';
  }

  function groupLeader(group, court) {
    if (group.archetypeId === 'crown') return court.rulerHouseId;
    if (group.archetypeId === 'magnate') {
      return group.id.slice(MAGNATE_PREFIX.length);
    }
    var members = group.members.slice().sort(function (a, b) {
      return b.influence - a.influence || compareId(a.id, b.id);
    });
    return members.length ? members[0].id : court.rulerHouseId;
  }

  function buildSummary(state) {
    var court = FB.politicalCourt(state);
    if (!court) return null;
    var snapshot = snapshotAllegiances(state, court);
    var groups = {};
    var total = 0;
    for (var i = 0; i < court.houses.length; i++) {
      var house = court.houses[i];
      var blocId = snapshot.ids[house.id];
      var archetypeId = archetypeOf(blocId);
      if (!groups[blocId]) {
        groups[blocId] = {
          id:blocId,
          archetypeId:archetypeId,
          members:[],
          influence:0,
          interests:[]
        };
      }
      groups[blocId].members.push(house);
      groups[blocId].influence += house.influence;
      total += house.influence;
      var option = snapshot.evaluation.interests[house.id][blocId];
      var reasons = option ? option.reasons : [];
      for (var j = 0; j < reasons.length; j++) {
        var copied = {};
        for (var key in reasons[j]) if (own(reasons[j], key)) {
          copied[key] = reasons[j][key];
        }
        copied.houseId = house.id;
        groups[blocId].interests.push(copied);
      }
    }
    var blocs = [];
    for (var id in groups) {
      var group = groups[id];
      group.leaderHouseId = groupLeader(group, court);
      group.members.sort(function (a, b) {
        return b.influence - a.influence || compareId(a.id, b.id);
      });
      blocs.push(group);
    }
    blocs.sort(function (a, b) {
      var ad = blocDef(a.archetypeId) || {};
      var bd = blocDef(b.archetypeId) || {};
      var ao = isFinite(Number(ad.order)) ? Number(ad.order) : 99;
      var bo = isFinite(Number(bd.order)) ? Number(bd.order) : 99;
      return ao - bo || b.influence - a.influence || compareId(a.id, b.id);
    });
    var pending = state.politics &&
      state.politics.polityId === court.polityId &&
      pendingValid(state, court, state.politics.pendingMotion)
      ? state.politics.pendingMotion : null;
    return {
      polityId:court.polityId,
      rulerHouseId:court.rulerHouseId,
      houses:court.houses,
      blocs:blocs,
      totalInfluence:total,
      majority:Math.floor(total / 2) + 1,
      pendingMotion:pending
    };
  }

  function traitMotionValue(traitId, motionId) {
    if (motionId === 'redress') {
      return {
        ambitious:5, greedy:8, proud:5, content:-5, generous:-5
      }[traitId] || 0;
    }
    return {
      brave:-10, craven:12, greedy:5, patient:4, wrathful:-6
    }[traitId] || 0;
  }

  function weightedMemberAverage(bloc, getter) {
    var total = 0;
    var weight = 0;
    for (var i = 0; i < bloc.members.length; i++) {
      var house = bloc.members[i];
      total += getter(house) * house.influence;
      weight += house.influence;
    }
    return weight ? total / weight : 0;
  }

  function motionScore(state, bloc, motionId) {
    var def = blocDef(bloc.archetypeId) || {};
    var motions = def.motions || {};
    var base = isFinite(Number(motions[motionId]))
      ? Number(motions[motionId]) : 0;
    var reasons = [reason('bloc_posture', base, {
      archetypeId:bloc.archetypeId
    })];
    var terms = FB.parliamentTerms ? FB.parliamentTerms(state) : {
      aid:(FBDATA.balance.parliamentAidBase || 0.25)
    };
    var customary = FBDATA.balance.parliamentAidBase || 0.25;
    var aid = terms.aid === undefined ? customary : terms.aid;
    var aidValue = motionId === 'redress'
      ? Math.round((aid - customary) * 100)
      : Math.round((customary - aid) * 60);
    if (aidValue) reasons.push(reason('current_aid', aidValue, {
      aid:aid
    }));
    var traits = Math.round(weightedMemberAverage(bloc, function (house) {
      return traitMotionValue(house.traitId, motionId);
    }));
    if (traits) reasons.push(reason('ruler_traits', traits));
    var martial = 0;
    if (motionId === 'scutage') {
      var averageMartial = weightedMemberAverage(bloc, function (house) {
        return house.martial;
      });
      martial = FB.clamp(Math.round((6 - averageMartial) * 2), -12, 12);
      if (martial) reasons.push(reason('martial_inclination', martial, {
        martial:Math.round(averageMartial * 10) / 10
      }));
    }
    return {
      score:base + aidValue + traits + martial,
      reasons:reasons
    };
  }

  function pendingPledge(pending, blocId) {
    var value = pending && pending.pledges && pending.pledges[blocId];
    return value === 'support' || value === 'oppose' ? value : null;
  }

  function resultPledge(pending, blocId) {
    var outcomes = pending && pending.result && pending.result.outcomes;
    var value = outcomes && outcomes[blocId];
    return value === 'support' || value === 'oppose' ? value : null;
  }

  FB.politicalMotionForecast = function (state, motionId) {
    if (!MOTIONS[motionId]) return null;
    if (FB.parliamentActive && !FB.parliamentActive(state)) return null;
    var summary = buildSummary(state);
    if (!summary) return null;
    var pending = summary.pendingMotion &&
      summary.pendingMotion.motionId === motionId
      ? summary.pendingMotion : null;
    var blocs = [];
    var support = 0;
    var opposition = 0;
    var uncertain = 0;
    for (var i = 0; i < summary.blocs.length; i++) {
      var bloc = summary.blocs[i];
      var scored = motionScore(state, bloc, motionId);
      var probability = FB.clamp((50 + scored.score) / 100, 0.15, 0.85);
      var pledge = resultPledge(pending, bloc.id) ||
        pendingPledge(pending, bloc.id);
      var posture = pledge || (
        scored.score >= 25 ? 'support' :
          (scored.score <= -25 ? 'oppose' : 'undecided'));
      if (posture === 'support') support += bloc.influence;
      else if (posture === 'oppose') opposition += bloc.influence;
      else uncertain += bloc.influence;
      var copy = {};
      for (var key in bloc) if (own(bloc, key)) copy[key] = bloc[key];
      copy.score = scored.score;
      copy.motionReasons = scored.reasons;
      copy.naturalSupportChance = probability;
      copy.posture = posture;
      copy.pledged = !!pledge;
      copy.locked = !pledge && posture !== 'undecided';
      blocs.push(copy);
    }
    var playerChance = FB.parliamentVoteChance
      ? FB.parliamentVoteChance(state, motionId === 'redress') : 0.5;
    return {
      motionId:motionId,
      polityId:summary.polityId,
      blocs:blocs,
      totalInfluence:summary.totalInfluence,
      majority:summary.majority,
      supportInfluence:support,
      oppositionInfluence:opposition,
      uncertainInfluence:uncertain,
      majoritySecured:support >= summary.majority,
      majorityBlocked:opposition >= summary.majority,
      playerVoteChance:playerChance,
      pendingMotion:pending
    };
  };

  FB.politicalSummary = function (state) {
    var summary = buildSummary(state);
    if (!summary) return null;
    var redress = FB.politicalMotionForecast(state, 'redress');
    var scutage = FB.politicalMotionForecast(state, 'scutage');
    summary.forecasts = redress && scutage
      ? { redress:redress, scutage:scutage } : null;
    summary.motion = summary.pendingMotion
      ? (summary.forecasts &&
        summary.forecasts[summary.pendingMotion.motionId]) : null;
    return summary;
  };
})();
