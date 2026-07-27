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

  function config(religionId) {
    var religion = FBDATA.religions[religionId];
    return religion && religion.head && religion.head.greatHolyWar || null;
  }

  function callingGroup(religionId) {
    var religion = FBDATA.religions[religionId];
    return religion ? religion.group : null;
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

  function ownerGroup(state, pid) {
    var rid = state.owner && state.owner[pid];
    var religionId = rid && FB.realmReligionId(state, rid);
    return religionId ? FB.religionOf(religionId).group : null;
  }

  function countyLost(state, religionId, pid) {
    var group = ownerGroup(state, pid);
    return !!group && group !== callingGroup(religionId);
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

  function addContribution(campaign, rid, points) {
    if (!rid || !isFinite(points) || points <= 0) return;
    campaign.contribution[rid] = contribution(campaign, rid) + points;
  }

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
    var conf = config(religionId), rows = sacredTargets(conf), out = [];
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
    var group = callingGroup(religionId), objectives = [];
    var originalFaith = 0, total = 0, lostDev = 0, totalDev = 0;
    for (var i = 0; i < counties.length; i++) {
      var pid = counties[i], province = FB.world.byId[pid];
      if (!province || province.wasteland) continue;
      total++;
      if (province.religion === religionId) originalFaith++;
      var dev = state.dev[pid] || 1;
      totalDev += dev;
      var currentGroup = ownerGroup(state, pid);
      if (currentGroup && currentGroup !== group) {
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
    if (!state || !config(religionId) || !callingGroup(religionId)) return [];
    var history = ensureHistory(state), conf = config(religionId), out = [];
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
      campaignType:campaign.callingReligion === 'catholic' ? 'crusade' :
        (campaign.callingReligion === 'sunni' ? 'jihad' : 'other'),
      caller:realmName(state, campaign.callerRealm),
      leader:realmName(state, campaign.leaderRealm),
      kingdom:kingdom ? kingdom.name : campaign.targetKingdom
    };
  }

  FB.canCallGreatHolyWar = function (state, religionId, kingdomId, callerRealm) {
    if (!state || state.greatHolyWar || !config(religionId)) return false;
    var conf = config(religionId), history = ensureHistory(state);
    if (!dateReached(state, conf.minDate)) return false;
    if ((history.cooldownUntil[religionId] || 0) > state.turn) return false;
    var head = FB.religiousHeadOf(state, religionId);
    if (!head) return false;
    if (callerRealm && callerRealm !== head.id) return false;
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

  function aiAttackers(state, campaign) {
    var candidates = [], faith = campaign.callingReligion;
    for (var rid in state.realms) {
      if (rid === 'player' || rid === campaign.callerRealm ||
          !livingSovereign(state, rid)) continue;
      if (FB.realmReligionId(state, rid) !== faith) continue;
      candidates.push(rid);
    }
    candidates.sort(function (a, b) {
      return (participantScore(state, b) - participantScore(state, a)) ||
        (a < b ? -1 : a > b ? 1 : 0);
    });
    var cap = B('greatHolyWarVolunteersPerCamp', 8);
    for (var i = 0; i < candidates.length && voluntaryCount(campaign, 'attackers') < cap; i++) {
      if (i >= 2 && !FB.chance(0.55)) continue;
      addParticipant(campaign, 'attackers', {
        realm:candidates[i], sovereign:true, mandatory:false, voluntary:true,
        joinedTurn:state.turn
      });
    }
  }

  function mandatoryDefenders(state, campaign) {
    var seen = {};
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var rid = sovereignRealm(state, state.owner[campaign.objectiveCounties[i]]);
      if (!rid || seen[rid] || ownerGroup(state, campaign.objectiveCounties[i]) ===
          callingGroup(campaign.callingReligion)) continue;
      seen[rid] = 1;
      addParticipant(campaign, 'defenders', {
        realm:rid, sovereign:true, mandatory:true, voluntary:false,
        joinedTurn:state.turn
      });
      if (rid === 'player') {
        state.player.greatHolyWar = {
          campaignId:campaign.id, camp:'defenders', mode:'host', vow:true,
          mandatory:true, withdrawn:false, landEligible:false,
          renewalRequired:false
        };
      }
    }
  }

  function aiDefenders(state, campaign) {
    var candidates = [];
    for (var rid in state.realms) {
      if (rid === 'player' || !livingSovereign(state, rid) ||
          participantOf(campaign, 'defenders', rid) || ordinaryWarInvolves(state, rid)) continue;
      var faith = FB.realmReligionId(state, rid);
      if (!faith ||
          FB.religionOf(faith).group === callingGroup(campaign.callingReligion)) continue;
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
    if (character.religion === campaign.callingReligion) return 'attackers';
    if (FB.religionOf(character.religion).group !==
        callingGroup(campaign.callingReligion)) return 'defenders';
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

  FB.joinGreatHolyWar = function (state, camp, realmId) {
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
        renewalRequired:false
      };
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
      addContribution(campaign, 'player', 0);
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
    var realmGroup = realmReligion && FB.religionOf(realmReligion).group;
    if (camp === 'attackers' && realmReligion !== campaign.callingReligion) return false;
    if (camp === 'defenders' &&
        (!realmGroup || realmGroup === callingGroup(campaign.callingReligion) ||
         ordinaryWarInvolves(state, realmId))) return false;
    if (camp !== 'attackers' && camp !== 'defenders') return false;
    if (voluntaryCount(campaign, camp) >= B('greatHolyWarVolunteersPerCamp', 8)) return false;
    addParticipant(campaign, camp, {
      realm:realmId, sovereign:true, mandatory:false, voluntary:true,
      joinedTurn:state.turn
    });
    return true;
  };

  function removeParticipant(campaign, camp, rid, keepMandatory) {
    var list = campaign.participants[camp], out = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].realm !== rid || (keepMandatory && list[i].mandatory)) out.push(list[i]);
    }
    campaign.participants[camp] = out;
  }

  FB.withdrawGreatHolyWar = function (state) {
    var campaign = state && state.greatHolyWar;
    var pledge = state && state.player.greatHolyWar;
    if (!campaign || !pledge || pledge.campaignId !== campaign.id || pledge.withdrawn) return false;
    var inherited = !!pledge.renewalRequired;
    if (!inherited) {
      state.player.piety = Math.max(0, state.player.piety -
        B('greatHolyWarWithdrawPiety', 100));
      state.player.prestige = Math.max(0, state.player.prestige -
        B('greatHolyWarWithdrawPrestige', 50));
    }
    pledge.withdrawn = true;
    pledge.vow = false;
    pledge.landEligible = false;
    pledge.renewalRequired = false;
    removeParticipant(campaign, pledge.camp, 'player', !!pledge.mandatory);
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
    delete pledge.inheritedLandEligible;
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
  }

  function campaignTargetValid(state, campaign) {
    var opposing = 0, group = callingGroup(campaign.callingReligion);
    for (var i = 0; i < campaign.holyCounties.length; i++) {
      if (!countyLost(state, campaign.callingReligion, campaign.holyCounties[i])) return false;
    }
    for (var j = 0; j < campaign.objectiveCounties.length; j++) {
      if (ownerGroup(state, campaign.objectiveCounties[j]) !== group) opposing++;
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
    history.campaigns.push({
      id:campaign.id, religion:campaign.callingReligion,
      target:campaign.targetKingdom, outcome:'collapsed', reason:reason, turn:state.turn
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
    if (FB.playerGreatHolyWarHostActive(state)) {
      if (FB.warFooting) FB.warFooting(state);
      else if (FB.raisePlayerHost) FB.raisePlayerHost(state);
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

  function occupationRequirement(state, pid) {
    return B('greatHolyWarSiegeBase', 120) +
      (state.dev[pid] || 1) * B('greatHolyWarSiegePerDev', 10);
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

  function shareOccupationContribution(campaign, hosts, men, points) {
    if (!hosts.length || men <= 0) return;
    for (var i = 0; i < hosts.length; i++) {
      addContribution(campaign, hosts[i].realm, points * hosts[i].men / men);
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
        if (occupation.progress > 0) {
          occupation.progress = Math.max(0, occupation.progress -
            B('greatHolyWarSiegeDecay', 1));
          changed = true;
        }
        if (!occupation.progress) occupation.progressCamp = null;
        continue;
      }
      if (occupation.progressCamp && occupation.progressCamp !== camp) occupation.progress = 0;
      occupation.progressCamp = camp;
      var men = present[camp + 'Men'];
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
      if (occupation.progress < occupationRequirement(state, pid)) continue;
      var points = 10 + (state.dev[pid] || 1) * 2;
      occupation.progress = 0;
      occupation.progressCamp = null;
      if (camp === 'attackers') {
        occupation.occupied = true;
        occupation.occupiedBy = present.attackers.slice().sort(function (a, b) {
          return b.men - a.men || (a.realm < b.realm ? -1 : 1);
        })[0].realm;
        campaign.resolve = FB.clamp(campaign.resolve +
          B('greatHolyWarOccupationResolve', 5), -100, 100);
        shareOccupationContribution(campaign, present.attackers,
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
        shareOccupationContribution(campaign, present.defenders,
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
    addContribution(campaign, winner.realm, 5 + Math.floor((loserLoss || 0) / 100));
    if (loser.men > 0) addContribution(campaign, loser.realm, 1);
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
    if (!campaign || !pledge || pledge.campaignId !== campaign.id ||
        pledge.landEligible === false) return 'none';
    var share = FB.greatHolyWarPlayerShare(state);
    var captured = [];
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var pid = campaign.objectiveCounties[i];
      if (campaign.occupations[pid] && campaign.occupations[pid].occupied) captured.push(pid);
    }
    var kingdomCounties = FB.kingdomCounties(campaign.targetKingdom);
    var ids = participantKeys(campaign, pledge.camp);
    ids.sort(function (a, b) {
      return contribution(campaign, b) - contribution(campaign, a) ||
        (a < b ? -1 : a > b ? 1 : 0);
    });
    if (share >= B('greatHolyWarCrownShare', 0.35) && ids[0] === 'player' &&
        captured.length >= Math.ceil(kingdomCounties.length / 2)) return 'kingdom';
    if (share >= B('greatHolyWarDuchyShare', 0.25) &&
        completeCapturedDuchies(captured).length) return 'duchy';
    if (share >= B('greatHolyWarCountyShare', 0.15) && captured.length) return 'county';
    return 'honor';
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

  function sacredCapital(state, campaign, captured) {
    var capturedMap = {}, holy = [];
    for (var i = 0; i < captured.length; i++) capturedMap[captured[i]] = 1;
    for (var j = 0; j < campaign.holyCounties.length; j++) {
      if (capturedMap[campaign.holyCounties[j]]) holy.push(campaign.holyCounties[j]);
    }
    return highestDevelopment(state, holy.length ? holy : captured);
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

  function buildSettlement(state, campaign) {
    var captured = [];
    for (var i = 0; i < campaign.objectiveCounties.length; i++) {
      var pid = campaign.objectiveCounties[i];
      if (campaign.occupations[pid] && campaign.occupations[pid].occupied) captured.push(pid);
    }
    var keys = participantKeys(campaign, 'attackers'), total = totalContribution(campaign, 'attackers');
    keys.sort(function (a, b) {
      return contribution(campaign, b) - contribution(campaign, a) ||
        (a < b ? -1 : a > b ? 1 : 0);
    });
    var completeDuchies = completeCapturedDuchies(captured);
    var kingdomMajority = captured.length >=
      Math.ceil(FB.kingdomCounties(campaign.targetKingdom).length / 2);
    var sponsor = null, rank = 1, sovereignCounties = captured.slice();
    for (var s = 0; s < keys.length; s++) {
      if (keys[s] !== 'player' || playerLandEligible(state, campaign)) {
        var share = total ? contribution(campaign, keys[s]) / total : 0;
        if (keys[s] !== 'player' ||
            (kingdomMajority && share >= B('greatHolyWarCrownShare', 0.35)) ||
            (completeDuchies.length && share >= B('greatHolyWarDuchyShare', 0.25)) ||
            share >= B('greatHolyWarCountyShare', 0.15)) {
          sponsor = keys[s];
          break;
        }
      }
    }
    if (!sponsor) sponsor = keys.length ? keys[0] : campaign.leaderRealm;
    var sponsorShare = total ? contribution(campaign, sponsor) / total : 0;
    if (kingdomMajority && (sponsor !== 'player' ||
        sponsorShare >= B('greatHolyWarCrownShare', 0.35))) rank = 3;
    else if (completeDuchies.length && (sponsor !== 'player' ||
        sponsorShare >= B('greatHolyWarDuchyShare', 0.25))) rank = 2;
    var capital = sacredCapital(state, campaign, captured);
    var reserved = {}; reserved[capital] = 1;
    var allocations = [], assigned = {};
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (key === sponsor || (key === 'player' && !playerLandEligible(state, campaign))) continue;
      var keyShare = total ? contribution(campaign, key) / total : 0;
      var packageCounties = null, packageRank = 0;
      if (keyShare >= B('greatHolyWarDuchyShare', 0.25)) {
        for (var d = 0; d < completeDuchies.length; d++) {
          var possible = completeDuchies[d].counties, free = true;
          for (var dc = 0; dc < possible.length; dc++) {
            if (reserved[possible[dc]] || assigned[possible[dc]]) { free = false; break; }
          }
          if (free) { packageCounties = possible.slice(); packageRank = 2; break; }
        }
      }
      if (!packageCounties && keyShare >= B('greatHolyWarCountyShare', 0.15)) {
        var unavailable = {}, reservedKey, assignedKey;
        for (reservedKey in reserved) {
          if (Object.prototype.hasOwnProperty.call(reserved, reservedKey)) {
            unavailable[reservedKey] = 1;
          }
        }
        for (assignedKey in assigned) {
          if (Object.prototype.hasOwnProperty.call(assigned, assignedKey)) {
            unavailable[assignedKey] = 1;
          }
        }
        var county = highestDevelopment(state, captured, unavailable);
        if (county) { packageCounties = [county]; packageRank = 1; }
      }
      if (!packageCounties) continue;
      for (var pc = 0; pc < packageCounties.length; pc++) assigned[packageCounties[pc]] = 1;
      allocations.push({
        sponsor:key, rank:packageRank, counties:packageCounties, share:keyShare
      });
    }
    sovereignCounties = captured.filter(function (pid) { return !assigned[pid]; });
    var capitalIndex = sovereignCounties.indexOf(capital);
    if (capitalIndex > 0) {
      sovereignCounties.splice(capitalIndex, 1);
      sovereignCounties.unshift(capital);
    }
    var settlement = {
      captured:captured,
      capital:capital,
      kingdomMajority:kingdomMajority,
      sovereign:{ sponsor:sponsor, rank:rank, counties:sovereignCounties },
      allocations:allocations,
      mainRealmId:null,
      pendingPlayer:null
    };
    if (sponsor === 'player') {
      settlement.pendingPlayer = {
        sovereign:true, rank:rank, kind:rank >= 3 ? 'kingdom' : rank === 2 ? 'duchy' : 'county',
        counties:sovereignCounties.slice(), share:sponsorShare
      };
    } else {
      for (var a = 0; a < allocations.length; a++) {
        if (allocations[a].sponsor === 'player') {
          settlement.pendingPlayer = {
            sovereign:false, rank:allocations[a].rank,
            kind:allocations[a].rank === 2 ? 'duchy' : 'county',
            counties:allocations[a].counties.slice(), share:allocations[a].share
          };
          break;
        }
      }
    }
    return settlement;
  }

  function nonLandReward(state, campaign) {
    var score = contribution(campaign, 'player');
    if (!score) return;
    state.player.piety += Math.round(40 + score * 2);
    state.player.prestige += Math.round(20 + score);
  }

  function finalize(state, campaign) {
    var history = ensureHistory(state);
    history.campaigns.push({
      id:campaign.id, religion:campaign.callingReligion,
      target:campaign.targetKingdom,
      outcome:campaign.result ? campaign.result.outcome : 'unknown',
      reason:campaign.result ? campaign.result.reason : null,
      turn:state.turn
    });
    if (history.campaigns.length > 24) history.campaigns.shift();
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
    campaign.result = { outcome:outcome, reason:reason || 'resolve', turn:state.turn };
    if (FB.validateFocus) FB.validateFocus(state);
    ensureHistory(state).cooldownUntil[campaign.callingReligion] = state.turn +
      B('greatHolyWarCooldownDays', 6480);
    if (outcome === 'attackers') {
      campaign.settlement = buildSettlement(state, campaign);
      if (campaign.settlement.pendingPlayer) {
        if (!campaign.settlement.pendingPlayer.sovereign) {
          settleAiRealm(state, campaign, campaign.settlement);
        }
        FB.news(state, FB.msg('news.holywar.victory',
          '👑 The attacking camp wins the {campaign}. The occupied lands await partition.', {
            campaign:FB.dataParam('religion', campaign.callingReligion,
              'head.greatHolyWar.name')
          }));
        if (FB.game && !FB.game.observe) {
          FB.game.setPaused(true);
        }
        return true;
      }
      settleAiRealm(state, campaign, campaign.settlement);
      if (state.player.greatHolyWar &&
          state.player.greatHolyWar.campaignId === campaign.id &&
          state.player.greatHolyWar.camp === 'attackers') {
        nonLandReward(state, campaign);
      }
      FB.news(state, FB.msg('news.holywar.victory_partitioned',
        '👑 The attacking camp wins the {campaign}. Occupied lands are partitioned among new rulers.', {
          campaign:FB.dataParam('religion', campaign.callingReligion,
            'head.greatHolyWar.name')
        }));
      finalize(state, campaign);
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
    player.liege = null;
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
      player.liege = main && main.rank > award.rank ? main.id : null;
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

  FB.greatHolyWarSettlementChoice = function (state, accept) {
    var campaign = state && state.greatHolyWar;
    var settlement = campaign && campaign.settlement;
    var award = settlement && settlement.pendingPlayer;
    if (!campaign || campaign.phase !== 'settlement' || !award) return false;
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
    for (var religionId in FBDATA.religions) {
      var conf = config(religionId);
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
      var head = FB.religiousHeadOf(state, religionId);
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
        if (ownerGroup(state, counties[j]) === conf.crisisGroup) crisis++;
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
    var ids = Object.keys(FBDATA.religions).sort();
    for (var i = 0; i < ids.length; i++) {
      var religionId = ids[i], conf = config(religionId);
      if (!conf || !dateReached(state, conf.minDate)) continue;
      var history = ensureHistory(state);
      history.unlockChecked[religionId] = true;
      var head = FB.religiousHeadOf(state, religionId);
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

  FB.greatHolyWarSeason = function (state) {
    var campaign = state && state.greatHolyWar;
    if (!campaign || campaign.phase !== 'active') return;
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
        addContribution(campaign, list[i].realm, 1);
      }
    }
    var playerPledge = state.player.greatHolyWar;
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
  FB.fns.ghw_service_safe = function (state) {
    var campaign = state.greatHolyWar;
    if (campaign) addContribution(campaign, 'player', 1);
  };
  FB.fns.ghw_service_danger = function (state) {
    var campaign = state.greatHolyWar;
    if (campaign) addContribution(campaign, 'player', 3);
  };

  FB.greatHolyWarTick = function (state) {
    FB.ensureGreatHolyWar(state);
    trackSacredLosses(state);
    var campaign = state.greatHolyWar;
    if (!campaign) {
      var history = ensureHistory(state);
      var unlockIds = Object.keys(FBDATA.religions).sort();
      for (var unlockIndex = 0; unlockIndex < unlockIds.length; unlockIndex++) {
        var unlockReligionId = unlockIds[unlockIndex];
        var unlockConf = config(unlockReligionId);
        if (!unlockConf || history.unlockChecked[unlockReligionId] ||
            !dateReached(state, unlockConf.minDate)) continue;
        history.unlockChecked[unlockReligionId] = true;
        var unlockHead = FB.religiousHeadOf(state, unlockReligionId);
        var unlockTargets = FB.greatHolyWarTargets(state, unlockReligionId);
        var unlockForced = (!history.firstLaunched[unlockReligionId] &&
          unlockConf.firstByYear && state.date.year >= unlockConf.firstByYear) ||
          guaranteedByLoss(state, unlockReligionId, unlockConf);
        if (unlockHead && unlockHead.id !== 'player' && unlockTargets.length &&
            (history.cooldownUntil[unlockReligionId] || 0) <= state.turn &&
            (unlockForced || FB.chance(crisisChance(
              state, unlockReligionId, unlockConf)))) {
          FB.callGreatHolyWar(state, unlockReligionId,
            unlockTargets[0].kingdomId, unlockHead.id);
          return;
        }
      }
      for (var religionId in history.headState) {
        var conf = config(religionId), hs = history.headState[religionId];
        if (!conf || history.firstLaunched[religionId] || !hs ||
            !isFinite(hs.restoredTurn) || state.turn - hs.restoredTurn < 360) continue;
        var head = FB.religiousHeadOf(state, religionId);
        var targets = FB.greatHolyWarTargets(state, religionId);
        if (head && head.id !== 'player' && targets.length &&
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
    if (!campaign.id || !validPhase || !config(campaign.callingReligion) ||
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
