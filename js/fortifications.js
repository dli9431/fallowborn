/* Fallowborn — county fortifications. Settlement-scoped `walls` records are
   strategic strongpoints: construction is sequential, garrisons reduce the
   field levy, and an unbreached hostile fort stops a host at the county.
   Everything stored here is plain additive save data. */
window.FB = window.FB || {};

(function () {
  'use strict';

  var cacheState = null;
  var cacheBuildings = null;
  var cache = null;

  function config() {
    return FBDATA.forts || { levels:{}, baseSiegeSteps:3 };
  }

  function levelDef(level) {
    return config().levels[Math.max(0, Math.min(4, Number(level) || 0))] || null;
  }

  FB.fortLevelDef = levelDef;

  FB.fortLevelName = function (state, level, viewer) {
    var def = levelDef(level);
    if (!def) return '';
    return FB.dataText
      ? FB.dataText(state, viewer || (state && state.player && state.player.charId),
          'fort', String(level), def, 'name', {})
      : def.name;
  };

  function rawBuildings(state, pid) {
    return state && state.buildings && state.buildings[pid] || [];
  }

  function rebuildIndex(state) {
    var next = { byCounty:{}, bySite:{}, forts:[], projects:[] };
    var buildings = state && state.buildings || {};
    for (var pid in buildings) {
      if (!Object.prototype.hasOwnProperty.call(buildings, pid)) continue;
      var list = buildings[pid];
      if (!Array.isArray(list)) continue;
      for (var i = 0; i < list.length; i++) {
        var record = list[i];
        if (!record || typeof record !== 'object' || record.id !== 'walls') continue;
        var indexed = { pid:pid, record:record };
        next.forts.push(indexed);
        next.bySite[pid + ':' + (record.s | 0)] = record;
        if (!record.ruined && !next.byCounty[pid]) next.byCounty[pid] = record;
        if (!record.ruined && record.targetLevel) next.projects.push(indexed);
      }
    }
    cacheState = state;
    cacheBuildings = buildings;
    cache = next;
    return next;
  }

  function indexOf(state) {
    if (cacheState !== state || cacheBuildings !== (state && state.buildings) || !cache) {
      return rebuildIndex(state);
    }
    return cache;
  }

  /* Fort mutations go through this file, so keep the live index current in
     place. In particular, annual AI construction must not invalidate and
     rescan every county once per holder. */
  function syncIndexedRecord(state, pid, record, newRecord, newProject) {
    var current = indexOf(state), projectIndex = -1;
    if (newRecord) current.forts.push({ pid:pid, record:record });
    current.bySite[pid + ':' + (record.s | 0)] = record;
    if (!record.ruined) current.byCounty[pid] = record;
    else if (current.byCounty[pid] === record) delete current.byCounty[pid];
    if (!record.ruined && record.targetLevel && newProject) {
      current.projects.push({ pid:pid, record:record });
    } else if (record.ruined || !record.targetLevel) {
      for (var i = 0; i < current.projects.length; i++) {
        if (current.projects[i].record === record) { projectIndex = i; break; }
      }
      if (projectIndex >= 0) current.projects.splice(projectIndex, 1);
    }
  }

  FB.invalidateFortIndex = function () {
    cacheState = null;
    cacheBuildings = null;
    cache = null;
  };

  FB.rebuildFortIndex = function (state) {
    return rebuildIndex(state);
  };

  FB.fortAt = function (state, pid, includeRuined) {
    var current = indexOf(state).byCounty[pid] || null;
    if (current || !includeRuined) return current;
    var list = rawBuildings(state, pid);
    for (var i = 0; i < list.length; i++) {
      if (list[i] && typeof list[i] === 'object' && list[i].id === 'walls') {
        return list[i];
      }
    }
    return null;
  };

  FB.fortAtSettlement = function (state, pid, settlement, includeRuined) {
    var current = indexOf(state).bySite[pid + ':' + (settlement | 0)] || null;
    return current && (!current.ruined || includeRuined) ? current : null;
  };

  FB.fortList = function (state) {
    return indexOf(state).forts.slice();
  };

  function playerHolds(state, pid) {
    return !!(state && state.player &&
      ((state.player.provs && state.player.provs.indexOf(pid) >= 0) ||
       (state.holder && state.holder[pid] === 'player')));
  }

  function siteExists(pid, settlement) {
    var info = FB.world && FB.world.sitesByProv && FB.world.sitesByProv[pid];
    return !!(info && info.list && info.list[settlement]);
  }

  function highestSupportedLevel(state, realmId) {
    var levels = config().levels;
    var best = 0;
    for (var level = 1; level <= 4; level++) {
      var def = levels[level];
      if (!def || !FB.techRequirementMet ||
          !FB.techRequirementMet(state, def.requiresTech, realmId)) break;
      best = level;
    }
    return best;
  }

  FB.fortHighestSupportedLevel = highestSupportedLevel;

  function normalizeRecord(state, pid, record) {
    var changed = false;
    if (!isFinite(Number(record.s)) || Number(record.s) < 0) {
      record.s = 0;
      changed = true;
    } else {
      var settlement = Math.floor(Number(record.s));
      if (settlement !== record.s) changed = true;
      record.s = settlement;
    }
    var legacy = record.level === undefined;
    var level = legacy ? (config().legacyLevel || 3) : Math.floor(Number(record.level));
    if (!isFinite(level)) level = 0;
    level = Math.max(0, Math.min(4, level));
    if (record.level !== level) {
      record.level = level;
      changed = true;
    }
    if (record.targetLevel !== undefined) {
      var target = Math.floor(Number(record.targetLevel));
      if (!isFinite(target) || target < 1 || target > 4 || target <= level ||
          !isFinite(Number(record.completeTurn))) {
        delete record.targetLevel;
        delete record.completeTurn;
        changed = true;
      } else {
        if (record.targetLevel !== target) changed = true;
        record.targetLevel = target;
        record.completeTurn = Math.max(Number(state.turn) || 0,
          Math.floor(Number(record.completeTurn)));
      }
    }
    if (legacy && !record.ruined && playerHolds(state, pid) &&
        record.maintenanceGraceUntil === undefined) {
      record.maintenanceGraceUntil = (Number(state.turn) || 0) +
        (config().legacyGraceSeasons || 4) * 90;
      changed = true;
    }
    return changed;
  }

  function seedAiSeats(state) {
    if (state.fortMigration) return false;
    var changed = false;
    var ids = Object.keys(state.realms || {}).sort();
    for (var i = 0; i < ids.length; i++) {
      var rid = ids[i];
      var realm = state.realms[rid];
      if (rid === 'player' || !realm || !realm.alive || realm.rank < 2 ||
          !realm.capital || playerHolds(state, realm.capital) ||
          FB.fortAt(state, realm.capital, true)) continue;
      var level = highestSupportedLevel(state, rid);
      if (!level || !siteExists(realm.capital, 0)) continue;
      state.buildings[realm.capital] = state.buildings[realm.capital] || [];
      var fort = { s:0, id:'walls', level:level };
      state.buildings[realm.capital].push(fort);
      syncIndexedRecord(state, realm.capital, fort, true, false);
      changed = true;
    }
    state.fortMigration = 1;
    return changed;
  }

  /* Save repair is deterministic and RNG-neutral. Bare building ids are
     normalized with the same head-settlement rule as FB.builtIn. Legacy
     walls become Stone Castles; only player-held legacy records receive the
     four-season old-rate maintenance grace. */
  FB.repairForts = function (state) {
    if (!state) return;
    state.buildings = state.buildings || {};
    var changed = false;
    for (var pid in state.buildings) {
      if (!Object.prototype.hasOwnProperty.call(state.buildings, pid) ||
          !Array.isArray(state.buildings[pid])) continue;
      var list = state.buildings[pid];
      for (var i = 0; i < list.length; i++) {
        if (typeof list[i] === 'string') {
          list[i] = { s:0, id:list[i] };
          changed = true;
        }
        if (list[i] && list[i].id === 'walls' && normalizeRecord(state, pid, list[i])) {
          changed = true;
        }
      }
    }
    if (changed) FB.invalidateFortIndex();
    seedAiSeats(state);
    rebuildIndex(state);
  };

  function projectStatus(state, pid, settlement, targetLevel, options) {
    options = options || {};
    var result = {
      ok:false, pid:pid, settlement:settlement | 0, targetLevel:targetLevel || 0,
      currentLevel:0, cost:0, seasons:0, completeTurn:null,
      missingTech:[], reason:'unavailable'
    };
    if (!state || !siteExists(pid, result.settlement)) {
      result.reason = 'settlement';
      return result;
    }
    var realmId = options.realm || 'player';
    if (realmId === 'player') {
      if (!playerHolds(state, pid)) { result.reason = 'ownership'; return result; }
      if (!state.player || state.player.tier < 3) { result.reason = 'rank'; return result; }
    } else {
      var directHolder = state.holder && state.holder[pid] || state.owner[pid];
      if (directHolder !== realmId) { result.reason = 'ownership'; return result; }
    }
    if (!options.contestedChecked && FB.fortCountyContested &&
        FB.fortCountyContested(state, pid, realmId)) {
      result.reason = 'contested';
      return result;
    }
    var fort = FB.fortAt(state, pid);
    var ruins = FB.fortAtSettlement(state, pid, result.settlement, true);
    if (ruins && ruins.ruined) { result.reason = 'ruins'; return result; }
    if (fort) {
      result.currentLevel = Number(fort.level) || 0;
      if (fort.s !== result.settlement) { result.reason = 'other_settlement'; return result; }
      if (fort.targetLevel) { result.reason = 'active_project'; return result; }
    }
    var expected = fort ? result.currentLevel + 1 : 1;
    result.targetLevel = targetLevel || expected;
    if (result.targetLevel !== expected || result.targetLevel > 4) {
      result.reason = result.currentLevel >= 4 ? 'maximum' : 'sequential';
      return result;
    }
    var def = levelDef(result.targetLevel);
    if (!def) { result.reason = 'maximum'; return result; }
    result.cost = realmId === 'player' && FB.marketCostQuote ?
      FB.marketCostQuote(state, def.cost,
        { materials:0.80, transport:0.15, wares:0.05 }, pid, 'up') : def.cost;
    result.seasons = def.seasons;
    result.completeTurn = (Number(state.turn) || 0) + def.seasons * 90;
    for (var i = 0; i < def.requiresTech.length; i++) {
      if (!FB.hasTech || !FB.hasTech(state, def.requiresTech[i], realmId)) {
        result.missingTech.push(def.requiresTech[i]);
      }
    }
    if (result.missingTech.length) { result.reason = 'technology'; return result; }
    if (realmId === 'player' && Number(state.player.gold) < result.cost) {
      result.reason = 'gold';
      return result;
    }
    result.ok = true;
    result.reason = null;
    return result;
  }

  FB.fortProjectStatus = projectStatus;

  FB.canStartFortProject = function (state, pid, settlement, targetLevel, options) {
    return projectStatus(state, pid, settlement, targetLevel, options).ok;
  };

  FB.startFortProject = function (state, pid, settlement, targetLevel, options) {
    options = options || {};
    var status = projectStatus(state, pid, settlement, targetLevel, options);
    if (!status.ok) return false;
    var realmId = options.realm || 'player';
    var fort = FB.fortAt(state, pid);
    var newRecord = !fort;
    if (realmId === 'player') state.player.gold -= status.cost;
    if (!fort) {
      state.buildings[pid] = state.buildings[pid] || [];
      fort = { s:settlement | 0, id:'walls', level:0 };
      state.buildings[pid].push(fort);
    }
    fort.targetLevel = status.targetLevel;
    fort.completeTurn = status.completeTurn;
    delete fort.ruined;
    syncIndexedRecord(state, pid, fort, newRecord, true);
    if (realmId === 'player') {
      var site = FB.world.sitesByProv[pid].list[settlement | 0];
      FB.news(state, FB.msg('news.fort.project_started',
        '🏰 Work begins on {fort} at {settlement}, {province}.', {
          fort:FB.dataParam('fort', String(status.targetLevel)),
          settlement:site ? site.name : FB.world.byId[pid].name,
          province:FB.world.byId[pid].name
        }));
    }
    if (FB.map) FB.map.request();
    return fort;
  };

  FB.demolishFort = function (state, pid, settlement) {
    if (!playerHolds(state, pid)) return false;
    var fort = FB.fortAtSettlement(state, pid, settlement, false);
    if (!fort) return false;
    fort.ruined = true;
    fort.level = 0;
    delete fort.targetLevel;
    delete fort.completeTurn;
    delete fort.maintenanceGraceUntil;
    syncIndexedRecord(state, pid, fort);
    if (FB.map) FB.map.request();
    return true;
  };

  /* Only active projects are visited daily; no county or realm scan sits on
     the daily path. The previous tier remains active during an upgrade. */
  FB.fortificationDay = function (state) {
    if (!state) return 0;
    var projects = indexOf(state).projects.slice();
    var completed = 0;
    for (var i = 0; i < projects.length; i++) {
      var item = projects[i], fort = item.record;
      if (fort.ruined || !fort.targetLevel || fort.completeTurn > state.turn) continue;
      var target = fort.targetLevel;
      var def = levelDef(target);
      fort.level = target;
      delete fort.targetLevel;
      delete fort.completeTurn;
      delete fort.maintenanceGraceUntil;
      completed++;
      if (playerHolds(state, item.pid) && def) {
        state.player.prestige += def.prestige;
        FB.news(state, FB.msg('news.fort.completed',
          '🏰 {fort} is completed in {province}; its defenses command the road.', {
            fort:FB.dataParam('fort', String(target)),
            province:FB.world.byId[item.pid] ? FB.world.byId[item.pid].name : item.pid
          }));
      }
    }
    if (completed) {
      var current = indexOf(state);
      current.projects = current.projects.filter(function (item) {
        return !item.record.ruined && !!item.record.targetLevel;
      });
      var armies = state.armies || [];
      for (var armyIndex = 0; armyIndex < armies.length; armyIndex++) {
        var army = armies[armyIndex];
        if (!FB.fortBlocksArmy(state, army.at, army)) continue;
        army.path = [];
        army.goal = null;
        army.moveLeft = 0;
      }
      if (FB.map) FB.map.request();
    }
    return completed;
  };

  FB.fortUpkeep = function (state) {
    var total = 0;
    var forts = indexOf(state).forts;
    for (var i = 0; i < forts.length; i++) {
      var item = forts[i], fort = item.record;
      if (fort.ruined || !fort.level || !playerHolds(state, item.pid)) continue;
      if (fort.maintenanceGraceUntil !== undefined &&
          state.turn <= fort.maintenanceGraceUntil) {
        total += config().legacyUpkeep || 1;
      } else {
        total += levelDef(fort.level).upkeep;
      }
    }
    return total;
  };

  FB.fortGarrisonBurden = function (state, subject) {
    var total = 0;
    var forts = indexOf(state).forts;
    for (var i = 0; i < forts.length; i++) {
      var item = forts[i], fort = item.record;
      if (fort.ruined || !fort.level) continue;
      var include = false;
      if (!subject || subject === 'player') include = playerHolds(state, item.pid);
      else if (state.realms && state.realms[subject]) {
        include = ((state.holder && state.holder[item.pid]) ||
          state.owner[item.pid]) === subject;
      } else include = item.pid === subject;
      if (include) total += levelDef(fort.level).garrison;
    }
    return total;
  };

  function realmFriendlyTo(state, realmId, controller) {
    if (!controller || realmId === controller) return true;
    var top = realmId === 'player'
      ? (FB.playerRealmId ? FB.playerRealmId(state) : 'player')
      : (FB.topRealm ? FB.topRealm(state, realmId) : realmId);
    if (top === controller) return true;
    return !!(FB.areAllied && FB.areAllied(state, realmId, controller));
  }

  FB.armyFriendlyProvince = function (state, army, pid) {
    if (!state || !army || !pid) return false;
    if (army.realm === 'player' && playerHolds(state, pid)) return true;
    var holder = state.holder && state.holder[pid];
    if (holder === army.realm) return true;
    return realmFriendlyTo(state, army.realm, state.owner[pid]);
  };

  function holyWarFortControl(state, army, pid) {
    var campaign = state.greatHolyWar;
    if (!campaign || campaign.phase !== 'active' ||
        !campaign.occupations || !campaign.occupations[pid] ||
        !FB.greatHolyWarCamp) return null;
    var camp = FB.greatHolyWarCamp(state, army.realm);
    if (!camp) return null;
    var occupation = campaign.occupations[pid];
    var controllingCamp = occupation.occupied ? 'attackers' : 'defenders';
    return camp === controllingCamp;
  }

  FB.fortBlocksArmy = function (state, pid, army) {
    var fort = FB.fortAt(state, pid);
    if (!fort || fort.ruined || !fort.level || !army) return false;
    var holyWarControl = holyWarFortControl(state, army, pid);
    if (holyWarControl !== null) return !holyWarControl;
    if (FB.armyFriendlyProvince(state, army, pid)) return false;
    return true;
  };

  FB.fortPinnedStatus = function (state, army) {
    if (!army || !FB.fortBlocksArmy(state, army.at, army)) return null;
    var fort = FB.fortAt(state, army.at), def = levelDef(fort.level);
    return {
      pid:army.at, fort:fort, level:fort.level,
      name:FB.fortLevelName(state, fort.level),
      retreat:army.from || null,
      minimum:def.garrison * (config().garrisonStrengthRatio || 3),
      shortage:Math.max(0,
        def.garrison * (config().garrisonStrengthRatio || 3) - (army.men || 0))
    };
  };

  FB.fortBattleBonus = function (state, pid, army) {
    var fort = FB.fortAt(state, pid);
    if (!fort || !fort.level || fort.ruined ||
        (army && FB.fortBlocksArmy(state, pid, army))) return 0;
    return levelDef(fort.level).defense;
  };

  function totalMen(hosts) {
    var total = 0;
    for (var i = 0; i < (hosts || []).length; i++) {
      total += Math.max(0, Number(hosts[i] && hosts[i].men) || 0);
    }
    return total;
  }

  FB.fortSiegeStatus = function (state, pid, siege, hosts) {
    siege = siege || {};
    var fort = FB.fortAt(state, pid);
    var level = siege.fortLevel !== undefined
      ? Math.max(0, Math.min(4, Number(siege.fortLevel) || 0))
      : (fort && !fort.ruined ? Number(fort.level) || 0 : 0);
    var def = levelDef(level);
    var garrison = def ? def.garrison : 0;
    var delay = def ? Math.max(0, Number(def.siegeDelay) || 0) : 0;
    var minimum = garrison * (config().garrisonStrengthRatio || 3);
    var present = Array.isArray(hosts) ? totalMen(hosts) :
      Math.max(0, Number(hosts && hosts.men) || Number(hosts) || 0);
    var progress = Math.max(0, Number(siege.progress) || 0);
    var required = (config().baseSiegeSteps || 3) + delay;
    return {
      pid:pid, fort:fort, level:level, delay:delay,
      name:def ? FB.fortLevelName(state, level) : null,
      garrison:garrison, minimum:minimum, present:present,
      shortage:Math.max(0, minimum - present),
      attrition:def ? Math.ceil(garrison *
        (config().seasonalAttritionRate || 0.15)) : 0,
      progress:progress, required:required, breached:progress >= required,
      canProgress:!level || present >= minimum
    };
  };

  function lossTotals() {
    var totals = { total:0 };
    var ids = FB.unitClassIds ? FB.unitClassIds() :
      ['levy', 'arch', 'cav', 'ret', 'mercs'];
    for (var i = 0; i < ids.length; i++) totals[ids[i]] = 0;
    return totals;
  }

  function mergeLosses(total, losses) {
    for (var key in losses) {
      if (key in total) total[key] += Number(losses[key]) || 0;
    }
  }

  function applyProportionalLosses(state, hosts, casualties) {
    var losses = lossTotals();
    hosts = (hosts || []).filter(function (host) { return host && host.men > 0; });
    var men = totalMen(hosts);
    casualties = Math.min(men, Math.max(0, Math.round(casualties || 0)));
    if (!casualties || !men) return losses;
    var allocations = [], assigned = 0;
    for (var i = 0; i < hosts.length; i++) {
      var exact = casualties * hosts[i].men / men;
      var amount = Math.floor(exact);
      assigned += amount;
      allocations.push({ host:hosts[i], amount:amount, fraction:exact - amount,
        key:String(hosts[i].realm || '') + ':' + String(hosts[i].id || '') });
    }
    allocations.sort(function (a, b) {
      return b.fraction - a.fraction || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    });
    for (i = 0; assigned < casualties; i++, assigned++) {
      allocations[i % allocations.length].amount++;
    }
    for (i = 0; i < allocations.length; i++) {
      var hostLosses = FB.applyHostLosses
        ? FB.applyHostLosses(allocations[i].host, allocations[i].amount)
        : { total:0 };
      mergeLosses(losses, hostLosses);
      if (allocations[i].host.realm === 'player' &&
          FB.notePlayerWarTroopLosses) {
        FB.notePlayerWarTroopLosses(state, hostLosses);
      }
      if (allocations[i].host.men <= 0 && FB.disbandArmy) {
        state.armyDown = state.armyDown || {};
        state.armyDown[allocations[i].host.realm] = state.turn;
        FB.disbandArmy(state, allocations[i].host);
      }
    }
    return losses;
  }

  /* Shared ordinary/AI siege pulse. `record` remains the caller's compact
     serializable object; key options let legacy numeric siege fields coexist
     with the new tier snapshot. */
  FB.advanceFortSiegePulse = function (state, pid, record, options) {
    options = options || {};
    var progressKey = options.progressKey || 'progress';
    var levelKey = options.levelKey || 'fortLevel';
    var hosts = options.hosts || [];
    if (record[levelKey] === undefined) {
      var active = FB.fortAt(state, pid);
      record[levelKey] = active && !active.ruined ? Number(active.level) || 0 : 0;
    }
    var probe = { fortLevel:record[levelKey], progress:record[progressKey] || 0 };
    var status = FB.fortSiegeStatus(state, pid, probe, hosts);
    if (options.contested || !status.canProgress) {
      status.stalled = options.contested ? 'contested' : 'shortage';
      return status;
    }
    var losses = status.attrition
      ? applyProportionalLosses(state, hosts, status.attrition) : lossTotals();
    record[progressKey] = (Number(record[progressKey]) || 0) +
      (options.progressAmount === undefined ? 1 : options.progressAmount);
    record.lastSiegeTurn = state.turn;
    if (options.playerCampaign && status.level && FB.adjustWarStrength) {
      FB.adjustWarStrength(state, -(config().campaignStrengthLoss || 0.05), {
        source:'fort_siege_attrition', condition:'thin_ranks', troopLosses:losses
      });
    }
    status = FB.fortSiegeStatus(state, pid, {
      fortLevel:record[levelKey], progress:record[progressKey]
    }, hosts);
    status.losses = losses;
    status.stalled = null;
    return status;
  };

  FB.fortCountyContested = function (state, pid, realmId) {
    var armies = state.armies || [];
    var friendlyRealm = realmId === 'player' ? 'player' :
      (FB.topRealm ? FB.topRealm(state, realmId) : realmId);
    var friendly = { realm:friendlyRealm };
    for (var i = 0; i < armies.length; i++) {
      if (armies[i].at !== pid) continue;
      if (FB.armiesHostile && FB.armiesHostile(state, armies[i], friendly)) return true;
    }
    var campaign = state.greatHolyWar;
    var occupation = campaign && campaign.occupations && campaign.occupations[pid];
    return !!(occupation && (occupation.progress || occupation.occupied));
  };

  function foreignFrontier(state, pid, rid) {
    var ownTop = FB.topRealm ? FB.topRealm(state, rid) : rid;
    var adj = FB.world.adj[pid] || {};
    for (var nb in adj) {
      var other = state.owner[nb];
      if (other && other !== ownTop) return true;
    }
    return false;
  }

  function nextAiTier(state, rid, pid) {
    var fort = FB.fortAt(state, pid);
    if (fort && fort.targetLevel) return 0;
    var next = fort ? (Number(fort.level) || 0) + 1 : 1;
    var highest = highestSupportedLevel(state, rid);
    return next <= highest ? next : 0;
  }

  /* One annual O(realms + counties) pass accumulates works and builds one
     stable-priority project per living AI holder at most. */
  FB.fortAIYear = function (state) {
    var held = {}, directDevelopment = {}, contested = {};
    var ids = Object.keys(state.realms || {}).sort();
    var year = Number(state.date && state.date.year) || 0;
    for (var i = 0; i < ids.length; i++) held[ids[i]] = [];
    for (var pid in state.dev) {
      if (!Object.prototype.hasOwnProperty.call(state.dev, pid)) continue;
      var holder = state.holder && state.holder[pid] || state.owner[pid];
      var realm = state.realms[holder];
      if (!realm || !realm.alive || holder === 'player') continue;
      if (!held[holder]) held[holder] = [];
      held[holder].push(pid);
      directDevelopment[holder] = (directDevelopment[holder] || 0) +
        Math.max(0, Number(state.dev[pid]) || 0);
    }
    /* Keep the yearly pass idempotent. A repaired save or diagnostic caller
       may invoke the world-year seam twice, but a holder earns its directly
       held development only once for that calendar year. */
    for (i = 0; i < ids.length; i++) {
      var accrualId = ids[i], accrualRealm = state.realms[accrualId];
      if (accrualId === 'player' || !accrualRealm || !accrualRealm.alive ||
          !directDevelopment[accrualId] || accrualRealm.fortWorksYear === year) continue;
      accrualRealm.fortWorks = Math.min(config().aiWorksCap || 400,
        (Number(accrualRealm.fortWorks) || 0) + directDevelopment[accrualId]);
      accrualRealm.fortWorksYear = year;
    }
    var armies = state.armies || [];
    for (i = 0; i < armies.length; i++) {
      var armyPid = armies[i].at;
      var armyHolder = state.holder && state.holder[armyPid] || state.owner[armyPid];
      var armyController = !armyHolder ? null : armyHolder === 'player' ? 'player' :
        (FB.topRealm ? FB.topRealm(state, armyHolder) : armyHolder);
      if (armyController && FB.armiesHostile &&
          FB.armiesHostile(state, armies[i], { realm:armyController })) {
        contested[armyPid] = true;
      }
    }
    var campaign = state.greatHolyWar;
    var occupations = campaign && campaign.occupations || {};
    for (pid in occupations) {
      if (occupations[pid] &&
          (occupations[pid].progress || occupations[pid].occupied)) {
        contested[pid] = true;
      }
    }
    for (i = 0; i < ids.length; i++) {
      var rid = ids[i], r = state.realms[rid];
      if (rid === 'player' || !r || !r.alive || r.fortProjectYear === year) continue;
      var chosen = null;
      var counties = held[rid] || [];
      for (var j = 0; j < counties.length; j++) {
        pid = counties[j];
        var target = nextAiTier(state, rid, pid);
        if (!target || contested[pid]) continue;
        var def = levelDef(target);
        if ((Number(r.fortWorks) || 0) < def.work) continue;
        var candidate = {
          pid:pid, target:target, work:def.work,
          priority:pid === r.capital ? 0 : (foreignFrontier(state, pid, rid) ? 1 : 2),
          development:Number(state.dev[pid]) || 0
        };
        if (!chosen || candidate.priority < chosen.priority ||
            (candidate.priority === chosen.priority &&
             candidate.development > chosen.development) ||
            (candidate.priority === chosen.priority &&
             candidate.development === chosen.development &&
             candidate.pid < chosen.pid)) chosen = candidate;
      }
      if (!chosen) continue;
      var existing = FB.fortAt(state, chosen.pid);
      var settlement = existing ? existing.s : 0;
      if (FB.startFortProject(state, chosen.pid, settlement, chosen.target,
          { realm:rid, ai:true, contestedChecked:true })) {
        r.fortWorks -= chosen.work;
        r.fortProjectYear = year;
      }
    }
  };

  FB.advanceAIYearlyFortSiege = function (state, war, pid, besiegerRealm) {
    war.fortSieges = war.fortSieges || {};
    var siege = war.fortSieges[pid] = war.fortSieges[pid] || { progress:0 };
    /* any of the besieger's hosts standing on the fort presses the siege —
       a detachment's work counts, not only the main body's */
    var besiegers = [];
    var hosts = FB.hostsOf ? FB.hostsOf(state, besiegerRealm) : [];
    for (var h = 0; h < hosts.length; h++) {
      if (hosts[h].at === pid && FB.fortBlocksArmy(state, pid, hosts[h])) {
        besiegers.push(hosts[h]);
      }
    }
    besiegers.sort(function (a, b) { return b.men - a.men; });
    var host = besiegers.length ? besiegers[0]
      : (FB.hostOf ? FB.hostOf(state, besiegerRealm) : null);
    if (!host || host.at !== pid || !FB.fortBlocksArmy(state, pid, host)) {
      return FB.fortSiegeStatus(state, pid, siege, host ? [host] : []);
    }
    var contested = false;
    var here = FB.armiesAt ? FB.armiesAt(state, pid) : [];
    for (var i = 0; i < here.length; i++) {
      if (here[i] !== host && FB.armiesHostile(state, host, here[i])) {
        contested = true;
        break;
      }
    }
    var status = null;
    for (i = 0; i < 4; i++) {
      status = FB.advanceFortSiegePulse(state, pid, siege, {
        hosts:besiegers, contested:contested,
        progressAmount:1 + (FB.techBonus ? FB.techBonus(state, 'siege', besiegerRealm) * 3 : 0)
      });
      if (status.stalled || status.breached || host.men <= 0) break;
    }
    if (status && status.breached) siege.breached = true;
    return status;
  };

  FB.decayAIYearlyFortSieges = function (war, activePid) {
    if (!war || !war.fortSieges) return;
    for (var pid in war.fortSieges) {
      if (pid === activePid || !war.fortSieges[pid]) continue;
      war.fortSieges[pid].progress = Math.max(0,
        (Number(war.fortSieges[pid].progress) || 0) - 4);
    }
  };

  FB.fortBadgeDescriptor = function (state, pid, settlement) {
    var fort = FB.fortAtSettlement(state, pid, settlement, false);
    if (!fort) return null;
    return {
      level:Number(fort.level) || 0,
      marks:(Number(fort.level) || Number(fort.targetLevel) || 1),
      constructing:!!fort.targetLevel,
      targetLevel:Number(fort.targetLevel) || null
    };
  };

  /* Shape and repeated marks carry the badge without depending on color.
     Construction is a crossed diagonal in the badge corner. */
  FB.renderFortBadge = function (ctx, state, site, x, y, half, dpr) {
    var badge = FB.fortBadgeDescriptor(state, site.pid, site.index);
    if (!badge) return;
    var size = 5.5 * dpr;
    var bx = x + (half || 4 * dpr) * 0.72;
    var by = y - (half || 4 * dpr) * 0.72;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bx - size, by - size * 0.7);
    ctx.lineTo(bx + size, by - size * 0.7);
    ctx.lineTo(bx + size * 0.78, by + size * 0.45);
    ctx.lineTo(bx, by + size);
    ctx.lineTo(bx - size * 0.78, by + size * 0.45);
    ctx.closePath();
    ctx.fillStyle = 'rgba(24,18,10,0.9)';
    ctx.fill();
    ctx.strokeStyle = '#f5df9a';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.stroke();
    ctx.fillStyle = '#f5df9a';
    var gap = size * 1.2 / Math.max(1, badge.marks - 1);
    for (var i = 0; i < badge.marks; i++) {
      var mx = badge.marks === 1 ? bx : bx - size * 0.6 + gap * i;
      ctx.beginPath();
      ctx.rect(mx - 0.65 * dpr, by - 1.4 * dpr, 1.3 * dpr, 3.4 * dpr);
      ctx.fill();
    }
    if (badge.constructing) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.2, 1.2 * dpr);
      ctx.beginPath();
      ctx.moveTo(bx + size * 0.35, by - size * 0.95);
      ctx.lineTo(bx + size * 0.95, by - size * 0.35);
      ctx.moveTo(bx + size * 0.95, by - size * 0.95);
      ctx.lineTo(bx + size * 0.35, by - size * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  };
})();
