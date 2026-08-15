/* Fallowborn — great holy wars.
   One global, two-camp campaign may prepare or fight alongside the ordinary
   bilateral-war model. Religious heads call; sovereign volunteers field one
   ordinary host each; objective counties are occupied temporarily and change
   ownership only at settlement. All saved fields are additive to save v3. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function B(key, fallback) {
    var value = FBDATA.balance[key];
    return value === undefined ? fallback : value;
  }

  function config(state, religionId) {
    var religion = FB.religionOf(religionId, state);
    return religion && religion.head && religion.head.greatHolyWar || null;
  }

  function papalFaith(state, religionId) {
    return FB.faithHasSystem && FB.faithHasSystem(religionId, 'papacy', state);
  }

  function callingGroup(state, religionId) {
    return FB.faithGroup(religionId, state);
  }

  function opposedToCall(state, religionId, callingReligion) {
    var relation = FB.faithRelation(state, religionId, callingReligion);
    return relation === 'hostile' || relation === 'foreign';
  }

  function dateNumber(date) {
    return date.year * 360 + date.season * 90 + (date.day - 1);
  }

  function dateReached(state, date) {
    return !!date && dateNumber(state.date) >= dateNumber(date);
  }

  function realmName(state, rid) {
    if (rid === 'player') {
      if (state.realms.player && state.realms.player.name) return state.realms.player.name;
      var pc = state.chars && state.chars[state.player.charId];
      return pc ? FB.fullName(pc) : 'player';
    }
    return state.realms[rid] ? state.realms[rid].name : rid;
  }

  function ownerFaith(state, pid) {
    var rid = state.owner && state.owner[pid];
    return rid && FB.realmReligionId(state, rid) || null;
  }

  function countyLost(state, religionId, pid) {
    var ownerReligion = ownerFaith(state, pid);
    return !!ownerReligion &&
      !FB.faithInFold(state, religionId, ownerReligion);
  }

  function sovereignRealm(state, rid) {
    if (!rid) return null;
    if (rid === 'player') return FB.isPlayerSovereign(state) ? 'player' : FB.playerRealmId(state);
    return FB.topRealm(state, rid);
  }

  function livingSovereign(state, rid) {
    if (rid === 'player') return FB.isPlayerSovereign(state);
    var realm = state.realms[rid];
    return !!(realm && realm.alive && !realm.liege);
  }

  function participantRealmValid(state, participant) {
    if (!participant || !participant.realm) return false;
    if (!participant.sovereign) return participant.realm === 'player';
    return livingSovereign(state, participant.realm);
  }

  function participantOf(campaign, camp, rid) {
    var list = campaign && campaign.participants && campaign.participants[camp] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].realm === rid) return list[i];
    }
    return null;
  }

  function addParticipant(campaign, camp, record) {
    var list = campaign.participants[camp];
    var old = participantOf(campaign, camp, record.realm);
    if (old) {
      if (record.mandatory) old.mandatory = true;
      return old;
    }
    list.push(record);
    return record;
  }

  function voluntaryCount(campaign, camp) {
    var list = campaign.participants[camp], count = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].voluntary && !list[i].mandatory && list[i].realm !== 'player') count++;
    }
    return count;
  }

  function contribution(campaign, rid) {
    var value = campaign.contribution[rid];
    return typeof value === 'number' && isFinite(value) ? value : 0;
  }

  function addContribution(state, campaign, rid, points) {
    if (!rid || !isFinite(points) || points <= 0) return;
    if (rid === 'player' && FB.campaignModBonus) {
      points *= Math.max(0, 1 + FB.campaignModBonus(state, 'contribution'));
    }
    campaign.contribution[rid] = contribution(campaign, rid) + points;
  }

  FB.addGreatHolyWarContribution = function (state, rid, points) {
    var campaign = state && state.greatHolyWar;
    if (!campaign) return false;
    addContribution(state, campaign, rid, points);
    return true;
  };

  function ensureHistory(state) {
    var history = state.greatHolyWarHistory;
    if (!history || typeof history !== 'object' || Array.isArray(history)) {
      history = {};
      state.greatHolyWarHistory = history;
    }
    if (!isFinite(history.sequence) || history.sequence < 0) history.sequence = 0;
    if (!history.firstCall || typeof history.firstCall !== 'object') history.firstCall = {};
    if (!history.firstLaunched || typeof history.firstLaunched !== 'object') history.firstLaunched = {};
    if (!history.unlockChecked || typeof history.unlockChecked !== 'object') {
      history.unlockChecked = {};
    }
    if (!history.sacredLossSince || typeof history.sacredLossSince !== 'object') {
      history.sacredLossSince = {};
    }
    if (!history.cooldownUntil || typeof history.cooldownUntil !== 'object') {
      history.cooldownUntil = {};
    }
    if (!history.headState || typeof history.headState !== 'object') history.headState = {};
    if (!Array.isArray(history.campaigns)) history.campaigns = [];
    return history;
  }

  function ensurePlayerState(state) {
    if (state.player.greatHolyWar === undefined) {
      state.player.greatHolyWar = null;
    }
    if (state.player.greatHolyWar &&
        (typeof state.player.greatHolyWar !== 'object' ||
         Array.isArray(state.player.greatHolyWar))) {
      state.player.greatHolyWar = null;
    }
    return state.player.greatHolyWar;
  }

  FB.ensureGreatHolyWar = function (state) {
    if (!state) return null;
    ensureHistory(state);
    ensurePlayerState(state);
    if (state.greatHolyWar === undefined) state.greatHolyWar = null;
    return state.greatHolyWar;
  };

  function sacredTargets(conf) {
    return conf && Array.isArray(conf.sacredTargets) ? conf.sacredTargets : [];
  }

  function sacredForKingdom(state, religionId, kingdomId, lostOnly) {
    var conf = config(state, religionId), rows = sacredTargets(conf), out = [];
    for (var i = 0; i < rows.length; i++) {
      if (!rows[i] || rows[i].kingdom !== kingdomId || !Array.isArray(rows[i].counties)) continue;
      for (var j = 0; j < rows[i].counties.length; j++) {
        var pid = rows[i].counties[j];
        if (!FB.world.byId[pid] || out.indexOf(pid) >= 0) continue;
        if (!lostOnly || countyLost(state, religionId, pid)) out.push(pid);
      }
    }
    return out;
  }

  function objectiveRecord(state, religionId, kingdomId, specialFirst) {
    var counties = FB.kingdomCounties(kingdomId).slice();
    if (!counties.length) return null;
    var objectives = [];
    var originalFaith = 0, total = 0, lostDev = 0, totalDev = 0;
    for (var i = 0; i < counties.length; i++) {
      var pid = counties[i], province = FB.world.byId[pid];
      if (!province || province.wasteland) continue;
      total++;
      if (FB.faithInFold(state, religionId, province.religion)) originalFaith++;
      var dev = state.dev[pid] || 1;
      totalDev += dev;
      var currentFaith = ownerFaith(state, pid);
      if (currentFaith && !FB.faithInFold(state, religionId, currentFaith)) {
        objectives.push(pid);
        lostDev += dev;
      }
    }
    if (!objectives.length) return null;
    var holy = sacredForKingdom(state, religionId, kingdomId, true);
    var heartland = total > 0 && originalFaith > total / 2 && lostDev > totalDev / 2;
    if (!specialFirst && !holy.length && !heartland) return null;
    return {
      kingdomId:kingdomId,
      objectiveCounties:objectives,
      holyCounties:holy,
      holyPriority:holy.length,
      heartlandLoss:lostDev,
      objectiveDevelopment:lostDev,
      totalDevelopment:totalDev
    };
  }

  /* Eligible targets are frozen only when a call is made. Lost sacred places
     rank before later heartland reconquests; ties prefer more lost development
     and then the stable kingdom id. */
  FB.greatHolyWarTargets = function (state, religionId) {
    if (!state || !config(state, religionId) ||
        !callingGroup(state, religionId)) return [];
    var history = ensureHistory(state), conf = config(state, religionId), out = [];
    if (conf.firstTarget && !history.firstLaunched[religionId]) {
      var first = objectiveRecord(state, religionId, conf.firstTarget, true);
      if (first && first.holyCounties.length) out.push(first);
      return out;
    }
    var seen = {}, rows = sacredTargets(conf);
    for (var i = 0; i < rows.length; i++) {
      if (!rows[i] || !rows[i].kingdom || seen[rows[i].kingdom]) continue;
      seen[rows[i].kingdom] = 1;
      var sacred = objectiveRecord(state, religionId, rows[i].kingdom, false);
      if (sacred) out.push(sacred);
    }
    for (var kingdomId in FBDATA.kingdoms) {
      if (!Object.prototype.hasOwnProperty.call(FBDATA.kingdoms, kingdomId) ||
          seen[kingdomId]) continue;
      var later = objectiveRecord(state, religionId, kingdomId, false);
      if (later) out.push(later);
    }
    out.sort(function (a, b) {
      return (b.holyPriority - a.holyPriority) ||
        (b.heartlandLoss - a.heartlandLoss) ||
        (a.kingdomId < b.kingdomId ? -1 : a.kingdomId > b.kingdomId ? 1 : 0);
    });
    return out;
  };

  function targetById(state, religionId, kingdomId) {
    var targets = FB.greatHolyWarTargets(state, religionId);
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].kingdomId === kingdomId) return targets[i];
    }
    return null;
  }

  function campaignEventContext(state, campaign) {
    var kingdom = FBDATA.kingdoms[campaign.targetKingdom];
    return {
      campaignType:papalFaith(state, campaign.callingReligion) ? 'crusade' :
        (FB.faithOfficeId(campaign.callingReligion, state) === 'sunni'
          ? 'jihad' : 'other'),
      caller:realmName(state, campaign.callerRealm),
      leader:realmName(state, campaign.leaderRealm),
      kingdom:kingdom ? kingdom.name : campaign.targetKingdom
    };
  }

  FB.canCallGreatHolyWar = function (state, religionId, kingdomId, callerRealm) {
    if (!state || state.greatHolyWar || !config(state, religionId)) return false;
    if (callerRealm === 'player' && FB.intrigueCaptivityOf &&
        FB.intrigueCaptivityOf(state, state.player.charId)) return false;
    var conf = config(state, religionId), history = ensureHistory(state);
    if (!dateReached(state, conf.minDate)) return false;
    if ((history.cooldownUntil[religionId] || 0) > state.turn) return false;
    var head = FB.religiousHeadOf(state, religionId);
    if (!head) return false;
    if (FB.intrigueRealmRulerCaptive &&
        FB.intrigueRealmRulerCaptive(state, head.id)) return false;
    if (papalFaith(state, religionId) && FB.ensurePapacy) {
      var papacy = FB.ensurePapacy(state);
      var obedience = papacy && papacy.obediences[papacy.romanObedience];
      var authorityGate = FBDATA.papacy &&
        FBDATA.papacy.authority && FBDATA.papacy.authority.gates
        ? FBDATA.papacy.authority.gates.greatHolyWar : 50;
      if (!obedience || !obedience.claimantId ||
          FB.papacyInSchism(state) ||
          obedience.authority < authorityGate) return false;
      var playerCaller = callerRealm === 'player' &&
        obedience.claimantId === state.player.charId;
      if (callerRealm && callerRealm !== head.id && !playerCaller) return false;
    } else if (callerRealm && callerRealm !== head.id) {
      return false;
    }
    var targets = FB.greatHolyWarTargets(state, religionId);
    if (!targets.length) return false;
    if (!kingdomId) return true;
    return !!targetById(state, religionId, kingdomId);
  };

  function ordinaryWarInvolves(state, rid) {
    var top = sovereignRealm(state, rid);
    var playerRealm = FB.playerRealmId(state);
    var pw = state.player.war;
    if (pw) {
      var enemyTop = sovereignRealm(state, pw.enemy);
      if (rid === 'player' || top === playerRealm || top === enemyTop) return true;
    }
    if (top && state.realms[top] && state.realms[top].war) return true;
    for (var id in state.realms) {
      var realm = state.realms[id];
      if (realm && realm.alive && realm.war &&
          sovereignRealm(state, realm.war.enemy) === top) return true;
    }
    return false;
  }
  FB.realmInOrdinaryWar = ordinaryWarInvolves;

  function paperStrength(state, rid) {
    if (rid === 'player') return Math.max(1, FB.playerLevy(state));
    return Math.max(1, FB.aiBaseHost(state, rid));
  }

  function participantScore(state, rid) {
    var realm = state.realms[rid], zeal = 0;
    if (realm && realm.ruler && realm.ruler.trait === 'zealous') zeal = 200;
    return paperStrength(state, rid) + ((realm && realm.rank) || 1) * 100 + zeal;
  }

  function stableNumber(value) {
    value = String(value || '');
    var out = 0;
    for (var i = 0; i < value.length; i++) {
      out = (out * 33 + value.charCodeAt(i)) >>> 0;
    }
    return out;
  }

  function objectiveDuchies(campaign) {
    var seen = {}, out = [];
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var dejure = FB.dejureOf(campaign.objectiveCounties[i]);
      if (dejure.duchy && !seen[dejure.duchy]) {
        seen[dejure.duchy] = 1;
        out.push(dejure.duchy);
      }
    }
    out.sort();
    return out;
  }

  function normalizeDesire(campaign, desire, neutralFallback) {
    if (!desire || typeof desire !== 'object') {
      return { kind:neutralFallback ? 'neutral' : 'honor', id:null };
    }
    var kind = desire.kind;
    if (['crown','sacred','duchy','county','honor','neutral'].indexOf(kind) < 0) {
      kind = neutralFallback ? 'neutral' : 'honor';
    }
    var id = desire.id || null;
    if (kind === 'duchy' && objectiveDuchies(campaign).indexOf(id) < 0) {
      kind = neutralFallback ? 'neutral' : 'honor';
      id = null;
    }
    if (kind === 'county' && campaign.objectiveCounties.indexOf(id) < 0) {
      kind = neutralFallback ? 'neutral' : 'honor';
      id = null;
    }
    if (kind !== 'duchy' && kind !== 'county') id = null;
    return { kind:kind, id:id };
  }

  function copyDesire(desire) {
    return desire && typeof desire === 'object'
      ? { kind:desire.kind || 'neutral', id:desire.id || null } : null;
  }

  function eligibleBeneficiary(state, charId) {
    var c = charId && state.chars[charId];
    return !!(c && !c.dead && FB.ageOf(c, state.date.year) >= 16 &&
      FB.kinOf(state).byId[c.id] && !FB.isReigningRealmRuler(state, c));
  }

  FB.greatHolyWarVowBeneficiaries = function (state) {
    var out = [], kin = FB.kinOf(state).byId;
    for (var charId in kin) {
      if (!eligibleBeneficiary(state, charId)) continue;
      out.push({ c:state.chars[charId], rel:kin[charId] });
    }
    out.sort(function (a, b) {
      return (a.c.born - b.c.born) ||
        (a.c.id < b.c.id ? -1 : a.c.id > b.c.id ? 1 : 0);
    });
    return out;
  };

  FB.greatHolyWarDesireTargets = function (state, kind) {
    var campaign = state && state.greatHolyWar, out = [];
    if (!campaign) return out;
    if (kind === 'duchy') {
      var duchies = objectiveDuchies(campaign);
      for (var i = 0; i < duchies.length; i++) {
        out.push({
          id:duchies[i],
          name:FBDATA.duchies[duchies[i]]
            ? FBDATA.duchies[duchies[i]].name : duchies[i]
        });
      }
    } else if (kind === 'county') {
      for (var j = 0; j < campaign.objectiveCounties.length; j++) {
        var pid = campaign.objectiveCounties[j];
        out.push({ id:pid, name:FB.world.byId[pid] ? FB.world.byId[pid].name : pid });
      }
      out.sort(function (a, b) {
        return (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      });
    }
    return out;
  };

  function defaultPlayerVowTerms(campaign, supplied) {
    supplied = supplied && typeof supplied === 'object' ? supplied : {};
    var seasons = [4,8,12].indexOf(supplied.seasons) >= 0
      ? supplied.seasons : 4;
    var desire = normalizeDesire(campaign, supplied.desire, !supplied.desire);
    var beneficiary = supplied.beneficiary || null;
    if (desire.kind !== 'duchy' && desire.kind !== 'county') beneficiary = null;
    return {
      seasons:seasons,
      desire:desire,
      beneficiary:beneficiary,
      served:Math.max(0, Math.floor(supplied.served || 0)),
      mustered:!!supplied.mustered
    };
  }

  function seedAiVow(state, campaign, participant, deterministic) {
    if (!participant || participant.realm === 'player') return participant;
    if ([4,8,12].indexOf(participant.vowSeasons) >= 0 &&
        participant.desire && typeof participant.desire === 'object') {
      participant.desire = normalizeDesire(campaign, participant.desire, true);
      participant.served = Math.max(0, Math.floor(participant.served || 0));
      participant.mustered = !!participant.mustered;
      return participant;
    }
    var realm = state.realms[participant.realm], trait = realm && realm.ruler &&
      realm.ruler.trait;
    var hash = stableNumber(campaign.id + ':' + participant.realm);
    var longVow = trait === 'zealous' || trait === 'ambitious';
    participant.vowSeasons = longVow
      ? (deterministic ? (hash % 3 ? 12 : 8) : (FB.chance(0.67) ? 12 : 8))
      : (deterministic ? (hash % 2 ? 8 : 4) : (FB.chance(0.4) ? 8 : 4));
    if (trait === 'zealous') {
      participant.desire = { kind:'sacred', id:null };
    } else if (trait === 'ambitious') {
      participant.desire = { kind:'crown', id:null };
    } else {
      var land = deterministic ? hash % 2 === 0 : FB.chance(0.5);
      if (!land) {
        participant.desire = { kind:'honor', id:null };
      } else {
        var duchies = objectiveDuchies(campaign);
        var chooseDuchy = duchies.length &&
          (deterministic ? hash % 3 !== 0 : FB.chance(0.55));
        if (chooseDuchy) {
          participant.desire = {
            kind:'duchy',
            id:duchies[deterministic ? hash % duchies.length : FB.ri(0, duchies.length - 1)]
          };
        } else {
          var counties = campaign.objectiveCounties;
          participant.desire = {
            kind:'county',
            id:counties[deterministic ? hash % counties.length : FB.ri(0, counties.length - 1)]
          };
        }
      }
    }
    participant.served = Math.max(0, Math.floor(participant.served || 0));
    participant.mustered = !!participant.mustered;
    return participant;
  }

  function participantRecord(state, campaign, record, deterministic) {
    if (record && record.realm !== 'player' && record.sovereign) {
      seedAiVow(state, campaign, record, deterministic);
    }
    return record;
  }

  function aiAttackers(state, campaign) {
    var candidates = [], faith = campaign.callingReligion;
    for (var rid in state.realms) {
      if (rid === 'player' || rid === campaign.callerRealm ||
          !livingSovereign(state, rid)) continue;
      if (!FB.faithInFold(state, faith, FB.realmReligionId(state, rid))) continue;
      var ruler = FB.realmRulerCharacter &&
        FB.realmRulerCharacter(state, rid);
      if (papalFaith(state, FB.realmReligionId(state, rid)) && ruler &&
          FB.excommunicationOf &&
          FB.excommunicationOf(state, ruler.id,
            FB.papalObedienceForRealm(state, rid))) continue;
      candidates.push(rid);
    }
    candidates.sort(function (a, b) {
      return (participantScore(state, b) - participantScore(state, a)) ||
        (a < b ? -1 : a > b ? 1 : 0);
    });
    var cap = B('greatHolyWarVolunteersPerCamp', 8);
    for (var i = 0; i < candidates.length && voluntaryCount(campaign, 'attackers') < cap; i++) {
      if (i >= 2 && !FB.chance(0.55)) continue;
      addParticipant(campaign, 'attackers', participantRecord(state, campaign, {
        realm:candidates[i], sovereign:true, mandatory:false, voluntary:true,
        joinedTurn:state.turn
      }, false));
    }
  }

  function mandatoryDefenders(state, campaign) {
    var seen = {};
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var rid = sovereignRealm(state, state.owner[campaign.objectiveCounties[i]]);
      if (!rid || seen[rid] ||
          !countyLost(state, campaign.callingReligion,
            campaign.objectiveCounties[i])) continue;
      seen[rid] = 1;
      addParticipant(campaign, 'defenders', {
        realm:rid, sovereign:true, mandatory:true, voluntary:false,
        joinedTurn:state.turn
      });
      if (rid === 'player') {
        state.player.greatHolyWar = {
          campaignId:campaign.id, camp:'defenders', mode:'host', vow:true,
          mandatory:true, withdrawn:false, landEligible:false,
          renewalRequired:false,
          vowTerms:defaultPlayerVowTerms(campaign, null),
          vowOutcome:null
        };
      }
    }
    if (FB.syncGreatHolyWarModifiers) FB.syncGreatHolyWarModifiers(state);
  }

  function aiDefenders(state, campaign) {
    var candidates = [];
    for (var rid in state.realms) {
      if (rid === 'player' || !livingSovereign(state, rid) ||
          participantOf(campaign, 'defenders', rid) || ordinaryWarInvolves(state, rid)) continue;
      var faith = FB.realmReligionId(state, rid);
      if (!faith ||
          !opposedToCall(state, faith, campaign.callingReligion)) continue;
      candidates.push(rid);
    }
    candidates.sort(function (a, b) {
      return (participantScore(state, b) - participantScore(state, a)) ||
        (a < b ? -1 : a > b ? 1 : 0);
    });
    var cap = B('greatHolyWarVolunteersPerCamp', 8);
    for (var j = 0; j < candidates.length && voluntaryCount(campaign, 'defenders') < cap; j++) {
      if (!FB.chance(0.3)) continue;
      addParticipant(campaign, 'defenders', {
        realm:candidates[j], sovereign:true, mandatory:false, voluntary:true,
        joinedTurn:state.turn
      });
    }
  }

  FB.callGreatHolyWar = function (state, religionId, kingdomId, callerRealm) {
    if (!FB.canCallGreatHolyWar(state, religionId, kingdomId, callerRealm)) return false;
    var target = targetById(state, religionId, kingdomId);
    var head = FB.religiousHeadOf(state, religionId);
    if (!target || !head) return false;
    var history = ensureHistory(state);
    history.sequence++;
    var campaign = {
      id:'ghw_' + history.sequence,
      phase:'preparation',
      callingReligion:religionId,
      callerRealm:head.id,
      callerClaimantId:papalFaith(state, religionId) && FB.romanPope
        ? (FB.romanPope(state) || {}).id || null : null,
      callerObedienceId:papalFaith(state, religionId) &&
        FB.papalObedienceForRealm
        ? FB.papalObedienceForRealm(state, head.id) : null,
      leaderRealm:null,
      targetKingdom:target.kingdomId,
      holyCounties:target.holyCounties.slice(),
      objectiveCounties:target.objectiveCounties.slice(),
      calledTurn:state.turn,
      launchTurn:state.turn + B('greatHolyWarPreparationDays', 180),
      deadlineTurn:null,
      participants:{ attackers:[], defenders:[] },
      occupations:{},
      resolve:0,
      contribution:{},
      result:null,
      settlement:null
    };
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      campaign.occupations[campaign.objectiveCounties[i]] = {
        occupied:false, progress:0, progressCamp:null, occupiedBy:null
      };
    }
    state.greatHolyWar = campaign;
    history.firstCall[religionId] = true;
    mandatoryDefenders(state, campaign);
    aiAttackers(state, campaign);
    aiDefenders(state, campaign);
    var kingdom = FBDATA.kingdoms[kingdomId];
    FB.news(state, FB.msg('news.holywar.called',
      '📯 {caller} calls the faithful to a {campaign} for {kingdom}. The banners have 180 days to gather.', {
        caller:realmName(state, head.id),
        campaign:FB.dataParam('religion', religionId, 'head.greatHolyWar.name'),
        kingdom:kingdom ? kingdom.name : kingdomId
      }));
    FB.queueEvent(state, 'ghw_called', campaignEventContext(state, campaign));
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return campaign;
  };

  function playerCompatibleCamp(state, campaign) {
    var character = state.chars[state.player.charId];
    if (!character || FB.ageOf(character, state.date.year) < 16 || state.player.tier < 1) {
      return null;
    }
    if (papalFaith(state, character.religion) &&
        FB.playerExcommunicated && FB.playerExcommunicated(state)) return null;
    if (FB.faithInFold(state, campaign.callingReligion,
        character.religion)) return 'attackers';
    if (opposedToCall(state, character.religion,
        campaign.callingReligion)) return 'defenders';
    return null;
  }

  FB.playerGreatHolyWarJoinCamp = function (state) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || campaign.phase !== 'preparation') return null;
    return playerCompatibleCamp(state, campaign);
  };

  FB.playerGreatHolyWarCamp = function (state) {
    var pledge = state && state.player && state.player.greatHolyWar;
    var campaign = state && state.greatHolyWar;
    return pledge && campaign && pledge.campaignId === campaign.id && !pledge.withdrawn
      ? pledge.camp : null;
  };

  FB.joinGreatHolyWar = function (state, camp, realmId, vowTerms) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || campaign.phase !== 'preparation') return false;
    realmId = realmId || 'player';
    if (realmId === 'player') {
      if (state.player.greatHolyWar &&
          state.player.greatHolyWar.campaignId === campaign.id) return false;
      var compatible = playerCompatibleCamp(state, campaign);
      if (!compatible || (camp && camp !== compatible)) return false;
      camp = compatible;
      var sovereign = FB.isPlayerSovereign(state);
      var top = FB.playerRealmId(state);
      var mode = sovereign ? 'host'
        : (top && participantOf(campaign, camp, top) ? 'liege' : 'expedition');
      if (camp === 'defenders' && sovereign && ordinaryWarInvolves(state, 'player')) {
        return false;
      }
      state.player.greatHolyWar = {
        campaignId:campaign.id, camp:camp, mode:mode, vow:true,
        mandatory:!!participantOf(campaign, camp, 'player'),
        withdrawn:false, landEligible:camp === 'attackers',
        renewalRequired:false,
        vowTerms:defaultPlayerVowTerms(campaign, vowTerms),
        vowOutcome:null
      };
      if (!eligibleBeneficiary(state,
          state.player.greatHolyWar.vowTerms.beneficiary)) {
        state.player.greatHolyWar.vowTerms.beneficiary = null;
      }
      if (sovereign) {
        addParticipant(campaign, camp, {
          realm:'player', sovereign:true, mandatory:false, voluntary:true,
          joinedTurn:state.turn
        });
      } else {
        addParticipant(campaign, camp, {
          realm:'player', sovereign:false, personal:true, mandatory:false,
          voluntary:true, joinedTurn:state.turn
        });
      }
      addContribution(state, campaign, 'player', 0);
      if (FB.syncGreatHolyWarModifiers) FB.syncGreatHolyWarModifiers(state);
      FB.news(state, FB.msg('news.holywar.player_pledges',
        '📯 You take the vow and pledge yourself to the {campaign}.', {
          campaign:FB.dataParam('religion', campaign.callingReligion,
            'head.greatHolyWar.name')
        }));
      return true;
    }
    var topRealm = sovereignRealm(state, realmId);
    if (topRealm !== realmId || !livingSovereign(state, realmId)) return false;
    var realmReligion = FB.realmReligionId(state, realmId);
    var joiningRuler = FB.realmRulerCharacter &&
      FB.realmRulerCharacter(state, realmId);
    if (camp === 'attackers' && papalFaith(state, realmReligion) &&
        joiningRuler && FB.excommunicationOf &&
        FB.excommunicationOf(state, joiningRuler.id,
          FB.papalObedienceForRealm(state, realmId))) return false;
    if (camp === 'attackers' &&
        !FB.faithInFold(state, campaign.callingReligion, realmReligion)) return false;
    if (camp === 'defenders' &&
        (!realmReligion || !opposedToCall(state, realmReligion,
          campaign.callingReligion) ||
         ordinaryWarInvolves(state, realmId))) return false;
    if (camp !== 'attackers' && camp !== 'defenders') return false;
    if (voluntaryCount(campaign, camp) >= B('greatHolyWarVolunteersPerCamp', 8)) return false;
    var joiningRecord = {
      realm:realmId, sovereign:true, mandatory:false, voluntary:true,
      joinedTurn:state.turn
    };
    if (camp === 'attackers') {
      if (vowTerms && typeof vowTerms === 'object') {
        joiningRecord.vowSeasons = [4,8,12].indexOf(vowTerms.seasons) >= 0
          ? vowTerms.seasons : 4;
        joiningRecord.desire = normalizeDesire(
          campaign, vowTerms.desire, !vowTerms.desire);
        joiningRecord.served = Math.max(0,
          Math.floor(vowTerms.served || 0));
        joiningRecord.mustered = !!vowTerms.mustered;
      }
      participantRecord(state, campaign, joiningRecord, false);
    }
    addParticipant(campaign, camp, joiningRecord);
    return true;
  };

  function removeParticipant(campaign, camp, rid, keepMandatory) {
    var list = campaign.participants[camp], out = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].realm !== rid || (keepMandatory && list[i].mandatory)) out.push(list[i]);
    }
    campaign.participants[camp] = out;
  }

  FB.greatHolyWarWithdrawalCost = function (state) {
    var pledge = state && state.player && state.player.greatHolyWar;
    var inherited = !!(pledge && pledge.renewalRequired);
    if (inherited) {
      return { piety:0, prestige:0, inherited:true, fulfilled:false, broken:false };
    }
    var terms = pledge && pledge.vowTerms;
    var fulfilled = !!(terms && terms.mustered && terms.served >= terms.seasons);
    var broken = !fulfilled;
    var multiplier = broken ? 2 : 1;
    if (FB.traitBonus) {
      var current = state && state.player && state.chars &&
        state.chars[state.player.charId];
      multiplier *= 1 + (FB.traitBonus(current, 'vow', 'withdrawalPenalty') || 0);
    }
    if (FB.campaignModBonus) {
      multiplier *= Math.max(0, 1 + FB.campaignModBonus(state, 'withdrawalPenalty'));
    }
    return {
      piety:Math.round(B('greatHolyWarWithdrawPiety', 100) * multiplier),
      prestige:Math.round(B('greatHolyWarWithdrawPrestige', 50) * multiplier),
      inherited:false,
      fulfilled:fulfilled,
      broken:broken
    };
  };

  FB.withdrawGreatHolyWar = function (state) {
    var campaign = state && state.greatHolyWar;
    var pledge = state && state.player.greatHolyWar;
    if (!campaign || !pledge || pledge.campaignId !== campaign.id || pledge.withdrawn) return false;
    var cost = FB.greatHolyWarWithdrawalCost(state);
    var inherited = cost.inherited;
    var broken = cost.broken;
    if (!inherited) {
      state.player.piety = Math.max(0, state.player.piety - cost.piety);
      state.player.prestige = Math.max(0, state.player.prestige - cost.prestige);
    }
    pledge.withdrawn = true;
    pledge.vow = false;
    pledge.landEligible = false;
    pledge.renewalRequired = false;
    pledge.vowOutcome = inherited ? 'declined' : (broken ? 'broken' : 'fulfilled');
    removeParticipant(campaign, pledge.camp, 'player', !!pledge.mandatory);
    if (FB.syncGreatHolyWarModifiers) FB.syncGreatHolyWarModifiers(state);
    if (FB.validateFocus) FB.validateFocus(state);
    FB.news(state, FB.msg('news.holywar.player_withdraws',
      inherited
        ? '🏳 You decline the inherited vow. Your house’s earlier service remains recorded, but you claim no reward.'
        : '🏳 You abandon the vow. Piety and prestige are forfeit, and your house can claim no land.', {}));
    return true;
  };

  FB.renewGreatHolyWarVow = function (state) {
    var campaign = state && state.greatHolyWar;
    var pledge = state && state.player.greatHolyWar;
    if (!campaign || !pledge || pledge.campaignId !== campaign.id ||
        !pledge.renewalRequired) return false;
    pledge.renewalRequired = false;
    pledge.vow = true;
    pledge.withdrawn = false;
    pledge.landEligible = pledge.inheritedLandEligible !== false;
    pledge.vowOutcome = null;
    delete pledge.inheritedLandEligible;
    if (FB.syncGreatHolyWarModifiers) FB.syncGreatHolyWarModifiers(state);
    FB.news(state, FB.msg('news.holywar.vow_renewed',
      '📯 You renew your predecessor’s vow. The dynasty’s service and claim remain whole.', {}));
    return true;
  };

  FB.greatHolyWarSuccession = function (state) {
    var campaign = state && state.greatHolyWar;
    var pledge = state && state.player.greatHolyWar;
    if (!campaign || !pledge || pledge.campaignId !== campaign.id ||
        pledge.withdrawn || (campaign.phase !== 'preparation' && campaign.phase !== 'active')) {
      return;
    }
    pledge.inheritedLandEligible = pledge.landEligible !== false;
    pledge.landEligible = false;
    pledge.vow = false;
    pledge.renewalRequired = true;
    if (FB.syncGreatHolyWarModifiers) FB.syncGreatHolyWarModifiers(state);
  };

  FB.greatHolyWarCamp = function (state, rid) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || (campaign.phase !== 'preparation' && campaign.phase !== 'active')) {
      return null;
    }
    if (rid === 'player') {
      var personal = FB.playerGreatHolyWarCamp(state);
      if (personal) return personal;
    }
    var top = rid === 'player' ? 'player' : sovereignRealm(state, rid);
    if (participantOf(campaign, 'attackers', top)) return 'attackers';
    if (participantOf(campaign, 'defenders', top)) return 'defenders';
    return null;
  };

  FB.greatHolyWarEnemies = function (state, rid) {
    var campaign = state && state.greatHolyWar;
    var camp = FB.greatHolyWarCamp(state, rid);
    if (!campaign || !camp) return [];
    var enemyCamp = camp === 'attackers' ? 'defenders' : 'attackers';
    var list = campaign.participants[enemyCamp], out = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].sovereign && participantRealmValid(state, list[i]) &&
          out.indexOf(list[i].realm) < 0) out.push(list[i].realm);
    }
    return out;
  };

  /* The first valid enemy realm of a camp — the daily warringMap only ever
     reads greatHolyWarEnemies(...)[0], so it asks once per camp instead of
     building the full validated list per participant per day. */
  FB.greatHolyWarFirstEnemy = function (state, camp) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || !camp) return null;
    var enemyCamp = camp === 'attackers' ? 'defenders' : 'attackers';
    var list = campaign.participants[enemyCamp] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].sovereign && participantRealmValid(state, list[i])) {
        return list[i].realm;
      }
    }
    return null;
  };

  FB.playerGreatHolyWarHostActive = function (state) {
    var campaign = state && state.greatHolyWar;
    var pledge = state && state.player.greatHolyWar;
    if (!campaign || campaign.phase !== 'active' || !FB.isPlayerSovereign(state)) {
      return false;
    }
    var mandatory = participantOf(campaign, 'defenders', 'player');
    if (mandatory && mandatory.mandatory) return true;
    return !!(pledge && pledge.campaignId === campaign.id &&
      pledge.mode === 'host' && !pledge.withdrawn &&
      !pledge.renewalRequired);
  };

  FB.playerGreatHolyWarActive = function (state) {
    var campaign = state && state.greatHolyWar;
    var pledge = state && state.player.greatHolyWar;
    if (campaign && campaign.phase === 'active') {
      var mandatory = participantOf(campaign, 'defenders', 'player');
      if (mandatory && mandatory.mandatory) return true;
    }
    return !!(campaign && campaign.phase === 'active' && pledge &&
      pledge.campaignId === campaign.id && !pledge.withdrawn &&
      !pledge.renewalRequired);
  };

  function pruneParticipants(state, campaign) {
    var camps = ['attackers','defenders'];
    for (var c = 0; c < camps.length; c++) {
      var camp = camps[c], list = campaign.participants[camp], out = [], seen = {};
      for (var i = 0; i < list.length; i++) {
        var part = list[i];
        if (!participantRealmValid(state, part) || seen[part.realm]) continue;
        seen[part.realm] = 1;
        out.push(part);
      }
      campaign.participants[camp] = out;
    }
    var pledge = state.player.greatHolyWar;
    if (pledge && pledge.campaignId === campaign.id && !pledge.withdrawn &&
        !participantOf(campaign, pledge.camp, 'player') && pledge.mode === 'host') {
      pledge.withdrawn = true;
      pledge.landEligible = false;
    }
    if (FB.syncGreatHolyWarModifiers) FB.syncGreatHolyWarModifiers(state);
  }

  function campaignTargetValid(state, campaign) {
    var opposing = 0;
    for (var i = 0; i < campaign.holyCounties.length; i++) {
      if (!countyLost(state, campaign.callingReligion, campaign.holyCounties[i])) return false;
    }
    for (var j = 0; j < campaign.objectiveCounties.length; j++) {
      if (countyLost(state, campaign.callingReligion,
          campaign.objectiveCounties[j])) opposing++;
    }
    return opposing > 0;
  }

  function endOrdinaryWars(state, rid) {
    var top = sovereignRealm(state, rid);
    var pw = state.player.war;
    if (pw) {
      var playerTop = FB.playerRealmId(state), enemyTop = sovereignRealm(state, pw.enemy);
      if (top === playerTop || top === enemyTop || rid === 'player') {
        if (FB.endPlayerWar) FB.endPlayerWar(state);
        else state.player.war = null;
      }
    }
    for (var id in state.realms) {
      var realm = state.realms[id];
      if (!realm || !realm.war) continue;
      if (sovereignRealm(state, id) === top ||
          sovereignRealm(state, realm.war.enemy) === top) realm.war = null;
    }
  }

  function breakCrossCampTies(state, campaign) {
    var campByRealm = {};
    var camps = ['attackers','defenders'];
    for (var c = 0; c < camps.length; c++) {
      var list = campaign.participants[camps[c]];
      for (var i = 0; i < list.length; i++) {
        if (list[i].sovereign) campByRealm[list[i].realm] = camps[c];
      }
    }
    state.alliances = (state.alliances || []).filter(function (alliance) {
      return !(campByRealm[alliance.a] && campByRealm[alliance.b] &&
        campByRealm[alliance.a] !== campByRealm[alliance.b]);
    });
    var playerCamp = campByRealm.player || FB.playerGreatHolyWarCamp(state);
    if (playerCamp && state.pacts) {
      for (var rid in state.pacts) {
        if (campByRealm[rid] && campByRealm[rid] !== playerCamp) delete state.pacts[rid];
      }
    }
  }

  function campaignStrength(state, campaign, camp, current) {
    var list = campaign.participants[camp], total = 0;
    for (var i = 0; i < list.length; i++) {
      var part = list[i];
      if (!part.sovereign || !participantRealmValid(state, part)) continue;
      var host = current && FB.hostOf ? FB.hostOf(state, part.realm) : null;
      total += host ? host.men : paperStrength(state, part.realm) *
        (FB.rearmScale ? FB.rearmScale(state, part.realm) : 1);
    }
    return Math.round(total);
  }

  FB.greatHolyWarStrength = function (state, camp) {
    var campaign = state && state.greatHolyWar;
    return campaign ? campaignStrength(state, campaign, camp,
      campaign.phase === 'active') : 0;
  };

  function collapse(state, reason) {
    var campaign = state.greatHolyWar;
    if (!campaign) return;
    var history = ensureHistory(state);
    history.cooldownUntil[campaign.callingReligion] = state.turn +
      B('greatHolyWarCollapseCooldownDays', 2880);
    var collapsedPledge = playerPledgeFor(state, campaign);
    if (collapsedPledge && !collapsedPledge.vowOutcome) {
      collapsedPledge.vowOutcome = collapsedPledge.renewalRequired
        ? 'unfulfilled' : collapsedPledge.withdrawn
          ? (collapsedPledge.vowOutcome || 'broken') : 'unfulfilled';
    }
    history.campaigns.push({
      id:campaign.id, religion:campaign.callingReligion,
      target:campaign.targetKingdom, outcome:'collapsed', reason:reason, turn:state.turn,
      vowOutcome:collapsedPledge ? collapsedPledge.vowOutcome : null,
      desire:collapsedPledge && collapsedPledge.vowTerms
        ? copyDesire(collapsedPledge.vowTerms.desire) : null,
      settlementContested:false,
      objections:0,
      awards:[]
    });
    if (history.campaigns.length > 24) history.campaigns.shift();
    if (state.player.greatHolyWar &&
        state.player.greatHolyWar.campaignId === campaign.id) {
      state.player.greatHolyWar = null;
    }
    FB.news(state, FB.msg('news.holywar.collapses',
      '🏳 The gathering {campaign} collapses before the banners can march.', {
        campaign:FB.dataParam('religion', campaign.callingReligion,
          'head.greatHolyWar.name')
      }));
    state.greatHolyWar = null;
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  }

  FB.cancelGreatHolyWar = function (state, reason) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || campaign.phase !== 'preparation') return false;
    collapse(state, reason || 'cancelled');
    return true;
  };

  function launch(state, campaign) {
    pruneParticipants(state, campaign);
    var attackers = campaign.participants.attackers, kept = [];
    for (var i = 0; i < attackers.length; i++) {
      if (attackers[i].voluntary && ordinaryWarInvolves(state, attackers[i].realm)) {
        if (attackers[i].realm === 'player' && state.player.greatHolyWar) {
          state.player.greatHolyWar.withdrawn = true;
          state.player.greatHolyWar.landEligible = false;
        }
        continue;
      }
      kept.push(attackers[i]);
    }
    campaign.participants.attackers = kept;
    var defenders = campaign.participants.defenders;
    for (var j = 0; j < defenders.length; j++) {
      if (defenders[j].mandatory) endOrdinaryWars(state, defenders[j].realm);
    }
    pruneParticipants(state, campaign);
    var sovereignAttackers = [];
    for (var k = 0; k < campaign.participants.attackers.length; k++) {
      if (campaign.participants.attackers[k].sovereign) {
        sovereignAttackers.push(campaign.participants.attackers[k].realm);
      }
    }
    var attackStrength = campaignStrength(state, campaign, 'attackers', false);
    var defenseStrength = campaignStrength(state, campaign, 'defenders', false);
    if (!sovereignAttackers.length ||
        (sovereignAttackers.length < 2 && attackStrength < defenseStrength * 0.75)) {
      collapse(state, 'strength');
      return false;
    }
    sovereignAttackers.sort(function (a, b) {
      return (paperStrength(state, b) - paperStrength(state, a)) ||
        (a < b ? -1 : a > b ? 1 : 0);
    });
    campaign.leaderRealm = sovereignAttackers[0];
    campaign.phase = 'active';
    campaign.launchedTurn = state.turn;
    campaign.deadlineTurn = state.turn + B('greatHolyWarDeadlineDays', 2880);
    /* armyTick has already run on the launch day. Queue the second announcement
       on the following tick, after the newly active sovereign hosts have raised. */
    campaign.musterEventPending = true;
    ensureHistory(state).firstLaunched[campaign.callingReligion] = true;
    breakCrossCampTies(state, campaign);
    var launchPledge = state.player.greatHolyWar;
    if (launchPledge && launchPledge.campaignId === campaign.id &&
        !launchPledge.withdrawn && !launchPledge.renewalRequired &&
        launchPledge.vowTerms &&
        (launchPledge.mode === 'liege' || launchPledge.mode === 'expedition')) {
      launchPledge.vowTerms.mustered = true;
    }
    if (FB.playerGreatHolyWarHostActive(state)) {
      if (FB.warFooting) FB.warFooting(state);
      else if (FB.raisePlayerHost) FB.raisePlayerHost(state);
      if (FB.playerHost && FB.playerHost(state)) {
        FB.greatHolyWarMarkMuster(state, 'player');
      }
    }
    FB.news(state, FB.msg('news.holywar.launches',
      '⚔ The {campaign} begins. {leader} takes command of the gathered host.', {
        campaign:FB.dataParam('religion', campaign.callingReligion,
          'head.greatHolyWar.name'),
        leader:realmName(state, campaign.leaderRealm)
      }));
    return true;
  }

  function nearestObjective(state, fromPid, ids) {
    var from = FB.world.byId[fromPid], best = null, bestDistance = Infinity;
    for (var i = 0; i < ids.length; i++) {
      var province = FB.world.byId[ids[i]];
      if (!from || !province) continue;
      var dx = from.cx - province.cx, dy = from.cy - province.cy;
      var distance = dx * dx + dy * dy;
      if (distance < bestDistance ||
          (distance === bestDistance && ids[i] < best)) {
        bestDistance = distance;
        best = ids[i];
      }
    }
    return best;
  }

  FB.greatHolyWarArmyGoal = function (state, rid, fromPid) {
    var campaign = state && state.greatHolyWar;
    var camp = FB.greatHolyWarCamp(state, rid);
    if (!campaign || campaign.phase !== 'active' || !camp) return null;
    var ids = [];
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var pid = campaign.objectiveCounties[i];
      var occupation = campaign.occupations[pid];
      if (camp === 'attackers') {
        if (!occupation || !occupation.occupied) ids.push(pid);
      } else if (occupation && occupation.occupied) {
        ids.push(pid);
      }
    }
    if (ids.length) return nearestObjective(state, fromPid, ids);
    var realm = rid === 'player' ? state.realms.player : state.realms[rid];
    return realm && realm.capital || fromPid;
  };

  function occupationRequirement(state, pid, occupation) {
    occupation = occupation || (state.greatHolyWar &&
      state.greatHolyWar.occupations && state.greatHolyWar.occupations[pid]) || {};
    var fort = FB.fortAt ? FB.fortAt(state, pid) : null;
    var level = occupation.fortLevel !== undefined
      ? Math.max(0, Math.min(4, Number(occupation.fortLevel) || 0))
      : (fort && !fort.ruined ? Number(fort.level) || 0 : 0);
    return B('greatHolyWarSiegeBase', 120) +
      (state.dev[pid] || 1) * B('greatHolyWarSiegePerDev', 10) +
      level * ((FBDATA.forts && FBDATA.forts.holyWarDaysPerLevel) || 90);
  }

  FB.greatHolyWarSiegeRequirement = occupationRequirement;

  function hostsAtByCamp(state, pid) {
    var out = { attackers:[], defenders:[], attackersMen:0, defendersMen:0 };
    var hosts = FB.armiesAt ? FB.armiesAt(state, pid) : [];
    for (var i = 0; i < hosts.length; i++) {
      var camp = FB.greatHolyWarCamp(state, hosts[i].realm);
      if (!camp) continue;
      out[camp].push(hosts[i]);
      out[camp + 'Men'] += hosts[i].men;
    }
    return out;
  }

  function shareOccupationContribution(state, campaign, hosts, men, points) {
    if (!hosts.length || men <= 0) return;
    for (var i = 0; i < hosts.length; i++) {
      addContribution(state, campaign, hosts[i].realm, points * hosts[i].men / men);
    }
  }

  function occupationTick(state, campaign) {
    var changed = false;
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var pid = campaign.objectiveCounties[i];
      var occupation = campaign.occupations[pid];
      if (!occupation) {
        occupation = { occupied:false, progress:0, progressCamp:null, occupiedBy:null };
        campaign.occupations[pid] = occupation;
      }
      var present = hostsAtByCamp(state, pid);
      if (present.attackersMen && present.defendersMen) continue;
      var camp = present.attackersMen ? 'attackers'
        : (present.defendersMen ? 'defenders' : null);
      var canWork = (camp === 'attackers' && !occupation.occupied) ||
        (camp === 'defenders' && occupation.occupied);
      if (!canWork) {
        continue;
      }
      if (occupation.progressCamp && occupation.progressCamp !== camp) {
        occupation.progress = 0;
        delete occupation.fortLevel;
      }
      occupation.progressCamp = camp;
      var men = present[camp + 'Men'];
      if (occupation.fortLevel === undefined) {
        var activeFort = FB.fortAt ? FB.fortAt(state, pid) : null;
        occupation.fortLevel = activeFort && !activeFort.ruined
          ? Number(activeFort.level) || 0 : 0;
      }
      if (FB.fortSiegeStatus) {
        var strongpoint = FB.fortSiegeStatus(state, pid, occupation,
          present[camp]);
        if (!strongpoint.canProgress) continue;
      }
      var rate = FB.clamp(men /
        ((state.dev[pid] || 1) * B('greatHolyWarSiegeMenPerDev', 27)),
        B('greatHolyWarSiegeMinRate', 0.5),
        B('greatHolyWarSiegeMaxRate', 2));
      var siegeBonus = 0;
      var campHosts = present[camp] || [];
      for (var siegeHostIndex = 0; siegeHostIndex < campHosts.length; siegeHostIndex++) {
        siegeBonus = Math.max(siegeBonus,
          FB.techBonus ? FB.techBonus(state, 'siege', campHosts[siegeHostIndex].realm) : 0);
      }
      rate *= 1 + siegeBonus;
      occupation.progress += rate;
      changed = true;
      if (occupation.progress < occupationRequirement(state, pid, occupation)) continue;
      var points = 10 + (state.dev[pid] || 1) * 2;
      occupation.progress = 0;
      occupation.progressCamp = null;
      delete occupation.fortLevel;
      if (camp === 'attackers') {
        occupation.occupied = true;
        occupation.occupiedBy = present.attackers.slice().sort(function (a, b) {
          return b.men - a.men || (a.realm < b.realm ? -1 : 1);
        })[0].realm;
        campaign.resolve = FB.clamp(campaign.resolve +
          B('greatHolyWarOccupationResolve', 5), -100, 100);
        shareOccupationContribution(state, campaign, present.attackers,
          present.attackersMen, points);
        FB.news(state, FB.msg('news.holywar.occupied',
          '🏰 {province} falls to the attacking camp.', {
            province:FB.world.byId[pid].name
          }));
      } else {
        occupation.occupied = false;
        occupation.occupiedBy = null;
        campaign.resolve = FB.clamp(campaign.resolve -
          B('greatHolyWarOccupationResolve', 5), -100, 100);
        shareOccupationContribution(state, campaign, present.defenders,
          present.defendersMen, points);
        FB.news(state, FB.msg('news.holywar.recaptured',
          '🏳 {province} is relieved and returns to the defending camp.', {
            province:FB.world.byId[pid].name
          }));
      }
    }
    if (changed && FB.map) FB.map.request();
  }

  function attackerVictoryReady(state, campaign) {
    var occupiedCount = 0, occupiedDev = 0, objectiveDev = 0;
    for (var i = 0; i < campaign.holyCounties.length; i++) {
      var holyOccupation = campaign.occupations[campaign.holyCounties[i]];
      if (!holyOccupation || !holyOccupation.occupied) return false;
    }
    for (var j = 0; j < campaign.objectiveCounties.length; j++) {
      var pid = campaign.objectiveCounties[j], dev = state.dev[pid] || 1;
      objectiveDev += dev;
      if (campaign.occupations[pid] && campaign.occupations[pid].occupied) {
        occupiedCount++;
        occupiedDev += dev;
      }
    }
    return occupiedCount >= Math.ceil(campaign.objectiveCounties.length / 2) &&
      occupiedDev >= objectiveDev * 0.6;
  }

  FB.greatHolyWarBattle = function (state, pid, winner, loser, winnerLoss, loserLoss) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || campaign.phase !== 'active') return false;
    var winnerCamp = FB.greatHolyWarCamp(state, winner.realm);
    var loserCamp = FB.greatHolyWarCamp(state, loser.realm);
    if (!winnerCamp || !loserCamp || winnerCamp === loserCamp) return false;
    campaign.resolve = FB.clamp(campaign.resolve +
      (winnerCamp === 'attackers' ? 1 : -1) *
      B('greatHolyWarBattleResolve', 10), -100, 100);
    addContribution(state, campaign, winner.realm, 5 + Math.floor((loserLoss || 0) / 100));
    if (loser.men > 0) addContribution(state, campaign, loser.realm, 1);
    if (winner.realm === 'player' || loser.realm === 'player') {
      state.eventQueue.push({
        id:winner.realm === 'player'
          ? 'ghw_field_battle_won' : 'ghw_field_battle_lost',
        ctx:{ pid:pid, enemyId:winner.realm === 'player' ? loser.realm : winner.realm }
      });
    } else if (FB.game.observe) {
      FB.news(state, FB.msg('news.holywar.battle',
        '⚔ Battle at {province}: {winner} breaks {loser} in the great holy war.', {
          province:FB.world.byId[pid] ? FB.world.byId[pid].name : '',
          winner:realmName(state, winner.realm),
          loser:realmName(state, loser.realm)
        }));
    }
    return true;
  };

  function participantKeys(campaign, camp) {
    var list = campaign.participants[camp], out = [];
    for (var i = 0; i < list.length; i++) {
      if (out.indexOf(list[i].realm) < 0) out.push(list[i].realm);
    }
    return out;
  }

  function totalContribution(campaign, camp) {
    var ids = participantKeys(campaign, camp), total = 0;
    for (var i = 0; i < ids.length; i++) total += contribution(campaign, ids[i]);
    return total;
  }

  FB.greatHolyWarPlayerShare = function (state) {
    var campaign = state && state.greatHolyWar;
    var pledge = state && state.player.greatHolyWar;
    if (!campaign || !pledge || pledge.campaignId !== campaign.id) return 0;
    var total = totalContribution(campaign, pledge.camp);
    return total > 0 ? contribution(campaign, 'player') / total : 0;
  };

  function completeCapturedDuchies(captured) {
    var capturedMap = {}, out = [];
    for (var i = 0; i < captured.length; i++) capturedMap[captured[i]] = 1;
    for (var did in FBDATA.duchies) {
      var counties = FB.duchyCounties(did);
      if (!counties.length) continue;
      var complete = true;
      for (var j = 0; j < counties.length; j++) {
        if (!capturedMap[counties[j]]) { complete = false; break; }
      }
      if (complete) out.push({ duchy:did, counties:counties.slice() });
    }
    return out;
  }

  FB.greatHolyWarPlayerRewardBand = function (state) {
    var campaign = state && state.greatHolyWar;
    var pledge = state && state.player.greatHolyWar;
    if (!campaign || !pledge || pledge.campaignId !== campaign.id) return 'none';
    var settlement = campaign.settlement;
    if (settlement && settlement.pendingPlayer && settlement.pendingPlayer.kind) {
      return settlement.pendingPlayer.kind;
    }
    var settlementCase = settlement && settlement.case;
    if (settlementCase) {
      for (var i = 0; i < settlementCase.awards.length; i++) {
        var award = settlementCase.awards[i];
        if (award.claimant !== 'player') continue;
        for (var a = 0; a < settlementCase.assets.length; a++) {
          var asset = settlementCase.assets[a];
          if (asset.id !== award.asset || asset.kind === 'sacred') continue;
          return asset.kind === 'crown'
            ? (asset.rank >= 3 ? 'kingdom' : asset.rank === 2 ? 'duchy' : 'county')
            : asset.kind;
        }
      }
    }
    var projection = FB.greatHolyWarPlayerClaimProjection
      ? FB.greatHolyWarPlayerClaimProjection(state) : null;
    if (!projection || projection.likely === false) return 'honor';
    return projection.kind === 'crown'
      ? (projection.rank >= 3 ? 'kingdom' : projection.rank === 2 ? 'duchy' : 'county')
      : projection.kind;
  };

  FB.greatHolyWarMarkMuster = function (state, rid) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || campaign.phase !== 'active' || !rid) return false;
    if (rid === 'player') {
      var pledge = playerPledgeFor(state, campaign);
      if (!pledge || pledge.withdrawn || pledge.renewalRequired ||
          !pledge.vowTerms) return false;
      pledge.vowTerms.mustered = true;
      return true;
    }
    var participant = participantOf(campaign, 'attackers', rid);
    if (!participant) return false;
    participant.mustered = true;
    return true;
  };

  function highestDevelopment(state, ids, excluded) {
    var best = null, bestDev = -1;
    for (var i = 0; i < ids.length; i++) {
      if (excluded && excluded[ids[i]]) continue;
      var dev = state.dev[ids[i]] || 1;
      if (dev > bestDev || (dev === bestDev && ids[i] < best)) {
        best = ids[i];
        bestDev = dev;
      }
    }
    return best;
  }

  function sponsorIdentity(state, sponsor) {
    if (sponsor === 'player') {
      var character = state.chars[state.player.charId];
      return {
        culture:character ? character.culture : 'frankish',
        dynasty:character ? (character.dyn || character.name) : 'player'
      };
    }
    var realm = state.realms[sponsor];
    return {
      culture:realm && realm.ruler ? realm.ruler.culture : 'frankish',
      dynasty:realm && (realm.dynasty || (realm.ruler && realm.ruler.name)) || sponsor
    };
  }

  function uniqueRealmId(state, base) {
    var id = base, n = 2;
    while (state.realms[id]) { id = base + '_' + n; n++; }
    return id;
  }

  function makeCampaignRealm(state, campaign, sponsor, rank, capital, liege, suffix) {
    var identity = sponsorIdentity(state, sponsor);
    var kingdom = FBDATA.kingdoms[campaign.targetKingdom];
    var dejure = FB.dejureOf(capital);
    var name = rank >= 3
      ? 'Kingdom of ' + (kingdom ? kingdom.name : campaign.targetKingdom)
      : rank === 2
        ? 'Duchy of ' + (dejure.duchy && FBDATA.duchies[dejure.duchy]
          ? FBDATA.duchies[dejure.duchy].name : FB.world.byId[capital].name)
        : 'County of ' + FB.world.byId[capital].name;
    var id = uniqueRealmId(state, campaign.id + '_' + (suffix || 'realm'));
    var realm = FB.makeVassalRealm(state, {
      id:id, name:name, capital:capital, rank:rank, liege:liege || null,
      culture:identity.culture, religion:campaign.callingReligion
    });
    realm.rank = rank;
    realm.liege = liege || null;
    realm.religion = campaign.callingReligion;
    realm.dynasty = identity.dynasty;
    realm.sponsorRealm = sponsor;
    realm.color = rank >= 3 ? '#b99035' : realm.color;
    return realm;
  }

  function grantCaptured(state, pid, sovereignId, holderId) {
    FB.transferProvince(state, pid, sovereignId);
    state.owner[pid] = sovereignId;
    state.holder[pid] = holderId || sovereignId;
    FB.invalidateRealmCache();
  }

  function settleAiRealm(state, campaign, settlement, sponsorOverride) {
    if (settlement.mainRealmId && state.realms[settlement.mainRealmId]) {
      return state.realms[settlement.mainRealmId];
    }
    var sponsor = sponsorOverride || settlement.sovereign.sponsor;
    var main = makeCampaignRealm(state, campaign, sponsor,
      settlement.sovereign.rank, settlement.capital, null, 'crown');
    settlement.mainRealmId = main.id;
    for (var i = 0; i < settlement.captured.length; i++) {
      grantCaptured(state, settlement.captured[i], main.id, main.id);
    }
    for (var j = 0; j < settlement.allocations.length; j++) {
      var allocation = settlement.allocations[j];
      if (allocation.sponsor === 'player') continue;
      var vassal = makeCampaignRealm(state, campaign, allocation.sponsor,
        allocation.rank, allocation.counties[0], main.id, 'award_' + j);
      allocation.realmId = vassal.id;
      for (var k = 0; k < allocation.counties.length; k++) {
        state.owner[allocation.counties[k]] = main.id;
        state.holder[allocation.counties[k]] = vassal.id;
      }
    }
    FB.invalidateRealmCache();
    return main;
  }

  function playerLandEligible(state, campaign) {
    var pledge = state.player.greatHolyWar;
    return !!(pledge && pledge.campaignId === campaign.id &&
      pledge.camp === 'attackers' && pledge.landEligible !== false &&
      !pledge.withdrawn);
  }

  function capturedCounties(campaign) {
    var captured = [];
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var pid = campaign.objectiveCounties[i];
      if (campaign.occupations[pid] && campaign.occupations[pid].occupied) {
        captured.push(pid);
      }
    }
    return captured;
  }

  function developmentTotal(state, ids) {
    var total = 0;
    for (var i = 0; i < ids.length; i++) total += state.dev[ids[i]] || 1;
    return total;
  }

  function localHolderInfo(state, campaign, ids) {
    var seen = {}, out = [];
    for (var i = 0; i < ids.length; i++) {
      var rid = (state.holder && state.holder[ids[i]]) || state.owner[ids[i]];
      if (!rid || seen[rid] || !state.realms[rid] ||
          !state.realms[rid].alive ||
          !FB.faithInFold(state, campaign.callingReligion,
            FB.realmReligionId(state, rid))) continue;
      seen[rid] = 1;
      var territory = FB.realmTerritory(state, rid).slice();
      var intact = territory.length > 0;
      for (var t = 0; t < territory.length; t++) {
        if (ids.indexOf(territory[t]) < 0) { intact = false; break; }
      }
      out.push({
        realm:rid,
        intact:intact,
        territory:territory,
        counties:ids.filter(function (pid) {
          return ((state.holder && state.holder[pid]) || state.owner[pid]) === rid;
        })
      });
    }
    return out;
  }

  function confirmableCounty(state, campaign, pid) {
    var locals = localHolderInfo(state, campaign, [pid]);
    for (var i = 0; i < locals.length; i++) if (locals[i].intact) return true;
    return false;
  }

  function settlementSeat(state, campaign, captured) {
    var holy = [], ordinary = [], holyAny = [];
    for (var i = 0; i < captured.length; i++) {
      var pid = captured[i], sacred = campaign.holyCounties.indexOf(pid) >= 0;
      if (!confirmableCounty(state, campaign, pid)) {
        (sacred ? holy : ordinary).push(pid);
      }
      if (sacred) holyAny.push(pid);
    }
    return highestDevelopment(state, holy.length ? holy :
      ordinary.length ? ordinary : holyAny.length ? holyAny : captured);
  }

  function buildCouncilAssets(state, campaign) {
    var captured = capturedCounties(campaign);
    if (!captured.length) return [];
    var complete = completeCapturedDuchies(captured);
    complete.sort(function (a, b) {
      return (developmentTotal(state, b.counties) -
        developmentTotal(state, a.counties)) ||
        (a.duchy < b.duchy ? -1 : a.duchy > b.duchy ? 1 : 0);
    });
    var kingdomMajority = captured.length >=
      Math.ceil(FB.kingdomCounties(campaign.targetKingdom).length / 2);
    var rank = kingdomMajority ? 3 : complete.length ? 2 : 1;
    var seat = settlementSeat(state, campaign, captured);
    var assets = [{
      id:'crown',
      kind:'crown',
      ids:captured.slice(),
      awardIds:[seat],
      rank:rank,
      land:true,
      seat:seat,
      kingdomMajority:kingdomMajority
    }];
    var sites = [];
    for (var h = 0; h < campaign.holyCounties.length; h++) {
      if (captured.indexOf(campaign.holyCounties[h]) >= 0) {
        sites.push(campaign.holyCounties[h]);
      }
    }
    if (sites.length) {
      assets.push({
        id:'sacred',
        kind:'sacred',
        ids:sites.slice(),
        siteIds:sites.slice(),
        awardIds:[],
        rank:0,
        land:false
      });
    }
    var assigned = {};
    assigned[seat] = 1;
    for (var d = 0; d < complete.length; d++) {
      var duchy = complete[d], available = duchy.counties.indexOf(seat) < 0;
      for (var dc = 0; dc < duchy.counties.length && available; dc++) {
        if (assigned[duchy.counties[dc]] ||
            confirmableCounty(state, campaign, duchy.counties[dc])) {
          available = false;
        }
      }
      if (!available) continue;
      assets.push({
        id:'duchy:' + duchy.duchy,
        kind:'duchy',
        titleId:duchy.duchy,
        ids:duchy.counties.slice(),
        awardIds:duchy.counties.slice(),
        rank:2,
        land:true
      });
      for (var dm = 0; dm < duchy.counties.length; dm++) {
        assigned[duchy.counties[dm]] = 1;
      }
    }
    var counties = captured.filter(function (pid) { return !assigned[pid]; });
    counties.sort(function (a, b) {
      return ((state.dev[b] || 1) - (state.dev[a] || 1)) ||
        (a < b ? -1 : a > b ? 1 : 0);
    });
    for (var c = 0; c < counties.length; c++) {
      assets.push({
        id:'county:' + counties[c],
        kind:'county',
        titleId:counties[c],
        ids:[counties[c]],
        awardIds:[counties[c]],
        rank:1,
        land:true
      });
    }
    return assets;
  }

  function playerPledgeFor(state, campaign) {
    var pledge = state.player.greatHolyWar;
    return pledge && pledge.campaignId === campaign.id ? pledge : null;
  }

  function markVowOutcomes(state, campaign) {
    var pledge = playerPledgeFor(state, campaign);
    if (pledge && !pledge.vowOutcome) {
      if (pledge.withdrawn) pledge.vowOutcome = 'broken';
      else if (pledge.renewalRequired) pledge.vowOutcome = 'unfulfilled';
      else if (pledge.vowTerms && pledge.vowTerms.mustered) {
        pledge.vowOutcome = 'fulfilled';
      } else {
        pledge.vowOutcome = 'unfulfilled';
      }
    }
    var attackers = campaign.participants.attackers || [];
    for (var i = 0; i < attackers.length; i++) {
      var part = attackers[i];
      if (part.realm === 'player' || part.vowOutcome) continue;
      part.vowOutcome = part.mustered ? 'fulfilled' : 'unfulfilled';
    }
  }

  function priorBrokenVows(state) {
    var campaigns = ensureHistory(state).campaigns, count = 0;
    for (var i = 0; i < campaigns.length; i++) {
      if (campaigns[i] && campaigns[i].vowOutcome === 'broken') count++;
    }
    return count;
  }

  function desireFor(state, campaign, claimant) {
    if (claimant === 'player') {
      var pledge = playerPledgeFor(state, campaign);
      return pledge && pledge.vowTerms
        ? pledge.vowTerms.desire : { kind:'neutral', id:null };
    }
    var participant = participantOf(campaign, 'attackers', claimant);
    return participant && participant.desire
      ? participant.desire : { kind:'neutral', id:null };
  }

  function vowFulfilled(state, campaign, claimant, projected) {
    if (claimant === 'player') {
      var pledge = playerPledgeFor(state, campaign);
      if (!pledge || pledge.withdrawn || pledge.renewalRequired) return false;
      if (projected) return !!(pledge.vowTerms && pledge.vowTerms.mustered);
      return pledge.vowOutcome === 'fulfilled';
    }
    var participant = participantOf(campaign, 'attackers', claimant);
    if (!participant) return false;
    return projected ? !!participant.mustered :
      participant.vowOutcome === 'fulfilled';
  }

  function desireScore(state, campaign, claimant, asset, projected) {
    if (!vowFulfilled(state, campaign, claimant, projected)) return 0;
    var desire = desireFor(state, campaign, claimant);
    if (!desire || desire.kind === 'neutral') return 0.5;
    if (desire.kind === 'county' && asset.land &&
        asset.kind !== 'crown' && asset.ids.indexOf(desire.id) >= 0) return 1;
    var exact = desire.kind === asset.kind;
    if (exact && (desire.kind !== 'duchy' ||
        desire.id === asset.titleId) &&
        (desire.kind !== 'county' || asset.ids.indexOf(desire.id) >= 0)) {
      return 1;
    }
    if (asset.kind === 'county' && desire.kind === 'duchy' &&
        FB.dejureOf(asset.ids[0]).duchy === desire.id) return 0.75;
    return 0.25;
  }

  function claimantIdentity(state, claimant, sourceRealm) {
    if (claimant === 'player') {
      var pc = state.chars[state.player.charId];
      return {
        culture:pc && pc.culture,
        religion:pc && pc.religion,
        trait:pc && pc.traits && pc.traits[0]
      };
    }
    var rid = sourceRealm || claimant;
    var realm = state.realms[rid];
    return {
      culture:realm && realm.ruler && realm.ruler.culture,
      religion:realm && FB.realmReligionId(state, rid),
      trait:realm && realm.ruler && realm.ruler.trait
    };
  }

  function supportScore(state, asset, identity) {
    var total = 0, matched = 0;
    for (var i = 0; i < asset.ids.length; i++) {
      var pid = asset.ids[i], province = FB.world.byId[pid];
      var dev = state.dev[pid] || 1;
      total += dev;
      if (province && FB.faithInFold(state, province.religion,
          identity.religion)) matched += dev * 0.5;
      if (province && province.culture === identity.culture) matched += dev * 0.5;
    }
    return total ? matched / total : 0;
  }

  function occupationScore(campaign, asset, claimant) {
    var occupied = 0;
    for (var i = 0; i < asset.ids.length; i++) {
      var row = campaign.occupations[asset.ids[i]];
      if (row && row.occupiedBy === claimant) occupied++;
    }
    return asset.ids.length ? occupied / asset.ids.length : 0;
  }

  function rightScore(state, campaign, asset, claimant, local) {
    if (local && local.intact) return 1;
    if (local) return 0.5;
    if (claimant !== 'player') return 0;
    var claim = state.player.fabricatedClaim;
    var claimPid = typeof claim === 'string' ? claim : claim && claim.pid;
    if (claimPid && asset.ids.indexOf(claimPid) >= 0) {
      return asset.kind === 'county' ? 1 : 0.75;
    }
    var c = state.chars[state.player.charId];
    var restoration = c && c.restorationRight;
    if (restoration && restoration.realmId) {
      var restored = 0;
      for (var i = 0; i < asset.ids.length; i++) {
        if (state.owner[asset.ids[i]] === restoration.realmId) restored++;
      }
      if (restored) return restored / asset.ids.length;
    }
    return 0;
  }

  function officeScore(state, campaign, claimant, identity) {
    var standing = claimant === 'player'
      ? FB.clamp((state.player.piety || 0) / 500, 0, 1)
      : identity.trait === 'zealous' ? 1 : identity.trait === 'cynical' ? 0 : 0.5;
    var service = 0, mode = null;
    if (claimant === 'player') {
      var pledge = playerPledgeFor(state, campaign);
      mode = pledge && pledge.mode;
    } else if (participantOf(campaign, 'attackers', claimant)) {
      mode = 'host';
    }
    if (mode === 'host') service = 1;
    else if (mode === 'liege') service = 0.5;
    else if (mode === 'expedition') service = 0.25;
    return standing * 0.6 + service * 0.4;
  }

  function councilClaimants(state, campaign, asset, headId) {
    var out = [], byId = {};
    function add(record) {
      if (!record || !record.claimant ||
          (asset.land && record.claimant === headId)) return;
      var old = byId[record.claimant];
      if (old) {
        if (record.confirmation) old.confirmation = true;
        if (record.local) old.local = record.local;
        return;
      }
      byId[record.claimant] = record;
      out.push(record);
    }
    var attackers = campaign.participants.attackers || [];
    for (var i = 0; i < attackers.length; i++) {
      var part = attackers[i];
      if (!participantRealmValid(state, part)) continue;
      if (asset.land && part.realm === 'player' &&
          !playerLandEligible(state, campaign)) continue;
      add({
        claimant:part.realm,
        realmId:part.realm,
        realmRank:part.realm === 'player'
          ? (state.realms.player ? state.realms.player.rank : 0)
          : (state.realms[part.realm] ? state.realms[part.realm].rank : 0)
      });
    }
    if (asset.land && asset.kind !== 'crown') {
      var locals = localHolderInfo(state, campaign, asset.awardIds);
      for (var l = 0; l < locals.length; l++) {
        var local = locals[l];
        if (local.intact) {
          add({
            claimant:local.realm,
            realmId:local.realm,
            realmRank:state.realms[local.realm].rank || asset.rank,
            confirmation:true,
            local:local,
            opinionRealm:local.realm
          });
        } else {
          add({
            claimant:'local:' + local.realm + ':' + asset.id,
            realmId:null,
            realmRank:asset.rank,
            localCadet:true,
            sourceRealm:local.realm,
            local:local,
            opinionRealm:local.realm
          });
        }
      }
    }
    return out;
  }

  function buildCouncilSpec(state, campaign, projected) {
    var assets = buildCouncilAssets(state, campaign);
    var head = FB.religiousHeadOf(state, campaign.callingReligion);
    var headId = head && head.id;
    var seats = [], attackers = campaign.participants.attackers || [];
    for (var i = 0; i < attackers.length; i++) {
      if (attackers[i].sovereign &&
          seats.indexOf(attackers[i].realm) < 0) seats.push(attackers[i].realm);
    }
    if (headId && seats.indexOf(headId) < 0) seats.push(headId);
    var claims = [], total = totalContribution(campaign, 'attackers');
    var pledge = playerPledgeFor(state, campaign);
    if (pledge && pledge.vowTerms && pledge.vowTerms.beneficiary &&
        !eligibleBeneficiary(state, pledge.vowTerms.beneficiary)) {
      pledge.vowTerms.beneficiary = null;
    }
    for (var a = 0; a < assets.length; a++) {
      var asset = assets[a];
      var claimants = councilClaimants(state, campaign, asset, headId);
      /* A victorious religious head cannot take land personally. If attrition
         leaves no other crown claimant, seat a campaign cadet so the required
         sovereign title can still be awarded and the settlement can finish. */
      if (asset.kind === 'crown' && !claimants.length) {
        var cadetSponsor = campaign.leaderRealm || campaign.callerRealm;
        claimants.push({
          claimant:'local:' + cadetSponsor + ':' + asset.id,
          realmId:null,
          realmRank:asset.rank,
          localCadet:true,
          sourceRealm:cadetSponsor,
          opinionRealm:cadetSponsor
        });
      }
      for (var c = 0; c < claimants.length; c++) {
        var row = claimants[c], identity = claimantIdentity(
          state, row.claimant, row.sourceRealm);
        var basis = {
          contribution:total > 0 && row.claimant.indexOf('local:') !== 0
            ? contribution(campaign, row.claimant) / total : 0,
          vow:row.claimant.indexOf('local:') === 0 ? 0 :
            desireScore(state, campaign, row.claimant, asset, projected),
          occupation:occupationScore(campaign, asset, row.claimant),
          right:rightScore(state, campaign, asset, row.claimant, row.local),
          support:supportScore(state, asset, identity),
          office:row.claimant.indexOf('local:') === 0 ? 0 :
            officeScore(state, campaign, row.claimant, identity)
        };
        if (row.claimant === 'player' && basis.vow > 0) {
          basis.vow *= Math.max(0.5, 1 - priorBrokenVows(state) * 0.15);
        }
        if (row.claimant === 'player' && basis.vow > 0 && FB.traitBonus) {
          var playerChar = state.chars[state.player.charId];
          basis.vow = FB.clamp(basis.vow *
            (1 + (FB.traitBonus(playerChar, 'vow', 'claim') || 0)), 0, 1);
        }
        claims.push({
          claimant:row.claimant,
          asset:asset.id,
          basis:basis,
          realmId:row.realmId,
          realmRank:row.realmRank,
          confirmation:!!row.confirmation,
          localCadet:!!row.localCadet,
          sourceRealm:row.sourceRealm || null,
          opinionRealm:row.opinionRealm || row.realmId,
          beneficiary:row.claimant === 'player' && asset.land &&
            asset.kind !== 'crown' && pledge && pledge.vowTerms
              ? pledge.vowTerms.beneficiary || null : null
        });
      }
    }
    return {
      kind:'holy_war',
      seats:seats,
      assets:assets,
      claims:claims,
      playerHead:headId === 'player',
      playerDiplomacy:FB.skillOf(state.chars[state.player.charId], 'dip')
    };
  }

  function preBlessAiHead(state, campaign, settlementCase) {
    var head = FB.religiousHeadOf(state, campaign.callingReligion);
    if (!head || head.id === 'player' || settlementCase.blessingUsed) return;
    var assetId = null;
    for (var i = 0; i < settlementCase.assets.length; i++) {
      if (settlementCase.assets[i].kind === 'sacred') {
        assetId = settlementCase.assets[i].id;
        break;
      }
    }
    if (!assetId && settlementCase.assets.length) assetId = settlementCase.assets[0].id;
    var best = null;
    for (var c = 0; c < settlementCase.claims.length; c++) {
      var claim = settlementCase.claims[c];
      if (claim.asset !== assetId || claim.claimant === head.id) continue;
      if (!best || claim.weight > best.weight ||
          (claim.weight === best.weight && claim.claimant < best.claimant)) best = claim;
    }
    if (!best) return;
    best.blessing = 0.10;
    settlementCase.blessingUsed = true;
    settlementCase.blessed = {
      asset:assetId, claimant:best.claimant, amount:0.10, automatic:true
    };
  }

  function buildCouncilSettlement(state, campaign) {
    var spec = buildCouncilSpec(state, campaign, false);
    var settlementCase = FB.settlement.create(spec);
    settlementCase.playerDiplomacy = spec.playerDiplomacy;
    preBlessAiHead(state, campaign, settlementCase);
    return {
      schema:2,
      case:settlementCase,
      captured:capturedCounties(campaign),
      applied:false,
      pendingPlayer:null,
      awardRealms:{}
    };
  }

  FB.greatHolyWarPlayerClaimProjection = function (state) {
    var campaign = state && state.greatHolyWar;
    if (!campaign) return null;
    var settlement = campaign.settlement;
    var settlementCase = settlement && settlement.case;
    if (!settlementCase) {
      var spec = buildCouncilSpec(state, campaign, true);
      settlementCase = FB.settlement.create(spec);
      preBlessAiHead(state, campaign, settlementCase);
    } else {
      settlementCase = JSON.parse(JSON.stringify(settlementCase));
    }
    while (settlementCase.status === 'open') {
      FB.settlement.act(state, settlementCase, 'acquiesce');
    }
    for (var awardedIndex = 0;
         awardedIndex < settlementCase.awards.length; awardedIndex++) {
      var projectedAward = settlementCase.awards[awardedIndex];
      if (projectedAward.claimant !== 'player') continue;
      var projectedAsset = caseAsset(settlementCase, projectedAward.asset);
      if (!projectedAsset) continue;
      var winningClaim = awardClaim(settlementCase, projectedAward);
      return {
        asset:projectedAsset.id,
        kind:projectedAsset.kind,
        rank:projectedAsset.rank,
        weight:winningClaim
          ? winningClaim.weight + (winningClaim.blessing || 0) : 0,
        basis:winningClaim ? winningClaim.basis : {},
        likely:true
      };
    }
    var best = null;
    for (var i = 0; i < settlementCase.claims.length; i++) {
      var claim = settlementCase.claims[i];
      if (claim.claimant !== 'player') continue;
      var asset = null;
      for (var a = 0; a < settlementCase.assets.length; a++) {
        if (settlementCase.assets[a].id === claim.asset) {
          asset = settlementCase.assets[a];
          break;
        }
      }
      if (!asset) continue;
      if (!best || claim.weight > best.weight) {
        best = {
          asset:asset.id,
          kind:asset.kind,
          rank:asset.rank,
          weight:claim.weight,
          basis:claim.basis,
          likely:false
        };
      }
    }
    return best;
  };

  function nonLandReward(state, campaign) {
    var score = contribution(campaign, 'player');
    if (!score) return;
    state.player.piety += Math.round(40 + score * 2);
    state.player.prestige += Math.round(20 + score);
  }

  function finalize(state, campaign) {
    var history = ensureHistory(state);
    var pledge = playerPledgeFor(state, campaign);
    var settlementCase = campaign.settlement && campaign.settlement.case;
    var vows = [], attackers = campaign.participants.attackers || [];
    for (var i = 0; i < attackers.length; i++) {
      var part = attackers[i];
      vows.push({
        claimant:part.realm,
        outcome:part.realm === 'player' && pledge
          ? pledge.vowOutcome || null : part.vowOutcome || null,
        seasons:part.realm === 'player' && pledge && pledge.vowTerms
          ? pledge.vowTerms.seasons : part.vowSeasons || null,
        served:part.realm === 'player' && pledge && pledge.vowTerms
          ? pledge.vowTerms.served : part.served || 0,
        desire:part.realm === 'player' && pledge && pledge.vowTerms
          ? copyDesire(pledge.vowTerms.desire) : copyDesire(part.desire)
      });
    }
    var alreadyRecorded = false;
    for (var recordedIndex = 0;
         recordedIndex < history.campaigns.length; recordedIndex++) {
      if (history.campaigns[recordedIndex] &&
          history.campaigns[recordedIndex].id === campaign.id) {
        alreadyRecorded = true;
        break;
      }
    }
    if (!alreadyRecorded) {
      history.campaigns.push({
        id:campaign.id, religion:campaign.callingReligion,
        target:campaign.targetKingdom,
        outcome:campaign.result ? campaign.result.outcome : 'unknown',
        reason:campaign.result ? campaign.result.reason : null,
        turn:state.turn,
        vowOutcome:pledge ? pledge.vowOutcome || null : null,
        desire:pledge && pledge.vowTerms
          ? copyDesire(pledge.vowTerms.desire) : null,
        vows:vows,
        settlementContested:!!(settlementCase && settlementCase.contested),
        objections:settlementCase ? settlementCase.objections || 0 : 0,
        awards:councilAwardSummary(settlementCase)
      });
      if (history.campaigns.length > 24) history.campaigns.shift();
    }
    if (state.player.greatHolyWar &&
        state.player.greatHolyWar.campaignId === campaign.id) {
      state.player.greatHolyWar = null;
    }
    state.greatHolyWar = null;
    if (FB.validateFocus) FB.validateFocus(state);
    FB.invalidateRealmCache();
    if (FB.checkTierPromotions) FB.checkTierPromotions(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  }

  FB.resolveGreatHolyWar = function (state, outcome, reason) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || campaign.phase === 'settlement') return false;
    outcome = outcome === 'attackers' ? 'attackers' : 'defenders';
    campaign.phase = 'settlement';
    if (FB.syncGreatHolyWarModifiers) FB.syncGreatHolyWarModifiers(state);
    campaign.result = { outcome:outcome, reason:reason || 'resolve', turn:state.turn };
    markVowOutcomes(state, campaign);
    if (FB.validateFocus) FB.validateFocus(state);
    ensureHistory(state).cooldownUntil[campaign.callingReligion] = state.turn +
      B('greatHolyWarCooldownDays', 6480);
    if (outcome === 'attackers') {
      campaign.settlement = buildCouncilSettlement(state, campaign);
      FB.news(state, FB.msg('news.holywar.victory',
        '👑 The attacking camp wins the {campaign}. A settlement council convenes over the occupied lands.', {
          campaign:FB.dataParam('religion', campaign.callingReligion,
            'head.greatHolyWar.name')
        }));
      advanceCouncil(state, campaign);
      return true;
    }
    if (state.player.greatHolyWar &&
        state.player.greatHolyWar.campaignId === campaign.id &&
        state.player.greatHolyWar.camp === 'defenders') nonLandReward(state, campaign);
    FB.news(state, FB.msg('news.holywar.failure',
      '🏳 The defenders break the {campaign}. No conquered land changes hands.', {
        campaign:FB.dataParam('religion', campaign.callingReligion,
          'head.greatHolyWar.name')
      }));
    finalize(state, campaign);
    return true;
  };

  function exchangeOldPlayerLands(state) {
    var player = state.player, oldLiege = player.liege;
    if (!oldLiege || !state.realms[oldLiege]) return;
    var top = FB.topRealm(state, oldLiege);
    var old = (player.provs || []).slice();
    for (var i = 0; i < old.length; i++) {
      state.owner[old[i]] = top;
      state.holder[old[i]] = oldLiege;
    }
    for (var rid in state.realms) {
      if (rid !== 'player' && state.realms[rid].liege === 'player') {
        state.realms[rid].liege = oldLiege;
      }
    }
    player.provs = [];
    FB.invalidateRealmCache();
  }

  function applyPlayerSovereignAward(state, campaign, settlement, award) {
    var player = state.player;
    var hadLand = !!(player.provs && player.provs.length);
    var wasSovereign = FB.isPlayerSovereign(state);
    if (award.rank < 3 && player.liege) exchangeOldPlayerLands(state);
    FB.changePlayerLiege(state, null, 'holy_war:sovereign_award');
    FB.setPlayerTier(state, Math.max(player.tier, award.rank + 3), {
      attachLiege:false
    });
    player.provs = player.provs || [];
    for (var i = 0; i < award.counties.length; i++) {
      var pid = award.counties[i];
      FB.transferProvince(state, pid, 'player');
      state.owner[pid] = 'player';
      state.holder[pid] = 'player';
      if (player.provs.indexOf(pid) < 0) player.provs.push(pid);
    }
    if (award.counties.length && (award.rank < 3 || !hadLand)) {
      player.provinceId = settlement.capital;
    }
    FB.foundPlayerRealm(state);
    state.realms.player.religion = campaign.callingReligion;
    if (!wasSovereign || award.rank >= 3) {
      state.realms.player.capital = settlement.capital;
    }
    for (var a = 0; a < settlement.allocations.length; a++) {
      var allocation = settlement.allocations[a];
      if (allocation.sponsor === 'player') continue;
      var vassal = makeCampaignRealm(state, campaign, allocation.sponsor,
        allocation.rank, allocation.counties[0], 'player', 'award_' + a);
      for (var j = 0; j < allocation.counties.length; j++) {
        FB.transferProvince(state, allocation.counties[j], 'player');
        state.owner[allocation.counties[j]] = 'player';
        state.holder[allocation.counties[j]] = vassal.id;
      }
    }
    FB.invalidateRealmCache();
  }

  function settleDeclinedPlayerAllocation(state, campaign, settlement) {
    var main = state.realms[settlement.mainRealmId];
    if (!main) return;
    for (var i = 0; i < settlement.allocations.length; i++) {
      var allocation = settlement.allocations[i];
      if (allocation.sponsor !== 'player' || allocation.realmId) continue;
      var cadet = makeCampaignRealm(state, campaign, 'player',
        allocation.rank, allocation.counties[0], main.id, 'award_player');
      allocation.realmId = cadet.id;
      for (var j = 0; j < allocation.counties.length; j++) {
        state.owner[allocation.counties[j]] = main.id;
        state.holder[allocation.counties[j]] = cadet.id;
      }
      FB.invalidateRealmCache();
      return;
    }
  }

  function applyPlayerSecondaryAward(state, campaign, settlement, award) {
    var player = state.player, main = state.realms[settlement.mainRealmId];
    var sovereign = FB.isPlayerSovereign(state);
    if (!sovereign && player.provs && player.provs.length) exchangeOldPlayerLands(state);
    if (!sovereign) {
      FB.changePlayerLiege(state,
        main && main.rank > award.rank ? main.id : null,
        'holy_war:secondary_award');
      FB.setPlayerTier(state, Math.max(player.tier, award.rank + 3), {
        attachLiege:false
      });
      player.provs = [];
    }
    for (var i = 0; i < award.counties.length; i++) {
      var pid = award.counties[i];
      if (sovereign) {
        FB.transferProvince(state, pid, 'player');
        state.owner[pid] = 'player';
      } else {
        state.owner[pid] = main ? main.id : 'player';
      }
      state.holder[pid] = 'player';
      if (player.provs.indexOf(pid) < 0) player.provs.push(pid);
    }
    if (!sovereign && award.counties.length) player.provinceId = award.counties[0];
    FB.foundPlayerRealm(state);
    state.realms.player.religion = campaign.callingReligion;
    FB.invalidateRealmCache();
  }

  function caseAsset(settlementCase, assetId) {
    if (!settlementCase) return null;
    for (var i = 0; i < settlementCase.assets.length; i++) {
      if (settlementCase.assets[i].id === assetId) return settlementCase.assets[i];
    }
    return null;
  }

  function awardClaim(settlementCase, award) {
    for (var i = 0; i < settlementCase.claims.length; i++) {
      var claim = settlementCase.claims[i];
      if (claim.asset === award.asset && claim.claimant === award.claimant) {
        return claim;
      }
    }
    return null;
  }

  function councilAwardSummary(settlementCase) {
    var out = [];
    if (!settlementCase) return out;
    for (var i = 0; i < settlementCase.awards.length; i++) {
      var award = settlementCase.awards[i];
      var asset = caseAsset(settlementCase, award.asset);
      out.push({
        asset:award.asset,
        kind:asset ? asset.kind : award.form,
        claimant:award.claimant,
        form:award.form,
        terms:award.terms || null,
        beneficiary:award.beneficiary || null,
        runnerUp:award.runnerUp || null
      });
    }
    return out;
  }

  function pendingCouncilPlayerAward(state, campaign) {
    var settlement = campaign.settlement, settlementCase = settlement.case;
    for (var i = 0; i < settlementCase.awards.length; i++) {
      var award = settlementCase.awards[i];
      var asset = caseAsset(settlementCase, award.asset);
      if (award.claimant !== 'player' || award.beneficiary ||
          !asset || !asset.land) continue;
      return {
        schema:2,
        awardAsset:asset.id,
        sovereign:asset.kind === 'crown',
        rank:asset.rank,
        kind:asset.kind === 'crown'
          ? (asset.rank >= 3 ? 'kingdom' : asset.rank === 2 ? 'duchy' : 'county')
          : asset.kind,
        counties:asset.awardIds.slice(),
        share:FB.greatHolyWarPlayerShare(state)
      };
    }
    return null;
  }

  function validateCouncilBeneficiaries(state, campaign) {
    var settlementCase = campaign.settlement && campaign.settlement.case;
    if (!settlementCase) return;
    for (var i = 0; i < settlementCase.awards.length; i++) {
      var award = settlementCase.awards[i];
      if (!award.beneficiary ||
          eligibleBeneficiary(state, award.beneficiary)) continue;
      award.beneficiary = null;
      var claim = awardClaim(settlementCase, award);
      if (claim) claim.beneficiary = null;
      var pledge = playerPledgeFor(state, campaign);
      if (pledge && pledge.vowTerms) pledge.vowTerms.beneficiary = null;
    }
  }

  function preparePlayerCrown(state, campaign, asset, terms) {
    var player = state.player;
    var hadLand = !!(player.provs && player.provs.length);
    var wasSovereign = FB.isPlayerSovereign(state);
    var liege = terms && terms.kind === 'vassal' ? terms.liege : null;
    if (asset.rank < 3 && player.liege) exchangeOldPlayerLands(state);
    FB.changePlayerLiege(state, liege, 'holy_war:crown_award');
    FB.setPlayerTier(state, Math.max(player.tier, asset.rank + 3), {
      attachLiege:false
    });
    player.provs = player.provs || [];
    for (var i = 0; i < asset.awardIds.length; i++) {
      if (player.provs.indexOf(asset.awardIds[i]) < 0) {
        player.provs.push(asset.awardIds[i]);
      }
    }
    if (asset.awardIds.length && (asset.rank < 3 || !hadLand)) {
      player.provinceId = asset.seat || asset.awardIds[0];
    }
    FB.foundPlayerRealm(state);
    state.realms.player.rank = Math.max(state.realms.player.rank || 1, asset.rank);
    state.realms.player.liege = liege;
    state.realms.player.religion = campaign.callingReligion;
    if (!wasSovereign || asset.rank >= 3) {
      state.realms.player.capital = asset.seat || asset.awardIds[0];
    }
    return 'player';
  }

  function preparePlayerPackage(state, campaign, asset, mainId, terms) {
    var player = state.player;
    var sovereign = FB.isPlayerSovereign(state);
    if (sovereign && terms && terms.kind === 'vassal' &&
        state.realms[terms.liege] &&
        state.realms[terms.liege].rank > state.realms.player.rank) {
      FB.changePlayerLiege(state, terms.liege,
        'holy_war:package_vassalage');
    }
    if (!sovereign && player.provs && player.provs.length) exchangeOldPlayerLands(state);
    if (!sovereign) {
      var proposed = terms && terms.kind === 'vassal' ? terms.liege : mainId;
      FB.changePlayerLiege(state,
        proposed && state.realms[proposed] &&
          state.realms[proposed].rank > asset.rank ? proposed : mainId,
        'holy_war:package_award');
      FB.setPlayerTier(state, Math.max(player.tier, asset.rank + 3), {
        attachLiege:false
      });
      player.provs = [];
    }
    player.provs = player.provs || [];
    for (var i = 0; i < asset.awardIds.length; i++) {
      if (player.provs.indexOf(asset.awardIds[i]) < 0) {
        player.provs.push(asset.awardIds[i]);
      }
    }
    if (!sovereign && asset.awardIds.length) player.provinceId = asset.awardIds[0];
    FB.foundPlayerRealm(state);
    state.realms.player.rank = Math.max(state.realms.player.rank || 1, asset.rank);
    state.realms.player.religion = campaign.callingReligion;
    return 'player';
  }

  function awardSponsor(award, claim) {
    if (award.claimant === 'player') return 'player';
    return award.sourceRealm || (claim && claim.sourceRealm) || award.claimant;
  }

  function createAwardRealm(state, campaign, award, asset, mainId, claim, suffix) {
    var sponsor = awardSponsor(award, claim);
    var liege = award.terms && award.terms.kind === 'vassal'
      ? award.terms.liege : mainId;
    var realm = makeCampaignRealm(state, campaign, sponsor, asset.rank,
      asset.awardIds[0], liege, suffix);
    if (award.beneficiary && FB.assignRealmRulerCharacter) {
      FB.assignRealmRulerCharacter(state, realm.id, award.beneficiary);
    }
    return realm;
  }

  function realmUnderPlayer(state, rid) {
    var cur = rid, guard = 0;
    while (cur && guard++ < 20) {
      if (cur === 'player') return true;
      cur = state.realms[cur] ? state.realms[cur].liege : null;
    }
    return false;
  }

  function attachSacredCustody(state, campaign, settlement, award,
      asset, campaignRealms) {
    var claim = awardClaim(settlement.case, award);
    var rid = campaignRealms[award.claimant] || null;
    if (!rid) {
      if (award.claimant === 'player') rid = FB.playerRealmId(state);
      else if (claim && claim.sourceRealm) rid = sovereignRealm(state, claim.sourceRealm);
      else rid = sovereignRealm(state, award.claimant);
    }
    var realm = rid && state.realms[rid];
    if (!realm || !realm.alive) return;
    realm.sacredCustody = {
      religion:campaign.callingReligion,
      siteIds:(asset.siteIds || asset.ids || []).slice(),
      campaignId:campaign.id,
      grantTurn:state.turn
    };
    settlement.awardRealms[asset.id] = rid;
  }

  function cleanupDisplacedRealms(state, affected, protectedRealms) {
    FB.invalidateRealmCache();
    var ids = Object.keys(affected).sort();
    for (var i = 0; i < ids.length; i++) {
      var rid = ids[i], realm = state.realms[rid];
      if (!realm || !realm.alive || protectedRealms[rid]) continue;
      var territory = FB.realmTerritory(state, rid);
      if (!territory.length) {
        FB.realmBuryIfEmpty(state, rid);
      } else if (territory.indexOf(realm.capital) < 0) {
        realm.capital = territory[0];
      }
    }
  }

  function applyCouncilAwards(state, campaign, acceptPlayer) {
    var settlement = campaign.settlement, settlementCase = settlement.case;
    if (!settlement || settlement.applied || !settlementCase ||
        settlementCase.status !== 'resolved') return false;
    var crownAward = null, crownAsset = null;
    for (var i = 0; i < settlementCase.awards.length; i++) {
      var possibleAsset = caseAsset(settlementCase, settlementCase.awards[i].asset);
      if (possibleAsset && possibleAsset.kind === 'crown') {
        crownAward = settlementCase.awards[i];
        crownAsset = possibleAsset;
        break;
      }
    }
    if (!crownAward || !crownAsset) return false;

    var holders = {}, owners = {}, affected = {}, protectedRealms = {};
    var campaignRealms = {};
    for (var capturedIndex = 0;
         capturedIndex < settlement.captured.length; capturedIndex++) {
      var capturedPid = settlement.captured[capturedIndex];
      affected[state.owner[capturedPid]] = 1;
      affected[(state.holder && state.holder[capturedPid]) ||
        state.owner[capturedPid]] = 1;
    }
    var mainId, mainRealm, crownClaim = awardClaim(settlementCase, crownAward);
    var personalCrown = crownAward.claimant === 'player' && !crownAward.beneficiary;
    var personalCrownWasSovereign = personalCrown && acceptPlayer
      ? FB.isPlayerSovereign(state) : false;
    if (personalCrown && acceptPlayer) {
      mainId = preparePlayerCrown(state, campaign, crownAsset, crownAward.terms);
      mainRealm = state.realms.player;
    } else {
      var crownSponsor = awardSponsor(crownAward, crownClaim);
      var crownLiege = crownAward.terms && crownAward.terms.kind === 'vassal'
        ? crownAward.terms.liege : null;
      mainRealm = makeCampaignRealm(state, campaign, crownSponsor,
        crownAsset.rank, crownAsset.seat, crownLiege, 'crown');
      mainId = mainRealm.id;
      if (crownAward.beneficiary && FB.assignRealmRulerCharacter) {
        FB.assignRealmRulerCharacter(state, mainId, crownAward.beneficiary);
      }
    }
    settlement.mainRealmId = mainId;
    settlement.awardRealms[crownAsset.id] = mainId;

    campaignRealms[crownAward.claimant] = mainId;
    protectedRealms[mainId] = 1;

    function assignAsset(asset, holder) {
      var top = holder === 'player'
        ? (state.realms.player && state.realms.player.liege
          ? FB.topRealm(state, state.realms.player.liege) : 'player')
        : FB.topRealm(state, holder);
      for (var p = 0; p < asset.awardIds.length; p++) {
        var pid = asset.awardIds[p];
        affected[state.owner[pid]] = 1;
        affected[(state.holder && state.holder[pid]) || state.owner[pid]] = 1;
        owners[pid] = top;
        holders[pid] = holder;
      }
    }
    assignAsset(crownAsset, mainId);

    for (var a = 0; a < settlementCase.awards.length; a++) {
      var award = settlementCase.awards[a];
      var asset = caseAsset(settlementCase, award.asset);
      if (!asset || !asset.land || asset.kind === 'crown') continue;
      var claim = awardClaim(settlementCase, award), holder = null;
      var personal = award.claimant === 'player' && !award.beneficiary;
      if (personal && acceptPlayer) {
        holder = preparePlayerPackage(state, campaign, asset, mainId, award.terms);
      } else if (award.confirmation && state.realms[award.claimant] &&
          state.realms[award.claimant].alive) {
        holder = award.claimant;
        state.realms[holder].liege = mainId;
      } else {
        var suffix = award.localCadet ? 'local_' + a :
          (personal ? 'award_player' : 'award_' + a);
        holder = createAwardRealm(state, campaign, award, asset, mainId, claim, suffix).id;
      }
      protectedRealms[holder] = 1;
      campaignRealms[award.claimant] = holder;
      settlement.awardRealms[asset.id] = holder;
      assignAsset(asset, holder);
    }

    var mainTop = mainId === 'player'
      ? (state.realms.player && state.realms.player.liege
        ? FB.topRealm(state, state.realms.player.liege) : 'player')
      : FB.topRealm(state, mainId);
    for (var residualIndex = 0;
         residualIndex < settlement.captured.length; residualIndex++) {
      var residualPid = settlement.captured[residualIndex];
      if (owners[residualPid] !== undefined) continue;
      affected[state.owner[residualPid]] = 1;
      affected[(state.holder && state.holder[residualPid]) ||
        state.owner[residualPid]] = 1;
      owners[residualPid] = mainTop;
      holders[residualPid] = mainId;
    }

    for (var pid in owners) {
      state.owner[pid] = owners[pid];
      state.holder[pid] = holders[pid];
      if (holders[pid] === 'player' &&
          state.player.provs.indexOf(pid) < 0) state.player.provs.push(pid);
    }
    FB.invalidateRealmCache();
    if (mainId === 'player') {
      FB.foundPlayerRealm(state);
      state.realms.player.rank = Math.max(state.realms.player.rank || 1,
        crownAsset.rank);
      if (!personalCrownWasSovereign || crownAsset.rank >= 3) {
        state.realms.player.capital = crownAsset.seat;
      }
    }
    cleanupDisplacedRealms(state, affected, protectedRealms);

    for (var s = 0; s < settlementCase.awards.length; s++) {
      var sacredAward = settlementCase.awards[s];
      var sacredAsset = caseAsset(settlementCase, sacredAward.asset);
      if (sacredAsset && sacredAsset.kind === 'sacred') {
        attachSacredCustody(state, campaign, settlement,
          sacredAward, sacredAsset, campaignRealms);
      }
    }

    var playerLand = false;
    for (var w = 0; w < settlementCase.awards.length; w++) {
      var wonAsset = caseAsset(settlementCase, settlementCase.awards[w].asset);
      if (settlementCase.awards[w].claimant === 'player' &&
          wonAsset && wonAsset.land) playerLand = true;
    }
    if ((!playerLand || (settlement.pendingPlayer && !acceptPlayer)) &&
        playerPledgeFor(state, campaign) &&
        playerPledgeFor(state, campaign).camp === 'attackers') {
      nonLandReward(state, campaign);
    }
    settlement.applied = true;
    settlement.pendingPlayer = null;
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    FB.news(state, FB.msg('news.holywar.victory_partitioned',
      '👑 The attacking camp wins the {campaign}. The settlement council’s awards take effect.', {
        campaign:FB.dataParam('religion', campaign.callingReligion,
          'head.greatHolyWar.name')
      }));
    finalize(state, campaign);
    return true;
  }

  function advanceCouncil(state, campaign) {
    var settlement = campaign && campaign.settlement;
    var settlementCase = settlement && settlement.case;
    if (!settlementCase) return false;
    while (settlementCase.status === 'open') {
      var view = FB.settlement.current(settlementCase);
      if (!view) break;
      if (!(FB.game && FB.game.observe) && view.playerRelevant) {
        if (FB.game) FB.game.setPaused(true);
        return true;
      }
      FB.settlement.act(state, settlementCase, 'acquiesce');
    }
    if (settlementCase.status !== 'resolved') return false;
    validateCouncilBeneficiaries(state, campaign);
    settlement.pendingPlayer = pendingCouncilPlayerAward(state, campaign);
    if (settlement.pendingPlayer && !(FB.game && FB.game.observe)) {
      if (FB.game) FB.game.setPaused(true);
      return true;
    }
    return applyCouncilAwards(state, campaign, false);
  }

  FB.greatHolyWarSettlementNeedsPlayer = function (state) {
    var campaign = state && state.greatHolyWar;
    var settlement = campaign && campaign.phase === 'settlement' &&
      campaign.settlement;
    if (!settlement) return false;
    if (settlement.pendingPlayer) return true;
    var settlementCase = settlement.case;
    var view = settlementCase && FB.settlement.current(settlementCase);
    return !!(view && view.playerRelevant);
  };

  FB.greatHolyWarSettlementMove = function (state, move) {
    var campaign = state && state.greatHolyWar;
    var settlement = campaign && campaign.settlement;
    var settlementCase = settlement && settlement.case;
    if (!campaign || campaign.phase !== 'settlement' || !settlementCase ||
        settlementCase.status !== 'open') return false;
    var result = FB.settlement.act(state, settlementCase, move);
    if (!result) return false;
    advanceCouncil(state, campaign);
    return result;
  };

  FB.greatHolyWarSettlementChoice = function (state, accept) {
    var campaign = state && state.greatHolyWar;
    var settlement = campaign && campaign.settlement;
    var award = settlement && settlement.pendingPlayer;
    if (!campaign || campaign.phase !== 'settlement' || !award) return false;
    if (settlement.schema === 2 && settlement.case) {
      return applyCouncilAwards(state, campaign, !!accept);
    }
    if (accept) {
      if (award.sovereign) applyPlayerSovereignAward(state, campaign, settlement, award);
      else applyPlayerSecondaryAward(state, campaign, settlement, award);
      FB.news(state, FB.msg('news.holywar.player_accepts_land',
        '👑 You accept the campaign’s grant and take possession of the awarded lands.', {}));
    } else {
      if (award.sovereign) settleAiRealm(state, campaign, settlement, 'player');
      else settleDeclinedPlayerAllocation(state, campaign, settlement);
      nonLandReward(state, campaign);
      FB.news(state, FB.msg('news.holywar.player_declines_land',
        '🕊 You decline the land. A cadet ruler receives it, and your service is honored in piety and prestige.', {}));
    }
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    settlement.pendingPlayer = null;
    finalize(state, campaign);
    return true;
  };

  function trackSacredLosses(state) {
    var history = ensureHistory(state);
    /* one office-table repair for the whole pass: religiousHeadOf would
       re-run it per religion, and nothing below mutates the heads map */
    FB.ensureReligiousHeads(state);
    var religionIds = FB.religionIds(state, false);
    for (var religionIndex = 0; religionIndex < religionIds.length; religionIndex++) {
      var religionId = religionIds[religionIndex];
      var source = FB.faithValue(state, religionId, 'head.greatHolyWar').sourceId;
      if (source && source !== religionId) continue;
      var conf = config(state, religionId);
      if (!conf) continue;
      var map = history.sacredLossSince[religionId];
      if (!map || typeof map !== 'object') {
        map = {};
        history.sacredLossSince[religionId] = map;
      }
      var rows = sacredTargets(conf);
      for (var i = 0; i < rows.length; i++) {
        var counties = rows[i] && rows[i].counties || [];
        for (var j = 0; j < counties.length; j++) {
          var pid = counties[j];
          if (countyLost(state, religionId, pid)) {
            if (!isFinite(map[pid])) map[pid] = state.turn;
          } else {
            delete map[pid];
          }
        }
      }
      /* the head read inlined: same value religiousHeadOf would return after
         the ensure above — the live realm holding the office, or null */
      var headOfficeId = FB.faithOfficeId(religionId, state);
      var headRid = headOfficeId &&
        Object.prototype.hasOwnProperty.call(state.religiousHeads, headOfficeId)
        ? state.religiousHeads[headOfficeId] : null;
      var headRealm = headRid !== null && state.realms
        ? state.realms[headRid] : null;
      var head = headRealm && headRealm.alive ? headRealm : null;
      var headState = history.headState[religionId];
      if (!headState || typeof headState !== 'object') {
        history.headState[religionId] = { initialized:true, vacant:!head, restoredTurn:null };
      } else if (!head) {
        headState.vacant = true;
      } else if (headState.vacant) {
        headState.vacant = false;
        headState.restoredTurn = state.turn;
      }
    }
  }

  function crisisChance(state, religionId, conf) {
    if (!Array.isArray(conf.crisisKingdoms) || !conf.crisisKingdoms.length) {
      return conf.yearlyChance || 0;
    }
    var total = 0, crisis = 0;
    for (var i = 0; i < conf.crisisKingdoms.length; i++) {
      var counties = FB.kingdomCounties(conf.crisisKingdoms[i]);
      for (var j = 0; j < counties.length; j++) {
        total++;
        var countyFaith = ownerFaith(state, counties[j]);
        if (countyFaith && FB.faithIsA(countyFaith, conf.crisisGroup, state)) crisis++;
      }
    }
    return total && crisis / total >= (conf.crisisShare || 0.25)
      ? (conf.crisisChance || conf.yearlyChance || 0)
      : (conf.yearlyChance || 0);
  }

  function guaranteedByLoss(state, religionId, conf) {
    if (!conf.lossGuaranteeYears) return false;
    var map = ensureHistory(state).sacredLossSince[religionId] || {};
    for (var pid in map) {
      if (state.turn - map[pid] >= conf.lossGuaranteeYears * 360) return true;
    }
    return false;
  }

  /* Called once at the new-year world tick. The scheduler makes at most one
     global call, uses the saved RNG, and leaves player-controlled heads to
     their explicit deed. */
  FB.greatHolyWarYearly = function (state) {
    FB.ensureGreatHolyWar(state);
    trackSacredLosses(state);
    if (state.greatHolyWar) return;
    var ids = FB.religionIds(state, false).filter(function (religionId) {
      var source = FB.faithValue(state, religionId, 'head.greatHolyWar').sourceId;
      return !source || source === religionId;
    }).sort();
    for (var i = 0; i < ids.length; i++) {
      var religionId = ids[i], conf = config(state, religionId);
      if (!conf || !dateReached(state, conf.minDate)) continue;
      var history = ensureHistory(state);
      history.unlockChecked[religionId] = true;
      var head = FB.religiousHeadOf(state, religionId);
      if (papalFaith(state, religionId) && FB.playerPope &&
          FB.playerPope(state)) continue;
      if (!head || head.id === 'player') continue;
      if ((history.cooldownUntil[religionId] || 0) > state.turn) continue;
      var targets = FB.greatHolyWarTargets(state, religionId);
      if (!targets.length) continue;
      var forced = (!history.firstLaunched[religionId] && conf.firstByYear &&
        state.date.year >= conf.firstByYear) || guaranteedByLoss(state, religionId, conf);
      if (!forced && !FB.chance(crisisChance(state, religionId, conf))) continue;
      FB.callGreatHolyWar(state, religionId, targets[0].kingdomId, head.id);
      return;
    }
  };

  FB.sacredCustodySeason = function (state) {
    if (!state || !state.player || !state.realms) return 0;
    for (var rid in state.realms) {
      var realm = state.realms[rid], custody = realm && realm.sacredCustody;
      if (!realm || !realm.alive || !custody ||
          !Array.isArray(custody.siteIds) || !realmUnderPlayer(state, rid)) continue;
      var sovereign = FB.topRealm(state, rid), controlled = false;
      for (var i = 0; i < custody.siteIds.length; i++) {
        if (state.owner[custody.siteIds[i]] === sovereign) {
          controlled = true;
          break;
        }
      }
      if (controlled) {
        state.player.piety += 2;
        return 2;
      }
    }
    return 0;
  };

  FB.greatHolyWarSeason = function (state) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || campaign.phase !== 'active') return;
    /* Great-holy-war progress is earned daily, but abandoned works decay and
       a fort's sortie attrition both pulse only at the seasonal boundary. */
    for (var objectiveIndex = 0;
         objectiveIndex < campaign.objectiveCounties.length; objectiveIndex++) {
      var objectivePid = campaign.objectiveCounties[objectiveIndex];
      var objectiveOccupation = campaign.occupations[objectivePid];
      if (!objectiveOccupation || !(objectiveOccupation.progress > 0)) continue;
      var objectivePresent = hostsAtByCamp(state, objectivePid);
      var objectiveCamp = objectivePresent.attackersMen && !objectivePresent.defendersMen
        ? 'attackers'
        : (objectivePresent.defendersMen && !objectivePresent.attackersMen
          ? 'defenders' : null);
      var objectiveCanWork = objectiveCamp &&
        objectiveOccupation.progressCamp === objectiveCamp &&
        ((objectiveCamp === 'attackers' && !objectiveOccupation.occupied) ||
         (objectiveCamp === 'defenders' && objectiveOccupation.occupied));
      if (!objectiveCanWork) {
        objectiveOccupation.progress = Math.max(0,
          objectiveOccupation.progress - B('greatHolyWarSiegeDecay', 1));
        if (!objectiveOccupation.progress) {
          objectiveOccupation.progressCamp = null;
          delete objectiveOccupation.fortLevel;
        }
        continue;
      }
      if (FB.advanceFortSiegePulse) {
        FB.advanceFortSiegePulse(state, objectivePid, objectiveOccupation, {
          hosts:objectivePresent[objectiveCamp], progressAmount:0
        });
      }
    }
    var camps = ['attackers','defenders'], served = {};
    for (var c = 0; c < camps.length; c++) {
      var list = campaign.participants[camps[c]];
      for (var i = 0; i < list.length; i++) {
        if (!participantRealmValid(state, list[i]) || served[list[i].realm]) continue;
        if (list[i].realm === 'player') {
          var pledge = state.player.greatHolyWar;
          if (!pledge || pledge.renewalRequired || pledge.withdrawn) continue;
        }
        served[list[i].realm] = 1;
        if (camps[c] === 'attackers' && list[i].realm !== 'player') {
          list[i].served = Math.max(0, Math.floor(list[i].served || 0)) + 1;
        }
        addContribution(state, campaign, list[i].realm, 1);
      }
    }
    var playerPledge = state.player.greatHolyWar;
    if (playerPledge && playerPledge.campaignId === campaign.id &&
        !playerPledge.withdrawn && !playerPledge.renewalRequired &&
        playerPledge.vowTerms) {
      playerPledge.vowTerms.served =
        Math.max(0, Math.floor(playerPledge.vowTerms.served || 0)) + 1;
    }
    if (playerPledge && playerPledge.campaignId === campaign.id &&
        !playerPledge.withdrawn && !playerPledge.renewalRequired &&
        playerPledge.mode !== 'host') {
      state.eventQueue.push({
        id:FB.chance(0.35) ? 'ghw_expedition_danger' : 'ghw_expedition_service',
        ctx:{}
      });
    }
  };

  FB.fns = FB.fns || {};
  function playerGreatHolyWarFieldHost(state) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || campaign.phase !== 'active' ||
        !FB.playerGreatHolyWarHostActive ||
        !FB.playerGreatHolyWarHostActive(state) ||
        !FB.playerHost) return null;
    var host = FB.playerHost(state);
    return host && host.realm === 'player' && host.men > 0 ? host : null;
  }

  /* Random campaign recruits belong to this exact raised host. Increasing
     size lets ordinary home-territory reinforcement restore the enlarged
     muster, while a shattered/disbanded host loses them with the host. */
  function reinforcePlayerGreatHolyWarHost(state, unit, men) {
    var host = playerGreatHolyWarFieldHost(state);
    var add = Math.max(0, Math.round(Number(men) || 0));
    if (!host || !add || !FB.hostUnits) return false;
    var units = FB.hostUnits(host);
    units[unit] = (units[unit] || 0) + add;
    host.men += add;
    host.size = host.size === undefined ? host.men : host.size + add;
    if (FB.map) FB.map.request();
    return true;
  }

  FB.fns.ghw_has_field_host = function (state) {
    return !!playerGreatHolyWarFieldHost(state);
  };
  FB.fns.ghw_recruit_volunteers = function (state) {
    return reinforcePlayerGreatHolyWarHost(state, 'levy',
      B('greatHolyWarVolunteerMen', 120));
  };
  FB.fns.ghw_recruit_mercenaries = function (state) {
    return reinforcePlayerGreatHolyWarHost(state, 'mercs',
      B('mercCompanySize', 150));
  };
  FB.fns.ghw_recruit_knights = function (state) {
    return reinforcePlayerGreatHolyWarHost(state, 'cav',
      B('greatHolyWarKnightMen', 75));
  };
  FB.fns.ghw_recruit_adventurers = function (state) {
    return reinforcePlayerGreatHolyWarHost(state, 'ret',
      B('greatHolyWarAdventurerMen', 100));
  };

  FB.fns.ghw_service_safe = function (state) {
    var campaign = state.greatHolyWar;
    if (campaign) addContribution(state, campaign, 'player', 1);
  };
  FB.fns.ghw_service_danger = function (state) {
    var campaign = state.greatHolyWar;
    if (campaign) addContribution(state, campaign, 'player', 3);
  };

  FB.greatHolyWarTick = function (state) {
    FB.ensureGreatHolyWar(state);
    trackSacredLosses(state);
    var campaign = state.greatHolyWar;
    if (!campaign) {
      var history = ensureHistory(state);
      /* a checked religion is retired forever (unlockChecked is only ever
         set, never cleared), so the own-head source test — and its per-day
         faithValue allocations — only runs for religions still waiting; the
         candidates keep the same sorted evaluation order as before */
      var allReligionIds = FB.religionIds(state, false);
      var unlockIds = [];
      for (var candidateIndex = 0; candidateIndex < allReligionIds.length; candidateIndex++) {
        var candidateId = allReligionIds[candidateIndex];
        if (history.unlockChecked[candidateId]) continue;
        var candidateConf = config(state, candidateId);
        if (!candidateConf || !dateReached(state, candidateConf.minDate)) continue;
        var candidateSource = FB.faithValue(state, candidateId, 'head.greatHolyWar').sourceId;
        if (candidateSource && candidateSource !== candidateId) continue;
        unlockIds.push(candidateId);
      }
      unlockIds.sort();
      for (var unlockIndex = 0; unlockIndex < unlockIds.length; unlockIndex++) {
        var unlockReligionId = unlockIds[unlockIndex];
        history.unlockChecked[unlockReligionId] = true;
        var unlockConf = config(state, unlockReligionId);
        var unlockHead = FB.religiousHeadOf(state, unlockReligionId);
        var unlockTargets = FB.greatHolyWarTargets(state, unlockReligionId);
        var unlockForced = (!history.firstLaunched[unlockReligionId] &&
          unlockConf.firstByYear && state.date.year >= unlockConf.firstByYear) ||
          guaranteedByLoss(state, unlockReligionId, unlockConf);
        if (!(papalFaith(state, unlockReligionId) && FB.playerPope &&
              FB.playerPope(state)) &&
            unlockHead && unlockHead.id !== 'player' && unlockTargets.length &&
            (history.cooldownUntil[unlockReligionId] || 0) <= state.turn &&
            (unlockForced || FB.chance(crisisChance(
              state, unlockReligionId, unlockConf)))) {
          FB.callGreatHolyWar(state, unlockReligionId,
            unlockTargets[0].kingdomId, unlockHead.id);
          return;
        }
      }
      for (var religionId in history.headState) {
        var conf = config(state, religionId), hs = history.headState[religionId];
        if (!conf || history.firstLaunched[religionId] || !hs ||
            !isFinite(hs.restoredTurn) || state.turn - hs.restoredTurn < 360) continue;
        var head = FB.religiousHeadOf(state, religionId);
        var targets = FB.greatHolyWarTargets(state, religionId);
        if (!(papalFaith(state, religionId) && FB.playerPope &&
              FB.playerPope(state)) &&
            head && head.id !== 'player' && targets.length &&
            dateReached(state, conf.minDate) &&
            (history.cooldownUntil[religionId] || 0) <= state.turn) {
          FB.callGreatHolyWar(state, religionId, targets[0].kingdomId, head.id);
          return;
        }
      }
      return;
    }
    if (campaign.phase === 'preparation') {
      pruneParticipants(state, campaign);
      var head = FB.religiousHeadOf(state, campaign.callingReligion);
      if (!head || head.id !== campaign.callerRealm) {
        collapse(state, 'vacancy');
        return;
      }
      if (papalFaith(state, campaign.callingReligion) &&
          campaign.callerClaimantId && FB.ensurePapacy) {
        var papacy = FB.ensurePapacy(state);
        var callingObedience = papacy.obediences[
          campaign.callerObedienceId || papacy.romanObedience
        ];
        if (!callingObedience ||
            callingObedience.claimantId !== campaign.callerClaimantId) {
          collapse(state, 'vacancy');
          return;
        }
      }
      if (!campaignTargetValid(state, campaign)) {
        collapse(state, 'target');
        return;
      }
      if (state.turn >= campaign.launchTurn) launch(state, campaign);
      return;
    }
    if (campaign.phase !== 'active') return;
    if (campaign.musterEventPending) {
      campaign.musterEventPending = false;
      FB.queueEvent(state, 'ghw_muster_complete',
        campaignEventContext(state, campaign));
    }
    pruneParticipants(state, campaign);
    var attackerCount = 0;
    for (var i = 0; i < campaign.participants.attackers.length; i++) {
      if (campaign.participants.attackers[i].sovereign) attackerCount++;
    }
    if (!attackerCount) {
      FB.resolveGreatHolyWar(state, 'defenders', 'no_attackers');
      return;
    }
    occupationTick(state, campaign);
    if (campaign.resolve <= -100) {
      FB.resolveGreatHolyWar(state, 'defenders', 'resolve');
    } else if (state.turn >= campaign.deadlineTurn) {
      FB.resolveGreatHolyWar(state, 'defenders', 'deadline');
    } else if (attackerVictoryReady(state, campaign)) {
      FB.resolveGreatHolyWar(state, 'attackers', 'objectives');
    }
  };

  FB.repairGreatHolyWar = function (state) {
    if (!state || !state.player || !state.realms) return;
    FB.ensureGreatHolyWar(state);
    var campaign = state.greatHolyWar;
    if (!campaign) return;
    var validPhase = campaign.phase === 'preparation' || campaign.phase === 'active' ||
      campaign.phase === 'settlement';
    if (!campaign.id || !validPhase || !config(state, campaign.callingReligion) ||
        !FBDATA.kingdoms[campaign.targetKingdom] ||
        !Array.isArray(campaign.objectiveCounties) ||
        !campaign.participants || typeof campaign.participants !== 'object' ||
        !campaign.occupations || typeof campaign.occupations !== 'object' ||
        !campaign.contribution || typeof campaign.contribution !== 'object') {
      state.greatHolyWar = null;
      state.player.greatHolyWar = null;
      return;
    }
    campaign.objectiveCounties = campaign.objectiveCounties.filter(function (pid, index, all) {
      return !!FB.world.byId[pid] && all.indexOf(pid) === index;
    });
    campaign.holyCounties = (Array.isArray(campaign.holyCounties)
      ? campaign.holyCounties : []).filter(function (pid, index, all) {
        return campaign.objectiveCounties.indexOf(pid) >= 0 && all.indexOf(pid) === index;
      });
    if (!campaign.objectiveCounties.length) {
      state.greatHolyWar = null;
      state.player.greatHolyWar = null;
      return;
    }
    if (!Array.isArray(campaign.participants.attackers)) campaign.participants.attackers = [];
    if (!Array.isArray(campaign.participants.defenders)) campaign.participants.defenders = [];
    for (var attackerIndex = 0;
         attackerIndex < campaign.participants.attackers.length; attackerIndex++) {
      var repairAttacker = campaign.participants.attackers[attackerIndex];
      var hadServed = isFinite(repairAttacker.served);
      var hadMuster = repairAttacker.mustered !== undefined;
      participantRecord(state, campaign, repairAttacker, true);
      if (!hadServed && campaign.phase !== 'preparation' &&
          isFinite(campaign.launchedTurn)) {
        repairAttacker.served = Math.max(0,
          Math.floor((state.turn - campaign.launchedTurn) / 90));
      }
      if (!hadMuster && campaign.phase !== 'preparation') {
        repairAttacker.mustered = true;
      }
    }
    if (campaign.phase === 'preparation') {
      if (!isFinite(campaign.calledTurn)) campaign.calledTurn = state.turn;
      if (!isFinite(campaign.launchTurn)) {
        campaign.launchTurn = campaign.calledTurn +
          B('greatHolyWarPreparationDays', 180);
      }
    } else if (campaign.phase === 'active') {
      if (!isFinite(campaign.launchedTurn)) campaign.launchedTurn = state.turn;
      if (!isFinite(campaign.deadlineTurn)) {
        campaign.deadlineTurn = campaign.launchedTurn +
          B('greatHolyWarDeadlineDays', 2880);
      }
    }
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var pid = campaign.objectiveCounties[i], occupation = campaign.occupations[pid];
      if (!occupation || typeof occupation !== 'object') {
        campaign.occupations[pid] = {
          occupied:false, progress:0, progressCamp:null, occupiedBy:null
        };
      } else {
        occupation.occupied = !!occupation.occupied;
        if (occupation.fortLevel !== undefined) {
          occupation.fortLevel = Math.max(0, Math.min(4,
            Math.floor(Number(occupation.fortLevel) || 0)));
        }
        occupation.progress = isFinite(occupation.progress)
          ? FB.clamp(occupation.progress, 0, occupationRequirement(state, pid)) : 0;
        if (occupation.progressCamp !== 'attackers' &&
            occupation.progressCamp !== 'defenders') occupation.progressCamp = null;
      }
    }
    if (!isFinite(campaign.resolve)) campaign.resolve = 0;
    campaign.resolve = FB.clamp(campaign.resolve, -100, 100);
    pruneParticipants(state, campaign);
    var pledge = state.player.greatHolyWar;
    if (pledge && (pledge.campaignId !== campaign.id ||
        (pledge.camp !== 'attackers' && pledge.camp !== 'defenders') ||
        ['host','liege','expedition'].indexOf(pledge.mode) < 0)) {
      state.player.greatHolyWar = null;
      pledge = null;
    }
    if (pledge) {
      if (!pledge.vowTerms || typeof pledge.vowTerms !== 'object') {
        var legacyServed = campaign.phase === 'active' && isFinite(campaign.launchedTurn)
          ? Math.max(0, Math.floor((state.turn - campaign.launchedTurn) / 90)) : 0;
        pledge.vowTerms = defaultPlayerVowTerms(campaign, {
          seasons:4,
          desire:{ kind:'neutral', id:null },
          served:legacyServed,
          mustered:campaign.phase === 'active' || campaign.phase === 'settlement'
        });
      } else {
        pledge.vowTerms = defaultPlayerVowTerms(campaign, pledge.vowTerms);
      }
      if (!eligibleBeneficiary(state, pledge.vowTerms.beneficiary)) {
        pledge.vowTerms.beneficiary = null;
      }
      if (['fulfilled','broken','declined','unfulfilled'].indexOf(
          pledge.vowOutcome) < 0) pledge.vowOutcome = null;
    }
    if (campaign.phase === 'settlement') {
      var settlement = campaign.settlement;
      if (settlement && !settlement.case && settlement.pendingPlayer) {
        settlement.legacy = true;
        return;
      }
      if (settlement && settlement.case) {
        if (settlement.applied) {
          finalize(state, campaign);
          return;
        }
        settlement.schema = 2;
        var spec = buildCouncilSpec(state, campaign, false);
        var repaired = FB.settlement.repair(settlement.case, spec);
        if (repaired !== settlement.case) preBlessAiHead(state, campaign, repaired);
        settlement.case = repaired;
        settlement.awardRealms = settlement.awardRealms &&
          typeof settlement.awardRealms === 'object'
            ? settlement.awardRealms : {};
        settlement.pendingPlayer = settlement.case.status === 'resolved'
          ? pendingCouncilPlayerAward(state, campaign) : null;
        advanceCouncil(state, campaign);
        return;
      }
      if (settlement && !settlement.case) {
        finalize(state, campaign);
        return;
      }
      if (campaign.result && campaign.result.outcome === 'defenders') {
        finalize(state, campaign);
        return;
      }
      markVowOutcomes(state, campaign);
      campaign.settlement = buildCouncilSettlement(state, campaign);
      advanceCouncil(state, campaign);
    }
  };

  /* Screen-space campaign markers: a gold ring for frozen objectives, camp
     color for temporary occupation, and a siege arc for active works. */
  FB.renderGreatHolyWar = function (ctx, toScreen, zoom, dpr) {
    var state = FB.state, campaign = state && state.greatHolyWar;
    if (!campaign || (campaign.phase !== 'preparation' && campaign.phase !== 'active')) return;
    var objectiveMap = {};
    for (var objectiveIndex = 0;
         objectiveIndex < campaign.objectiveCounties.length; objectiveIndex++) {
      objectiveMap[campaign.objectiveCounties[objectiveIndex]] = 1;
    }
    var targetCounties = FB.kingdomCounties(campaign.targetKingdom);
    for (var targetIndex = 0; targetIndex < targetCounties.length; targetIndex++) {
      var targetPid = targetCounties[targetIndex];
      if (objectiveMap[targetPid]) continue;
      var targetProvince = FB.world.byId[targetPid];
      if (!targetProvince) continue;
      var targetScreen = toScreen(targetProvince.cx, targetProvince.cy);
      if (targetScreen[0] < -20 || targetScreen[1] < -20 ||
          targetScreen[0] > ctx.canvas.width + 20 ||
          targetScreen[1] > ctx.canvas.height + 20) continue;
      ctx.beginPath();
      ctx.arc(targetScreen[0], targetScreen[1],
        Math.max(4, 4 + zoom * 0.5) * dpr, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeStyle = 'rgba(232,193,83,0.28)';
      ctx.stroke();
    }
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var pid = campaign.objectiveCounties[i], province = FB.world.byId[pid];
      if (!province) continue;
      var screen = toScreen(province.cx, province.cy);
      if (screen[0] < -30 || screen[1] < -30 ||
          screen[0] > ctx.canvas.width + 30 || screen[1] > ctx.canvas.height + 30) continue;
      var occupation = campaign.occupations[pid] || {};
      var radius = Math.max(7, 7 + zoom) * dpr;
      ctx.beginPath();
      ctx.arc(screen[0], screen[1], radius, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, 1.5 * dpr);
      ctx.strokeStyle = occupation.occupied
        ? 'rgba(55,154,79,0.95)' : 'rgba(232,193,83,0.72)';
      ctx.stroke();
      if (occupation.occupied) {
        ctx.fillStyle = 'rgba(55,154,79,0.2)';
        ctx.fill();
      }
      if (occupation.progress > 0) {
        var requirement = occupationRequirement(state, pid);
        ctx.beginPath();
        ctx.arc(screen[0], screen[1], radius + 3 * dpr, -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * FB.clamp(occupation.progress / requirement, 0, 1));
        ctx.lineWidth = 3 * dpr;
        ctx.strokeStyle = occupation.progressCamp === 'defenders'
          ? '#d24a43' : '#62c978';
        ctx.stroke();
      }
    }
  };
})();
