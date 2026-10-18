/* Fallowborn — county fortifications. Settlement-scoped records of the
   fortification-role building (`walls` in the shipped data) are
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

  /* Building roles. A building says what it is; engine code asks for the
     role, never a building id, so a period or regional building is data.
     Role names deliberately differ from building ids. A building without a
     role (legacy runtime mods) is a fortification when it sets fort, and
     otherwise "unassigned". Exactly one building may be the fortification: the
     strategic strongpoint whose saved records these helpers manage. */
  FB.BUILDING_ROLES = {
    fortification:1, milling:1, food_store:1, crossing:1, marketplace:1,
    worship:1, port:1, shipyard:1, scholarship:1, stronghold:1, garrison:1,
    training:1, civic:1, industry:1, care:1, banking:1, unassigned:1
  };

  FB.buildingRole = function (id) {
    var def = FBDATA.buildings && Object.prototype.hasOwnProperty.call(FBDATA.buildings, id)
      ? FBDATA.buildings[id] : null;
    if (!def) return null;
    if (typeof def.role === 'string' && def.role) return def.role;
    return def.fort ? 'fortification' : 'unassigned';
  };

  FB.isFortificationBuilding = function (id) {
    return FB.buildingRole(id) === 'fortification';
  };

  /* The single fortification building's id; data validation guarantees one. */
  FB.fortificationBuildingId = function () {
    var table = FBDATA.buildings || {};
    for (var id in table) {
      if (Object.prototype.hasOwnProperty.call(table, id) &&
          FB.isFortificationBuilding(id)) return id;
    }
    return null;
  };

  function buildingScopeReferences() {
    var counties = Object.create(null);
    function add(rows) {
      if (!Array.isArray(rows)) return;
      rows.forEach(function (row) {
        if (row && typeof row.id === 'string') counties[row.id] = true;
      });
    }
    add(FBDATA.provinces);
    Object.keys(FBDATA.geographies || {}).forEach(function (id) {
      var geography = FBDATA.geographies[id];
      if (!geography) return;
      add(geography.provinces);
      add(geography.provinceAdditions);
    });
    return { eras:FBDATA.eras || {}, countyIds:counties,
      cultures:FBDATA.cultures || {}, traditions:FBDATA.techTraditions || {} };
  }

  function buildingScopeFaults(scope, refs) {
    var errors = [], own = Object.prototype.hasOwnProperty;
    if (!scope || typeof scope !== 'object' || Array.isArray(scope))
      return ['applicability must be an object.'];
    var allowed = { yearMin:1, yearMax:1, eras:1, countyIds:1, cultures:1, traditions:1 };
    Object.keys(scope).forEach(function (key) {
      if (!own.call(allowed, key)) errors.push('applicability has unknown key ' + key + '.');
    });
    ['yearMin','yearMax'].forEach(function (key) {
      if (scope[key] !== undefined && (typeof scope[key] !== 'number' ||
          !isFinite(scope[key]) || Math.floor(scope[key]) !== scope[key]))
        errors.push('applicability.' + key + ' must be a finite integer.');
    });
    if (scope.yearMin !== undefined && scope.yearMax !== undefined && scope.yearMin > scope.yearMax)
      errors.push('applicability yearMin must not exceed yearMax.');
    ['eras','countyIds','cultures','traditions'].forEach(function (key) {
      var list = scope[key];
      if (list === undefined) return;
      if (!Array.isArray(list) || !list.length) {
        errors.push('applicability.' + key + ' must be a nonempty list.');
        return;
      }
      var seen = Object.create(null);
      list.forEach(function (id) {
        if (typeof id !== 'string' || !own.call(refs[key], id))
          errors.push('applicability.' + key + ' has unknown reference ' + String(id) + '.');
        else if (seen[id]) errors.push('applicability.' + key + ' has duplicate ' + id + '.');
        seen[id] = true;
      });
    });
    return errors;
  }

  /* New construction only. Read the target's declared resident identity and
     the payer's sovereign knowledge without normalizing or creating state. */
  FB.buildingApplicabilityStatus = function (state, pid, id, payer) {
    var def = FBDATA.buildings && FBDATA.buildings[id];
    function blocked(code, reason) { return { ready:false, code:code, reason:reason }; }
    if (!def) return blocked('unavailable', FB.T('This building is unavailable.'));
    if (def.applicability === undefined) return { ready:true, code:null, reason:'' };
    var scope = def.applicability;
    var pr = FB.world && FB.world.byId && FB.world.byId[pid];
    if (!scope || typeof scope !== 'object' || Array.isArray(scope) || !state || !pr || pr.wasteland)
      return blocked('context', FB.T('Construction context is unavailable.'));
    var year = state.date && state.date.year;
    if (scope.yearMin !== undefined || scope.yearMax !== undefined) {
      if (typeof year !== 'number' || !isFinite(year) || Math.floor(year) !== year)
        return blocked('context', FB.T('Construction context is unavailable.'));
      if (scope.yearMin !== undefined && year < scope.yearMin)
        return blocked('yearMin', FB.T('Construction is available from {year}.', { year:scope.yearMin }));
      if (scope.yearMax !== undefined && year > scope.yearMax)
        return blocked('yearMax', FB.T('Construction was available through {year}.', { year:scope.yearMax }));
    }
    if (scope.eras) {
      if (state.start && state.start.era !== undefined &&
          !Object.prototype.hasOwnProperty.call(FBDATA.eras, state.start.era))
        return blocked('context', FB.T('Construction context is unavailable.'));
      if (scope.eras.indexOf(FB.campaignEra(state)) < 0)
        return blocked('eras', FB.T('Construction is unavailable in this campaign era.'));
    }
    if (scope.countyIds && scope.countyIds.indexOf(pid) < 0)
      return blocked('countyIds', FB.T('Construction is unavailable in this county.'));
    if (scope.cultures) {
      var population = state.population && state.population.counties && state.population.counties[pid];
      var culture = population && population.identity ? population.identity.culture : pr.culture;
      if (!culture || !FB.cultureExists(culture, state))
        return blocked('context', FB.T('Construction context is unavailable.'));
      if (scope.cultures.indexOf(culture) < 0)
        return blocked('cultures', FB.T('Construction is unavailable for this county’s resident culture.'));
    }
    if (scope.traditions) {
      if (!state.player || !state.realms || !state.chars)
        return blocked('context', FB.T('Construction context is unavailable.'));
      var actor = FB.settlementActor(state, payer);
      var realmId = actor.kind === 'realm' ? actor.id : FB.settlementCountyHolder(state, pid);
      if (realmId === 'player' && !(state.realms && state.realms.player && state.realms.player.alive))
        realmId = FB.settlementCountyHolder(state, pid);
      var realm = realmId && state.realms && state.realms[realmId];
      if ((actor.kind !== 'realm' && actor.kind !== 'character') || !realm || !realm.alive ||
          actor.kind === 'character' &&
          (!state.chars[actor.id] || state.chars[actor.id].dead))
        return blocked('context', FB.T('Construction context is unavailable.'));
      var sovereign = FB.techRealmId(state, realmId);
      if (!state.realms[sovereign] || !state.realms[sovereign].alive)
        return blocked('context', FB.T('Construction context is unavailable.'));
      var learningCulture = FB.techCulture(state, sovereign);
      var explicit = state.realms[sovereign].techTraditions;
      if (!(Array.isArray(explicit) && explicit.length) &&
          (!learningCulture || !FB.cultureExists(learningCulture, state)))
        return blocked('context', FB.T('Construction context is unavailable.'));
      var traditions = FB.techTraditionsForRealm(state, sovereign);
      if (!traditions.length || traditions.some(function (tradition) {
        return !Object.prototype.hasOwnProperty.call(FBDATA.techTraditions, tradition);
      })) return blocked('context', FB.T('Construction context is unavailable.'));
      if (!traditions.some(function (tradition) { return scope.traditions.indexOf(tradition) >= 0; }))
        return blocked('traditions', FB.T('Construction is unavailable for the payer’s national learning traditions.'));
    }
    return { ready:true, code:null, reason:'' };
  };

  /* Validation errors for a buildings table (an empty list when valid).
     requireRole: shipped data must declare every role explicitly. */
  FB.validateBuildingData = function (table, requireRole) {
    var errors = [];
    var forts = [];
    var scopeRefs = null;
    var groups = Object.create(null);
    for (var id in table || {}) {
      if (!Object.prototype.hasOwnProperty.call(table, id)) continue;
      var def = table[id];
      if (!def || typeof def !== 'object' || Array.isArray(def)) {
        errors.push('Building ' + id + ' must be an object.');
        continue;
      }
      if (def.role !== undefined &&
          (typeof def.role !== 'string' || !FB.BUILDING_ROLES[def.role])) {
        errors.push('Building ' + id + ' has unknown role ' + def.role + '.');
      } else if (def.role === undefined && requireRole) {
        errors.push('Building ' + id + ' needs a role.');
      }
      var role = typeof def.role === 'string' && def.role ? def.role
        : (def.fort ? 'fortification' : 'unassigned');
      if ((role === 'fortification') !== !!def.fort) {
        errors.push('Building ' + id + ' must set fort exactly when its role is fortification.');
      }
      if (role === 'fortification') forts.push(id);
      if (def.aiBuildOrder !== undefined &&
          (typeof def.aiBuildOrder !== 'number' || !isFinite(def.aiBuildOrder))) {
        errors.push('Building ' + id + ' aiBuildOrder must be a finite number.');
      }
      if (def.settlementDraw !== undefined && typeof def.settlementDraw !== 'boolean') {
        errors.push('Building ' + id + ' settlementDraw must be true or false.');
      }
      if (def.applicability !== undefined) {
        if (!scopeRefs) scopeRefs = buildingScopeReferences();
        buildingScopeFaults(def.applicability, scopeRefs).forEach(function (error) {
          errors.push('Building ' + id + ' ' + error);
        });
      }
      if (def.constructionGroup !== undefined) {
        var group = def.constructionGroup;
        if (!group || typeof group !== 'object' || Array.isArray(group) ||
            !Object.prototype.hasOwnProperty.call(group, 'id') ||
            !Object.prototype.hasOwnProperty.call(group, 'maxCounty') ||
            Object.keys(group).some(function (key) { return key !== 'id' && key !== 'maxCounty'; }) ||
            typeof group.id !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(group.id) ||
            group.id === '__proto__' || group.id === 'constructor' || group.id === 'prototype' ||
            typeof group.maxCounty !== 'number' || !isFinite(group.maxCounty) ||
            Math.floor(group.maxCounty) !== group.maxCounty || group.maxCounty < 1 || group.maxCounty > 2048) {
          errors.push('Building ' + id + ' constructionGroup needs a safe id and integer maxCounty from 1 to 2048, with no other fields.');
        } else if (groups[group.id] !== undefined && groups[group.id] !== group.maxCounty) {
          errors.push('Building ' + id + ' constructionGroup disagrees on maxCounty for ' + group.id + '.');
        } else {
          groups[group.id] = group.maxCounty;
        }
      }
    }
    if (forts.length !== 1) {
      errors.push('Exactly one building must have the fortification role; found ' +
        (forts.length ? forts.join(', ') : 'none') + '.');
    }
    if (FB.buildingOperations) errors = errors.concat(FB.buildingOperations.catalogFaults({buildings:table,buildingOperationProfiles:FBDATA.buildingOperationProfiles}));
    if (FB.buildingInstitutionCatalogFaults) errors = errors.concat(FB.buildingInstitutionCatalogFaults({
      buildings:table, buildingInstitutionProfiles:FBDATA.buildingInstitutionProfiles
    }));
    return errors;
  };

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
    var next = { byCounty:{}, countyForts:{}, bySite:{}, forts:[], projects:[] };
    var buildings = state && state.buildings || {};
    var fortId = FB.fortificationBuildingId();
    for (var pid in buildings) {
      if (!Object.prototype.hasOwnProperty.call(buildings, pid)) continue;
      var list = buildings[pid];
      if (!Array.isArray(list)) continue;
      for (var i = 0; i < list.length; i++) {
        var record = list[i];
        if (!record || typeof record !== 'object' || record.id !== fortId) continue;
        var indexed = { pid:pid, record:record };
        next.forts.push(indexed);
        (next.countyForts[pid] || (next.countyForts[pid] = [])).push(indexed);
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
    if (newRecord) {
      var indexed = { pid:pid, record:record };
      current.forts.push(indexed);
      (current.countyForts[pid] || (current.countyForts[pid] = [])).push(indexed);
    }
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
    if (FB.invalidateBuildingIndex) FB.invalidateBuildingIndex(state, pid);
  }

  FB.invalidateFortIndex = function () {
    cacheState = null;
    cacheBuildings = null;
    cache = null;
    if (FB.invalidateBuildingIndex) FB.invalidateBuildingIndex();
  };

  FB.rebuildFortIndex = function (state) {
    if (FB.invalidateBuildingIndex) FB.invalidateBuildingIndex(state);
    return rebuildIndex(state);
  };

  FB.fortAt = function (state, pid, includeRuined) {
    var current = indexOf(state).byCounty[pid] || null;
    if (current || !includeRuined) return current;
    var list = rawBuildings(state, pid);
    var fortId = FB.fortificationBuildingId();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && typeof list[i] === 'object' && list[i].id === fortId) {
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
      ((state.holder && state.holder[pid]) || (state.owner && state.owner[pid])) === 'player');
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
    if (state.openingInfrastructureState !== undefined) return false;
    if (state.fortMigration) return false;
    var changed = false;
    var ids = Object.keys(state.realms || {}).sort();
    for (var i = 0; i < ids.length; i++) {
      var rid = ids[i];
      var realm = state.realms[rid];
      if (rid === 'player' || !realm || !realm.alive || !FB.realmRank.isDucal(realm, state) ||
          !realm.capital || playerHolds(state, realm.capital) ||
          FB.fortAt(state, realm.capital, true)) continue;
      var level = highestSupportedLevel(state, rid);
      if (!level || !siteExists(realm.capital, 0)) continue;
      state.buildings[realm.capital] = state.buildings[realm.capital] || [];
      var fort = { s:0, id:FB.fortificationBuildingId(), level:level };
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
    FB.validateOpeningInfrastructureState(state);
    state.buildings = state.buildings || {};
    var changed = false;
    var fortId = FB.fortificationBuildingId();
    for (var pid in state.buildings) {
      if (!Object.prototype.hasOwnProperty.call(state.buildings, pid) ||
          !Array.isArray(state.buildings[pid])) continue;
      var list = state.buildings[pid];
      for (var i = 0; i < list.length; i++) {
        if (typeof list[i] === 'string') {
          list[i] = { s:0, id:list[i] };
          changed = true;
        }
        if (list[i] && list[i].id === fortId && normalizeRecord(state, pid, list[i])) {
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
    if (FB.homeAuthority && !FB.homeAuthority.quote(state, realmId, 'spend', {provinceId:pid}).allowed) {
      result.reason = 'home_authority'; return result;
    }
    if (realmId === 'player') {
      if (!playerHolds(state, pid)) { result.reason = 'ownership'; return result; }
      if (!state.player || !FB.station.isLanded(state.player, state)) { result.reason = 'rank'; return result; }
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
    var repairing = options.repair === true;
    if (repairing && (!ruins || !ruins.ruined || fort)) {
      result.reason = fort ? 'other_settlement' : 'ruins'; return result;
    }
    if (ruins && ruins.ruined && !repairing) { result.reason = 'ruins'; return result; }
    if (fort) {
      result.currentLevel = Number(fort.level) || 0;
      if (fort.s !== result.settlement) { result.reason = 'other_settlement'; return result; }
      if (fort.targetLevel) { result.reason = 'active_project'; return result; }
    }
    if (!repairing) {
      var applicability = FB.buildingApplicabilityStatus(state, pid, FB.fortificationBuildingId(), realmId);
      if (!applicability.ready) {
        result.reason = 'applicability';
        result.applicability = applicability;
        return result;
      }
    }
    if (!fort && !repairing && FB.buildingConstructionGroupStatus) {
      var groupStatus = FB.buildingConstructionGroupStatus(state, pid, FB.fortificationBuildingId());
      if (!groupStatus.ok) { result.reason = 'construction_group'; return result; }
    }
    var expected = repairing ? Math.max(1, Math.min(4,
      Math.floor(Number(ruins.ruinedLevel || ruins.level) || 1))) : fort ? result.currentLevel + 1 : 1;
    result.targetLevel = targetLevel || expected;
    if (result.targetLevel !== expected || result.targetLevel > 4) {
      result.reason = result.currentLevel >= 4 ? 'maximum' : 'sequential';
      return result;
    }
    var def = levelDef(result.targetLevel);
    if (!def) { result.reason = 'maximum'; return result; }
    var baseCost = def.cost * (repairing ? 0.5 : 1);
    result.cost = realmId === 'player' && FB.marketCostQuote ?
      FB.marketCostQuote(state, baseCost,
        { materials:0.80, transport:0.15, wares:0.05 }, pid, 'up') : baseCost;
    result.seasons = def.seasons;
    result.completeTurn = (Number(state.turn) || 0) + def.seasons * 90;
    for (var i = 0; i < def.requiresTech.length; i++) {
      if (!repairing && (!FB.hasTech || !FB.hasTech(state, def.requiresTech[i], realmId))) {
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
    var fort = options.repair ? FB.fortAtSettlement(state, pid, settlement, true) : FB.fortAt(state, pid);
    var newRecord = !fort;
    if (realmId === 'player') state.player.gold -= status.cost;
    if (!fort) {
      state.buildings[pid] = state.buildings[pid] || [];
      fort = { s:settlement | 0, id:FB.fortificationBuildingId(), level:0 };
      state.buildings[pid].push(fort);
    }
    fort.targetLevel = status.targetLevel;
    fort.completeTurn = status.completeTurn;
    if (options.repair) { fort.level = 0; fort.repairing = true; }
    delete fort.ruined;
    syncIndexedRecord(state, pid, fort, newRecord, true);
    if (FB.reconcileSettlementCommunities) {
      FB.reconcileSettlementCommunities(state, pid);
    }
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
    var building = FBDATA.buildings[FB.fortificationBuildingId()];
    var grouped = !!(building && building.constructionGroup);
    var fort = FB.fortAtSettlement(state, pid, settlement, grouped);
    if (!fort) return false;
    if (grouped) {
      var list = rawBuildings(state, pid), at = list.indexOf(fort);
      if (at < 0) return false;
      list.splice(at, 1);
      FB.invalidateFortIndex();
      if (FB.reconcileSettlementCommunities) FB.reconcileSettlementCommunities(state, pid);
      if (FB.map) FB.map.request();
      return true;
    }
    fort.ruinedLevel = Math.max(1, fort.level ||
      (fort.repairing ? fort.targetLevel : 0) || fort.ruinedLevel || 1);
    fort.ruined = true;
    fort.level = 0;
    delete fort.targetLevel;
    delete fort.completeTurn;
    delete fort.maintenanceGraceUntil;
    delete fort.repairing;
    syncIndexedRecord(state, pid, fort);
    if (FB.reconcileSettlementCommunities) {
      FB.reconcileSettlementCommunities(state, pid);
    }
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
      var repairing = fort.repairing === true;
      fort.level = target;
      delete fort.targetLevel;
      delete fort.completeTurn;
      delete fort.maintenanceGraceUntil;
      delete fort.repairing;
      delete fort.ruinedLevel;
      if (FB.invalidateBuildingIndex) {
        FB.invalidateBuildingIndex(state, item.pid);
      }
      if (FB.reconcileSettlementCommunities) {
        FB.reconcileSettlementCommunities(state, item.pid);
      }
      completed++;
      if (playerHolds(state, item.pid) && def) {
        if (!repairing) state.player.prestige += def.prestige;
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

  FB.fortGarrisonBurden = function (state, subject, recruitmentRealm, recruitment) {
    var total = 0;
    var index = indexOf(state), forts = index.forts;
    if (recruitment && recruitment.counties && subject === recruitmentRealm && subject !== 'player') {
      forts = [];
      for (var c = 0; c < recruitment.counties.length; c++) {
        var county = index.countyForts[recruitment.counties[c]] || [];
        for (var f = 0; f < county.length; f++) forts.push(county[f]);
      }
    }
    for (var i = 0; i < forts.length; i++) {
      var item = forts[i], fort = item.record;
      if (fort.ruined || !fort.level) continue;
      var include = false;
      if (!subject || subject === 'player') include = playerHolds(state, item.pid);
      else if (state.realms && state.realms[subject]) {
        include = ((state.holder && state.holder[item.pid]) ||
          state.owner[item.pid]) === subject;
      } else include = item.pid === subject;
      if (!include) continue;
      // Recruitment restrictions matter only for forts charged to this holder.
      // Checking every foreign fort first multiplied campaign scans per muster.
      if (recruitmentRealm && FB.recruitmentCountyBlocked) {
        if (recruitment && recruitment.blocked.indexOf(item.pid) >= 0) continue;
        if ((!recruitment || recruitment.eligible.indexOf(item.pid) < 0) &&
            FB.recruitmentCountyBlocked(state, recruitmentRealm, item.pid)) continue;
      }
      total += levelDef(fort.level).garrison;
    }
    return total;
  };

  function resolveArmyTopRealm(state, realmId) {
    if (!state || !realmId) return null;
    if (realmId === 'player') {
      if (state.realms && state.realms.player && state.realms.player.alive && state.realms.player.liege) {
        return FB.topRealm(state, state.realms.player.liege);
      }
      if (state.player && state.player.liege) {
        return FB.topRealm(state, state.player.liege);
      }
      if (FB.playerRealmId) return FB.playerRealmId(state);
      return (state.owner && state.player && state.owner[state.player.provinceId]) || 'player';
    }
    return FB.topRealm ? FB.topRealm(state, realmId) : realmId;
  }

  function controllerHostile(state, army, controller, relations) {
    if (!relations || !relations.hostile) return !!(FB.armiesHostile && FB.armiesHostile(state, army, { realm:controller }));
    if (!Object.prototype.hasOwnProperty.call(relations.hostile, controller)) {
      relations.hostile[controller] = !!(FB.armiesHostile && FB.armiesHostile(state, army, { realm:controller }));
      if (FB.game && FB.game._fastForwardTiming) FB.game._fastForwardTiming.count('Paths: controller hostility builds');
    } else if (FB.game && FB.game._fastForwardTiming) FB.game._fastForwardTiming.count('Paths: controller hostility hits');
    return relations.hostile[controller];
  }
  function realmFriendlyTo(state, realmId, controller, relations) {
    if (!controller || realmId === controller) return true;
    if (controllerHostile(state, { realm:realmId }, controller, relations)) return false;
    if (state.greatHolyWar && state.greatHolyWar.phase === 'active' && FB.greatHolyWarCamp) {
      var camp = FB.greatHolyWarCamp(state, realmId);
      if (camp && camp === FB.greatHolyWarCamp(state, controller)) return true;
    }
    var topA = resolveArmyTopRealm(state, realmId);
    var topB = FB.topRealm ? FB.topRealm(state, controller) : controller;
    if (topA && topB && topA === topB) return true;
    if (topA === controller || topB === realmId) return true;
    if (state.realms && state.realms[controller]) {
      var cur = state.realms[controller];
      var guard = 0;
      while (cur && guard++ < 20) {
        if (cur.liege === realmId || (realmId === 'player' && cur.liege === 'player')) return true;
        cur = state.realms[cur.liege];
      }
    }
    if (relations && relations.allies) return relations.allies[realmId] === controller || !!(topA && topB && relations.allies[topA] === topB);
    return !!(FB.areAllied && (FB.areAllied(state, realmId, controller) || (topA && topB && FB.areAllied(state, topA, topB))));
  }

  FB.armyFriendlyProvince = function (state, army, pid, relations) {
    if (!state || !army || !pid) return false;
    function friendlyController(controller) {
      if (!relations) return realmFriendlyTo(state, army.realm, controller);
      if (!Object.prototype.hasOwnProperty.call(relations.friendly, controller)) {
        relations.friendly[controller] = realmFriendlyTo(state, army.realm, controller, relations);
      }
      return relations.friendly[controller];
    }
    if (army.realm === 'player' && playerHolds(state, pid)) return true;
    var holder = state.holder && state.holder[pid];
    if (holder === army.realm) return true;
    if (holder && friendlyController(holder)) return true;
    var owner = state.owner && state.owner[pid];
    if (owner && friendlyController(owner)) return true;
    return false;
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

  FB.fortBlocksArmy = function (state, pid, army, relations) {
    if (!FB.armiesHostile || !FB.armiesHostile.militaryCacheSafe || (army && army.rebellionId)) relations = null;
    var fort = FB.fortAt(state, pid);
    if (!fort || fort.ruined || !fort.level || !army) return false;
    var holyWarControl = holyWarFortControl(state, army, pid);
    if (holyWarControl !== null) return !holyWarControl;
    if (FB.armyFriendlyProvince(state, army, pid, relations)) return false;
    // Neutral passage applies to ordinary campaigns too. Military occupation
    // control above still takes precedence over the county's legal owner.
    if (!controllerHostile(state, army, (state.holder || {})[pid], relations) &&
        !controllerHostile(state, army, (state.owner || {})[pid], relations)) return false;
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
    var ids = FB.unitClassIds ? FB.unitClassIds() : [];
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
        ? FB.applyHostLosses(allocations[i].host, allocations[i].amount, state)
        : { total:0 };
      mergeLosses(losses, hostLosses);
      if (FB.noteCohortLosses) {
        FB.noteCohortLosses(state, allocations[i].host.realm, hostLosses);
      }
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
    if (!FB.buildingApplicabilityStatus(state, pid, FB.fortificationBuildingId(), rid).ready) return 0;
    if (!fort && FB.buildingConstructionGroupStatus &&
        !FB.buildingConstructionGroupStatus(state, pid, FB.fortificationBuildingId()).ok) return 0;
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
