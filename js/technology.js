/* Fallowborn — historical national technology, regional seeding, and diffusion.
   This graph engine owns the public helper names used by saves and mods. */
window.FB = window.FB || {};

(function () {
  'use strict';

  var LEGACY_DOMAIN = {
    military:'warfare',
    economy:'agriculture',
    administrative:'governance'
  };
  var SCALAR_KEYS = {
    tax:1, levy:1, battle:1, devCap:1, health:1, research:1, domain:1,
    siege:1, movement:1, seaMovement:1, education:1, finance:1, trade:1
  };
  var COST_KEYS = { build:1, enterprise:1, training:1 };
  var UNIT_KEYS = { levy:1, arch:1, cav:1, ret:1 };
  var AI_UNIT_KEYS = { arch:1, cav:1, ret:1 };
  /* Technology records are engine-owned after their first access. Remember
     that access outside saved state so hot gameplay queries do not repeatedly
     deduplicate and rewrite the same arrays. A loaded save creates new record
     objects and is therefore normalized once again. */
  var NORMALIZED_RECORDS = typeof WeakSet === 'function' ? new WeakSet() : null;

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function unique(list) {
    var out = [], seen = {};
    for (var i = 0; i < (list || []).length; i++) {
      var value = list[i];
      if (typeof value !== 'string' || !value || seen[value]) continue;
      seen[value] = 1;
      out.push(value);
    }
    return out;
  }

  function asList(value) {
    if (value === undefined || value === null || value === '') return [];
    return Array.isArray(value) ? value.slice() : [value];
  }

  function domainOrder(id) {
    var def = FBDATA.techDomains && FBDATA.techDomains[id];
    var order = def && Number(def.order);
    return isFinite(order) ? order : Number.MAX_VALUE;
  }

  function emptyTechRecord() {
    return {
      completed:[],
      exposed:[],
      active:[],
      progress:{},
      reserve:0,
      priorities:{}
    };
  }

  function normalizeRecord(record) {
    if (record && typeof record === 'object' && !Array.isArray(record) &&
        NORMALIZED_RECORDS && NORMALIZED_RECORDS.has(record) &&
        Array.isArray(record.completed) && Array.isArray(record.exposed) &&
        Array.isArray(record.active) && record.progress &&
        typeof record.progress === 'object' && !Array.isArray(record.progress) &&
        record.priorities && typeof record.priorities === 'object' &&
        !Array.isArray(record.priorities)) {
      return record;
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      record = emptyTechRecord();
    }
    record.completed = unique(Array.isArray(record.completed) ? record.completed : []);
    record.exposed = unique(Array.isArray(record.exposed) ? record.exposed : []);
    if (typeof record.active === 'string') record.active = record.active ? [record.active] : [];
    record.active = unique(Array.isArray(record.active) ? record.active : []);
    record.progress = record.progress && typeof record.progress === 'object' &&
      !Array.isArray(record.progress) ? record.progress : {};
    for (var id in record.progress) {
      if (!own(record.progress, id)) continue;
      var progress = Number(record.progress[id]);
      if (!isFinite(progress) || progress < 0) delete record.progress[id];
      else record.progress[id] = progress;
    }
    record.reserve = Number(record.reserve);
    if (!isFinite(record.reserve) || record.reserve < 0) record.reserve = 0;
    record.priorities = record.priorities && typeof record.priorities === 'object' &&
      !Array.isArray(record.priorities) ? record.priorities : {};
    for (var priority in record.priorities) {
      if (!own(record.priorities, priority)) continue;
      var expires = Number(record.priorities[priority]);
      if (!isFinite(expires)) delete record.priorities[priority];
      else record.priorities[priority] = expires;
    }
    record.active = record.active.filter(function (id) {
      return !!FBDATA.tech[id] && record.completed.indexOf(id) < 0;
    });
    if (NORMALIZED_RECORDS) NORMALIZED_RECORDS.add(record);
    return record;
  }

  function rawTechRecord(state, rid) {
    state.realmTech = state.realmTech || {};
    var record = normalizeRecord(state.realmTech[rid]);
    state.realmTech[rid] = record;
    return record;
  }

  FB.techRealmId = function (state, realmId) {
    var rid = realmId;
    if (rid === undefined || rid === null) {
      rid = FB.playerRealmId ? FB.playerRealmId(state) :
        (state.owner && state.player ? state.owner[state.player.provinceId] : null);
    }
    if (rid && state.realms && state.realms[rid] && FB.topRealm) {
      rid = FB.topRealm(state, rid);
    }
    return rid || 'player';
  };

  function realmFaith(state, rid) {
    var realm = state.realms && state.realms[rid];
    if (realm && realm.religion) return realm.religion;
    var capital = realm && FB.world && FB.world.byId[realm.capital];
    return capital ? capital.religion : null;
  }

  function realmCulture(state, rid) {
    var realm = state.realms && state.realms[rid];
    if (realm && realm.ruler && realm.ruler.culture) return realm.ruler.culture;
    var capital = realm && FB.world && FB.world.byId[realm.capital];
    return capital ? capital.culture : null;
  }

  FB.techCulture = function (state, realmId) {
    return realmCulture(state, FB.techRealmId(state, realmId));
  };

  FB.techTraditionsForRealm = function (state, realmId) {
    var rid = FB.techRealmId(state, realmId);
    var realm = state.realms && state.realms[rid];
    var out = [], explicit = realm && realm.techTraditions;
    if (Array.isArray(explicit) && explicit.length) return unique(explicit);
    var culture = realmCulture(state, rid);
    var faith = realmFaith(state, rid);
    var table = FBDATA.techTraditions || {};
    for (var id in table) {
      if (!own(table, id)) continue;
      var def = table[id] || {};
      if ((def.cultures || []).indexOf(culture) >= 0 ||
          (def.religions || []).indexOf(faith) >= 0) out.push(id);
    }
    out = unique(out);
    return out.length ? out : ['latin'];
  };

  function adoptionWindowForTraditions(def, traditions) {
    var adoption = def && def.history && def.history.adoption || {};
    var fallback = Array.isArray(adoption.default) ? adoption.default : [0,0];
    var best = null, bestTradition = 'default';
    for (var i = 0; i < traditions.length; i++) {
      var id = traditions[i];
      var window = Array.isArray(adoption[id]) ? adoption[id] : fallback;
      if (!best || window[0] < best[0] ||
          (window[0] === best[0] && window[1] < best[1])) {
        best = window;
        bestTradition = id;
      }
    }
    best = best || fallback;
    var emergence = Number(best[0]);
    var widespread = Number(best[1]);
    if (!isFinite(emergence)) emergence = 0;
    if (!isFinite(widespread)) widespread = emergence;
    return {
      emergence:emergence,
      widespread:widespread,
      tradition:bestTradition
    };
  }

  function historicalWindowForTraditions(def, traditions) {
    var attested = def.history && def.history.attested || [0,0];
    var regional = adoptionWindowForTraditions(def, traditions);
    var from = Number(attested[0]), to = Number(attested[1]);
    if (!isFinite(from)) from = 0;
    if (!isFinite(to)) to = from;
    return {
      attested:[from,to],
      emergence:regional.emergence,
      widespread:regional.widespread,
      tradition:regional.tradition
    };
  }

  FB.techHistoricalWindow = function (state, id, realmId) {
    var def = FBDATA.tech[id];
    if (!def) return null;
    return historicalWindowForTraditions(
      def, FB.techTraditionsForRealm(state, realmId));
  };

  function cloneRecord(record) {
    var copy = emptyTechRecord();
    copy.completed = record.completed.slice();
    copy.exposed = record.exposed.slice();
    copy.active = record.active.slice();
    for (var id in record.progress) if (own(record.progress, id)) {
      copy.progress[id] = record.progress[id];
    }
    copy.reserve = record.reserve;
    for (var priority in record.priorities) if (own(record.priorities, priority)) {
      copy.priorities[priority] = record.priorities[priority];
    }
    return copy;
  }

  function addUnique(list, id) {
    if (list.indexOf(id) < 0) list.push(id);
  }

  function prerequisiteClosure(record, id, omitted, visiting) {
    var def = FBDATA.tech[id];
    if (!def || omitted[id] || visiting[id]) return false;
    visiting[id] = 1;
    var req = asList(def.req);
    for (var i = 0; i < req.length; i++) {
      if (!prerequisiteClosure(record, req[i], omitted, visiting)) {
        delete visiting[id];
        return false;
      }
    }
    var reqAny = asList(def.reqAny);
    if (reqAny.length) {
      var any = false;
      for (var j = 0; j < reqAny.length; j++) {
        if (record.completed.indexOf(reqAny[j]) >= 0 ||
            prerequisiteClosure(record, reqAny[j], omitted, visiting)) {
          any = true;
          break;
        }
      }
      if (!any) {
        delete visiting[id];
        return false;
      }
    }
    addUnique(record.completed, id);
    addUnique(record.exposed, id);
    delete visiting[id];
    return true;
  }

  function applySeedToRecord(state, rid, record) {
    var realm = state.realms && state.realms[rid] || {};
    var seed = realm.techSeed || {};
    var omitted = {}, i;
    for (i = 0; i < asList(seed.omit).length; i++) omitted[asList(seed.omit)[i]] = 1;
    var year = Number(state.date && state.date.year) || 867;
    for (var id in FBDATA.tech) {
      if (!own(FBDATA.tech, id) || omitted[id]) continue;
      var window = FB.techHistoricalWindow(state, id, rid);
      if (!window) continue;
      if (window.emergence <= year) addUnique(record.exposed, id);
      if (window.widespread <= year) prerequisiteClosure(record, id, omitted, {});
    }
    var expose = asList(seed.expose);
    for (i = 0; i < expose.length; i++) {
      if (FBDATA.tech[expose[i]] && !omitted[expose[i]]) addUnique(record.exposed, expose[i]);
    }
    var complete = asList(seed.complete);
    for (i = 0; i < complete.length; i++) {
      prerequisiteClosure(record, complete[i], omitted, {});
    }
    for (var omittedId in omitted) {
      var ci = record.completed.indexOf(omittedId);
      if (ci >= 0) record.completed.splice(ci, 1);
      var ei = record.exposed.indexOf(omittedId);
      if (ei >= 0) record.exposed.splice(ei, 1);
    }
    /* An authoritative omission also removes descendants whose hard
       prerequisites can no longer be closed. */
    var changed = true;
    while (changed) {
      changed = false;
      for (i = record.completed.length - 1; i >= 0; i--) {
        var doneId = record.completed[i], doneDef = FBDATA.tech[doneId];
        if (!doneDef) continue;
        var reqs = asList(doneDef.req), valid = true;
        for (var r = 0; r < reqs.length; r++) {
          if (record.completed.indexOf(reqs[r]) < 0) valid = false;
        }
        var alternatives = asList(doneDef.reqAny);
        if (alternatives.length) {
          var any = false;
          for (var a = 0; a < alternatives.length; a++) {
            if (record.completed.indexOf(alternatives[a]) >= 0) any = true;
          }
          if (!any) valid = false;
        }
        if (!valid) {
          record.completed.splice(i, 1);
          changed = true;
        }
      }
    }
    return record;
  }

  FB.seedRealmTechnologies = function (state, force) {
    state.realmTech = state.realmTech || {};
    if (state.techSeeded && !force) return state.realmTech;
    for (var rid in (state.realms || {})) {
      if (!own(state.realms, rid)) continue;
      var realm = state.realms[rid];
      if (!realm || !realm.alive || realm.liege) continue;
      applySeedToRecord(state, rid, rawTechRecord(state, rid));
    }
    state.techSeeded = 1;
    return state.realmTech;
  };

  function unionRecord(target, source, keepTargetReserve) {
    var i, id;
    for (i = 0; i < source.completed.length; i++) addUnique(target.completed, source.completed[i]);
    for (i = 0; i < source.exposed.length; i++) addUnique(target.exposed, source.exposed[i]);
    for (id in source.progress) if (own(source.progress, id)) {
      target.progress[id] = Math.max(target.progress[id] || 0, source.progress[id] || 0);
    }
    target.reserve = keepTargetReserve ?
      Math.max(target.reserve || 0, source.reserve || 0) :
      (target.reserve || 0) + (source.reserve || 0);
    for (id in source.priorities) if (own(source.priorities, id)) {
      target.priorities[id] = Math.max(target.priorities[id] || 0, source.priorities[id] || 0);
    }
    for (i = 0; i < source.active.length; i++) {
      if (target.active.indexOf(source.active[i]) < 0) target.active.push(source.active[i]);
    }
    target.active = target.active.filter(function (techId) {
      return target.completed.indexOf(techId) < 0 && !!FBDATA.tech[techId];
    });
  }

  /* Save-format-3 migration. Marker 2 is the graph/diffusion system. Every
     living sovereign receives its historical regional backfill first; saved
     knowledge is then unioned over that baseline. */
  FB.ensureRealmTech = function (state) {
    state.realmTech = state.realmTech || {};
    /* rawTechRecord normalizes the one record a caller actually reads. Once
       migration 2 has landed, sweeping every sovereign here turns each helper
       lookup into a whole-world rewrite; catalogue rendering performs hundreds
       of those lookups and can lock the load/menu UI on existing saves. */
    if (state.realmTechMigration === 2) return state.realmTech;

    var saved = {}, rid;
    for (rid in state.realmTech) if (own(state.realmTech, rid)) {
      saved[rid] = cloneRecord(normalizeRecord(state.realmTech[rid]));
    }
    state.realmTech = {};
    state.techSeeded = 0;
    FB.seedRealmTechnologies(state, true);

    for (rid in saved) if (own(saved, rid)) {
      unionRecord(rawTechRecord(state, rid), saved[rid], true);
    }

    var effective = FB.techRealmId(state);
    var record = rawTechRecord(state, effective);
    var legacy = Array.isArray(state.tech) ? state.tech : [];
    var seen = {}, oldRanks = {};
    var oldCapstones = {
      improved_husbandry:100, martial_drill:100, royal_catalogue:100
    };
    for (var i = 0; i < legacy.length; i++) {
      var id = legacy[i];
      if (!seen[id]) {
        seen[id] = 1;
        addUnique(record.completed, id);
        addUnique(record.exposed, id);
      } else if (oldCapstones[id]) {
        var rank = oldRanks[id] === undefined ? 1 : oldRanks[id] + 1;
        oldRanks[id] = rank;
        record.reserve += Math.round(oldCapstones[id] *
          Math.pow(FBDATA.balance.techRepeatCostGrowth || 1.6, rank));
      }
    }
    if (state.player && isFinite(Number(state.player.research)) &&
        Number(state.player.research) > 0) {
      record.reserve += Number(state.player.research);
    }
    delete state.tech;
    if (state.player) delete state.player.research;
    state.realmTechMigration = 2;
    state.techSeeded = 1;
    return state.realmTech;
  };

  FB.realmTechRecord = function (state, realmId) {
    FB.ensureRealmTech(state);
    return rawTechRecord(state, FB.techRealmId(state, realmId));
  };

  FB.techList = function (state, realmId) {
    return FB.realmTechRecord(state, realmId).completed;
  };

  FB.hasTech = function (state, id, realmId) {
    return FB.techList(state, realmId).indexOf(id) >= 0;
  };

  FB.techExposed = function (state, id, realmId) {
    var record = FB.realmTechRecord(state, realmId);
    return record.exposed.indexOf(id) >= 0 || record.completed.indexOf(id) >= 0;
  };

  FB.exposeTech = function (state, id, realmId) {
    if (!FBDATA.tech[id]) return false;
    var record = FB.realmTechRecord(state, realmId);
    if (record.exposed.indexOf(id) >= 0) return false;
    record.exposed.push(id);
    return true;
  };

  FB.techRequirementMet = function (state, requirement, realmId) {
    var list = asList(requirement);
    for (var i = 0; i < list.length; i++) {
      if (!FB.hasTech(state, list[i], realmId)) return false;
    }
    return true;
  };

  FB.techRequirementStatus = function (state, requirement, realmId) {
    var list = asList(requirement);
    var missing = [];
    for (var i = 0; i < list.length; i++) {
      if (!FB.hasTech(state, list[i], realmId)) missing.push(list[i]);
    }
    return {
      ready:missing.length === 0,
      requirements:list,
      missing:missing,
      realmId:FB.techRealmId(state, realmId)
    };
  };

  FB.techRequirementReason = function (state, requirement, realmId) {
    var status = FB.techRequirementStatus(state, requirement, realmId);
    var ids = status.missing.length ? status.missing : status.requirements;
    var viewerId = state && state.player ? state.player.charId : null;
    var names = ids.map(function (id) {
      var def = FBDATA.tech && FBDATA.tech[id];
      return def ? FB.dataText(state, viewerId,
        'tech', id, def, 'name', {}) : id;
    });
    if (!names.length) return '';
    return names.length === 1
      ? FB.T('Requires {technology}.', { technology:names[0] })
      : FB.T('Requires every listed technology: {technologies}.', {
          technologies:names.join(', ')
        });
  };

  FB.techAnyRequirementMet = function (state, requirement, realmId) {
    var list = asList(requirement);
    if (!list.length) return true;
    for (var i = 0; i < list.length; i++) {
      if (FB.hasTech(state, list[i], realmId)) return true;
    }
    return false;
  };

  function listLookup(list) {
    var out = {};
    for (var i = 0; i < (list || []).length; i++) out[list[i]] = 1;
    return out;
  }

  function prerequisitesMetFromLookup(def, completed) {
    if (!def) return false;
    var req = def.req || [];
    for (var i = 0; i < req.length; i++) {
      if (!completed[req[i]]) return false;
    }
    var reqAny = def.reqAny || [];
    if (!reqAny.length) return true;
    for (i = 0; i < reqAny.length; i++) {
      if (completed[reqAny[i]]) return true;
    }
    return false;
  }

  FB.techPrerequisitesMet = function (state, id, realmId) {
    var def = FBDATA.tech[id];
    if (!def) return false;
    var record = FB.realmTechRecord(state, realmId);
    return prerequisitesMetFromLookup(def, listLookup(record.completed));
  };

  function techMatchesCulture(def, culture) {
    if (def.cultures && def.cultures.indexOf(culture) < 0) return false;
    if (def.notCultures && def.notCultures.indexOf(culture) >= 0) return false;
    return true;
  }

  function techCostBreakdownFor(state, def, traditions, exposed) {
    var year = Number(state.date && state.date.year) || 0;
    var history = historicalWindowForTraditions(def, traditions);
    var attested = history.attested[0];
    var emergence = Math.max(attested, history.emergence);
    var widespread = Math.max(emergence, history.widespread);
    var multiplier, phase;
    if (year < attested) {
      multiplier = Math.min(8, 4 + Math.floor((attested - year) / 50));
      phase = 'before_attestation';
    } else if (year < emergence) {
      var attestedSpan = Math.max(1, emergence - attested);
      multiplier = 4 - 2 * ((year - attested) / attestedSpan);
      phase = 'attested';
    } else if (year < widespread) {
      var adoptionSpan = Math.max(1, widespread - emergence);
      multiplier = 2 - ((year - emergence) / adoptionSpan);
      phase = 'adoption';
    } else {
      multiplier = 1 - Math.min(0.3, (year - widespread) / 1000);
      phase = multiplier > 0.7001 ? 'catch_up' : 'mature';
    }
    var exposureFactor = exposed ? 0.65 : 1;
    var base = Number(def.cost) || 0;
    var total = Math.max(1, Math.round(base * multiplier * exposureFactor * 10) / 10);
    return {
      base:base,
      historicalMultiplier:Math.round(multiplier * 1000) / 1000,
      exposureMultiplier:exposureFactor,
      total:total,
      phase:phase,
      year:year,
      attested:history.attested,
      emergence:emergence,
      widespread:widespread,
      tradition:history.tradition
    };
  }

  FB.techCostBreakdown = function (state, id, realmId) {
    var def = FBDATA.tech[id];
    if (!def) return null;
    var rid = FB.techRealmId(state, realmId);
    var record = FB.realmTechRecord(state, rid);
    return techCostBreakdownFor(
      state,
      def,
      FB.techTraditionsForRealm(state, rid),
      record.exposed.indexOf(id) >= 0 || record.completed.indexOf(id) >= 0
    );
  };

  FB.techBaseCost = function (id) {
    return FBDATA.tech[id] ? Number(FBDATA.tech[id].cost) || 0 : 0;
  };

  FB.techCost = function (state, id, realmId) {
    var breakdown = FB.techCostBreakdown(state, id, realmId);
    return breakdown ? breakdown.total : 0;
  };

  function techCandidateFromContext(state, id, def, record, culture, traditions,
    completedLookup, exposedLookup, activeLookup) {
    var completed = !!completedLookup[id];
    var active = !!activeLookup[id];
    var exposed = !!exposedLookup[id] || completed;
    var cultureLocked = !techMatchesCulture(def, culture);
    var reqLocked = !prerequisitesMetFromLookup(def, completedLookup);
    var breakdown = techCostBreakdownFor(state, def, traditions, exposed);
    return {
      id:id,
      def:def,
      domain:def.domain,
      cost:breakdown.total,
      breakdown:breakdown,
      progress:record.progress[id] || 0,
      completed:completed,
      exposed:exposed,
      active:active,
      reqLocked:reqLocked,
      cultureLocked:cultureLocked,
      available:!completed && !active && !reqLocked && !cultureLocked
    };
  }

  FB.techCandidate = function (state, id, realmId) {
    var def = FBDATA.tech[id];
    if (!def) return null;
    var rid = FB.techRealmId(state, realmId);
    var record = FB.realmTechRecord(state, rid);
    return techCandidateFromContext(
      state,
      id,
      def,
      record,
      FB.techCulture(state, rid),
      FB.techTraditionsForRealm(state, rid),
      listLookup(record.completed),
      listLookup(record.exposed),
      listLookup(record.active)
    );
  };

  FB.techCandidates = function (state, realmId, skipSort) {
    var rid = FB.techRealmId(state, realmId);
    var record = FB.realmTechRecord(state, rid);
    var culture = FB.techCulture(state, rid);
    var traditions = FB.techTraditionsForRealm(state, rid);
    var completedLookup = listLookup(record.completed);
    var exposedLookup = listLookup(record.exposed);
    var activeLookup = listLookup(record.active);
    var out = [];
    for (var id in FBDATA.tech) {
      if (!own(FBDATA.tech, id)) continue;
      var def = FBDATA.tech[id];
      out.push(techCandidateFromContext(
        state, id, def, record, culture, traditions,
        completedLookup, exposedLookup, activeLookup));
    }
    if (!skipSort) {
      out.sort(function (a, b) {
        var da = domainOrder(a.domain), db = domainOrder(b.domain);
        var aa = a.def.history.attested[0], ab = b.def.history.attested[0];
        return da - db ||
          (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0) ||
          aa - ab || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      });
    }
    return out;
  };

  FB.techProjects = FB.techCandidates;

  FB.techAvailable = function (state, realmId) {
    return FB.techCandidates(state, realmId).filter(function (item) {
      return item.available;
    });
  };

  FB.techBranchLevel = function (state, branch, realmId) {
    var domain = LEGACY_DOMAIN[branch] || branch;
    var count = 0, list = FB.techList(state, realmId);
    for (var i = 0; i < list.length; i++) {
      var def = FBDATA.tech[list[i]];
      if (def && (def.domain === domain || def.branch === branch)) count++;
    }
    return count;
  };

  FB.techLevels = function (state, realmId) {
    return {
      military:FB.techBranchLevel(state, 'military', realmId),
      economy:FB.techBranchLevel(state, 'economy', realmId),
      administrative:FB.techBranchLevel(state, 'administrative', realmId)
    };
  };

  FB.techForLevel = function (state, branch, level, realmId) {
    var list = FB.techCandidates(state, realmId), matches = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].def.branch === branch ||
          (list[i].def.legacyBranch === branch && list[i].def.legacyLevel === level)) {
        matches.push(list[i]);
      }
    }
    for (i = 0; i < matches.length; i++) {
      if ((matches[i].def.level || matches[i].def.legacyLevel) === level) {
        return { id:matches[i].id, def:matches[i].def };
      }
    }
    return null;
  };

  FB.techBonus = function (state, key, realmId) {
    var sum = 0, list = FB.techList(state, realmId);
    for (var i = 0; i < list.length; i++) {
      var def = FBDATA.tech[list[i]];
      if (def && def.fx && def.fx[key]) sum += Number(def.fx[key]) || 0;
    }
    var caps = FBDATA.techCaps || {};
    var cap = caps[key];
    return cap === undefined ? sum : FB.clamp(sum, -Math.abs(cap), Math.abs(cap));
  };

  FB.techSeaTransportCapacity = function (state, realmId) {
    var capacity = null, list = FB.techList(state, realmId);
    for (var i = 0; i < list.length; i++) {
      var fx = FBDATA.tech[list[i]] && FBDATA.tech[list[i]].fx;
      var value = fx && fx.seaTransport;
      if (typeof value === 'number' && isFinite(value) && value > 0 &&
          Math.floor(value) === value &&
          (capacity === null || value > capacity)) capacity = value;
    }
    return capacity === null
      ? Math.max(1, Math.round(Number(FBDATA.balance.armySeaTransportBase) || 250))
      : capacity;
  };

  FB.techCostModifier = function (state, category, realmId) {
    var sum = 0, list = FB.techList(state, realmId);
    for (var i = 0; i < list.length; i++) {
      var def = FBDATA.tech[list[i]], fx = def && def.fx;
      if (!fx) continue;
      if (fx.costs && fx.costs[category]) sum += Number(fx.costs[category]) || 0;
      if (category === 'build' && fx.build) sum -= Number(fx.build) || 0;
    }
    return sum;
  };

  FB.techCostFactor = function (state, category, realmId) {
    var floors = FBDATA.techCaps && FBDATA.techCaps.costFloor || {};
    var floor = floors[category] === undefined ? 0.5 : floors[category];
    return Math.max(floor, 1 + FB.techCostModifier(state, category, realmId));
  };

  FB.techUnits = function (state, realmId) {
    var units = { levy:0, arch:0, cav:0, ret:0 };
    var list = FB.techList(state, realmId);
    for (var i = 0; i < list.length; i++) {
      var fx = FBDATA.tech[list[i]] && FBDATA.tech[list[i]].fx;
      if (!fx) continue;
      if (fx.units) for (var key in units) units[key] += Number(fx.units[key]) || 0;
      if (fx.retinue) units.ret += Number(fx.retinue) || 0;
      if (fx.archers) units.arch += Number(fx.archers) || 0;
    }
    var caps = FBDATA.techCaps && FBDATA.techCaps.units || {};
    for (var unit in units) if (own(units, unit) && caps[unit] !== undefined) {
      units[unit] = Math.min(units[unit], caps[unit]);
    }
    return units;
  };

  FB.techAIUnits = function (state, realmId) {
    var units = { arch:0, cav:0, ret:0 };
    var list = FB.techList(state, realmId);
    for (var i = 0; i < list.length; i++) {
      var fx = FBDATA.tech[list[i]] && FBDATA.tech[list[i]].fx;
      if (!fx || !fx.aiUnits) continue;
      for (var key in units) units[key] += Number(fx.aiUnits[key]) || 0;
    }
    var caps = FBDATA.techCaps && FBDATA.techCaps.aiUnits || {};
    for (var unit in units) if (own(units, unit) && caps[unit] !== undefined) {
      units[unit] = Math.min(units[unit], caps[unit]);
    }
    return units;
  };

  FB.techUnlocks = function (state, realmId) {
    var out = [], list = FB.techList(state, realmId);
    for (var i = 0; i < list.length; i++) {
      var unlocks = FBDATA.tech[list[i]] && FBDATA.tech[list[i]].unlocks || [];
      for (var j = 0; j < unlocks.length; j++) addUnique(out, unlocks[j]);
    }
    return out;
  };

  FB.hasTechUnlock = function (state, unlock, realmId) {
    return FB.techUnlocks(state, realmId).indexOf(unlock) >= 0;
  };

  FB.techSlotCount = function (state, realmId) {
    var slots = 1;
    if (FB.hasTech(state, 'scholarly_networks', realmId)) slots++;
    if (FB.hasTech(state, 'universities', realmId)) slots++;
    return slots;
  };

  FB.techArmyMarchDays = function (state, realmId) {
    var base = FBDATA.balance.armyMarchDays || 6;
    return Math.max(1, Math.round(base *
      (1 - FB.techBonus(state, 'movement', realmId))));
  };

  function cleanupPriorities(state, record) {
    var year = Number(state.date && state.date.year) || 0;
    for (var id in record.priorities) if (own(record.priorities, id)) {
      if (record.priorities[id] <= year || record.completed.indexOf(id) >= 0 ||
          record.active.indexOf(id) >= 0) delete record.priorities[id];
    }
  }

  function completeTech(state, rid, id) {
    var record = rawTechRecord(state, rid), def = FBDATA.tech[id];
    if (!def) return false;
    var cost = FB.techCost(state, id, rid);
    var progress = record.progress[id] || 0;
    if (progress + 0.0001 < cost) return false;
    record.progress[id] = cost;
    addUnique(record.completed, id);
    addUnique(record.exposed, id);
    var index = record.active.indexOf(id);
    if (index >= 0) record.active.splice(index, 1);
    record.reserve += Math.max(0, progress - cost);
    delete record.priorities[id];
    var playerRealm = FB.techRealmId(state);
    if (!(FB.game && FB.game.observe) && rid === playerRealm) {
      var realm = state.realms && state.realms[rid];
      FB.news(state, FB.msg('news.tech.completed',
        '💡 {realm} completes {technology}.', {
          realm:realm ? realm.name : rid,
          technology:FB.dataParam('tech', id)
        }));
      if (FB.ui && FB.ui.toast) {
        FB.ui.toast('{technology} completed.', {
          technology:FB.dataText(state, state.player.charId, 'tech', id, def, 'name', {})
        });
      }
    }
    return true;
  }

  function settleAffordableCompletions(state, rid) {
    var record = rawTechRecord(state, rid), changed = false;
    var active = record.active.slice();
    for (var i = 0; i < active.length; i++) {
      if (completeTech(state, rid, active[i])) changed = true;
    }
    return changed;
  }

  FB.selectTechProject = function (state, id, realmId, force) {
    var rid = FB.techRealmId(state, realmId);
    if (!force && (rid !== 'player' || !FB.isPlayerSovereign(state))) return false;
    var record = FB.realmTechRecord(state, rid);
    if (record.active.indexOf(id) >= 0) return true;
    if (record.active.length >= FB.techSlotCount(state, rid)) return false;
    var def = FBDATA.tech[id];
    if (!def || record.completed.indexOf(id) >= 0 ||
        !techMatchesCulture(def, FB.techCulture(state, rid)) ||
        !prerequisitesMetFromLookup(def, listLookup(record.completed))) return false;
    record.active.push(id);
    delete record.priorities[id];
    if (!force && rid === 'player') {
      FB.setProtected(state, 'researchTech', id, false);
    }
    return true;
  };

  FB.adoptTech = function (state, id, realmId) {
    return FB.selectTechProject(state, id, realmId, false);
  };

  FB.addResearch = function (state, amount, realmId) {
    amount = Number(amount) || 0;
    if (amount <= 0) return 0;
    var rid = FB.techRealmId(state, realmId);
    var record = FB.realmTechRecord(state, rid);
    settleAffordableCompletions(state, rid);
    var active = record.active.slice();
    if (!active.length) {
      record.reserve += amount;
      return amount;
    }
    var share = amount / active.length;
    for (var i = 0; i < active.length; i++) {
      var id = active[i];
      record.progress[id] = (record.progress[id] || 0) + share;
    }
    for (i = 0; i < active.length; i++) completeTech(state, rid, active[i]);
    return amount;
  };

  FB.techResearchRate = function (state, realmId) {
    var rid = FB.techRealmId(state, realmId);
    var dev = FB.realmStrength ? FB.realmStrength(state, rid) : 0;
    return 2 + Math.min(4, dev * 0.04) + FB.techBonus(state, 'research', rid);
  };

  function realmCoastal(state, rid) {
    if (!FB.realmProvinces || !FB.world) return false;
    var provinces = FB.realmProvinces(state, rid);
    for (var i = 0; i < provinces.length; i++) {
      if (FB.world.byId[provinces[i]] && FB.world.byId[provinces[i]].coastal) return true;
    }
    return false;
  }

  function techAIScoreContext(state, rid, record, researchRate) {
    var realm = state.realms[rid] || {};
    cleanupPriorities(state, record);
    if (researchRate === undefined) researchRate = FB.techResearchRate(state, rid);
    return {
      state:state,
      rid:rid,
      record:record,
      realm:realm,
      trait:realm.ruler && realm.ruler.trait,
      annual:Math.max(1, researchRate * 4),
      coastal:undefined
    };
  }

  function techAIRealmCoastal(context) {
    if (context.coastal === undefined) {
      context.coastal = realmCoastal(context.state, context.rid);
    }
    return context.coastal;
  }

  function techAIScoreFor(item, context) {
    var id = item.id, def = item.def, record = context.record;
    var breakdown = item.breakdown;
    var score = 10;
    if (item.exposed) score *= 2.25;
    score *= Math.max(0.25, 1.5 - breakdown.historicalMultiplier * 0.18);
    score *= Math.max(0.35, Math.min(2,
      context.annual / Math.max(1, breakdown.total) * 3));
    if (breakdown.historicalMultiplier >= 4) score *= 0.12;
    else if (breakdown.historicalMultiplier <= 1) score *= 1.35;
    var realm = context.realm, trait = context.trait;
    if (def.domain === 'warfare') {
      score *= 1 + Math.max(0, Number(realm.aggression) || 0) * 0.4;
      if (realm.war) score *= 2;
      if (['ambitious','wrathful','proud','brave'].indexOf(trait) >= 0) score *= 1.4;
    } else if (def.domain === 'agriculture' || def.domain === 'crafts') {
      if (['greedy','content','patient'].indexOf(trait) >= 0) score *= 1.25;
    } else if (def.domain === 'learning') {
      if (['patient','humble','honest'].indexOf(trait) >= 0) score *= 1.4;
    } else if (def.domain === 'governance') {
      score *= 1 + Math.max(0, (realm.rank || 1) - 2) * 0.2;
      if (['ambitious','patient','deceitful'].indexOf(trait) >= 0) score *= 1.3;
    } else if (def.domain === 'commerce') {
      if (techAIRealmCoastal(context)) score *= 1.2;
      if (trait === 'greedy') score *= 1.4;
    } else if (def.domain === 'seafaring') {
      score *= techAIRealmCoastal(context) ? 1.8 : 0.45;
    }
    var seaTransport = def.fx && def.fx.seaTransport;
    if (typeof seaTransport === 'number' && isFinite(seaTransport) &&
        seaTransport >
        FB.techSeaTransportCapacity(context.state, context.rid)) {
      score *= techAIRealmCoastal(context) ? 1.25 : 0.5;
    }
    var unlockWeight = 1;
    for (var unlockIndex = 0; unlockIndex < (def.unlocks || []).length; unlockIndex++) {
      var unlock = def.unlocks[unlockIndex];
      if (unlock.indexOf('research_slot:') === 0) unlockWeight = Math.max(unlockWeight, 1.8);
      else if (/^(building|enterprise|career|schooling|householdStandard):/.test(unlock)) {
        unlockWeight = Math.max(unlockWeight, 1.35);
      } else if (unlock.indexOf('unit:') === 0) unlockWeight = Math.max(unlockWeight, 1.25);
      else if (unlock.indexOf('rule:') === 0) unlockWeight = Math.max(unlockWeight, 1.10);
      else if (unlock.indexOf('practice:') === 0) unlockWeight = Math.max(unlockWeight, 1.03);
    }
    score *= unlockWeight;
    if (record.priorities[id] !== undefined) score *= 6;
    return Math.max(0, score);
  }

  FB.techAIScore = function (state, id, realmId) {
    var rid = FB.techRealmId(state, realmId);
    var def = FBDATA.tech[id], record = FB.realmTechRecord(state, rid);
    var completed = listLookup(record.completed);
    if (!def || !prerequisitesMetFromLookup(def, completed)) return 0;
    var exposed = record.exposed.indexOf(id) >= 0 || !!completed[id];
    var item = {
      id:id,
      def:def,
      exposed:exposed,
      breakdown:techCostBreakdownFor(
        state, def, FB.techTraditionsForRealm(state, rid), exposed)
    };
    return techAIScoreFor(item, techAIScoreContext(state, rid, record));
  };

  function scoredTechChoices(state, rid, record, researchRate) {
    var candidates = FB.techCandidates(state, rid, true);
    var available = [];
    for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
      if (candidates[candidateIndex].available) available.push(candidates[candidateIndex]);
    }
    if (!available.length) return [];
    var context = techAIScoreContext(state, rid, record, researchRate);
    var scored = [];
    for (var i = 0; i < available.length; i++) {
      var score = techAIScoreFor(available[i], context);
      if (score > 0) scored.push({ item:available[i], score:score });
    }
    scored.sort(function (a, b) {
      return b.score - a.score || (a.item.id < b.item.id ? -1 : 1);
    });
    return scored;
  }

  function scoredChoiceIndex(scored, deterministic) {
    if (!scored.length) return -1;
    if (deterministic) return 0;
    var total = 0;
    for (var i = 0; i < scored.length; i++) total += scored[i].score;
    var roll = FB.rng() * total;
    for (i = 0; i < scored.length; i++) {
      roll -= scored[i].score;
      if (roll <= 0) return i;
    }
    return scored.length - 1;
  }

  function fillSlots(state, rid, deterministic, researchRate) {
    var record = FB.realmTechRecord(state, rid);
    var slots = FB.techSlotCount(state, rid);
    if (record.active.length >= slots) return;
    var scored = scoredTechChoices(state, rid, record, researchRate), guard = 0;
    while (record.active.length < slots && scored.length && guard++ < 8) {
      var index = scoredChoiceIndex(scored, deterministic);
      if (index < 0) break;
      var choice = scored[index].item;
      scored.splice(index, 1);
      record.active.push(choice.id);
      delete record.priorities[choice.id];
    }
  }

  FB.techAutomationMode = function (mode) {
    return mode && mode !== 'cheapest' && own(FBDATA.techDomains || {}, mode)
      ? mode : 'cheapest';
  };

  function playerAutomatedChoices(state, rid, mode) {
    mode = FB.techAutomationMode(mode);
    var candidates = FB.techCandidates(state, rid, true);
    var available = [];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].available &&
          !FB.isProtected(state, 'researchTech', candidates[i].id)) {
        available.push(candidates[i]);
      }
    }
    available.sort(function (a, b) {
      var aPreferred = mode !== 'cheapest' && a.domain === mode ? 0 : 1;
      var bPreferred = mode !== 'cheapest' && b.domain === mode ? 0 : 1;
      var aYear = a.def.history.attested[0], bYear = b.def.history.attested[0];
      return aPreferred - bPreferred || a.cost - b.cost || aYear - bYear ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
    return available;
  }

  function fillPlayerSlots(state, rid, mode) {
    var record = FB.realmTechRecord(state, rid);
    var slots = FB.techSlotCount(state, rid);
    if (record.active.length >= slots) return false;
    var choices = playerAutomatedChoices(state, rid, mode);
    var changed = false;
    for (var i = 0; i < choices.length && record.active.length < slots; i++) {
      record.active.push(choices[i].id);
      delete record.priorities[choices[i].id];
      changed = true;
    }
    return changed;
  }

  FB.autoResearch = function (state, mode) {
    if (!FB.isPlayerSovereign(state)) return false;
    if (mode === undefined && FB.game && FB.game.auto) {
      mode = FB.game.auto.researchMode;
    }
    return fillPlayerSlots(state, 'player', mode);
  };

  function sovereignIds(state) {
    var out = [];
    for (var rid in (state.realms || {})) {
      if (!own(state.realms, rid)) continue;
      var realm = state.realms[rid];
      if (realm && realm.alive && !realm.liege) out.push(rid);
    }
    out.sort();
    return out;
  }

  function adjacentSovereigns(state, rid) {
    var out = {}, adj = FB.world && FB.world.adj || {};
    for (var pid in (state.owner || {})) {
      if (!own(state.owner, pid) || state.owner[pid] !== rid) continue;
      var neighbors = adj[pid] || {};
      for (var otherPid in neighbors) {
        if (!own(neighbors, otherPid)) continue;
        var other = state.owner[otherPid];
        if (other && other !== rid) out[FB.techRealmId(state, other)] = 1;
      }
    }
    return out;
  }

  function warOpponents(state, rid) {
    var out = {}, realm = state.realms && state.realms[rid];
    if (realm && realm.war && realm.war.enemy) out[FB.techRealmId(state, realm.war.enemy)] = 1;
    for (var id in (state.realms || {})) {
      if (!own(state.realms, id)) continue;
      var other = state.realms[id];
      if (other && other.war && FB.techRealmId(state, other.war.enemy) === rid) {
        out[FB.techRealmId(state, id)] = 1;
      }
    }
    var playerWar = state.player && state.player.war;
    if (playerWar && playerWar.enemy) {
      var playerRid = FB.techRealmId(state);
      var enemyRid = FB.techRealmId(state, playerWar.enemy);
      if (rid === playerRid) out[enemyRid] = 1;
      if (rid === enemyRid) out[playerRid] = 1;
    }
    return out;
  }

  function ensureDiffusionRealm(state, snapshot, rid) {
    rid = FB.techRealmId(state, rid);
    if (snapshot.records[rid]) return rid;
    var record = FB.realmTechRecord(state, rid);
    snapshot.records[rid] = record;
    snapshot.completed[rid] = listLookup(record.completed);
    snapshot.exposed[rid] = listLookup(record.exposed);
    snapshot.traditions[rid] = FB.techTraditionsForRealm(state, rid);
    snapshot.faiths[rid] = realmFaith(state, rid);
    return rid;
  }

  function ensureDiffusionContacts(state, snapshot, rid) {
    rid = ensureDiffusionRealm(state, snapshot, rid);
    if (snapshot.contactsReady[rid]) return rid;
    snapshot.adjacent[rid] = adjacentSovereigns(state, rid);
    snapshot.opponents[rid] = warOpponents(state, rid);
    var ally = FB.alliedRealm ? FB.alliedRealm(state, rid) : null;
    snapshot.allies[rid] = ally ? FB.techRealmId(state, ally) : null;
    snapshot.contactsReady[rid] = 1;
    return rid;
  }

  function diffusionSnapshot(state, sovereigns, includeContacts) {
    var snapshot = {
      records:{},
      completed:{},
      exposed:{},
      traditions:{},
      faiths:{},
      adjacent:{},
      opponents:{},
      allies:{},
      contactsReady:{},
      knownByTech:{}
    };
    for (var i = 0; i < sovereigns.length; i++) {
      var rid = ensureDiffusionRealm(state, snapshot, sovereigns[i]);
      var completed = snapshot.records[rid].completed;
      for (var j = 0; j < completed.length; j++) {
        var id = completed[j];
        if (!snapshot.knownByTech[id]) snapshot.knownByTech[id] = [];
        snapshot.knownByTech[id].push(rid);
      }
    }
    if (includeContacts) {
      for (i = 0; i < sovereigns.length; i++) {
        ensureDiffusionContacts(state, snapshot, sovereigns[i]);
      }
    }
    return snapshot;
  }

  function mappedRealmKnows(state, snapshot, realmMap, id) {
    for (var rid in realmMap) {
      if (!own(realmMap, rid)) continue;
      var effective = ensureDiffusionRealm(state, snapshot, rid);
      if (snapshot.completed[effective][id]) return true;
    }
    return false;
  }

  function techDiffusionChanceFrom(state, id, rid, snapshot) {
    var def = FBDATA.tech[id];
    rid = ensureDiffusionContacts(state, snapshot, rid);
    if (!def || snapshot.completed[rid][id] || snapshot.exposed[rid][id]) return 0;
    var chance = 0;
    if (mappedRealmKnows(state, snapshot, snapshot.adjacent[rid], id)) chance += 0.12;
    var ally = snapshot.allies[rid];
    if (ally && snapshot.completed[ensureDiffusionRealm(state, snapshot, ally)][id]) {
      chance += 0.15;
    }
    if (mappedRealmKnows(state, snapshot, snapshot.opponents[rid], id)) {
      chance += def.domain === 'warfare' ? 0.20 : 0.05;
    }
    var traditions = snapshot.traditions[rid];
    var faith = snapshot.faiths[rid];
    var knowers = snapshot.knownByTech[id] || [];
    var sameTradition = false, sameFaith = false;
    for (var i = 0; i < knowers.length; i++) {
      var other = knowers[i];
      if (other === rid) continue;
      var otherTraditions = snapshot.traditions[other];
      for (var t = 0; t < traditions.length; t++) {
        if (otherTraditions.indexOf(traditions[t]) >= 0) sameTradition = true;
      }
      if (faith && snapshot.faiths[other] === faith) sameFaith = true;
    }
    if (sameTradition) chance += 0.04;
    if (sameFaith) chance += 0.03;
    return Math.min(0.50, chance);
  }

  FB.techDiffusionChance = function (state, id, realmId) {
    FB.ensureRealmTech(state);
    var sovereigns = sovereignIds(state);
    var snapshot = diffusionSnapshot(state, sovereigns, false);
    return techDiffusionChanceFrom(
      state, id, FB.techRealmId(state, realmId), snapshot);
  };

  FB.diffuseTechnologies = function (state) {
    var year = Number(state.date && state.date.year) || 0;
    if (state.techDiffusionYear === year) return 0;
    state.techDiffusionYear = year;
    var exposed = 0, sovereigns = sovereignIds(state);
    FB.ensureRealmTech(state);
    var snapshot = diffusionSnapshot(state, sovereigns, true);
    for (var r = 0; r < sovereigns.length; r++) {
      var rid = sovereigns[r];
      for (var id in FBDATA.tech) {
        if (!own(FBDATA.tech, id)) continue;
        var chance = techDiffusionChanceFrom(state, id, rid, snapshot);
        if (chance > 0 && FB.rng() < chance && FB.exposeTech(state, id, rid)) exposed++;
      }
    }
    return exposed;
  };

  /* One seasonal pass for every living sovereign. AI fills every open slot.
     Player automation is deterministic and therefore consumes no random roll. */
  FB.techSeason = function (state, autoPlayer) {
    FB.ensureRealmTech(state);
    var sovereigns = sovereignIds(state);
    var playerAutoMode = autoPlayer
      ? FB.techAutomationMode(typeof autoPlayer === 'string' ? autoPlayer :
        (FB.game && FB.game.auto && FB.game.auto.researchMode))
      : null;
    for (var i = 0; i < sovereigns.length; i++) {
      var rid = sovereigns[i], isPlayer = rid === 'player';
      var record = FB.realmTechRecord(state, rid);
      var researchRate = FB.techResearchRate(state, rid);
      if (!isPlayer) fillSlots(state, rid, false, researchRate);
      else if (playerAutoMode && FB.isPlayerSovereign(state)) {
        fillPlayerSlots(state, rid, playerAutoMode);
      }
      var pool = researchRate + record.reserve;
      record.reserve = 0;
      FB.addResearch(state, pool, rid);
      if (!isPlayer) fillSlots(state, rid, false);
      else if (playerAutoMode && FB.isPlayerSovereign(state)) {
        fillPlayerSlots(state, rid, playerAutoMode);
      }
    }
    if (state.date && state.date.season === 0 && state.date.day === 1) {
      FB.diffuseTechnologies(state);
    }
  };

  FB.mergeRealmTech = function (state, targetRid, sourceRid) {
    FB.ensureRealmTech(state);
    if (!targetRid || !sourceRid || targetRid === sourceRid) return;
    var target = rawTechRecord(state, targetRid);
    var source = rawTechRecord(state, sourceRid);
    var targetActive = target.active.slice();
    unionRecord(target, source, true);
    target.active = targetActive;
    for (var i = 0; i < source.active.length &&
        target.active.length < FB.techSlotCount(state, targetRid); i++) {
      var id = source.active[i];
      if (target.active.indexOf(id) < 0 && target.completed.indexOf(id) < 0 &&
          FBDATA.tech[id] && FB.techPrerequisitesMet(state, id, targetRid)) {
        target.active.push(id);
      }
    }
    settleAffordableCompletions(state, targetRid);
  };

  FB.canAdvocateTech = function (state, id) {
    var p = state.player, def = FBDATA.tech[id];
    if (!p || !def || p.tier < 3 || !p.liege || FB.isPlayerSovereign(state)) return false;
    var rid = FB.techRealmId(state);
    if (FB.hasTech(state, id, rid) || !FB.techPrerequisitesMet(state, id, rid)) return false;
    if (FB.realmTechRecord(state, rid).active.indexOf(id) >= 0) return false;
    if ((p.techAdvocacyYear || 0) >= state.date.year) return false;
    if (p.gold < 20) return false;
    return FB.standingOf(state, { kind:'realm', id:p.liege }) >= 40;
  };

  /* The national catalogue is an authority surface, not a general-purpose
     encyclopedia. Landed rulers either choose sovereign research or may
     advocate at court; common households only need the concrete prerequisite
     named where national knowledge gates one of their own choices. */
  FB.techUiRelevant = function (state) {
    return !!(state && state.player && state.player.tier >= 3);
  };

  FB.advocateTech = function (state, id) {
    if (!FB.canAdvocateTech(state, id)) return false;
    var rid = FB.techRealmId(state), record = FB.realmTechRecord(state, rid);
    state.player.gold -= 20;
    FB.adjustStanding(state, {
      kind:'realm', id:state.player.liege
    }, -15, 'technology:advocacy');
    state.player.techAdvocacyYear = state.date.year;
    record.priorities[id] = state.date.year + 4;
    FB.news(state, FB.msg('news.tech.advocated',
      '📜 Your household advocates {technology} at the liege’s court.', {
        technology:FB.dataParam('tech', id)
      }));
    return true;
  };

  FB.devCap = function (state, pid) {
    var owner = state.owner && state.owner[pid];
    return 10 + FB.techBonus(state, 'devCap', owner || undefined);
  };

  function inferAdoption(def, from) {
    var emergence = def.yearMin !== undefined ? Number(def.yearMin) : from + 75;
    if (!isFinite(emergence)) emergence = from + 75;
    var adoption = { default:[emergence,emergence + 200] };
    for (var id in (FBDATA.techTraditions || {})) {
      if (own(FBDATA.techTraditions, id)) adoption[id] = adoption.default.slice();
    }
    return adoption;
  }

  FB.normalizeTechDefinition = function (id, def) {
    if (!def || typeof def !== 'object' || Array.isArray(def)) return def;
    if (!def.domain && def.branch) {
      def.legacyBranch = def.branch;
      def.legacyLevel = def.level;
      def.domain = LEGACY_DOMAIN[def.branch] || def.branch;
    }
    def.req = asList(def.req);
    def.reqAny = asList(def.reqAny);
    var inferredFrom = def.yearMin !== undefined ? Number(def.yearMin) - 100 : 700;
    if (!isFinite(inferredFrom)) inferredFrom = 700;
    def.history = def.history && typeof def.history === 'object' ? def.history : {};
    if (!Array.isArray(def.history.attested)) {
      def.history.attested = [inferredFrom,inferredFrom + 200];
    }
    if (!def.history.adoption || typeof def.history.adoption !== 'object') {
      def.history.adoption = inferAdoption(def, def.history.attested[0]);
    }
    if (!Array.isArray(def.history.adoption.default)) {
      def.history.adoption.default = [
        def.history.attested[0] + 75, def.history.attested[0] + 275
      ];
    }
    def.fx = def.fx && typeof def.fx === 'object' ? def.fx : {};
    def.unlocks = Array.isArray(def.unlocks) ? def.unlocks : [];
    def.sources = Array.isArray(def.sources) && def.sources.length ?
      def.sources : ['MOD'];
    def.confidence = def.confidence || 'modded';
    return def;
  };

  function validateUnlock(id, unlock, errors) {
    if (typeof unlock !== 'string' || unlock.indexOf(':') < 1) {
      errors.push('Technology ' + id + ': invalid unlock ' + unlock + '.');
      return;
    }
    var parts = unlock.split(':'), kind = parts[0], target = parts.slice(1).join(':');
    if (!target) {
      errors.push('Technology ' + id + ': unlock target is empty.');
      return;
    }
    var table = kind === 'building' ? FBDATA.buildings :
      kind === 'career' ? FBDATA.careers :
      kind === 'enterprise' ? FBDATA.enterprises :
      kind === 'schooling' ? FBDATA.schooling :
      kind === 'householdStandard' ? FBDATA.householdStandards : null;
    if (table && !table[target]) {
      errors.push('Technology ' + id + ': unlock references missing ' + kind + ' ' + target + '.');
    } else if (!table && ['practice','rule','unit','research_slot'].indexOf(kind) < 0) {
      errors.push('Technology ' + id + ': unknown unlock kind ' + kind + '.');
    }
    if (kind === 'research_slot' && target !== '2' && target !== '3') {
      errors.push('Technology ' + id + ': invalid research slot ' + target + '.');
    }
    if (kind === 'unit' &&
        ['levy','archers','cavalry','retinue'].indexOf(target) < 0) {
      errors.push('Technology ' + id + ': invalid unit unlock ' + target + '.');
    }
  }

  FB.validateTechnologyData = function () {
    var errors = [], domains = FBDATA.techDomains || {};
    var traditions = FBDATA.techTraditions || {};
    for (var domain in domains) {
      if (!own(domains, domain)) continue;
      var domainDef = domains[domain];
      if (!domainDef || !domainDef.name ||
          (domainDef.order !== undefined &&
           (typeof domainDef.order !== 'number' || !isFinite(domainDef.order)))) {
        errors.push('Technology domain ' + domain + ' is invalid.');
      }
    }
    for (var tradition in traditions) {
      if (!own(traditions, tradition)) continue;
      var traditionDef = traditions[tradition];
      if (!traditionDef || !traditionDef.name ||
          !Array.isArray(traditionDef.cultures) || !Array.isArray(traditionDef.religions)) {
        errors.push('Technology tradition ' + tradition + ' is invalid.');
      }
    }
    var caps = FBDATA.techCaps;
    if (!caps || typeof caps !== 'object' || Array.isArray(caps)) {
      errors.push('Technology caps are invalid.');
    } else {
      for (var scalarCap in SCALAR_KEYS) if (own(SCALAR_KEYS, scalarCap) &&
          caps[scalarCap] !== undefined &&
          (typeof caps[scalarCap] !== 'number' || !isFinite(caps[scalarCap]) ||
           caps[scalarCap] < 0)) {
        errors.push('Technology cap ' + scalarCap +
          ' must be a non-negative number.');
      }
      var capTables = {
        costFloor:COST_KEYS,
        units:UNIT_KEYS,
        aiUnits:AI_UNIT_KEYS
      };
      for (var capName in caps) if (own(caps, capName) &&
          !own(SCALAR_KEYS, capName) && !own(capTables, capName)) {
        errors.push('Technology caps have unknown key ' + capName + '.');
      }
      for (var capTableName in capTables) {
        if (!own(capTables, capTableName) || caps[capTableName] === undefined) continue;
        var capTable = caps[capTableName];
        if (!capTable || typeof capTable !== 'object' || Array.isArray(capTable)) {
          errors.push('Technology cap group ' + capTableName + ' is invalid.');
          continue;
        }
        for (var capKey in capTable) if (own(capTable, capKey)) {
          if (!own(capTables[capTableName], capKey)) {
            errors.push('Technology cap group ' + capTableName +
              ' has unknown key ' + capKey + '.');
          } else if (typeof capTable[capKey] !== 'number' ||
              !isFinite(capTable[capKey]) || capTable[capKey] < 0) {
            errors.push('Technology cap ' + capTableName + '.' + capKey +
              ' must be a non-negative number.');
          }
        }
      }
    }
    var impactReviews = FBDATA.techImpactReviews;
    if (!impactReviews || typeof impactReviews !== 'object' ||
        Array.isArray(impactReviews)) {
      errors.push('Technology impact review registry is invalid.');
    } else {
      if (typeof impactReviews.baselineVersion !== 'string' ||
          !/^\d+\.\d+\.\d+$/.test(impactReviews.baselineVersion)) {
        errors.push('Technology impact review baseline version is invalid.');
      }
      var reviewedFeatures = impactReviews.features;
      if (!reviewedFeatures || typeof reviewedFeatures !== 'object' ||
          Array.isArray(reviewedFeatures)) {
        errors.push('Technology impact review feature table is invalid.');
      } else {
        for (var featureId in reviewedFeatures) {
          if (!own(reviewedFeatures, featureId)) continue;
          var review = reviewedFeatures[featureId];
          if (!review || typeof review !== 'object' || Array.isArray(review)) {
            errors.push('Technology impact review ' + featureId + ' is invalid.');
            continue;
          }
          if (['hard','soft','none'].indexOf(review.mode) < 0) {
            errors.push('Technology impact review ' + featureId +
              ': mode must be hard, soft, or none.');
          }
          if (typeof review.rationale !== 'string' || !review.rationale.trim()) {
            errors.push('Technology impact review ' + featureId +
              ': rationale is required.');
          }
          var reviewTech = review.tech === undefined ? [] : review.tech;
          if (!Array.isArray(reviewTech)) {
            errors.push('Technology impact review ' + featureId +
              ': tech must be an array.');
            reviewTech = [];
          }
          if ((review.mode === 'hard' || review.mode === 'soft') &&
              !reviewTech.length) {
            errors.push('Technology impact review ' + featureId +
              ': hard and soft reviews require technology ids.');
          }
          if (review.mode === 'none' && reviewTech.length) {
            errors.push('Technology impact review ' + featureId +
              ': none reviews cannot name technology ids.');
          }
          if (review.mode === 'hard' &&
              (typeof review.fallback !== 'string' || !review.fallback.trim())) {
            errors.push('Technology impact review ' + featureId +
              ': hard reviews require a fallback.');
          }
          for (var reviewTechIndex = 0; reviewTechIndex < reviewTech.length;
              reviewTechIndex++) {
            if (!FBDATA.tech[reviewTech[reviewTechIndex]]) {
              errors.push('Technology impact review ' + featureId +
                ': missing technology ' + reviewTech[reviewTechIndex] + '.');
            }
          }
        }
      }
    }
    for (var id in (FBDATA.tech || {})) {
      if (!own(FBDATA.tech, id)) continue;
      var def = FB.normalizeTechDefinition(id, FBDATA.tech[id]);
      if (!def || !FBDATA.techDomains[def.domain]) {
        errors.push('Technology ' + id + ': invalid domain.');
        continue;
      }
      if (!(Number(def.cost) > 0)) errors.push('Technology ' + id + ': cost must be positive.');
      var attested = def.history.attested;
      if (!Array.isArray(attested) || attested.length !== 2 ||
          !isFinite(attested[0]) || !isFinite(attested[1]) || attested[0] > attested[1]) {
        errors.push('Technology ' + id + ': invalid attested range.');
      }
      var adoption = def.history.adoption || {};
      if (!Array.isArray(adoption.default) || adoption.default.length !== 2 ||
          !isFinite(adoption.default[0]) || !isFinite(adoption.default[1]) ||
          adoption.default[0] > adoption.default[1]) {
        errors.push('Technology ' + id + ': missing default adoption window.');
      } else if (Array.isArray(attested) && adoption.default[0] < attested[0]) {
        errors.push('Technology ' + id + ': default adoption predates first attestation.');
      }
      for (var adoptionKey in adoption) if (own(adoption, adoptionKey) &&
          adoptionKey !== 'default' && !traditions[adoptionKey]) {
        errors.push('Technology ' + id + ': unknown adoption tradition ' + adoptionKey + '.');
      }
      for (var traditionId in traditions) if (own(traditions, traditionId)) {
        var window = adoption[traditionId] || adoption.default;
        if (!Array.isArray(window) || window.length !== 2 ||
            !isFinite(window[0]) || !isFinite(window[1]) || window[0] > window[1]) {
          errors.push('Technology ' + id + ': invalid ' + traditionId + ' adoption window.');
        } else if (Array.isArray(attested) && window[0] < attested[0]) {
          errors.push('Technology ' + id + ': ' + traditionId +
            ' adoption predates first attestation.');
        }
      }
      var refs = def.req.concat(def.reqAny);
      for (var r = 0; r < refs.length; r++) {
        if (!FBDATA.tech[refs[r]]) errors.push('Technology ' + id + ': missing prerequisite ' + refs[r] + '.');
      }
      if (!Array.isArray(def.sources) || !def.sources.length) {
        errors.push('Technology ' + id + ': at least one source is required.');
      } else {
        for (var sourceIndex = 0; sourceIndex < def.sources.length; sourceIndex++) {
          if (typeof def.sources[sourceIndex] !== 'string' || !def.sources[sourceIndex]) {
            errors.push('Technology ' + id + ': invalid source reference.');
          }
        }
        if (def.confidence !== 'high' && def.confidence !== 'modded' &&
            def.sources.length < 2) {
          errors.push('Technology ' + id + ': disputed chronology requires multiple sources.');
        }
      }
      if (['high','medium','low','modded'].indexOf(def.confidence) < 0) {
        errors.push('Technology ' + id + ': invalid confidence.');
      }
      for (var u = 0; u < def.unlocks.length; u++) validateUnlock(id, def.unlocks[u], errors);
      for (var fxKey in def.fx) if (own(def.fx, fxKey)) {
        if (SCALAR_KEYS[fxKey] || fxKey === 'seaTransport' ||
            fxKey === 'costs' || fxKey === 'units' ||
            fxKey === 'aiUnits' || fxKey === 'build' || fxKey === 'retinue' ||
            fxKey === 'archers') continue;
        errors.push('Technology ' + id + ': invalid effect ' + fxKey + '.');
      }
      for (var scalarKey in SCALAR_KEYS) if (own(SCALAR_KEYS, scalarKey) &&
          def.fx[scalarKey] !== undefined && !isFinite(Number(def.fx[scalarKey]))) {
        errors.push('Technology ' + id + ': non-numeric effect ' + scalarKey + '.');
      }
      if (def.fx.seaTransport !== undefined &&
          (typeof def.fx.seaTransport !== 'number' ||
           !isFinite(def.fx.seaTransport) ||
           def.fx.seaTransport <= 0 ||
           Math.floor(def.fx.seaTransport) !== def.fx.seaTransport)) {
        errors.push('Technology ' + id +
          ': seaTransport must be a positive integer.');
      }
      if (def.fx.costs) for (var costKey in def.fx.costs) {
        if (own(def.fx.costs, costKey) && !COST_KEYS[costKey]) {
          errors.push('Technology ' + id + ': invalid cost effect ' + costKey + '.');
        } else if (own(def.fx.costs, costKey) &&
            !isFinite(Number(def.fx.costs[costKey]))) {
          errors.push('Technology ' + id + ': non-numeric cost effect ' + costKey + '.');
        }
      }
      if (def.fx.units) for (var unitKey in def.fx.units) {
        if (own(def.fx.units, unitKey) && !UNIT_KEYS[unitKey]) {
          errors.push('Technology ' + id + ': invalid unit effect ' + unitKey + '.');
        } else if (own(def.fx.units, unitKey) &&
            !isFinite(Number(def.fx.units[unitKey]))) {
          errors.push('Technology ' + id + ': non-numeric unit effect ' + unitKey + '.');
        }
      }
      if (def.fx.aiUnits) for (var aiKey in def.fx.aiUnits) {
        if (own(def.fx.aiUnits, aiKey) && !AI_UNIT_KEYS[aiKey]) {
          errors.push('Technology ' + id + ': invalid AI unit effect ' + aiKey + '.');
        } else if (own(def.fx.aiUnits, aiKey) &&
            !isFinite(Number(def.fx.aiUnits[aiKey]))) {
          errors.push('Technology ' + id + ': non-numeric AI unit effect ' + aiKey + '.');
        }
      }
    }

    var visiting = {}, visited = {};
    function walk(id) {
      if (visiting[id]) {
        errors.push('Technology prerequisite cycle reaches ' + id + '.');
        return;
      }
      if (visited[id] || !FBDATA.tech[id]) return;
      visiting[id] = 1;
      var def = FBDATA.tech[id], refs = def.req.concat(def.reqAny);
      for (var i = 0; i < refs.length; i++) walk(refs[i]);
      delete visiting[id];
      visited[id] = 1;
    }
    for (var techId in FBDATA.tech) if (own(FBDATA.tech, techId)) walk(techId);

    function validateRequirement(tableName, itemId, requirement) {
      var requirements = asList(requirement);
      for (var requirementIndex = 0; requirementIndex < requirements.length;
        requirementIndex++) {
        if (!FBDATA.tech[requirements[requirementIndex]]) {
          errors.push(tableName + ' ' + itemId + ': missing required technology ' +
            requirements[requirementIndex] + '.');
        }
      }
    }
    var auctionLotTypes = FBDATA.auctionLotTypes || {};
    var knownAuctionLotTypes = ['item','enterprise','claim'];
    for (var knownAuctionLotIndex = 0;
        knownAuctionLotIndex < knownAuctionLotTypes.length; knownAuctionLotIndex++) {
      if (!auctionLotTypes[knownAuctionLotTypes[knownAuctionLotIndex]]) {
        errors.push('Auction lot type ' + knownAuctionLotTypes[knownAuctionLotIndex] +
          ': definition is required.');
      }
    }
    for (var auctionLotTypeId in auctionLotTypes) {
      if (!own(auctionLotTypes, auctionLotTypeId)) continue;
      var auctionLotType = auctionLotTypes[auctionLotTypeId];
      if (knownAuctionLotTypes.indexOf(auctionLotTypeId) < 0) {
        errors.push('Auction lot type ' + auctionLotTypeId + ': id is not supported.');
      } else if (!auctionLotType || typeof auctionLotType !== 'object' ||
          Array.isArray(auctionLotType)) {
        errors.push('Auction lot type ' + auctionLotTypeId + ': definition is invalid.');
      } else if (typeof auctionLotType.weight !== 'number' ||
          !isFinite(auctionLotType.weight) || auctionLotType.weight < 0) {
        errors.push('Auction lot type ' + auctionLotTypeId +
          ': weight must be a non-negative number.');
      }
    }
    var requirementTables = {
      Building:FBDATA.buildings,
      Career:FBDATA.careers,
      Schooling:FBDATA.schooling,
      Enterprise:FBDATA.enterprises,
      'Auction lot type':FBDATA.auctionLotTypes,
      Finance:FBDATA.finance,
      Policy:FBDATA.policies,
      Privilege:FBDATA.privileges,
      'Feudal service charter':FBDATA.feudalServiceCharters
    };
    for (var tableName in requirementTables) {
      if (!own(requirementTables, tableName)) continue;
      var table = requirementTables[tableName] || {};
      for (var itemId in table) if (own(table, itemId)) {
        validateRequirement(tableName, itemId,
          table[itemId] && table[itemId].requiresTech);
      }
    }
    var careers = FBDATA.careers || {};
    for (var careerId in careers) if (own(careers, careerId)) {
      var career = careers[careerId] || {};
      var specializations = career.specializations || {};
      for (var specializationId in specializations) {
        if (!own(specializations, specializationId)) continue;
        validateRequirement('Career specialization',
          careerId + '.' + specializationId,
          specializations[specializationId].requiresTech);
      }
    }
    var standards = FBDATA.householdStandards || {};
    for (var standardId in standards) if (own(standards, standardId)) {
      validateRequirement('Household standard', standardId, standards[standardId].requiresTech);
      var levels = standards[standardId].levels || [];
      for (var levelIndex = 0; levelIndex < levels.length; levelIndex++) {
        validateRequirement('Household standard level',
          standardId + '.' + levelIndex, levels[levelIndex].requiresTech);
      }
    }
    var events = FBDATA.events || [];
    for (var eventIndex = 0; eventIndex < events.length; eventIndex++) {
      var event = events[eventIndex];
      if (!event || !Array.isArray(event.options)) continue;
      for (var optionIndex = 0; optionIndex < event.options.length; optionIndex++) {
        var eventOption = event.options[optionIndex];
        validateRequirement('Event option', event.id + '.' + optionIndex,
          eventOption.requiresTech);
        if (eventOption.showWhenTechLocked !== undefined &&
            typeof eventOption.showWhenTechLocked !== 'boolean') {
          errors.push('Event option ' + event.id + '.' + optionIndex +
            ': showWhenTechLocked must be a boolean.');
        }
        if (eventOption.showWhenTechLocked && !eventOption.requiresTech) {
          errors.push('Event option ' + event.id + '.' + optionIndex +
            ': showWhenTechLocked requires requiresTech.');
        }
        if (eventOption.manualOnly !== undefined &&
            typeof eventOption.manualOnly !== 'boolean') {
          errors.push('Event option ' + event.id + '.' + optionIndex +
            ': manualOnly must be a boolean.');
        }
      }
    }
    var bookmarks = FBDATA.bookmarks || {};
    for (var bookmarkId in bookmarks) {
      if (!own(bookmarks, bookmarkId)) continue;
      var realms = bookmarks[bookmarkId] && bookmarks[bookmarkId].realms || [];
      for (var ri = 0; ri < realms.length; ri++) {
        var realm = realms[ri];
        if (!realm) continue;
        if (realm.techTraditions !== undefined &&
            !Array.isArray(realm.techTraditions)) {
          errors.push('Bookmark ' + bookmarkId + ' realm ' + realm.id +
            ': technology traditions must be an array.');
        }
        var explicit = asList(realm.techTraditions);
        for (var ti = 0; ti < explicit.length; ti++) if (!traditions[explicit[ti]]) {
          errors.push('Bookmark ' + bookmarkId + ' realm ' + realm.id +
            ': invalid technology tradition ' + explicit[ti] + '.');
        }
        var seed = realm.techSeed || {};
        if (realm.techSeed !== undefined &&
            (!realm.techSeed || typeof realm.techSeed !== 'object' ||
             Array.isArray(realm.techSeed))) {
          errors.push('Bookmark ' + bookmarkId + ' realm ' + realm.id +
            ': technology seed must be an object.');
          seed = {};
        }
        for (var seedFieldIndex = 0;
          seedFieldIndex < ['complete','expose','omit'].length; seedFieldIndex++) {
          var seedField = ['complete','expose','omit'][seedFieldIndex];
          if (seed[seedField] !== undefined && !Array.isArray(seed[seedField])) {
            errors.push('Bookmark ' + bookmarkId + ' realm ' + realm.id +
              ': technology seed ' + seedField + ' must be an array.');
          }
        }
        var seedRefs = asList(seed.complete).concat(asList(seed.expose),asList(seed.omit));
        for (var si = 0; si < seedRefs.length; si++) if (!FBDATA.tech[seedRefs[si]]) {
          errors.push('Bookmark ' + bookmarkId + ' realm ' + realm.id +
            ': invalid technology seed ' + seedRefs[si] + '.');
        }
      }
    }
    return errors;
  };

  FB.techGraphEngine = 1;
})();
