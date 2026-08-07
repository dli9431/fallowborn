/* Fallowborn — bounded ruler agency and managed-family ambitions.
   Rulers keep one durable aim and only structural relations. Player-facing
   approaches are annual, globally capped, and gated by map distance, culture,
   and faith. The family side is deliberately restricted to the player's
   managed household and resident manageable siblings. */
window.FB = window.FB || {};

(function () {
  'use strict';

  var AIM_IDS = [
    'secure_dynasty', 'expand_realm', 'amass_wealth', 'defend_faith',
    'strengthen_crown', 'win_independence', 'keep_peace'
  ];
  var FAMILY_AIM_IDS = [
    'learn', 'marry_well', 'prosper', 'serve_house', 'serve_faith',
    'build_household'
  ];

  function rulerGeneration(realm) {
    return realm && realm.ruler && realm.ruler.generation !== undefined
      ? Number(realm.ruler.generation) || 1 : 1;
  }

  function rulerCharacter(state, rid) {
    return rid === 'player'
      ? state.chars[state.player.charId]
      : (FB.realmRulerCharacterSnapshot
        ? FB.realmRulerCharacterSnapshot(state, rid) : null);
  }

  function realmCulture(state, rid) {
    var c = rulerCharacter(state, rid);
    var realm = state.realms[rid];
    var capital = realm && realm.capital && FB.world.byId[realm.capital];
    return c && c.culture || realm && realm.ruler && realm.ruler.culture ||
      capital && capital.culture || null;
  }

  function realmReligion(state, rid) {
    if (rid === 'player') {
      var me = state.chars[state.player.charId];
      return me && me.religion || null;
    }
    return FB.realmReligionId ? FB.realmReligionId(state, rid) : null;
  }

  function relationKey(fromRid, toRid) {
    return String(fromRid) + '|' + String(toRid);
  }

  function currentRulerRelation(state, record) {
    var from = record && state.realms[record.fromRid];
    var to = record && state.realms[record.toRid];
    return !!(from && to && from.alive && to.alive &&
      Number(record.fromGeneration) === rulerGeneration(from) &&
      Number(record.toGeneration) === rulerGeneration(to));
  }

  function aimForRealm(state, rid) {
    var realm = state.realms[rid];
    var c = rulerCharacter(state, rid);
    var traits = c && c.traits || [];
    var family = FB.realmFamilySnapshot
      ? FB.realmFamilySnapshot(state, rid) : [];
    if (realm && realm.liege && Number(realm.favor || 0) <= -20) {
      return 'win_independence';
    }
    if (family.length < 2 || !c ||
        (!c.spouseId && FB.ageOf(c, state.date.year) < 45)) {
      return 'secure_dynasty';
    }
    if (traits.indexOf('zealous') >= 0) return 'defend_faith';
    if (traits.indexOf('greedy') >= 0) return 'amass_wealth';
    if (traits.indexOf('ambitious') >= 0 ||
        traits.indexOf('wrathful') >= 0) return 'expand_realm';
    if (traits.indexOf('content') >= 0 || traits.indexOf('kind') >= 0 ||
        traits.indexOf('patient') >= 0) return 'keep_peace';
    return realm && realm.liege ? 'win_independence' : 'strengthen_crown';
  }

  FB.agencyFamilyMembers = function (state, kinSnapshot) {
    var out = [], seen = {};
    var me = state && state.player && state.chars[state.player.charId];
    function add(c) {
      if (!c || c.dead || !me || c.id === me.id || seen[c.id]) return;
      seen[c.id] = 1;
      out.push(c);
    }
    if (FB.householdMembers) {
      var household = FB.householdMembers(state);
      for (var i = 0; i < household.length; i++) add(household[i]);
    }
    if (FB.manageableKinKind) {
      var kin = kinSnapshot || (FB.kinOf && FB.kinOf(state));
      var siblings = kin && kin.siblings;
      if (siblings) {
        for (i = 0; i < siblings.length; i++) {
          if (FB.manageableKinKind(state, siblings[i].c.id)) add(siblings[i].c);
        }
      } else {
        for (var id in state.chars) {
          if (FB.manageableKinKind(state, id)) add(state.chars[id]);
        }
      }
    }
    out.sort(function (a, b) {
      return Number(a.born || 0) - Number(b.born || 0) ||
        String(a.id).localeCompare(String(b.id));
    });
    return out;
  };

  FB.isAgencyFamilyMember = function (state, cid, familySnapshot) {
    var family = familySnapshot || FB.agencyFamilyMembers(state);
    for (var i = 0; i < family.length; i++) {
      if (String(family[i].id) === String(cid)) return true;
    }
    return false;
  };

  function familyAimFor(state, c, avoid) {
    var traits = c.traits || [];
    var options = [];
    var age = FB.ageOf(c, state.date.year);
    if (age < 16) options.push('learn');
    if (age >= 12 && !c.spouseId && !c.betrothedId) {
      options.push('marry_well');
    }
    if (traits.indexOf('zealous') >= 0 ||
        c.career && (c.career.profession === 'monk' ||
          c.career.profession === 'priest')) options.push('serve_faith');
    if (traits.indexOf('greedy') >= 0 ||
        c.career && c.career.profession === 'merchant') options.push('prosper');
    if (traits.indexOf('ambitious') >= 0 || traits.indexOf('proud') >= 0) {
      options.push('serve_house');
    }
    options.push('build_household', 'serve_house', 'prosper', 'learn');
    for (var i = 0; i < options.length; i++) {
      if (options[i] !== avoid) return options[i];
    }
    return 'build_household';
  }

  FB.ensureAgency = function (state, familySnapshot) {
    if (!state || !state.player || !state.realms || !state.chars) return null;
    var agency = state.agency;
    if (!agency || typeof agency !== 'object' || Array.isArray(agency)) {
      agency = state.agency = {};
    }
    if (!agency.rulerAims || typeof agency.rulerAims !== 'object' ||
        Array.isArray(agency.rulerAims)) agency.rulerAims = {};
    if (!agency.familyAmbitions ||
        typeof agency.familyAmbitions !== 'object' ||
        Array.isArray(agency.familyAmbitions)) agency.familyAmbitions = {};
    if (!agency.relations || typeof agency.relations !== 'object' ||
        Array.isArray(agency.relations)) agency.relations = {};
    if (!agency.rebelSupport || typeof agency.rebelSupport !== 'object' ||
        Array.isArray(agency.rebelSupport)) agency.rebelSupport = {};

    var liveRulers = {};
    for (var rid in state.realms) {
      var realm = state.realms[rid];
      if (rid === 'player' || !realm || !realm.alive || !realm.ruler) continue;
      liveRulers[rid] = 1;
      var generation = rulerGeneration(realm);
      var record = agency.rulerAims[rid];
      if (!record || AIM_IDS.indexOf(record.id) < 0 ||
          Number(record.generation) !== generation) {
        agency.rulerAims[rid] = {
          id:aimForRealm(state, rid), generation:generation,
          sinceYear:state.date.year
        };
      }
    }
    for (rid in agency.rulerAims) {
      if (!liveRulers[rid]) delete agency.rulerAims[rid];
    }
    for (var relationId in agency.relations) {
      if (!currentRulerRelation(state, agency.relations[relationId])) {
        delete agency.relations[relationId];
      }
    }

    var managed = {};
    var family = familySnapshot || FB.agencyFamilyMembers(state);
    for (var i = 0; i < family.length; i++) {
      var c = family[i];
      managed[c.id] = 1;
      var ambition = agency.familyAmbitions[c.id];
      if (!ambition || FAMILY_AIM_IDS.indexOf(ambition.id) < 0) {
        agency.familyAmbitions[c.id] = {
          id:familyAimFor(state, c), sinceYear:state.date.year,
          guidance:'neutral', progress:0, lastRequestYear:null
        };
      } else {
        if (ambition.guidance !== 'encouraged' &&
            ambition.guidance !== 'discouraged') ambition.guidance = 'neutral';
        ambition.progress = Math.max(0, Math.floor(Number(ambition.progress) || 0));
      }
    }
    for (var cid in agency.familyAmbitions) {
      if (!managed[cid]) delete agency.familyAmbitions[cid];
    }
    FB.familyOfficeRecords(state, family);
    return agency;
  };

  FB.rulerAimSnapshot = function (state, rid) {
    var realm = state && state.realms && state.realms[rid];
    if (!realm || !realm.alive || rid === 'player') return null;
    var stored = state.agency && state.agency.rulerAims &&
      state.agency.rulerAims[rid];
    if (stored && Number(stored.generation) === rulerGeneration(realm)) {
      return stored;
    }
    return { id:aimForRealm(state, rid),
      generation:rulerGeneration(realm), sinceYear:state.date.year };
  };

  FB.rulerAimLabel = function (state, rid) {
    var aim = FB.rulerAimSnapshot(state, rid);
    var labels = {
      secure_dynasty:'Secure the dynasty', expand_realm:'Expand the realm',
      amass_wealth:'Amass wealth', defend_faith:'Defend the faith',
      strengthen_crown:'Strengthen the crown',
      win_independence:'Win independence', keep_peace:'Keep the peace'
    };
    return aim ? FB.T(labels[aim.id] || aim.id) : FB.T('Unknown');
  };

  FB.familyAmbitionSnapshot = function (state, cid, familySnapshot) {
    var c = state && state.chars && state.chars[cid];
    if (!c || c.dead ||
        !FB.isAgencyFamilyMember(state, cid, familySnapshot)) return null;
    var stored = state.agency && state.agency.familyAmbitions &&
      state.agency.familyAmbitions[cid];
    return stored || { id:familyAimFor(state, c), sinceYear:state.date.year,
      guidance:'neutral', progress:0, lastRequestYear:null };
  };

  FB.familyAmbitionLabel = function (state, cid, familySnapshot) {
    var ambition = FB.familyAmbitionSnapshot(state, cid, familySnapshot);
    var labels = {
      learn:'Master an art', marry_well:'Make a worthy marriage',
      prosper:'Build a fortune', serve_house:'Win a place in family service',
      serve_faith:'Serve the faith', build_household:'Build a household'
    };
    return ambition ? FB.T(labels[ambition.id] || ambition.id) : '';
  };

  FB.familyAmbitionGuidanceLabel = function (guidance) {
    if (guidance === 'encouraged') return FB.T('Encouraged');
    if (guidance === 'discouraged') return FB.T('Discouraged');
    return FB.T('Left to their judgment');
  };

  FB.setFamilyAmbitionGuidance = function (state, cid, guidance) {
    var agency = state.agency || FB.ensureAgency(state);
    var record = agency && agency.familyAmbitions[cid];
    if (!record || ['neutral', 'encouraged', 'discouraged'].indexOf(guidance) < 0) {
      return false;
    }
    record.guidance = guidance;
    if (guidance === 'discouraged') {
      var c = state.chars[cid];
      record.id = familyAimFor(state, c, record.id);
      record.sinceYear = state.date.year;
      record.progress = 0;
      record.guidance = 'neutral';
    }
    return true;
  };

  function baselineRegard(state, fromRid, toRid) {
    var score = 0;
    var fromCulture = realmCulture(state, fromRid);
    var toCulture = realmCulture(state, toRid);
    var fromReligion = realmReligion(state, fromRid);
    var toReligion = realmReligion(state, toRid);
    if (fromCulture && fromCulture === toCulture) score += 15;
    if (fromReligion && fromReligion === toReligion) score += 20;
    else if (fromReligion && toReligion &&
        FB.religionOf(fromReligion).group === FB.religionOf(toReligion).group) {
      score += 8;
    }
    if (FB.areAlliedSnapshot && FB.areAlliedSnapshot(state, fromRid, toRid)) {
      score += 25;
    }
    var from = state.realms[fromRid];
    if (from && from.war && FB.topRealm(state, from.war.enemy) ===
        FB.topRealm(state, toRid)) score -= 50;
    return FB.clamp(score, -100, 100);
  }

  FB.rulerRegard = function (state, fromRid, toRid) {
    if (!state || !fromRid || !toRid) return 0;
    if (fromRid === toRid) return 100;
    if (fromRid === 'player' || toRid === 'player') {
      var other = fromRid === 'player' ? toRid : fromRid;
      return state.realms[other] && FB.standingOf
        ? FB.standingOf(state, { kind:'realm', id:other }) : 0;
    }
    var from = state.realms[fromRid];
    if (from && from.liege === toRid && isFinite(Number(from.favor))) {
      return Number(from.favor);
    }
    var record = state.agency && state.agency.relations &&
      state.agency.relations[relationKey(fromRid, toRid)];
    return currentRulerRelation(state, record) && isFinite(Number(record.value))
      ? Number(record.value) : baselineRegard(state, fromRid, toRid);
  };

  FB.adjustRulerRegard = function (state, fromRid, toRid, amount, reason) {
    if (!state || !fromRid || !toRid || fromRid === toRid) return 0;
    if (fromRid === 'player' || toRid === 'player') {
      var other = fromRid === 'player' ? toRid : fromRid;
      if (!state.realms[other] || !FB.adjustStanding) return 0;
      FB.adjustStanding(state, { kind:'realm', id:other }, amount,
        reason || 'agency:ruler_relation');
      return FB.rulerRegard(state, fromRid, toRid);
    }
    var from = state.realms[fromRid];
    if (from && from.liege === toRid) {
      from.favor = FB.clamp(Number(from.favor || 0) + Number(amount || 0),
        -100, 100);
      return from.favor;
    }
    var agency = state.agency || FB.ensureAgency(state);
    var key = relationKey(fromRid, toRid);
    var current = FB.rulerRegard(state, fromRid, toRid);
    agency.relations[key] = {
      fromRid:fromRid, toRid:toRid,
      fromGeneration:rulerGeneration(state.realms[fromRid]),
      toGeneration:rulerGeneration(state.realms[toRid]),
      value:FB.clamp(current + Number(amount || 0), -100, 100),
      lastYear:state.date.year, reason:reason || 'cultivation'
    };
    return agency.relations[key].value;
  };

  var distanceCache = { state:null, home:null, distances:null };
  function playerDistances(state) {
    var home = state.player.provinceId;
    if (distanceCache.state === state && distanceCache.home === home &&
        distanceCache.distances) return distanceCache.distances;
    var distances = {};
    if (!home || !FB.world.byId[home]) return distances;
    var queue = [home], head = 0;
    distances[home] = 0;
    while (head < queue.length) {
      var pid = queue[head++];
      var adjacent = FB.world.adj[pid] || {};
      for (var next in adjacent) {
        if (distances[next] !== undefined) continue;
        distances[next] = distances[pid] + 1;
        queue.push(next);
      }
    }
    distanceCache = { state:state, home:home, distances:distances };
    return distances;
  }

  function playerCommitment(state, rid) {
    if (state.player.liege && FB.liegeChain(state, state.player.liege)
        .indexOf(rid) >= 0) return true;
    if (state.player.war && state.player.war.enemy === rid) return true;
    if (state.pacts && state.pacts[rid] > state.turn) return true;
    if (FB.areAlliedSnapshot && FB.areAlliedSnapshot(state, 'player', rid)) {
      return true;
    }
    return !!(state.player.royalCompact &&
      state.player.royalCompact.realmId === rid);
  }

  FB.rulerPlayerRelevance = function (state, rid) {
    var realm = state && state.realms && state.realms[rid];
    var me = state && state.player && state.chars[state.player.charId];
    if (!realm || !realm.alive || !realm.ruler || rid === 'player' || !me) {
      return { eligible:false, reason:'invalid', distance:null, score:-999 };
    }
    var cap = realm.capital;
    var distances = playerDistances(state);
    var distance = distances[cap] === undefined ? Infinity : distances[cap];
    var culture = realmCulture(state, rid);
    var religion = realmReligion(state, rid);
    var sameCulture = !!culture && culture === me.culture;
    var sameReligion = !!religion && religion === me.religion;
    var sameFaithGroup = !!religion &&
      FB.religionOf(religion).group === FB.religionOf(me.religion).group;
    var playerRealm = FB.playerRealmId ? FB.playerRealmId(state) :
      (state.player.liege || 'player');
    var inRealm = FB.topRealm(state, rid) === playerRealm;
    var committed = playerCommitment(state, rid);
    var maxDistance = sameCulture && sameFaithGroup ? 14 :
      (sameCulture || sameFaithGroup ? 8 : 3);
    var eligible = inRealm || committed ||
      (isFinite(distance) && distance <= maxDistance);
    var reason = eligible ? 'eligible' :
      (!isFinite(distance) ? 'unreachable' : 'too_distant');
    var scoreDistance = isFinite(distance) ? distance :
      (inRealm ? 0 : (committed ? maxDistance : 50));
    var score = 100 - scoreDistance * 8 +
      (sameCulture ? 18 : 0) + (sameReligion ? 28 :
        (sameFaithGroup ? 10 : -15)) + (inRealm ? 35 : 0) +
      (committed ? 25 : 0);
    return {
      eligible:eligible, reason:reason, distance:isFinite(distance) ? distance : null,
      maxDistance:maxDistance, sameCulture:sameCulture,
      sameReligion:sameReligion, sameFaithGroup:sameFaithGroup,
      inRealm:inRealm, committed:committed, score:score
    };
  };

  FB.rulerPlayerRelevanceText = function (state, rid) {
    var status = FB.rulerPlayerRelevance(state, rid);
    if (status.inRealm) return FB.T('Inside your political realm');
    if (status.committed) return FB.T('Existing diplomatic commitment');
    if (!status.eligible) {
      return status.reason === 'unreachable'
        ? FB.T('Beyond reachable diplomatic routes')
        : FB.T('Too distant for this culture and faith');
    }
    var affinity = status.sameCulture && status.sameReligion
      ? FB.T('same culture and faith')
      : (status.sameCulture ? FB.T('shared culture') :
        (status.sameFaithGroup ? FB.T('related faith') :
          FB.T('nearby foreign court')));
    return FB.T('{distance} county steps · {affinity}', {
      distance:status.distance, affinity:affinity
    });
  };

  FB.rulerAimMotionValue = function (state, rid, motionId) {
    if (rid === 'player') return 0;
    var aim = FB.rulerAimSnapshot(state, rid);
    var def = FB.policyDef ? FB.policyDef(motionId) : null;
    var family = def && def.family || '';
    if (!aim) return 0;
    if (aim.id === 'amass_wealth') {
      return family === 'commerce' ? 12 :
        (motionId === 'emergency_subsidy' ? -8 : 0);
    }
    if (aim.id === 'expand_realm') {
      if (motionId === 'war_authorization') return 14;
      if (motionId === 'war_condemnation' || family === 'service') return -10;
    }
    if (aim.id === 'keep_peace') {
      if (motionId === 'war_condemnation') return 14;
      if (motionId === 'war_authorization') return -12;
    }
    if (aim.id === 'strengthen_crown') {
      if (motionId === 'redress' || motionId === 'revocation_consent') return -12;
      if (motionId === 'emergency_subsidy') return 10;
    }
    if (aim.id === 'win_independence' &&
        (motionId === 'redress' || family === 'custom')) return 10;
    if (aim.id === 'defend_faith' && motionId === 'war_authorization') return 8;
    return 0;
  };

  /* A family member may fill the same office slot as a retainer. These are
     unpaid household duties and therefore do not consume retainer capacity. */
  FB.familyOfficeRecords = function (state, familySnapshot) {
    var p = state.player;
    if (!p.familyOffices || typeof p.familyOffices !== 'object' ||
        Array.isArray(p.familyOffices)) p.familyOffices = {};
    var seen = {};
    for (var office in p.familyOffices) {
      var cid = p.familyOffices[office];
      var c = state.chars[cid];
      var def = FB.positionDef && FB.positionDef(office);
      var career = c && FB.careerOf ? FB.careerOf(state, c) : null;
      if (!c || c.dead || !def || def.kind !== 'retainer' || seen[cid] ||
          !FB.isAgencyFamilyMember(state, cid, familySnapshot) ||
          FB.ageOf(c, state.date.year) < 16 ||
          !career || career.profession !== def.profession ||
          (def.maleOnly && c.sex !== 'm') ||
          (FB.retainerOfficeRecord && FB.retainerOfficeRecord(state, office)) ||
          state.player.tier < (def.minTier || 0)) {
        delete p.familyOffices[office];
        continue;
      }
      seen[cid] = 1;
    }
    var out = [];
    for (office in p.familyOffices) {
      out.push({ office:office, charId:p.familyOffices[office] });
    }
    return out;
  };

  FB.familyOfficeRecord = function (state, cid) {
    var records = FB.familyOfficeRecords(state);
    for (var i = 0; i < records.length; i++) {
      if (String(records[i].charId) === String(cid)) return records[i];
    }
    return null;
  };

  FB.familyOfficeHolder = function (state, office) {
    var records = FB.familyOfficeRecords(state);
    for (var i = 0; i < records.length; i++) {
      if (records[i].office === office) return state.chars[records[i].charId];
    }
    return null;
  };

  FB.canAppointFamilyOffice = function (state, office, cid) {
    var def = FB.positionDef && FB.positionDef(office);
    var c = state.chars[cid];
    var career = c && FB.careerOf ? FB.careerOf(state, c) : null;
    if (!def || def.kind !== 'retainer' || !c || c.dead ||
        !FB.isAgencyFamilyMember(state, cid) ||
        FB.ageOf(c, state.date.year) < 16 ||
        state.player.tier < (def.minTier || 0) ||
        (def.maleOnly && c.sex !== 'm') ||
        !career || career.profession !== def.profession ||
        FB.familyOfficeRecord(state, cid)) return false;
    if (FB.retainerOfficeRecord && FB.retainerOfficeRecord(state, office)) return false;
    return !FB.familyOfficeHolder(state, office);
  };

  FB.appointFamilyOffice = function (state, office, cid) {
    if (!FB.canAppointFamilyOffice(state, office, cid)) return false;
    if (FB.unassignEnterpriseWorker) FB.unassignEnterpriseWorker(state, cid);
    FB.familyOfficeRecords(state);
    state.player.familyOffices[office] = cid;
    FB.adjustStanding(state, { kind:'character', id:cid }, 8,
      'family:office_appointed');
    FB.news(state, FB.msg('news.family.office_appointed',
      '🗝 {name} is entrusted with the household office of {office}.', {
        name:state.chars[cid].name,
        office:FB.dataParam('position', office)
      }));
    return true;
  };

  FB.removeFamilyOffice = function (state, cid) {
    var record = FB.familyOfficeRecord(state, cid);
    if (!record) return false;
    delete state.player.familyOffices[record.office];
    return true;
  };

  function charCommitted(state, c) {
    if (!c || c.dead || c.betrothedId) return true;
    if (FB.spousesSnapshot && FB.spousesSnapshot(state, c).length) return true;
    return false;
  }

  function marriagePair(state, rid, familySnapshot) {
    var relevance = FB.rulerPlayerRelevance(state, rid);
    if (!relevance.eligible) return null;
    var rulerAim = FB.rulerAimSnapshot(state, rid);
    if (!rulerAim || ['secure_dynasty', 'keep_peace', 'strengthen_crown']
        .indexOf(rulerAim.id) < 0) return null;
    var family = (familySnapshot || FB.agencyFamilyMembers(state))
      .filter(function (c) {
        var age = FB.ageOf(c, state.date.year);
        return age >= 12 && !charCommitted(state, c) &&
          !(FB.papacyCelibateSnapshot &&
            FB.papacyCelibateSnapshot(state, c)) &&
          !(FB.isReigningRealmRuler &&
            FB.isReigningRealmRuler(state, c));
      });
    var members = FB.realmFamilySnapshot ? FB.realmFamilySnapshot(state, rid) : [];
    var partners = [];
    for (var i = 0; i < members.length; i++) {
      var member = members[i];
      var partner = member.charId && state.chars[member.charId];
      if (!partner || partner.dead || FB.ageOf(partner, state.date.year) < 12 ||
          charCommitted(state, partner) ||
          (FB.papacyCelibateSnapshot &&
            FB.papacyCelibateSnapshot(state, partner))) continue;
      partners.push(partner);
    }
    var best = null;
    for (i = 0; i < family.length; i++) {
      for (var j = 0; j < partners.length; j++) {
        var target = family[i], other = partners[j];
        if (target.sex === other.sex || target.religion !== other.religion ||
            FB.closeMarriageKinSnapshot &&
              FB.closeMarriageKinSnapshot(state, target, other)) continue;
        var terms = FB.marriageTerms(state, target, other);
        var score = relevance.score +
          FB.standingOf(state, { kind:'realm', id:rid }) +
          Math.min(30, Number(state.player.prestige || 0) / 5) +
          state.player.tier * 6 + FB.stationOf(target) * 8 +
          FB.skillOf(target, 'dip') * 2;
        if (rulerAim.id === 'secure_dynasty') score += 20;
        if (terms.subjectPays && terms.amount > state.player.gold) score -= 35;
        if (!best || score > best.score) {
          best = { target:target, partner:other, terms:terms, score:score };
        }
      }
    }
    return best && best.score >= 35 ? best : null;
  }

  function queuedAgencyEvent(state) {
    var queue = state.eventQueue || [];
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].id === 'ruler_overture' ||
          queue[i].id === 'ruler_marriage_offer') return true;
    }
    return false;
  }

  function sovereignNeighbors(state) {
    var out = {};
    for (var pid in state.owner) {
      var a = state.owner[pid];
      var adjacent = FB.world.adj[pid] || {};
      for (var next in adjacent) {
        var b = state.owner[next];
        if (!a || !b || a === b) continue;
        (out[a] = out[a] || {})[b] = 1;
        (out[b] = out[b] || {})[a] = 1;
      }
    }
    return out;
  }

  function cultivateRulers(state, neighbors) {
    var agency = state.agency;
    for (var rid in state.realms) {
      var realm = state.realms[rid];
      if (rid === 'player' || !realm || !realm.alive || !realm.ruler) continue;
      var target = null;
      if (realm.liege) target = realm.liege;
      if (!target) {
        var adjacent = neighbors[rid] || {};
        var ids = Object.keys(adjacent).sort();
        if (ids.length) target = ids[Math.abs(state.date.year) % ids.length];
      }
      if (!target || target === 'player' || !state.realms[target] ||
          !state.realms[target].alive) continue;
      var aim = FB.rulerAimSnapshot(state, rid);
      var amount = aim && (aim.id === 'keep_peace' ||
        aim.id === 'secure_dynasty') ? 3 : 1;
      if (aim && (aim.id === 'expand_realm' ||
          aim.id === 'win_independence')) amount = -2;
      FB.adjustRulerRegard(state, rid, target, amount,
        'agency:annual_cultivation');
    }
    /* Only the protagonist's relevant court needs peer cultivation for bloc
       formation. Each AI house touches one stable peer, so this stays linear
       in the already-bounded court rather than becoming an all-realm graph. */
    var court = FB.politicalCourt && FB.politicalCourt(state);
    var peers = court ? court.houses.filter(function (house) {
      return !house.isPlayer;
    }) : [];
    for (var i = 0; i < peers.length; i++) {
      if (peers.length < 2) break;
      var from = peers[i];
      var to = peers[(i + 1) % peers.length];
      var peerAim = FB.rulerAimSnapshot(state, from.id);
      var peerAmount = peerAim && peerAim.id === 'keep_peace' ? 3 : 1;
      if (peerAim && (peerAim.id === 'expand_realm' ||
          peerAim.id === 'win_independence')) peerAmount = -1;
      FB.adjustRulerRegard(state, from.id, to.id, peerAmount,
        'agency:court_cultivation');
    }
    for (var key in agency.relations) {
      var record = agency.relations[key];
      if (!currentRulerRelation(state, record) ||
          state.date.year - Number(record.lastYear || 0) > 8) {
        delete agency.relations[key];
      }
    }
  }

  function maintainFamilyAmbitions(state, familySnapshot) {
    var agency = state.agency;
    var family = familySnapshot || FB.agencyFamilyMembers(state);
    for (var i = 0; i < family.length; i++) {
      var c = family[i];
      var record = agency.familyAmbitions[c.id];
      if (!record || record.guidance !== 'encouraged') continue;
      if (!FB.chance(0.55)) continue;
      var skills = {
        learn:'lea', marry_well:'dip', prosper:'ste', serve_house:'mar',
        serve_faith:'lea', build_household:'dip'
      };
      FB.gainSkill(c, skills[record.id] || 'dip', 1);
      record.progress++;
      if (record.progress < 3) continue;
      record.progress = 0;
      record.guidance = 'neutral';
      state.player.prestige += 3;
      FB.news(state, FB.msg('news.family.ambition_progress',
        '🌟 {name} makes good on the ambition to {ambition}.', {
          name:c.name,
          ambition:FB.familyAmbitionLabel(state, c.id, family)
        }));
    }
  }

  function maybeQueueFamilyRequest(state, familySnapshot) {
    var agency = state.agency;
    if (FB.game && FB.game.observe ||
        Number(agency.lastFamilyRequestYear) === state.date.year ||
        !FB.chance(0.35)) return;
    var family = (familySnapshot || FB.agencyFamilyMembers(state))
      .filter(function (c) {
        var record = agency.familyAmbitions[c.id];
        return record && Number(record.lastRequestYear) !== state.date.year &&
          FB.ageOf(c, state.date.year) >= 10;
      });
    if (!family.length) return;
    family.sort(function (a, b) {
      var standingOrder =
        FB.standingOf(state, { kind:'character', id:a.id }) -
        FB.standingOf(state, { kind:'character', id:b.id });
      return standingOrder || String(a.id).localeCompare(String(b.id));
    });
    var chosen = family[0];
    var record = agency.familyAmbitions[chosen.id];
    record.lastRequestYear = state.date.year;
    agency.lastFamilyRequestYear = state.date.year;
    FB.queueEvent(state, 'family_ambition_request', {
      studentId:chosen.id, ambitionId:record.id
    });
  }

  function maybeSponsorRebels(state, neighbors) {
    var agency = state.agency;
    for (var targetId in agency.rebelSupport) {
      var support = agency.rebelSupport[targetId];
      var target = state.realms[targetId];
      var sponsor = support && state.realms[support.sponsorRid];
      if (!support || !target || !target.alive || !target.liege ||
          !sponsor || !sponsor.alive ||
          Number(support.sponsorGeneration) !== rulerGeneration(sponsor) ||
          state.date.year >= Number(support.expiresYear || 0)) {
        delete agency.rebelSupport[targetId];
      }
    }
    if (Object.keys(agency.rebelSupport).length >= 3 || !FB.chance(0.14)) return;
    var candidates = [];
    var vassalsByTop = {};
    for (var possibleId in state.realms) {
      var possible = state.realms[possibleId];
      if (!possible || !possible.alive || !possible.liege ||
          possibleId === 'player') continue;
      var possibleTop = FB.topRealm(state, possibleId);
      (vassalsByTop[possibleTop] = vassalsByTop[possibleTop] || [])
        .push(possibleId);
    }
    for (var sponsorId in state.realms) {
      var sponsorRealm = state.realms[sponsorId];
      var aim = FB.rulerAimSnapshot(state, sponsorId);
      if (sponsorId === 'player' || !sponsorRealm || !sponsorRealm.alive ||
          sponsorRealm.liege || !aim ||
          (aim.id !== 'expand_realm' && aim.id !== 'strengthen_crown')) continue;
      var rivals = Object.keys(neighbors[sponsorId] || {});
      for (var rivalIndex = 0; rivalIndex < rivals.length; rivalIndex++) {
        var top = rivals[rivalIndex];
        if (top === sponsorId ||
            FB.rulerRegard(state, sponsorId, top) >= 20) continue;
        var targets = vassalsByTop[top] || [];
        for (var targetIndex = 0; targetIndex < targets.length; targetIndex++) {
          var targetId2 = targets[targetIndex];
          var targetRealm = state.realms[targetId2];
          if (agency.rebelSupport[targetId2] ||
              Number(targetRealm.favor || 0) > -15) continue;
          if ((top === 'player' || targetRealm.liege === 'player') &&
              !FB.rulerPlayerRelevance(state, sponsorId).eligible) continue;
          candidates.push({ sponsorRid:sponsorId, targetRid:targetId2,
            hostility:-Number(targetRealm.favor || 0) });
        }
      }
    }
    if (!candidates.length) return;
    candidates.sort(function (a, b) {
      return b.hostility - a.hostility ||
        String(a.targetRid).localeCompare(String(b.targetRid)) ||
        String(a.sponsorRid).localeCompare(String(b.sponsorRid));
    });
    var chosen = candidates[0];
    agency.rebelSupport[chosen.targetRid] = {
      sponsorRid:chosen.sponsorRid, startedYear:state.date.year,
      sponsorGeneration:rulerGeneration(state.realms[chosen.sponsorRid]),
      expiresYear:state.date.year + 5, multiplier:1.75
    };
    if (!(FB.game && FB.game.observe) &&
        state.realms[chosen.targetRid].liege === 'player') {
      FB.queueEvent(state, 'ruler_rebel_intrigue', {
        realmId:chosen.sponsorRid,
        rulerGeneration:rulerGeneration(state.realms[chosen.sponsorRid]),
        rebelRealmId:chosen.targetRid
      });
    }
  }

  function maybeApproachPlayer(state, familySnapshot) {
    var agency = state.agency;
    if (FB.game && FB.game.observe || queuedAgencyEvent(state) ||
        Number(agency.lastPlayerApproachYear) === state.date.year ||
        !FB.chance(0.45)) return;
    var candidates = [];
    for (var rid in state.realms) {
      var realm = state.realms[rid];
      if (rid === 'player' || !realm || !realm.alive || !realm.ruler) continue;
      var aimRecord = agency.rulerAims[rid];
      if (aimRecord && isFinite(Number(aimRecord.lastApproachYear)) &&
          state.date.year - Number(aimRecord.lastApproachYear) < 4) continue;
      var relevance = FB.rulerPlayerRelevance(state, rid);
      if (!relevance.eligible) continue;
      candidates.push({ rid:rid, relevance:relevance,
        marriage:marriagePair(state, rid, familySnapshot) });
    }
    if (!candidates.length) return;
    candidates.sort(function (a, b) {
      var am = a.marriage ? 25 : 0;
      var bm = b.marriage ? 25 : 0;
      return b.relevance.score + bm - a.relevance.score - am ||
        String(a.rid).localeCompare(String(b.rid));
    });
    var chosen = candidates[0];
    var realm2 = state.realms[chosen.rid];
    agency.lastPlayerApproachYear = state.date.year;
    agency.rulerAims[chosen.rid].lastApproachYear = state.date.year;
    if (chosen.marriage) {
      var pair = chosen.marriage;
      FB.queueEvent(state, 'ruler_marriage_offer', {
        realmId:chosen.rid, rulerGeneration:rulerGeneration(realm2),
        studentId:pair.target.id, partnerId:pair.partner.id,
        dowry:pair.terms.amount,
        playerPays:pair.terms.subjectPays ? 'yes' : 'no',
        aimId:FB.rulerAimSnapshot(state, chosen.rid).id
      });
    } else {
      FB.queueEvent(state, 'ruler_overture', {
        realmId:chosen.rid, rulerGeneration:rulerGeneration(realm2),
        aimId:FB.rulerAimSnapshot(state, chosen.rid).id
      });
    }
  }

  FB.rebelSupportMultiplier = function (state, rid) {
    var support = state && state.agency && state.agency.rebelSupport &&
      state.agency.rebelSupport[rid];
    var sponsor = support && state.realms[support.sponsorRid];
    if (!support || !sponsor || !sponsor.alive ||
        Number(support.sponsorGeneration) !== rulerGeneration(sponsor) ||
        state.date.year >= Number(support.expiresYear || 0)) return 1;
    return Math.max(1, Number(support.multiplier) || 1);
  };

  FB.rulerAgencyYearly = function (state, familyLinks) {
    var family = FB.agencyFamilyMembers(state,
      familyLinks && familyLinks.kin);
    if (!FB.ensureAgency(state, family)) return;
    var neighbors = sovereignNeighbors(state);
    cultivateRulers(state, neighbors);
    maintainFamilyAmbitions(state, family);
    maybeSponsorRebels(state, neighbors);
    maybeApproachPlayer(state, family);
    maybeQueueFamilyRequest(state, family);
  };

  FB.fns = FB.fns || {};

  FB.fns.agency_ruler_context_valid = function (state, ctx) {
    var realm = ctx && state.realms[ctx.realmId];
    return !!(realm && realm.alive && realm.ruler &&
      rulerGeneration(realm) === Number(ctx.rulerGeneration) &&
      FB.rulerPlayerRelevance(state, ctx.realmId).eligible);
  };

  FB.fns.agency_overture_welcome = function (state, ctx) {
    if (!FB.fns.agency_ruler_context_valid(state, ctx)) return false;
    FB.adjustRulerRegard(state, ctx.realmId, 'player', 8,
      'agency:overture_welcomed');
    return true;
  };

  FB.fns.agency_overture_gift = function (state, ctx) {
    if (!FB.fns.agency_ruler_context_valid(state, ctx)) return false;
    FB.adjustRulerRegard(state, ctx.realmId, 'player', 15,
      'agency:overture_gift');
    return true;
  };

  FB.fns.agency_overture_rebuff = function (state, ctx) {
    if (!FB.fns.agency_ruler_context_valid(state, ctx)) return false;
    FB.adjustRulerRegard(state, ctx.realmId, 'player', -8,
      'agency:overture_rebuffed');
    return true;
  };

  FB.fns.agency_marriage_context_valid = function (state, ctx) {
    if (!FB.fns.agency_ruler_context_valid(state, ctx)) return false;
    var target = state.chars[ctx.studentId];
    var partner = state.chars[ctx.partnerId];
    return !!(target && partner &&
      FB.ageOf(target, state.date.year) >= 12 &&
      FB.ageOf(partner, state.date.year) >= 12 &&
      !charCommitted(state, target) &&
      !charCommitted(state, partner) &&
      !(FB.papacyCelibateSnapshot &&
        (FB.papacyCelibateSnapshot(state, target) ||
          FB.papacyCelibateSnapshot(state, partner))) &&
      FB.isAgencyFamilyMember(state, target.id) &&
      target.sex !== partner.sex && target.religion === partner.religion &&
      partner.royalLine && partner.royalLine.realmId === ctx.realmId &&
      !(FB.closeMarriageKinSnapshot &&
        FB.closeMarriageKinSnapshot(state, target, partner)));
  };

  FB.fns.agency_marriage_affordable = function (state, ctx) {
    return FB.fns.agency_marriage_context_valid(state, ctx) &&
      (ctx.playerPays !== 'yes' || state.player.gold >= Number(ctx.dowry || 0));
  };

  FB.fns.agency_marriage_accept = function (state, ctx) {
    if (!FB.fns.agency_marriage_affordable(state, ctx)) return false;
    var target = state.chars[ctx.studentId];
    var partner = state.chars[ctx.partnerId];
    var dowry = Math.max(0, Number(ctx.dowry) || 0);
    if (ctx.playerPays === 'yes') state.player.gold -= dowry;
    else partner.dowryDue = dowry;
    target.betrothedId = partner.id;
    partner.betrothedId = target.id;
    partner.role = 'kinspouse';
    if (FB.touchFamily) FB.touchFamily();
    FB.adjustRulerRegard(state, ctx.realmId, 'player', 15,
      'agency:marriage_offer_accepted');
    state.player.prestige += 8;
    if (FB.ageOf(target, state.date.year) >= 16 &&
        FB.ageOf(partner, state.date.year) >= 16) {
      FB.doKinWedding(state, target, partner);
    }
    return true;
  };

  FB.fns.agency_marriage_decline = function (state, ctx) {
    if (!FB.fns.agency_ruler_context_valid(state, ctx)) return false;
    FB.adjustRulerRegard(state, ctx.realmId, 'player', -8,
      'agency:marriage_offer_declined');
    return true;
  };

  FB.fns.agency_family_context_valid = function (state, ctx) {
    var record = ctx && FB.familyAmbitionSnapshot(state, ctx.studentId);
    return !!(record && record.id === ctx.ambitionId);
  };

  function supportFamilyAmbition(state, ctx, amount, guidance) {
    if (!FB.fns.agency_family_context_valid(state, ctx)) return false;
    var c = state.chars[ctx.studentId];
    var skills = {
      learn:'lea', marry_well:'dip', prosper:'ste', serve_house:'mar',
      serve_faith:'lea', build_household:'dip'
    };
    if (amount > 0) FB.gainSkill(c, skills[ctx.ambitionId] || 'dip', amount);
    FB.adjustStanding(state, { kind:'character', id:c.id },
      guidance === 'encouraged' ? 8 : (guidance === 'discouraged' ? -8 : 3),
      'family:ambition_guidance');
    return FB.setFamilyAmbitionGuidance(state, c.id, guidance);
  }

  FB.fns.agency_family_support = function (state, ctx) {
    return supportFamilyAmbition(state, ctx, 1, 'encouraged');
  };
  FB.fns.agency_family_counsel = function (state, ctx) {
    return supportFamilyAmbition(state, ctx, 0, 'neutral');
  };
  FB.fns.agency_family_refuse = function (state, ctx) {
    return supportFamilyAmbition(state, ctx, 0, 'discouraged');
  };

  FB.fns.agency_rebel_context_valid = function (state, ctx) {
    var support = ctx && state.agency && state.agency.rebelSupport &&
      state.agency.rebelSupport[ctx.rebelRealmId];
    var target = ctx && state.realms[ctx.rebelRealmId];
    return !!(support && target && target.alive && target.liege &&
      target.liege === 'player' &&
      support.sponsorRid === ctx.realmId &&
      Number(support.sponsorGeneration) === Number(ctx.rulerGeneration) &&
      state.date.year < Number(support.expiresYear || 0) &&
      FB.fns.agency_ruler_context_valid(state, ctx));
  };

  FB.fns.agency_rebel_expose = function (state, ctx) {
    if (!FB.fns.agency_rebel_context_valid(state, ctx)) return false;
    delete state.agency.rebelSupport[ctx.rebelRealmId];
    FB.adjustRulerRegard(state, ctx.realmId, 'player', -12,
      'agency:rebel_scheme_exposed');
    return true;
  };

  FB.fns.agency_rebel_buyoff = function (state, ctx) {
    if (!FB.fns.agency_rebel_context_valid(state, ctx)) return false;
    delete state.agency.rebelSupport[ctx.rebelRealmId];
    FB.adjustStanding(state, { kind:'realm', id:ctx.rebelRealmId }, 15,
      'agency:rebel_bought_off');
    return true;
  };
})();
