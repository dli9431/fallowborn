/* Fallowborn — characters, dynasties, traits, titles */
window.FB = window.FB || {};

(function () {
  'use strict';

  const SKILLS = ['dip', 'mar', 'ste', 'int', 'lea'];
  const CHARACTER_RESIDENCE_CACHE =
    typeof WeakMap === 'function' ? new WeakMap() : null;
  FB.SKILLS = SKILLS;
  FB.SKILL_NAMES = { dip: 'Diplomacy', mar: 'Martial', ste: 'Stewardship', int: 'Intrigue', lea: 'Learning' };
  FB.SKILL_ICONS = { dip: '🤝', mar: '⚔', ste: '⚖', int: '🕸', lea: '📖' };
  FB.skillName = function (id) {
    return FB.T(FB.SKILL_NAMES[id] || id);
  };

  FB.cultureOf = function (id) { return FBDATA.cultures[id] || FBDATA.cultures.frankish; };

  FB.cultureGroup = function (cid) {
    const culture = FBDATA.cultures && FBDATA.cultures[cid];
    const id = culture && culture.tradition;
    return id && FBDATA.cultureTraditions &&
      Object.prototype.hasOwnProperty.call(FBDATA.cultureTraditions, id)
      ? id : 'other';
  };

  FB.cultureTraditionOf = function (cid) {
    const id = FB.cultureGroup(cid);
    return FBDATA.cultureTraditions && FBDATA.cultureTraditions[id] ||
      FBDATA.cultureTraditions && FBDATA.cultureTraditions.other || null;
  };

  FB.validateCultureData = function () {
    const errors = [];
    const traditions = FBDATA.cultureTraditions;
    const cultures = FBDATA.cultures;
    const slug = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
    if (!traditions || typeof traditions !== 'object' || Array.isArray(traditions)) {
      return ['Culture data: FBDATA.cultureTraditions must be an object keyed by tradition id.'];
    }
    if (!Object.prototype.hasOwnProperty.call(traditions, 'other')) {
      errors.push('Culture data: missing other tradition.');
    }
    for (const tid in traditions) {
      if (!Object.prototype.hasOwnProperty.call(traditions, tid)) continue;
      const tradition = traditions[tid];
      if (!slug.test(tid)) errors.push('Culture data: invalid tradition id ' + tid + '.');
      if (!tradition || typeof tradition !== 'object' || Array.isArray(tradition)) {
        errors.push('Culture data: tradition ' + tid + ' must be an object.');
        continue;
      }
      if (typeof tradition.name !== 'string' || !tradition.name) {
        errors.push('Culture data: tradition ' + tid + ' requires a name.');
      }
      if (tradition.icon !== undefined && typeof tradition.icon !== 'string') {
        errors.push('Culture data: tradition ' + tid + ' icon must be a string.');
      }
      if (tradition.order !== undefined &&
          (typeof tradition.order !== 'number' || !isFinite(tradition.order))) {
        errors.push('Culture data: tradition ' + tid + ' order must be finite.');
      }
    }
    if (!cultures || typeof cultures !== 'object' || Array.isArray(cultures)) {
      errors.push('Culture data: FBDATA.cultures must be an object keyed by culture id.');
      return errors;
    }
    for (const cid in cultures) {
      if (!Object.prototype.hasOwnProperty.call(cultures, cid)) continue;
      const culture = cultures[cid];
      if (!culture || typeof culture !== 'object' || Array.isArray(culture)) {
        errors.push('Culture data: culture ' + cid + ' must be an object.');
        continue;
      }
      if (culture.tradition !== undefined &&
          !Object.prototype.hasOwnProperty.call(traditions, culture.tradition)) {
        errors.push('Culture data: culture ' + cid + ' has invalid tradition ' +
          culture.tradition + '.');
      }
    }
    return errors;
  };

  FB.cultureRelation = function (state, observerId, targetId) {
    if (observerId === targetId) return 'same';
    const g1 = FB.cultureGroup(observerId);
    const g2 = FB.cultureGroup(targetId);
    if (g1 === g2 && g1 !== 'other') return 'same_group';
    return 'foreign';
  };

  /* ---------- faith definitions ----------
     Authored and generated faiths share one inheritance graph. Definitions
     keep identity/lifecycle fields locally and recursively inherit only the
     JSON-safe values inside `properties`; legacy top-level qualities and the
     old `group` parent spelling remain accepted for existing mods. */
  const FAITH_META = {
    id:true, name:true, adjective:true, collective:true, desc:true, icon:true,
    parent:true, group:true, assignable:true, active:true,
    relationToParent:true, relations:true, properties:true,
    createdTurn:true, founderId:true, originProvinceId:true
  };
  const FAITH_RELATIONS = {
    same:0, in_fold:1, schismatic:2, hostile:3, foreign:4
  };
  /* A shared faith is a useful prior, not a verdict. Related branches retain
     some trust, unfamiliar faiths begin guarded, and the severe penalty is
     reserved for an explicitly condemned relationship. */
  const FAITH_RELATION_BASELINES = {
    same:15, in_fold:10, schismatic:5, hostile:-25, foreign:-10
  };
  const LEGACY_FAITH_GROUPS = {
    christian:true, muslim:true, pagan:true, jewish:true
  };
  let staticFaithCompiled = null;
  let liveFaithState = null;
  let liveFaithRevision = -1;
  let liveFaithCompiled = null;

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function plainObject(value) {
    return !!value && Object.prototype.toString.call(value) === '[object Object]';
  }

  function cloneFaithValue(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) { return cloneFaithValue(item); });
    }
    if (plainObject(value)) {
      const out = {};
      for (const key in value) if (own(value, key)) {
        out[key] = cloneFaithValue(value[key]);
      }
      return out;
    }
    return value;
  }

  function jsonSafeFaithValue(value, stack) {
    if (value === null || typeof value === 'string' ||
        typeof value === 'boolean') return true;
    if (typeof value === 'number') return isFinite(value);
    if (!Array.isArray(value) && !plainObject(value)) return false;
    stack = stack || [];
    if (stack.indexOf(value) >= 0) return false;
    stack.push(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (!jsonSafeFaithValue(value[i], stack)) { stack.pop(); return false; }
      }
    } else {
      for (const key in value) if (own(value, key) &&
          !jsonSafeFaithValue(value[key], stack)) {
        stack.pop();
        return false;
      }
    }
    stack.pop();
    return true;
  }

  function mergeFaithValues(target, additions, sources, sourceId, prefix) {
    if (!plainObject(additions)) return target;
    for (const key in additions) {
      if (!own(additions, key)) continue;
      const path = prefix ? prefix + '.' + key : key;
      const value = additions[key];
      if (plainObject(value)) {
        if (!plainObject(target[key])) target[key] = {};
        if (path) sources[path] = sourceId;
        mergeFaithValues(target[key], value, sources, sourceId, path);
      } else {
        target[key] = cloneFaithValue(value);
        sources[path] = sourceId;
      }
    }
    return target;
  }

  function faithParent(def) {
    if (!def || typeof def !== 'object') return null;
    const value = own(def, 'parent') ? def.parent : def.group;
    if (value === undefined || value === null || value === '') return null;
    /* Old Judaism replacements commonly repeated `group:'jewish'`. It was a
       category label, not an attempt to make the faith inherit from itself. */
    return String(value) === String(def.id || '') ? null : String(value);
  }

  function localFaithProperties(def) {
    const out = {};
    if (plainObject(def && def.properties)) {
      mergeFaithValues(out, def.properties, {}, '', '');
    }
    /* Compatibility: religion records historically placed `head` and any
       mod-added qualities beside name/group/icon. Treat every non-meta field
       as an inheritable property without mutating the mod's raw object. */
    if (def && typeof def === 'object') {
      for (const key in def) {
        if (!own(def, key) || FAITH_META[key]) continue;
        out[key] = cloneFaithValue(def[key]);
      }
    }
    return out;
  }

  function faithRawTable(state) {
    const table = {};
    const base = FBDATA.religions || {};
    for (const id in base) if (own(base, id)) table[id] = base[id];
    const generated = state && plainObject(state.faiths) ? state.faiths : null;
    if (generated) for (const id in generated) if (own(generated, id)) {
      table[id] = generated[id];
    }
    return table;
  }

  function normalizeFaithRelation(value, direction) {
    let status = value;
    if (plainObject(value)) {
      status = direction === 'parentView' ? value.parentView : value.childView;
    }
    return own(FAITH_RELATIONS, status) && status !== 'same' && status !== 'foreign'
      ? status : 'schismatic';
  }

  function compileFaithTable(state) {
    const raw = faithRawTable(state);
    const resolved = {}, errors = [], visiting = {};
    function fault(id, text) { errors.push('Faith ' + id + ': ' + text); }
    function resolve(id) {
      if (resolved[id]) return resolved[id];
      const def = raw[id];
      if (!plainObject(def)) {
        fault(id, 'definition must be an object.');
        return null;
      }
      if (!jsonSafeFaithValue(def)) {
        fault(id, 'definition must contain only finite JSON-safe values.');
        return null;
      }
      if (visiting[id]) {
        fault(id, 'inheritance cycle.');
        return null;
      }
      visiting[id] = true;
      const local = cloneFaithValue(def);
      local.id = id;
      const parentId = faithParent(local);
      let parent = null;
      if (parentId) {
        if (!raw[parentId]) fault(id, 'unknown parent ' + parentId + '.');
        else parent = resolve(parentId);
      }
      const properties = parent ? cloneFaithValue(parent.properties) : {};
      const sources = parent ? cloneFaithValue(parent._faithSources) : {};
      const localProperties = localFaithProperties(local);
      mergeFaithValues(properties, localProperties, sources, id, '');
      /* A faith founded during play is a new institution, even when it keeps
         friendly relations with its parent. Doctrines continue to inherit,
         but a central office is allegiance rather than doctrine: the branch
         must explicitly author `properties.head` to keep recognizing it.
         Applying this while compiling also repairs campaign faiths created by
         older builds, whose saved definitions inherited an office silently. */
      const campaignFounded = local.founderId !== undefined ||
        local.originProvinceId !== undefined;
      if (parent && campaignFounded && !own(localProperties, 'head')) {
        properties.head = null;
        sources.head = id;
      }
      /* Papal mechanics cannot survive an explicit or automatic removal of
         the office. Keep the effective capability tree consistent even when
         an older definition supplied only `head:null`. */
      if (properties.head === null && plainObject(properties.systems) &&
          properties.systems.papacy) {
        properties.systems.papacy = false;
        sources['systems.papacy'] = id;
      }
      /* Before officeId existed, a head definition's faith id was also its
         save key. Preserve that contract for old mods while new definitions
         can deliberately share a stable office across inherited children. */
      if (plainObject(local.head) && !own(local.head, 'officeId')) {
        properties.head.officeId = id;
        sources['head.officeId'] = id;
      } else if (plainObject(properties.head) && !own(properties.head, 'officeId')) {
        properties.head.officeId = id;
        sources['head.officeId'] = id;
      }
      const effective = {
        id:id,
        name:typeof local.name === 'string' && local.name ? local.name : id,
        adjective:local.adjective,
        collective:local.collective,
        desc:local.desc,
        icon:local.icon || (parent && parent.icon) || '',
        parent:parentId,
        assignable:local.assignable !== false,
        active:local.active !== false,
        relationToParent:local.relationToParent,
        relations:plainObject(local.relations) ? cloneFaithValue(local.relations) : {},
        properties:properties,
        createdTurn:local.createdTurn,
        founderId:local.founderId,
        originProvinceId:local.originProvinceId
      };
      for (const key in properties) if (own(properties, key)) {
        effective[key] = properties[key];
      }
      const lineage = [id];
      if (parent && parent._faithLineage) {
        for (let i = 0; i < parent._faithLineage.length; i++) {
          lineage.push(parent._faithLineage[i]);
        }
      }
      let legacyGroup = null;
      for (let i = 0; i < lineage.length; i++) {
        if (LEGACY_FAITH_GROUPS[lineage[i]]) legacyGroup = lineage[i];
      }
      effective.group = legacyGroup || parentId || id;
      Object.defineProperty(effective, '_faithLineage', {
        value:lineage, enumerable:false
      });
      Object.defineProperty(effective, '_faithSources', {
        value:sources, enumerable:false
      });
      Object.defineProperty(effective, '_faithRaw', {
        value:local, enumerable:false
      });
      resolved[id] = effective;
      visiting[id] = false;
      return effective;
    }
    for (const id in raw) if (own(raw, id)) resolve(id);

    for (const id in resolved) {
      if (!own(resolved, id)) continue;
      const rel = resolved[id];
      const rawDef = raw[id];
      if (rawDef.assignable !== false &&
          (typeof rawDef.name !== 'string' || !rawDef.name)) {
        fault(id, 'assignable definitions need a name.');
      }
      if (rawDef.relationToParent !== undefined && !rel.parent) {
        fault(id, 'relationToParent requires a parent.');
      }
      if (rel.parent) {
        const relation = rawDef.relationToParent;
        if (plainObject(relation)) {
          if (!own(FAITH_RELATIONS, relation.childView) ||
              !own(FAITH_RELATIONS, relation.parentView) ||
              relation.childView === 'same' || relation.childView === 'foreign' ||
              relation.parentView === 'same' || relation.parentView === 'foreign') {
            fault(id, 'relationToParent has an invalid directional status.');
          }
        } else if (relation !== undefined &&
            (!own(FAITH_RELATIONS, relation) || relation === 'same' ||
             relation === 'foreign')) {
          fault(id, 'relationToParent has an invalid status.');
        }
      }
      for (const targetId in rel.relations) {
        if (!own(rel.relations, targetId)) continue;
        if (!resolved[targetId]) fault(id, 'relation references unknown faith ' + targetId + '.');
        const status = rel.relations[targetId];
        if (!own(FAITH_RELATIONS, status) || status === 'same') {
          fault(id, 'relation to ' + targetId + ' has an invalid status.');
        }
      }
      const marriage = rel.marriage;
      if (marriage !== undefined) {
        if (!plainObject(marriage)) {
          fault(id, 'marriage must be an object.');
        } else {
          const limits = marriage.spouseLimit;
          if (!plainObject(limits) || !isFinite(limits.m) || !isFinite(limits.f) ||
              limits.m < 1 || limits.f < 1 || Math.floor(limits.m) !== limits.m ||
              Math.floor(limits.f) !== limits.f) {
            fault(id, 'marriage.spouseLimit needs positive integer m and f values.');
          }
          const accepted = marriage.acceptedRelations;
          if (!Array.isArray(accepted) || !accepted.length) {
            fault(id, 'marriage.acceptedRelations must be a non-empty array.');
          } else for (let ai = 0; ai < accepted.length; ai++) {
            if (!own(FAITH_RELATIONS, accepted[ai])) {
              fault(id, 'marriage.acceptedRelations contains ' + accepted[ai] + '.');
            }
          }
          const ending = marriage.divorce;
          if (!plainObject(ending) ||
              ['annulment','talaq','get','sunder'].indexOf(ending.kind) < 0) {
            fault(id, 'marriage.divorce has an invalid kind.');
          }
        }
      }
      const titles = rel.rankTitles;
      if (titles !== undefined) {
        if (!plainObject(titles) || !Array.isArray(titles.m) ||
            !Array.isArray(titles.f) || titles.m.length < 8 || titles.f.length < 8) {
          fault(id, 'rankTitles needs m and f arrays with eight tiers.');
        }
      }
      if (rel.head !== undefined && rel.head !== null) {
        if (!plainObject(rel.head) || typeof rel.head.officeId !== 'string' ||
            !rel.head.officeId) fault(id, 'head needs a stable officeId.');
        else if (rel.head.holderSex !== undefined &&
            rel.head.holderSex !== 'm' && rel.head.holderSex !== 'f') {
          fault(id, 'head.holderSex must be m or f when supplied.');
        }
      }
    }
    return { raw:raw, resolved:resolved, errors:errors };
  }

  function stateFaithRevision(state) {
    return state && isFinite(state._faithRevision) ? state._faithRevision : 0;
  }

  function requestedFaithState(state) {
    return state === undefined ? FB.state : state;
  }

  function compiledFaiths(state) {
    if (state && plainObject(state.faiths) && Object.keys(state.faiths).length) {
      const revision = stateFaithRevision(state);
      if (liveFaithState !== state || liveFaithRevision !== revision ||
          !liveFaithCompiled) {
        liveFaithState = state;
        liveFaithRevision = revision;
        liveFaithCompiled = compileFaithTable(state);
      }
      return liveFaithCompiled;
    }
    if (!staticFaithCompiled) staticFaithCompiled = compileFaithTable(null);
    return staticFaithCompiled;
  }

  function touchFaithState(state) {
    if (!state) return;
    const next = stateFaithRevision(state) + 1;
    try {
      Object.defineProperty(state, '_faithRevision', {
        value:next, writable:true, configurable:true, enumerable:false
      });
    } catch (e) { state._faithRevision = next; }
    if (liveFaithState === state) liveFaithCompiled = null;
  }

  FB.invalidateReligionData = function () {
    staticFaithCompiled = null;
    liveFaithCompiled = null;
  };

  FB.invalidateFaithState = function (state) {
    touchFaithState(state);
  };

  FB.configureReligions = function (state) {
    if (state) touchFaithState(state);
    else FB.invalidateReligionData();
    return compiledFaiths(state).errors.slice();
  };

  FB.validateReligionData = function (state) {
    return compiledFaiths(state).errors.slice();
  };

  FB.ensureFaithState = function (state) {
    if (!state) return {};
    let changed = false;
    if (!plainObject(state.faiths)) { state.faiths = {}; changed = true; }
    if (!plainObject(state.faithRelations)) { state.faithRelations = {}; changed = true; }
    if (!isFinite(state.faithNextId) || state.faithNextId < 1) {
      state.faithNextId = 1;
      changed = true;
    } else state.faithNextId = Math.floor(state.faithNextId);
    if (changed) touchFaithState(state);
    return state.faiths;
  };

  FB.religionIds = function (state, assignableOnly) {
    const compiled = compiledFaiths(requestedFaithState(state));
    const out = [];
    for (const id in compiled.resolved) {
      if (!own(compiled.resolved, id)) continue;
      const rel = compiled.resolved[id];
      if (assignableOnly && (!rel.assignable || !rel.active)) continue;
      out.push(id);
    }
    return out;
  };

  FB.religionOf = function (id, state) {
    const compiled = compiledFaiths(requestedFaithState(state));
    return compiled.resolved[id] || compiled.resolved.catholic ||
      compiled.resolved[Object.keys(compiled.resolved)[0]] || null;
  };

  FB.faithExists = function (id, state) {
    return !!compiledFaiths(requestedFaithState(state)).resolved[id];
  };

  FB.faithAssignable = function (id, state) {
    const rel = compiledFaiths(requestedFaithState(state)).resolved[id];
    return !!(rel && rel.assignable && rel.active);
  };

  FB.faithLineage = function (id, state) {
    const rel = compiledFaiths(requestedFaithState(state)).resolved[id];
    return rel && rel._faithLineage ? rel._faithLineage.slice() : [];
  };

  FB.faithIsA = function (id, ancestorId, state) {
    return FB.faithLineage(id, state).indexOf(ancestorId) >= 0;
  };

  FB.faithGroup = function (id, state) {
    const lineage = FB.faithLineage(id, state);
    let group = null;
    for (let i = 0; i < lineage.length; i++) {
      if (LEGACY_FAITH_GROUPS[lineage[i]]) group = lineage[i];
    }
    return group || (lineage.length > 1 ? lineage[lineage.length - 1] : id);
  };

  function faithPath(obj, path) {
    const parts = String(path || '').split('.');
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      if (cur === undefined || cur === null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  FB.faithValue = function (state, id, path) {
    const rel = compiledFaiths(requestedFaithState(state)).resolved[id];
    if (!rel) return { value:undefined, sourceId:null };
    let sourceId = id;
    if (path !== 'name' && path !== 'adjective' && path !== 'collective' &&
        path !== 'desc' && path !== 'icon') {
      let probe = String(path || '');
      while (probe) {
        if (rel._faithSources[probe]) { sourceId = rel._faithSources[probe]; break; }
        const dot = probe.lastIndexOf('.');
        probe = dot >= 0 ? probe.slice(0, dot) : '';
      }
    }
    return { value:faithPath(rel, path), sourceId:sourceId };
  };

  FB.faithDataText = function (state, viewer, id, path, ctx) {
    const found = FB.faithValue(state, id, path);
    const sourceId = found.sourceId || id;
    const source = FB.religionOf(sourceId, state);
    if (!source) return '';
    return FB.dataText(state, viewer, 'religion', sourceId, source, path, ctx || {});
  };

  FB.faithBranch = function (state, id, value) {
    if (!plainObject(value) || value.text !== undefined || value.forms) {
      return { branch:'default', value:value };
    }
    const lineage = FB.faithLineage(id, state);
    for (let i = 0; i < lineage.length; i++) {
      if (own(value, lineage[i])) {
        return { branch:lineage[i], value:value[lineage[i]] };
      }
    }
    return { branch:'default', value:value.default };
  };

  function explicitFaithRelation(state, observerId, targetId) {
    const overrides = state && plainObject(state.faithRelations)
      ? state.faithRelations : null;
    const compiled = compiledFaiths(requestedFaithState(state)).resolved;
    const observerLine = FB.faithLineage(observerId, state);
    const targetLine = FB.faithLineage(targetId, state);
    for (let oi = 0; oi < observerLine.length; oi++) {
      const observer = observerLine[oi];
      for (let ti = 0; ti < targetLine.length; ti++) {
        const target = targetLine[ti];
        if (overrides && plainObject(overrides[observer]) &&
            own(overrides[observer], target)) {
          return overrides[observer][target];
        }
        const rel = compiled[observer];
        if (rel && own(rel.relations, target)) return rel.relations[target];
      }
    }
    return null;
  }

  FB.faithRelation = function (state, observerId, targetId) {
    if (observerId === targetId && FB.faithExists(observerId, state)) return 'same';
    if (!FB.faithExists(observerId, state) || !FB.faithExists(targetId, state)) {
      return 'foreign';
    }
    const explicit = explicitFaithRelation(state, observerId, targetId);
    if (own(FAITH_RELATIONS, explicit)) return explicit;
    const observerLine = FB.faithLineage(observerId, state);
    const targetLine = FB.faithLineage(targetId, state);
    let common = null, observerCommon = -1, targetCommon = -1;
    for (let oi = 0; oi < observerLine.length && common === null; oi++) {
      const ti = targetLine.indexOf(observerLine[oi]);
      if (ti >= 0) { common = observerLine[oi]; observerCommon = oi; targetCommon = ti; }
    }
    if (common === null) return 'foreign';
    let worst = FAITH_RELATIONS.in_fold;
    const compiled = compiledFaiths(requestedFaithState(state)).resolved;
    for (let oi = 0; oi < observerCommon; oi++) {
      const status = normalizeFaithRelation(
        compiled[observerLine[oi]].relationToParent, 'childView');
      worst = Math.max(worst, FAITH_RELATIONS[status]);
    }
    for (let ti = 0; ti < targetCommon; ti++) {
      const status = normalizeFaithRelation(
        compiled[targetLine[ti]].relationToParent, 'parentView');
      worst = Math.max(worst, FAITH_RELATIONS[status]);
    }
    for (const status in FAITH_RELATIONS) {
      if (FAITH_RELATIONS[status] === worst) return status;
    }
    return 'schismatic';
  };

  FB.faithRelationBaseline = function (state, observerId, targetId) {
    const relation = FB.faithRelation(state, observerId, targetId);
    return own(FAITH_RELATION_BASELINES, relation)
      ? FAITH_RELATION_BASELINES[relation] : 0;
  };

  FB.faithInFold = function (state, observerId, targetId) {
    const relation = FB.faithRelation(state, observerId, targetId);
    return relation === 'same' || relation === 'in_fold';
  };

  FB.setFaithRelation = function (state, observerId, targetId, status) {
    if (!state || observerId === targetId || !FB.faithExists(observerId, state) ||
        !FB.faithExists(targetId, state) || !own(FAITH_RELATIONS, status) ||
        status === 'same') return false;
    FB.ensureFaithState(state);
    if (!plainObject(state.faithRelations[observerId])) {
      state.faithRelations[observerId] = {};
    }
    state.faithRelations[observerId][targetId] = status;
    return true;
  };

  FB.faithAllowsMarriage = function (state, observerId, targetId) {
    if (!FB.faithExists(observerId, state) || !FB.faithExists(targetId, state)) return false;
    const rel = FB.religionOf(observerId, state);
    const accepted = rel && rel.marriage && rel.marriage.acceptedRelations || ['same'];
    return accepted.indexOf(FB.faithRelation(state, observerId, targetId)) >= 0;
  };

  FB.faithHasSystem = function (id, systemId, state) {
    if (!FB.faithExists(id, state)) return false;
    const rel = FB.religionOf(id, state);
    return !!(rel && rel.systems && rel.systems[systemId]);
  };

  FB.faithOfficeId = function (id, state) {
    if (!FB.faithExists(id, state)) return null;
    const rel = FB.religionOf(id, state);
    return rel && rel.head && rel.head.officeId || null;
  };

  FB.createFaith = function (state, definition) {
    if (!state || !plainObject(definition) ||
        !jsonSafeFaithValue(definition)) return null;
    FB.ensureFaithState(state);
    const suppliedId = definition.id === undefined ? null : String(definition.id);
    let id = suppliedId;
    if (!id) {
      do { id = 'generated_faith_' + state.faithNextId++; }
      while (FB.faithExists(id, state));
    }
    if (!/^[a-z0-9_-]+$/i.test(id) || FB.faithExists(id, state)) return null;
    const stored = cloneFaithValue(definition);
    delete stored.id;
    if (stored.assignable === undefined) stored.assignable = true;
    if (stored.active === undefined) stored.active = true;
    if (stored.createdTurn === undefined) stored.createdTurn = Number(state.turn) || 0;
    state.faiths[id] = stored;
    touchFaithState(state);
    const errors = FB.validateReligionData(state);
    if (errors.length) {
      delete state.faiths[id];
      touchFaithState(state);
      return null;
    }
    return id;
  };

  /* Runtime schisms use the same JSON definition as seeded faiths. The
     definition is saved in state; only actor/realm conversion is performed
     here because county religion still belongs to the authored world map. */
  FB.foundFaith = function (state, definition, options) {
    if (!state || !definition || typeof definition !== 'object') return null;
    options = options || {};
    const me = state.chars && state.chars[state.player.charId];
    const stored = cloneFaithValue(definition);
    if (!own(stored, 'group') && !own(stored, 'parent') && me) {
      stored.group = me.religion;
    } else if (stored.group === '$current' && me) {
      stored.group = me.religion;
    } else if (stored.parent === '$current' && me) {
      stored.parent = me.religion;
    }
    if ((stored.group || stored.parent) && stored.relationToParent === undefined) {
      stored.relationToParent = 'schismatic';
    }
    if (stored.founderId === undefined && me) stored.founderId = me.id;
    if (stored.originProvinceId === undefined && state.player) {
      stored.originProvinceId = state.player.provinceId;
    }
    const id = FB.createFaith(state, stored);
    if (!id) return null;
    if (!FB.faithAssignable(id, state)) return id;
    if (me && options.convertFounder !== false) me.religion = id;
    if (me && options.convertHousehold && FB.householdMembers) {
      const household = FB.householdMembers(state);
      for (let i = 0; i < household.length; i++) household[i].religion = id;
    }
    if (options.convertRealm && state.realms && state.realms.player &&
        state.realms.player.alive) state.realms.player.religion = id;
    if (FB.clearPortraitCache) FB.clearPortraitCache();
    return id;
  };

  function religiousOfficeDefinitions(state) {
    const out = {};
    const ids = FB.religionIds(state, false);
    for (let i = 0; i < ids.length; i++) {
      const religionId = ids[i];
      const rel = FB.religionOf(religionId, state);
      if (!rel || !rel.head || !rel.head.officeId) continue;
      const officeId = rel.head.officeId;
      const source = FB.faithValue(state, religionId, 'head.officeId').sourceId ||
        religionId;
      if (!out[officeId] || source === religionId) {
        out[officeId] = { id:officeId, religionId:source, head:rel.head };
      }
    }
    return out;
  }

  FB.religiousOfficeReligion = function (state, officeId) {
    const office = religiousOfficeDefinitions(state)[officeId];
    return office ? office.religionId : null;
  };

  /* Some central offices attach to the temporal realm but retain a personal
     eligibility rule. The restriction is deliberately office data rather
     than a general succession rule: a woman may inherit the realm without
     becoming Pope or Caliph. */
  function religiousHeadHolderEligible(state, office, realmId) {
    const requiredSex = office && office.head && office.head.holderSex;
    if (!requiredSex) return true;
    const realm = state && state.realms && state.realms[realmId];
    if (!realm || !realm.alive) return false;
    const player = realmId === 'player' && state.player && state.chars &&
      state.chars[state.player.charId];
    const sex = player && player.sex || realm.ruler && realm.ruler.sex;
    return sex === requiredSex;
  }

  FB.religiousHeadHolderEligible = function (state, religionId, realmId) {
    const rel = FB.religionOf(religionId, state);
    const officeId = rel && rel.head && rel.head.officeId;
    const office = officeId && religiousOfficeDefinitions(state)[officeId];
    return !!(office && religiousHeadHolderEligible(state, office, realmId));
  };

  function bookmarkReligiousHead(state, religionId) {
    var bookmark = null;
    if (state && state.start && FB.bookmark) bookmark = FB.bookmark(state.start.id);
    if (!bookmark) bookmark = FB.activeBookmark;
    var mapping = bookmark && bookmark.religiousHeads;
    if (mapping && Object.prototype.hasOwnProperty.call(mapping, religionId)) {
      return mapping[religionId];
    }
    var rel = FB.religionOf(religionId, state);
    var officeId = rel && rel.head && rel.head.officeId;
    if (mapping && officeId && Object.prototype.hasOwnProperty.call(mapping, officeId)) {
      return mapping[officeId];
    }
    if (mapping && officeId) {
      for (var mappedFaithId in mapping) {
        if (!own(mapping, mappedFaithId) ||
            !FB.faithExists(mappedFaithId, state)) continue;
        var mappedFaith = FB.religionOf(mappedFaithId, state);
        if (mappedFaith && mappedFaith.head &&
            mappedFaith.head.officeId === officeId) return mapping[mappedFaithId];
      }
    }
    return rel && rel.head ? rel.head.realm : null;
  }

  FB.religiousHeadDefaultRealm = function (state, religionId) {
    return bookmarkReligiousHead(state, religionId);
  };

  /* Central religious offices are saved assignments, separate from territorial
     rank. The active bookmark may replace a religion's global default holder.
     An own null value is an intentional vacancy and must survive repairs; its
     turn and former realm are preserved beside it for delayed recovery. */
  FB.ensureReligiousHeads = function (state) {
    if (!state) return {};
    FB.ensureFaithState(state);
    if (!state.religiousHeads || typeof state.religiousHeads !== 'object' ||
        Array.isArray(state.religiousHeads)) state.religiousHeads = {};
    if (!state.religiousHeadVacancies ||
        typeof state.religiousHeadVacancies !== 'object' ||
        Array.isArray(state.religiousHeadVacancies)) {
      state.religiousHeadVacancies = {};
    }
    const offices = religiousOfficeDefinitions(state);
    for (const officeId in offices) {
      if (!own(offices, officeId)) continue;
      const office = offices[officeId];
      const religionId = office.religionId;
      const rel = FB.religionOf(religionId, state);
      if (!Object.prototype.hasOwnProperty.call(state.religiousHeads, officeId)) {
        state.religiousHeads[officeId] = bookmarkReligiousHead(state, religionId);
      }
      const assigned = state.religiousHeads[officeId];
      if (assigned !== null && state.realms &&
          (!state.realms[assigned] || !state.realms[assigned].alive ||
           !religiousHeadHolderEligible(state, office, assigned))) {
        const bookmarkDefault = bookmarkReligiousHead(state, religionId);
        /* Older 1066 saves were seeded with the global 867 ids even though
           those realm records never existed in their bookmark. Repair only
           that missing-default signature; a realm that existed and died is
           a genuine vacancy and must keep its clock. */
        if (!state.realms[assigned] && assigned === rel.head.realm &&
            bookmarkDefault && bookmarkDefault !== assigned &&
            state.realms[bookmarkDefault] && state.realms[bookmarkDefault].alive &&
            !state.religiousHeadVacancies[officeId]) {
          state.religiousHeads[officeId] = bookmarkDefault;
          delete state.religiousHeadVacancies[officeId];
        } else {
          state.religiousHeads[officeId] = null;
          if (!state.religiousHeadVacancies[officeId]) {
            state.religiousHeadVacancies[officeId] = {
              turn:isFinite(state.turn) ? state.turn : 0,
              formerHolder:assigned
            };
          }
        }
      } else if (state.religiousHeads[officeId] === null) {
        const vacancy = state.religiousHeadVacancies[officeId];
        if (!vacancy || !isFinite(vacancy.turn)) {
          state.religiousHeadVacancies[officeId] = {
            turn:isFinite(state.turn) ? state.turn : 0,
            formerHolder:vacancy && vacancy.formerHolder || null
          };
        }
      } else {
        delete state.religiousHeadVacancies[officeId];
      }
    }
    return state.religiousHeads;
  };

  FB.religiousHeadVacancy = function (state, religionId) {
    FB.ensureReligiousHeads(state);
    const officeId = FB.faithOfficeId(religionId, state);
    if (!state || !officeId || state.religiousHeads[officeId] !== null) return null;
    return state.religiousHeadVacancies[officeId] || null;
  };

  FB.assignReligiousHead = function (state, religionId, realmId) {
    const rel = FB.religionOf(religionId, state);
    const officeId = rel && rel.head && rel.head.officeId;
    const realm = state && state.realms && state.realms[realmId];
    const office = officeId && religiousOfficeDefinitions(state)[officeId];
    if (!state || !rel || !officeId || !realm || !realm.alive ||
        !religiousHeadHolderEligible(state, office, realmId)) return false;
    FB.ensureReligiousHeads(state);
    state.religiousHeads[officeId] = realmId;
    delete state.religiousHeadVacancies[officeId];
    return true;
  };

  /* Set every office held by a dying realm to an explicit saved vacancy.
     Repeated death cleanup is idempotent: null assignments neither reset the
     vacancy clock nor emit a second announcement. */
  FB.vacateReligiousHeads = function (state, realmId, opts) {
    if (!state || !realmId) return [];
    opts = opts || {};
    FB.ensureReligiousHeads(state);
    const vacated = [];
    const realm = state.realms && state.realms[realmId];
    const offices = religiousOfficeDefinitions(state);
    for (const officeId in offices) {
      if (!own(offices, officeId) || state.religiousHeads[officeId] !== realmId) continue;
      const religionId = offices[officeId].religionId;
      state.religiousHeads[officeId] = null;
      state.religiousHeadVacancies[officeId] = {
        turn:isFinite(state.turn) ? state.turn : 0,
        formerHolder:realmId
      };
      vacated.push(religionId);
      if (!opts.silent && FB.news && state.log) {
        FB.news(state, FB.msg('news.religion.head_vacant',
          '⛪ The office of {title} stands vacant after {realm} falls.', {
            title:FB.dataParam('religion', religionId, 'head.title'),
            realm:realm ? realm.name : realmId
          }));
      }
    }
    return vacated;
  };

  /* The single realm-death boundary used by conquest, escheat, revocation,
     downfall, and inheritance. Territorial callers remain responsible for
     reparenting vassals and moving capitals. */
  FB.markRealmDead = function (state, realmId) {
    const realm = state && state.realms && state.realms[realmId];
    if (!realm || !realm.alive) return false;
    const ruler = realmId !== 'player' && FB.realmRulerCharacterSnapshot
      ? FB.realmRulerCharacterSnapshot(state, realmId) : null;
    if (ruler && FB.noteCharacterStatus && FB.realmRulerTitleSnapshot) {
      FB.noteCharacterStatus(state, ruler,
        FB.clamp((realm.rank || 1) + 3, 4, 7),
        FB.realmRulerTitleSnapshot(state, realm, ruler));
    }
    FB.vacateReligiousHeads(state, realmId);
    realm.alive = false;
    realm.war = null;
    if (FB.papacyRealmDied) FB.papacyRealmDied(state, realmId);
    if (FB.breakAlliance) FB.breakAlliance(state, realmId);
    if (FB.invalidateRealmCache) FB.invalidateRealmCache();
    return true;
  };

  /* The live realm holding an exact faith's central office, or null while the
     assignment is vacant, missing, or points at a dead realm. */
  FB.religiousHeadOf = function (state, religionId) {
    const rel = FB.religionOf(religionId, state);
    const officeId = rel && rel.head && rel.head.officeId;
    if (!state || !officeId) return null;
    const heads = FB.ensureReligiousHeads(state);
    if (!Object.prototype.hasOwnProperty.call(heads, officeId)) return null;
    const rid = heads[officeId];
    const realm = rid !== null && state.realms ? state.realms[rid] : null;
    const office = officeId && religiousOfficeDefinitions(state)[officeId];
    return realm && realm.alive &&
      religiousHeadHolderEligible(state, office, rid) ? realm : null;
  };

  FB.religiousHeadSnapshot = function (state, religionId) {
    const rel = FB.religionOf(religionId, state);
    const officeId = rel && rel.head && rel.head.officeId;
    const heads = state && state.religiousHeads;
    if (!state || !officeId) return null;
    const saved = !!(heads && typeof heads === 'object' &&
      !Array.isArray(heads) &&
      Object.prototype.hasOwnProperty.call(heads, officeId));
    let rid = saved ? heads[officeId] :
      bookmarkReligiousHead(state, religionId);
    if (rid === null) return null;
    let realm = state.realms && state.realms[rid];
    if ((!realm || !realm.alive) && saved) {
      const bookmarkDefault = bookmarkReligiousHead(state, religionId);
      const vacancies = state.religiousHeadVacancies;
      if (!realm && rid === rel.head.realm && bookmarkDefault &&
          bookmarkDefault !== rid && state.realms &&
          state.realms[bookmarkDefault] &&
          state.realms[bookmarkDefault].alive &&
          !(vacancies && vacancies[officeId])) {
        rid = bookmarkDefault;
        realm = state.realms[rid];
      }
    }
    const office = officeId && religiousOfficeDefinitions(state)[officeId];
    return realm && realm.alive &&
      religiousHeadHolderEligible(state, office, rid) ? realm : null;
  };

  FB.religionsHeadedBy = function (state, realmId) {
    const out = [];
    if (!state || !realmId) return out;
    const offices = religiousOfficeDefinitions(state);
    for (const officeId in offices) {
      if (!own(offices, officeId)) continue;
      const religionId = offices[officeId].religionId;
      const head = FB.religiousHeadSnapshot(state, religionId);
      if (head && head.id === realmId) out.push(religionId);
    }
    return out;
  };

  FB.isReligiousHead = function (state, realmId, religionId) {
    if (religionId !== undefined && religionId !== null) {
      const head = FB.religiousHeadOf(state, religionId);
      return !!head && head.id === realmId;
    }
    return FB.religionsHeadedBy(state, realmId).length > 0;
  };

  FB.religiousHeadTitle = function (state, religionId) {
    const rel = FB.religionOf(religionId, state);
    if (!rel || !rel.head || !rel.head.title) return '';
    const viewer = state && state.player ? state.player.charId : null;
    return FB.faithDataText(state, viewer, religionId, 'head.title', {});
  };

  /* avoid (optional): a plain object used as a set of lowercase names,
     e.g. { louis: true } — when provided, re-rolls up to 8 times to dodge
     a collision, then accepts the last roll regardless */
  FB.randomName = function (cultureId, sex, avoid) {
    const c = FB.cultureOf(cultureId);
    const pool = sex === 'f' ? c.female : c.male;
    let name = FB.pick(pool);
    if (avoid) {
      for (let tries = 0; tries < 8 && avoid[name.toLowerCase()]; tries++) {
        name = FB.pick(pool);
      }
    }
    return name;
  };

  /* lowercase name set of a dynasty's living members — feeds randomName's
     avoid so siblings and cousins stop sharing a first name */
  FB.dynastyNameSet = function (state, dyn) {
    const set = {};
    if (!state || !dyn) return set;
    for (const id in state.chars) {
      const k = state.chars[id];
      if (!k.dead && k.dyn === dyn) set[k.name.toLowerCase()] = true;
    }
    return set;
  };

  FB.patronym = function (parentName, sex) {
    parentName = String(parentName || '');
    if (sex === 'f') return parentName + 'datter';
    return parentName + (parentName.slice(-1) === 's' ? 'son' : 'sson');
  };

  FB.dynastyName = function (cultureId, founderName, provinceName, founderSex) {
    const c = FB.cultureOf(cultureId);
    switch (c.dyn) {
      case 'patronym': return FB.patronym(founderName, founderSex || 'm');
      case 'mac': return 'mac ' + founderName;
      case 'ap': return 'ap ' + founderName;
      case 'ibn': return 'Banu ' + founderName.split(' ').pop();
      case 'ov': return founderName + 'ich';
      case 'plain': return c.family ? FB.pick(c.family) : ('of ' + provinceName);
      default: return 'of ' + provinceName;
    }
  };

  /* House names allow letters of any script, spaces, hyphens, and
     apostrophes. The blacklist rejects digits, ASCII punctuation and
     symbols, control characters, and non-BMP code units (emoji) without
     Unicode property escapes, so old mobile browsers parse it. */
  const HOUSE_NAME_FORBIDDEN = '!"#$%&()*+,./:;<=>?@[\\]^_`{|}~';

  function houseNameCharsOk(nm) {
    for (let i = 0; i < nm.length; i++) {
      const code = nm.charCodeAt(i);
      if (code <= 0x1F || code === 0x7F ||
          (code >= 48 && code <= 57) ||
          HOUSE_NAME_FORBIDDEN.indexOf(nm.charAt(i)) >= 0) return false;
      /* a surrogate half means an astral character (emoji and friends) */
      if (code >= 0xD800 && code <= 0xDFFF) return false;
    }
    return true;
  }

  /* Validation only; reason keys map to player-facing text at the UI layer. */
  FB.validateHouseName = function (name, currentDyn) {
    const nm = String(name === undefined || name === null ? '' : name).trim();
    if (!nm) return { ok:false, reason:'empty' };
    if (currentDyn && nm === currentDyn) return { ok:false, reason:'unchanged' };
    if (nm.length < 2) return { ok:false, reason:'short' };
    if (nm.length > 20) return { ok:false, reason:'long' };
    if (!houseNameCharsOk(nm)) return { ok:false, reason:'chars' };
    return { ok:true, name:nm };
  };

  /* A house is just the c.dyn string its members share, so a rename rewrites
     every character carrying the old string — the same membership rule
     FB.dynastyNameSet uses — plus the player realm identity when it was
     derived from the house. Personal names and bynames are untouched, and
     chronicle or legend text already written keeps the old name. Heraldry is
     seeded from the dyn string, so the coat of arms is redrawn. */
  FB.renameHouse = function (state, newName) {
    const me = state && state.player && state.chars &&
      state.chars[state.player.charId];
    if (!me || !me.dyn) return { ok:false, reason:'nohouse' };
    const oldDyn = me.dyn;
    const check = FB.validateHouseName(newName, oldDyn);
    if (!check.ok) return check;
    const nm = check.name;
    for (const id in state.chars) {
      const c = state.chars[id];
      if (c && c.dyn === oldDyn) c.dyn = nm;
    }
    const realm = state.realms && state.realms.player;
    if (realm) {
      if (realm.name === 'Realm of ' + oldDyn) realm.name = 'Realm of ' + nm;
      if (realm.dynasty === oldDyn) realm.dynasty = nm;
    }
    FB.touchFamily();
    FB.news(state, FB.msg('news.house.renamed',
      '👑 The house of {old} is henceforth known as {dynasty}.',
      { old:oldDyn, dynasty:nm }));
    return { ok:true, name:nm, old:oldDyn };
  };

  /* ---------- character factory ----------
     opts: {sex, culture, religion, born, dyn, role, station, unfree,
       quality (skill bonus), traitsN}
     opts.id installs a caller-derived identity instead of drawing the next
     sequential uid. Court records use it so the same succession member always
     resolves to the same character id, whether it was created at world
     creation or at the moment a player first opened the realm. */
  FB.makeCharacter = function (state, opts) {
    const sex = opts.sex || (FB.chance(0.5) ? 'm' : 'f');
    const c = {
      id: opts.id || FB.uid(),
      name: opts.name || FB.randomName(opts.culture, sex,
        opts.dyn ? FB.dynastyNameSet(state, opts.dyn) : null),
      sex: sex,
      culture: opts.culture,
      religion: opts.religion,
      born: opts.born,
      dead: false,
      dyn: opts.dyn || null,
      role: opts.role || null,
      traits: opts.traits || [],
      skills: {},
      opinion: opts.opinion !== undefined ? opts.opinion : 0,
      fertility: FB.rf(0.7, 1.3),
      station: opts.station !== undefined ? opts.station : null,
      spouseId: null, fatherId: opts.fatherId || null, motherId: opts.motherId || null,
      childrenIds: []
    };
    if (opts.unfree === true) c.unfree = true;
    /* Explicit opinion remains an exact authored total. A newly encountered
       neutral character instead begins at the current directional faith
       baseline, and the marker lets later schisms rebase only that component. */
    const playerCharacter = state && state.player && state.chars &&
      state.chars[state.player.charId];
    if (playerCharacter && playerCharacter.id !== c.id &&
        FB.faithRelationBaseline) {
      const faithBase = FB.faithRelationBaseline(
        state, c.religion, playerCharacter.religion);
      c.faithStandingBase = faithBase;
      if (opts.opinion === undefined) c.opinion = faithBase;
    }
    if (Object.prototype.hasOwnProperty.call(opts, 'byname')) {
      c.byname = opts.byname;
    } else if (state && FB.cultureOf(c.culture).dyn === 'patronym' &&
        c.fatherId && state.chars[c.fatherId]) {
      c.byname = FB.patronym(state.chars[c.fatherId].name, c.sex);
    }
    const q = opts.quality || 0;
    for (const s of SKILLS) c.skills[s] = Math.max(0, FB.ri(0, 6) + q);
    if (!opts.traits) {
      const pool = Object.keys(FBDATA.traits).filter(function (t) {
        return !FBDATA.traits[t].noRandom;
      });
      const n = opts.traitsN !== undefined ? opts.traitsN : FB.ri(1, 3);
      for (let i = 0; i < n; i++) FB.addTrait(c, FB.pick(pool));
    }
    if (state) {
      state.chars[c.id] = c;
      FB.touchFamily();
    }
    return c;
  };

  FB.addTrait = function (c, traitId) {
    const t = FBDATA.traits[traitId];
    if (!t || c.traits.indexOf(traitId) >= 0) return false;
    if (t.opposite && c.traits.indexOf(t.opposite) >= 0) {
      c.traits.splice(c.traits.indexOf(t.opposite), 1);
    }
    c.traits.push(traitId);
    return true;
  };
  FB.removeTrait = function (c, traitId) {
    if (!c || !Array.isArray(c.traits)) return false;
    const i = c.traits.indexOf(traitId);
    if (i < 0) return false;
    c.traits.splice(i, 1);
    return true;
  };

  /* Grouped trait effects belong to the system that consumes them. Unknown
     traits and incomplete mod definitions are deliberately worth zero. */
  FB.traitBonus = function (c, group, key) {
    if (!c || !Array.isArray(c.traits) || !group || !key) return 0;
    let total = 0;
    for (const id of c.traits) {
      const def = FBDATA.traits[id];
      const effects = def && def[group];
      if (!effects || effects[key] === undefined) continue;
      const value = Number(effects[key]);
      if (isFinite(value)) total += value;
    }
    return total;
  };

  FB.ensureTraitProgress = function (state) {
    if (!state || !state.player) return {};
    let progress = state.player.traitProgress;
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
      progress = {};
      state.player.traitProgress = progress;
    }
    for (const id in progress) {
      if (!Object.prototype.hasOwnProperty.call(progress, id)) continue;
      let value = Number(progress[id]);
      if (!isFinite(value)) value = 0;
      value = Math.max(0, value);
      const def = FBDATA.traits[id];
      const threshold = def && def.earn && Number(def.earn.threshold);
      progress[id] = isFinite(threshold) && threshold > 0
        ? Math.min(value, threshold) : value;
    }
    return progress;
  };

  /* Progress is current-protagonist state. It stops at the catalog threshold;
     crossing that threshold grants once and writes a locale-neutral Chronicle
     descriptor. A later event-driven removal may reset the counter. */
  FB.noteTraitProgress = function (state, traitId, amount) {
    if (!state || !state.player) return false;
    const def = FBDATA.traits[traitId];
    const threshold = def && def.earn && Number(def.earn.threshold);
    if (!isFinite(threshold) || threshold <= 0) return false;
    const c = state.chars && state.chars[state.player.charId];
    if (!c) return false;
    const progress = FB.ensureTraitProgress(state);
    let delta = amount === undefined ? 1 : Number(amount);
    if (!isFinite(delta)) delta = 0;
    progress[traitId] = FB.clamp((Number(progress[traitId]) || 0) + delta,
      0, threshold);
    if (!Array.isArray(c.traits) ||
        progress[traitId] < threshold || c.traits.indexOf(traitId) >= 0) {
      return false;
    }
    if (!FB.addTrait(c, traitId)) return false;
    FB.news(state, FB.msg('news.life.trait_earned',
      '🏅 {name} earns {trait}.', {
        name:FB.fullName(c),
        trait:FB.dataParam('trait', traitId)
      }));
    return true;
  };

  /* ---------- ailments: named wounds & sicknesses (data table in traits.js) ----------
     Kept on c.ails as a short list of ids; old saves simply lack the field. */
  FB.ailmentsOf = function (c) {
    const out = [];
    if (!c.ails) return out;
    for (const id of c.ails) {
      const a = FBDATA.ailments[id];
      if (a) out.push({ id: id, def: a });
    }
    return out;
  };

  FB.hasAilmentKind = function (c, kind) {
    const list = FB.ailmentsOf(c);
    for (const a of list) if (a.def.kind === kind) return true;
    return false;
  };

  FB.addAilment = function (c, id) {
    const a = FBDATA.ailments[id];
    if (!a) return false;
    if (!c.ails) c.ails = [];
    if (c.ails.indexOf(id) >= 0) return false;
    c.ails.push(id);
    while (c.ails.length > 3) c.ails.shift(); // only so many afflictions worth naming
    return true;
  };

  /* remove ailments of a kind — the n oldest (default: all of that kind) */
  FB.cureAilments = function (c, kind, n) {
    if (!c.ails) return;
    let left = n === undefined ? Infinity : n;
    for (let i = 0; i < c.ails.length && left > 0;) {
      const a = FBDATA.ailments[c.ails[i]];
      if (a && a.kind === kind) { c.ails.splice(i, 1); left--; }
      else i++;
    }
    if (!c.ails.length) delete c.ails;
  };

  FB.randomWound = function (sev) {
    const pool = [];
    for (const id in FBDATA.ailments) {
      const a = FBDATA.ailments[id];
      if (a.kind === 'wound' && (a.sev || 1) === sev) pool.push(id);
    }
    return pool.length ? FB.pick(pool) : null;
  };

  FB.randomSickness = function () {
    const pool = [];
    for (const id in FBDATA.ailments) {
      if (FBDATA.ailments[id].kind === 'sickness') pool.push(id);
    }
    return pool.length ? FB.pick(pool) : null;
  };

  FB.traitAgg = function (c) {
    const agg = { dip: 0, mar: 0, ste: 0, int: 0, lea: 0, health: 0, fert: 1, opinion: 0 };
    for (const id of c.traits) {
      const t = FBDATA.traits[id];
      if (!t) continue;
      for (const s of SKILLS) if (t[s]) agg[s] += t[s];
      if (t.health) agg.health += t.health;
      if (t.fert) agg.fert *= t.fert;
      if (t.opinion) agg.opinion += t.opinion;
    }
    return agg;
  };

  function baseSkill(c, key) {
    if (!c) return 0;
    const skills = c.skills || {};
    return (skills[key] || 0) + (FB.traitAgg(c)[key] || 0);
  }

  FB.skillOf = function (c, key) {
    let v = baseSkill(c, key);
    // Equipped household gear sharpens its wearer (FB.itemBonus loads later).
    if (c && FB.state && FB.itemBonus && FB.state.chars &&
      FB.state.chars[c.id] === c) v += FB.itemBonus(FB.state, key, c.id);
    return Math.max(0, v);
  };

  FB.skillSnapshot = function (state, c, key) {
    let v = baseSkill(c, key);
    if (state && c && FB.itemBonusReadOnly && state.chars &&
        state.chars[c.id] === c) {
      v += FB.itemBonusReadOnly(state, key, c.id);
    }
    return Math.max(0, v);
  };

  /* Skill growth is uncapped. Below balance.skillSoftCap every gain lands;
     past it each point must beat a (softCap/current)^2 roll. At and beyond
     balance.skillMasteryThreshold that chance is further multiplied by
     (masteryThreshold/current)^skillMasteryPower. Only the raw trained skill
     sets these odds; traits and equipment do not make training harder.
     Returns points actually gained. */
  FB.gainSkill = function (c, key, n) {
    const B = FBDATA.balance;
    const soft = B.skillSoftCap || 20;
    const mastery = B.skillMasteryThreshold || 40;
    const power = B.skillMasteryPower !== undefined ? B.skillMasteryPower : 8;
    let gained = 0;
    for (let i = 0; i < (n || 1); i++) {
      const cur = c.skills[key] || 0;
      if (cur >= soft) {
        const x = soft / cur;
        let chance = x * x;
        if (cur >= mastery) chance *= Math.pow(mastery / cur, power);
        if (!FB.chance(chance)) continue;
      }
      c.skills[key] = cur + 1;
      gained++;
    }
    return gained;
  };

  FB.ageOf = function (c, year) { return year - c.born; };

  /* Age-driven fecundity, 0–1: full through the prime years, then a gradual
     slide (women from the late 20s, sharply after 35; men gently from 40).
     Points live in balance.fertilityByAge — flat before the first point,
     linear between points, flat past the last. The hard she-is-past-45 gate
     at the conception sites stays on top of this. */
  FB.ageFert = function (sex, age) {
    const pts = (FBDATA.balance.fertilityByAge || {})[sex];
    if (!pts || !pts.length) return 1;
    if (age <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (age <= pts[i][0]) {
        const a = pts[i - 1], b = pts[i];
        return a[1] + (b[1] - a[1]) * (age - a[0]) / (b[0] - a[0]);
      }
    }
    return pts[pts.length - 1][1];
  };

  /* ---------- station (social rank, 0–4) ----------
     0 lowborn · 1 freeholder · 2 gentry/burgher · 3 noble house · 4 royalty.
     Mirrors the player's tier ladder (tier 4+ all count as royalty). Marriage
     is gated on it: kin weigh a suit by the gap between the two houses.
     Characters from older saves carry no station — infer a coarse one. */
  /* Effective faith doctrine keeps spouse limits, accepted relations, and
     the costs/route for ending a marriage together. The old group balance
     table is only a compatibility fallback for a definition with no doctrine. */
  FB.marriageDoctrine = function (religionId, state) {
    const rel = FB.religionOf(religionId, state);
    let marriage = rel && rel.marriage;
    if (!marriage) {
      const g = FB.faithGroup(religionId, state);
      const wives = (FBDATA.balance.wivesByGroup || {})[g] || 1;
      const legacyKind = g === 'muslim' ? 'talaq' :
        (g === 'pagan' ? 'sunder' : (g === 'jewish' ? 'get' : 'annulment'));
      const legacyEnding = legacyKind === 'annulment'
        ? { kind:'annulment', direct:false, gold:15, piety:20,
          failurePiety:25, prestige:0, cooldownDays:360 }
        : { kind:legacyKind, direct:true,
          gold:legacyKind === 'sunder' ? 0 : 'dowry', piety:0,
          prestige:legacyKind === 'sunder' ? 5 : 0, cooldownDays:0 };
      marriage = {
        spouseLimit:{ m:wives, f:1 },
        divorce:legacyEnding,
        acceptedRelations:['same']
      };
    }
    const limits = marriage.spouseLimit || { m:1, f:1 };
    const ending = marriage.divorce || { kind:'annulment', direct:false };
    return {
      divorce:ending.kind === 'annulment' ? null : ending.kind,
      wives:Math.max(1, Math.floor(Number(limits.m) || 1)),
      spouseLimit:{
        m:Math.max(1, Math.floor(Number(limits.m) || 1)),
        f:Math.max(1, Math.floor(Number(limits.f) || 1))
      },
      acceptedRelations:(marriage.acceptedRelations || ['same']).slice(),
      kinship:cloneFaithValue(marriage.kinship || {}),
      end:cloneFaithValue(ending)
    };
  };

  FB.STATION_NAMES = ['Lowborn', 'Freeholder', 'Gentry', 'Noble', 'Royalty'];
  FB.stationName = function (station) {
    return FB.T(FB.STATION_NAMES[station] || '');
  };
  FB.stationOf = function (c) {
    if (c.station !== undefined && c.station !== null) return c.station;
    if (c.role === 'lord') return 3;
    if (c.role === 'notable' && c.dyn) return 3; // the lord’s house shares his name
    return 0;
  };
  FB.isUnfreeCharacter = function (state, c) {
    if (!c || FB.stationOf(c) !== 0) return false;
    if (c.unfree === true) return true;
    if (!state || !state.player || !state.chars) return false;
    if (c.id === state.player.charId) return state.player.tier === 0;
    /* Legacy tier-0 saves predate personal bondage. Their generated and
       household kin shared the active serf tenure even though the character
       record had no marker. */
    if (state.player.tier === 0) {
      if (c.role === 'parent' || c.role === 'grandparent' ||
          c.role === 'sibling' || c.role === 'spouse') return true;
      if (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id)) {
        return true;
      }
    }
    return false;
  };
  FB.characterStationName = function (state, c) {
    const unfree = FB.isUnfreeCharacter(state, c);
    if (unfree &&
        FB.characterRankTitleSnapshot && FB.renderTitleSnapshot) {
      const title = FB.characterRankTitleSnapshot(state, c, 0, '');
      if (title) return FB.renderTitleSnapshot(title);
    }
    return unfree ? FB.T('Serf') : FB.stationName(FB.stationOf(c));
  };
  /* Political household heads keep authority over their own establishments.
     A generated local lord is recognized through the active role seat or the
     persisted character role after relocation; neither is a realm-succession
     ruler. Household systems use this shared guard instead of testing only the
     realm roster. Marriage and friendship do not make either kind manageable. */
  FB.isExternalHouseholdAuthority = function (state, value) {
    if (!state || !state.player || !state.chars) return false;
    const c = typeof value === 'string' ? state.chars[value] : value;
    if (!c || c.dead || c.id === state.player.charId) return false;
    if (c.role === 'lord' ||
        (state.roles && state.roles.lord === c.id)) return true;
    return !!(FB.isReigningRealmRuler &&
      FB.isReigningRealmRuler(state, c));
  };
  FB.playerStation = function (state) {
    if ((FB.playerCardinal && FB.playerCardinal(state)) ||
        (FB.playerPope && FB.playerPope(state))) return 4;
    return FB.clamp(state.player.tier, 0, 4);
  };

  /* Authoritative NPC residence. Household members and paid retainers remain
     at the household home while its head travels. A materialized royal child
     lives at their realm's current capital until marriage brings them into the
     player's household. Foreign notables remain in their saved county roster;
     an explicit homeProvinceId keeps relocated contacts such as rivals behind. */
  FB.characterResidence = function (state, c) {
    if (!state || !state.player || !c) return null;
    /* A reigning spouse keeps the court and person at the realm's current
       capital; marriage never turns that sovereign household into a managed
       member of the player's permanent home. */
    const reigningId = FB.realmIdForRulerCharacter
      ? FB.realmIdForRulerCharacter(state, c) : null;
    if (reigningId) {
      const reigningRealm = state.realms[reigningId];
      if (reigningRealm && reigningRealm.capital && FB.world &&
          FB.world.byId[reigningRealm.capital]) return reigningRealm.capital;
    }
    if (c.id === state.player.charId ||
        (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id))) {
      return state.player.provinceId;
    }
    /* A living abdication can leave former household members at an explicit
       residence. Once they are outside the managed household, it outranks old
       royal-line provenance but not a sovereign ruler's live capital above. */
    if (c.homeProvinceId && FB.world && FB.world.byId[c.homeProvinceId]) {
      return c.homeProvinceId;
    }
    if (c.royalLine && state.realms) {
      const royalRealm = state.realms[c.royalLine.realmId];
      if (royalRealm && royalRealm.capital && FB.world &&
          FB.world.byId[royalRealm.capital]) return royalRealm.capital;
    }
    if (state.provChars) {
      const cached = CHARACTER_RESIDENCE_CACHE &&
        CHARACTER_RESIDENCE_CACHE.get(c);
      if (cached && Array.isArray(state.provChars[cached]) &&
          state.provChars[cached].indexOf(c.id) >= 0) return cached;
      for (const pid in state.provChars) {
        if (Array.isArray(state.provChars[pid]) &&
            state.provChars[pid].indexOf(c.id) >= 0) {
          if (CHARACTER_RESIDENCE_CACHE) {
            CHARACTER_RESIDENCE_CACHE.set(c, pid);
          }
          return pid;
        }
      }
    }
    return state.player.provinceId;
  };

  /* Compatibility name retained for cards and mods that asked where a
     character was based before residence became mechanically authoritative. */
  FB.homeOf = function (state, c) {
    return FB.characterResidence(state, c);
  };

  FB.inheritTraits = function (father, mother) {
    const traits = [];
    const parents = [father, mother].filter(Boolean);
    for (const p of parents) {
      for (const id of p.traits) {
        const t = FBDATA.traits[id];
        if (t && t.inherit && FB.chance(t.inherit) && traits.indexOf(id) < 0) traits.push(id);
      }
    }
    if (FB.chance(0.02)) traits.push('genius');
    return traits.slice(0, 3);
  };

  FB.portrait = function (c, year) {
    const a = FB.ageOf(c, year);
    if (a < 3) return '👶';
    if (a < 13) return c.sex === 'f' ? '👧' : '👦';
    if (a < 30) return c.sex === 'f' ? '👩' : '🧑';
    if (a < 50) return c.sex === 'f' ? '👩' : '🧔';
    return c.sex === 'f' ? '👵' : '👴';
  };

  FB.fullName = function (c) {
    if (Object.prototype.hasOwnProperty.call(c, 'byname')) {
      return c.byname ? c.name + ' ' + c.byname : c.name;
    }
    return c.dyn ? c.name + ' ' + c.dyn : c.name;
  };

  /* Patronyms describe a person while dyn remains the stable house identity
     used by succession and heraldry. Old saves repair deterministically from
     recorded fathers; no ancestor or RNG state is invented here. */
  FB.ensureCharacterBynames = function (state) {
    if (!state || !state.chars) return;
    for (const id in state.chars) {
      const c = state.chars[id];
      if (!c || Object.prototype.hasOwnProperty.call(c, 'byname') ||
          FB.cultureOf(c.culture).dyn !== 'patronym') continue;
      const father = c.fatherId && state.chars[c.fatherId];
      if (father) c.byname = FB.patronym(father.name, c.sex);
    }
  };

  /* ---------- family index ----------
     The Self/Kin panel rebuilds on every UI refresh, and refresh runs on the
     day ticker. Each walker below used to scan the whole character map once
     per relative, so the panel paid roughly twenty-five scans a tick. Eager
     royal courts multiply that map several times over without adding a single
     relative of the player's, so the scans are folded into one indexed pass.

     The index is derived, never serialized, and rebuilt whenever the day turns
     or a family link moves. Keying on the turn as well as the explicit stamp
     means a writer that forgets to call FB.touchFamily costs a card that is
     stale until tomorrow, not one that is wrong forever. */
  let familyStamp = 0;
  let familyIndex = null;

  FB.touchFamily = function () {
    familyStamp++;
    familyIndex = null;
  };

  function familyIndexOf(state) {
    if (familyIndex && familyIndex.state === state &&
        familyIndex.stamp === familyStamp &&
        familyIndex.turn === state.turn) return familyIndex;
    const children = Object.create(null);
    const familyParents = Object.create(null);
    const spouses = Object.create(null);
    const betrotheds = Object.create(null);
    const stepchildren = Object.create(null);
    function push(map, key, value) {
      if (map[key]) map[key].push(value);
      else map[key] = [value];
    }
    for (const id in state.chars) {
      const c = state.chars[id];
      if (!c) continue;
      if (c.fatherId) {
        push(children, c.fatherId, c.id);
        push(familyParents, c.id, c.fatherId);
      }
      if (c.motherId && c.motherId !== c.fatherId) {
        push(children, c.motherId, c.id);
        push(familyParents, c.id, c.motherId);
      }
      for (const childId of (c.childrenIds || [])) {
        push(familyParents, childId, c.id);
      }
      if (!c.dead && c.spouseId) push(spouses, c.spouseId, c.id);
      if (!c.dead && c.betrothedId) push(betrotheds, c.betrothedId, c.id);
      if (Array.isArray(c.stepParentIds)) {
        for (const parentId of c.stepParentIds) push(stepchildren, parentId, c.id);
      }
    }
    familyIndex = {
      state:state, stamp:familyStamp, turn:state.turn,
      children:children, familyParents:familyParents,
      spouses:spouses, betrotheds:betrotheds,
      stepchildren:stepchildren, kin:null, familyTree:null
    };
    return familyIndex;
  }

  /* Ids whose spouseId points at cid. Callers re-check the link and the life
     of each one, so the index stays a candidate list rather than an answer. */
  FB.spouseLinksTo = function (state, cid) {
    if (!state || !state.chars || !cid) return [];
    return familyIndexOf(state).spouses[cid] || [];
  };

  /* Death cleanup and yearly family systems need the reverse relationship
     maps and grouped kin. Expose a read-only same-tick snapshot so the sweep
     can keep using one indexed pass even though each death invalidates the
     live cache. */
  FB.familyLinksSnapshot = function (state) {
    const index = familyIndexOf(state);
    const kin = FB.kinOf(state);
    return {
      spouses:index.spouses,
      betrotheds:index.betrotheds,
      kin:kin,
      kinById:kin.byId
    };
  };

  /* ---------- kinship ----------
     The family tree hangs off fatherId/motherId (set for every birth) and
     childrenIds (also covers adopted children). Dead chars stay in the tree —
     the Kin tab marks them with †. */
  function parentsOf(state, c) {
    const out = [];
    if (c.fatherId && state.chars[c.fatherId]) out.push(state.chars[c.fatherId]);
    if (c.motherId && state.chars[c.motherId]) out.push(state.chars[c.motherId]);
    return out;
  }
  function childrenOf(state, c) {
    const out = [], seen = {};
    for (const id of (c.childrenIds || [])) {
      const k = state.chars[id];
      if (k && !seen[id]) { seen[id] = 1; out.push(k); }
    }
    /* childrenIds is the adoption-aware list, but a birth writes fatherId and
       motherId first. The reconciliation below is deliberately kept - deleting
       it in favour of trusting childrenIds would make any writer that sets a
       parent without pushing the back-link silently lose kin. The index only
       removes the per-relative scan it used to cost. */
    const byParent = familyIndexOf(state).children[c.id];
    for (const id of (byParent || [])) {
      const k = state.chars[id];
      if (k && !seen[id]) { seen[id] = 1; out.push(k); }
    }
    return out;
  }
  function familyParentsOf(state, c) {
    const out = [], seen = {};
    const ids = familyIndexOf(state).familyParents[c.id] || [];
    for (const id of ids) {
      const parent = state.chars[id];
      if (parent && !seen[id]) {
        seen[id] = 1;
        out.push(parent);
      }
    }
    return out;
  }

  /* One non-mutating vocabulary for marriage blood gates. Full characters
     use their recorded parents; compact royal courts may supply the same
     answer through world.js. Cousins are named because ordinary marriage
     permits them, while every closer degree remains barred unless a caller
     deliberately opens the exceptional sibling route. */
  FB.kinshipDegreeSnapshot = function (state, a, b) {
    if (!state || !state.chars || !a || !b) return 'unrelated';
    if (a.id === b.id) return 'self';
    function ids(c) {
      const out = [];
      if (c.fatherId) out.push(c.fatherId);
      if (c.motherId && c.motherId !== c.fatherId) out.push(c.motherId);
      return out;
    }
    function childOf(parent, child) {
      return !!(parent && child &&
        ((parent.childrenIds || []).indexOf(child.id) >= 0 ||
          child.fatherId === parent.id || child.motherId === parent.id));
    }
    if (childOf(a, b) || childOf(b, a)) return 'parent_child';
    const ap = ids(a), bp = ids(b);
    const shared = ap.filter(function (id) { return bp.indexOf(id) >= 0; });
    if (shared.length) {
      const bothRecorded = !!(a.fatherId && a.motherId &&
        b.fatherId && b.motherId);
      return bothRecorded && shared.length >= 2 ? 'full_sibling' : 'half_sibling';
    }
    function ancestry(c) {
      const out = {};
      let frontier = ids(c);
      for (let depth = 1; depth <= 2; depth++) {
        const next = [];
        for (let i = 0; i < frontier.length; i++) {
          const id = frontier[i];
          if (out[id] !== undefined && out[id] <= depth) continue;
          out[id] = depth;
          const parent = state.chars[id];
          if (parent) next.push.apply(next, ids(parent));
        }
        frontier = next;
      }
      return out;
    }
    const aa = ancestry(a), ba = ancestry(b);
    if (aa[b.id] === 2 || ba[a.id] === 2) return 'grandparent';
    let nearest = 99;
    for (const id in aa) {
      if (ba[id] !== undefined) nearest = Math.min(nearest, aa[id] + ba[id]);
    }
    if (nearest === 3) return 'avuncular';
    if (nearest === 4) return 'cousin';
    if (FB.royalKinshipDegreeSnapshot) {
      const royal = FB.royalKinshipDegreeSnapshot(state, a, b);
      if (royal && royal !== 'unrelated') return royal;
    }
    /* First-generation saves predate parent ids for generated siblings. */
    const me = state.player && state.chars[state.player.charId];
    const other = me && (a.id === me.id ? b : (b.id === me.id ? a : null));
    if (other && other.role === 'sibling' && me.dyn && other.dyn === me.dyn) {
      return 'full_sibling';
    }
    return 'unrelated';
  };

  FB.closeMarriageKinSnapshot = function (state, a, b) {
    const degree = FB.kinshipDegreeSnapshot(state, a, b);
    return ['self','parent_child','grandparent','full_sibling',
      'half_sibling','avuncular'].indexOf(degree) >= 0;
  };
  function siblingsOf(state, c) {
    const out = [], seen = {};
    const ps = parentsOf(state, c);
    for (const p of ps) {
      for (const k of childrenOf(state, p)) {
        if (k.id !== c.id && !seen[k.id]) { seen[k.id] = 1; out.push(k); }
      }
    }
    if (!ps.length && c.id === state.player.charId) {
      // first-generation kin of old saves: no recorded parents, only role + house
      for (const id in state.chars) {
        const k = state.chars[id];
        if (k.id !== c.id && !seen[k.id] && k.role === 'sibling' && k.dyn && k.dyn === c.dyn) {
          seen[k.id] = 1; out.push(k);
        }
      }
    }
    return out;
  }
  /* raw blood-line walkers, for views that draw the tree itself */
  FB.parentsOf = parentsOf;
  FB.childrenOf = childrenOf;
  FB.siblingsOf = siblingsOf;

  /* Generational depth of a character inside the recorded tree: 1 with no
     recorded parents, +1 per ancestor link (father preferred). Only relative
     differences matter — succession uses them to tell a child's inheritance
     from a sibling's. The seen set ends the walk on any cycle in a corrupt
     save. */
  FB.lineDepthOf = function (state, c) {
    let depth = 1, cur = c;
    const seen = {};
    while (cur) {
      if (seen[cur.id]) break;
      seen[cur.id] = true;
      const parent = (cur.fatherId && state.chars[cur.fatherId]) ||
        (cur.motherId && state.chars[cur.motherId]);
      if (!parent) break;
      depth++;
      cur = parent;
    }
    return depth;
  };

  /* Every blood or adopted relative in the recorded player family tree.
     Begin with each recorded ancestor (including the player), then walk only
     downward through that ancestor's descendants. This reaches distant
     cousins and arbitrarily deep collateral branches without crossing from a
     child into their unrelated other parent's family. The distance is the
     shortest parent/child path and supplies a stable nearest-first order for
     systems, such as succession, that append the wider tree after named close
     relationships. */
  FB.familyTreeMembers = function (state) {
    if (!state || !state.player || !state.chars) return [];
    const index = familyIndexOf(state);
    if (index.familyTree && index.familyTree.playerId === state.player.charId) {
      return index.familyTree.value;
    }
    const me = state.chars[state.player.charId];
    if (!me) return [];
    const ancestors = [];
    const ancestorQueue = [{ c:me, depth:0 }];
    const ancestorSeen = {};
    const members = {};

    function remember(c, distance) {
      if (!c || c.id === me.id) return;
      const prior = members[c.id];
      if (!prior || distance < prior.distance) {
        members[c.id] = { c:c, distance:distance };
      }
    }
    function descend(root, rootDistance) {
      const queue = [{ c:root, distance:rootDistance }];
      const seen = {};
      for (let i = 0; i < queue.length; i++) {
        const row = queue[i];
        if (!row.c || (seen[row.c.id] !== undefined &&
            seen[row.c.id] <= row.distance)) continue;
        seen[row.c.id] = row.distance;
        remember(row.c, row.distance);
        for (const child of childrenOf(state, row.c)) {
          queue.push({ c:child, distance:row.distance + 1 });
        }
      }
    }

    for (let i = 0; i < ancestorQueue.length; i++) {
      const row = ancestorQueue[i];
      if (!row.c || ancestorSeen[row.c.id] !== undefined) continue;
      ancestorSeen[row.c.id] = row.depth;
      ancestors.push(row);
      remember(row.c, row.depth);
      for (const parent of familyParentsOf(state, row.c)) {
        ancestorQueue.push({ c:parent, depth:row.depth + 1 });
      }
    }
    for (const ancestor of ancestors) descend(ancestor.c, ancestor.depth);

    /* First-generation saves can identify siblings by role and house without
       parent records. Keep their complete descendant branches connected to
       the same legacy family tree. */
    if (!familyParentsOf(state, me).length) {
      for (const sibling of siblingsOf(state, me)) descend(sibling, 2);
    }

    const value = Object.keys(members).map(function (id) {
      return members[id];
    }).sort(function (a, b) {
      if (a.distance !== b.distance) return a.distance - b.distance;
      const aSex = a.c.sex === 'm' ? 0 : (a.c.sex === 'f' ? 1 : 2);
      const bSex = b.c.sex === 'm' ? 0 : (b.c.sex === 'f' ? 1 : 2);
      if (aSex !== bSex) return aSex - bSex;
      const aBorn = Number(a.c.born) || 0;
      const bBorn = Number(b.c.born) || 0;
      if (aBorn !== bBorn) return aBorn - bBorn;
      return a.c.id < b.c.id ? -1 : (a.c.id > b.c.id ? 1 : 0);
    });
    index.familyTree = { playerId:state.player.charId, value:value };
    return value;
  };

  FB.stepchildrenOf = function (state, c) {
    const out = [];
    if (!state || !state.chars || !c) return out;
    const ids = familyIndexOf(state).stepchildren[c.id];
    for (const id of (ids || [])) {
      const child = state.chars[id];
      if (child) out.push(child);
    }
    return out;
  };

  FB.addStepRelation = function (state, stepParent, child) {
    if (!state || !stepParent || !child || stepParent.id === child.id ||
        child.fatherId === stepParent.id || child.motherId === stepParent.id) {
      return false;
    }
    child.stepParentIds = Array.isArray(child.stepParentIds)
      ? child.stepParentIds : [];
    if (child.stepParentIds.indexOf(stepParent.id) >= 0) return false;
    child.stepParentIds.push(stepParent.id);
    FB.touchFamily();
    return true;
  };

  FB.recordStepfamily = function (state, stepParent, spouse) {
    if (!state || !stepParent || !spouse) return [];
    if (FB.materializeRoyalStepchildren) {
      FB.materializeRoyalStepchildren(state, spouse);
    }
    const out = [];
    for (const child of childrenOf(state, spouse)) {
      if (child.fatherId === stepParent.id ||
          child.motherId === stepParent.id) continue;
      FB.addStepRelation(state, stepParent, child);
      out.push(child);
    }
    return out;
  };

  FB.ensureStepRelations = function (state) {
    if (!state || !state.chars || !state.player) return;
    for (const id in state.chars) {
      const c = state.chars[id];
      if (!c || !Array.isArray(c.stepParentIds)) continue;
      const clean = [];
      for (const parentId of c.stepParentIds) {
        if (!state.chars[parentId] || parentId === c.id ||
            c.fatherId === parentId || c.motherId === parentId ||
            clean.indexOf(parentId) >= 0) continue;
        clean.push(parentId);
      }
      if (clean.length) c.stepParentIds = clean;
      else delete c.stepParentIds;
    }
    const me = state.chars[state.player.charId];
    if (!me) return;
    const spouses = FB.spousesOf ? FB.spousesOf(state, me) :
      (me.spouseId && state.chars[me.spouseId]
        ? [state.chars[me.spouseId]] : []);
    for (const spouse of spouses) {
      FB.recordStepfamily(state, me, spouse);
      FB.recordStepfamily(state, spouse, me);
    }
  };

  /* Relationship to the current protagonist, independent of life or marital
     status. Callers layer those residence gates on top so the same rule can
     drive household membership, character actions, and relationship text. */
  FB.playerDescendantKind = function (state, cid) {
    if (!state || !state.player || !state.chars) return null;
    const me = state.chars[state.player.charId];
    const c = state.chars[cid];
    if (!me || !c || c.id === me.id) return null;
    function directChildOf(parent, child) {
      return !!(parent && child &&
        ((parent.childrenIds || []).indexOf(child.id) >= 0 ||
          child.fatherId === parent.id || child.motherId === parent.id));
    }
    if (directChildOf(me, c)) return 'child';
    const parents = [], seen = {};
    function addParent(parent) {
      if (!parent || seen[parent.id]) return;
      seen[parent.id] = 1;
      parents.push(parent);
    }
    for (const id of (me.childrenIds || [])) addParent(state.chars[id]);
    addParent(c.fatherId && state.chars[c.fatherId]);
    addParent(c.motherId && state.chars[c.motherId]);
    for (const parent of parents) {
      if (directChildOf(me, parent) && directChildOf(parent, c)) return 'grandchild';
    }
    return null;
  };

  /* Sibling of the protagonist by recorded parentage, with the same fallback
     siblingsOf uses for first-generation kin of old saves (no recorded
     parents, only role + house). House membership follows the dynasty: a
     maternal half-sibling of another house is kin, not manageable kin. */
  function siblingOfPlayer(state, me, c) {
    if (!me || !c || c.id === me.id) return false;
    if (me.dyn && c.dyn !== me.dyn) return false;
    const ps = parentsOf(state, me);
    if (ps.length) {
      for (const p of ps) {
        if ((p.childrenIds || []).indexOf(c.id) >= 0) return true;
        if (c.fatherId === p.id || c.motherId === p.id) return true;
      }
      return false;
    }
    return !!(c.role === 'sibling' && c.dyn && c.dyn === me.dyn);
  }

  /* The explicit manageable-kin rule. A relative the player may put to work
     is a LIVING sibling of the protagonist who
       - shares the protagonist's dynasty (house membership, not mere kinship),
       - is NOT a reigning realm ruler,
       - is NOT established above freeholder (FB.stationOf >= 2), a lord or
         notable, and has no royal-line identity of their own,
       - is NOT vowed to the faith: no monastic or priestly career
         (the vow IS the monk/priest profession record),
       - has NO living spouse (checked in both link directions, as in
         FB.isHouseholdCharacter, because polygynous wives point to the
         husband while only his first wife is stored on him), and
       - is RESIDENT: FB.characterResidence places them at the household home.
     Married-away, landed, vowed, ruling, or absent siblings stay visible kin
     but manage their own affairs. kinManageability returns 'manageable' when
     every test passes, otherwise a blocker key; FB.manageableKinKind maps
     that to the 'sibling'/null shape playerDescendantKind callers expect.
     Manageable kin join the labor pool and career/equipment agency WITHOUT
     becoming household members, so upkeep and succession semantics are
     untouched. */
  function kinManageability(state, cid) {
    if (!state || !state.player || !state.chars) return 'not-sibling';
    const me = state.chars[state.player.charId];
    const c = state.chars[cid];
    if (!me || !c || !siblingOfPlayer(state, me, c)) return 'not-sibling';
    if (c.dead) return 'dead';
    const spouse = c.spouseId && state.chars[c.spouseId];
    if (spouse && !spouse.dead) return 'married';
    for (const id in state.chars) {
      const other = state.chars[id];
      if (other && !other.dead && other.spouseId === c.id) return 'married';
    }
    if (FB.isReigningRealmRuler && FB.isReigningRealmRuler(state, c)) {
      return 'reigning';
    }
    if (FB.stationOf(c) >= 2 || c.role === 'lord' || c.role === 'notable' ||
        c.royalLine) return 'landed';
    if (c.career && (c.career.profession === 'monk' ||
        c.career.profession === 'priest')) return 'vowed';
    if (FB.characterResidence(state, c) !== state.player.provinceId) {
      return 'away';
    }
    return 'manageable';
  }

  FB.manageableKinKind = function (state, cid) {
    return kinManageability(state, cid) === 'manageable' ? 'sibling' : null;
  };

  /* Why a sibling stays independent: 'married' | 'reigning' | 'landed' |
     'vowed' | 'away'. Null when the sibling is manageable, dead, or not a
     sibling at all — callers only ask about known living siblings. */
  FB.manageableKinBlocker = function (state, cid) {
    const result = kinManageability(state, cid);
    return (result === 'manageable' || result === 'not-sibling' ||
      result === 'dead') ? null : result;
  };

  /* The player's living and dead kin, grouped by closeness. Each group is a
     list of {c, rel}; byId maps charId → rel for news and death notices.
     Memoized on the family index: the answer is rebuilt when the day turns or
     a family link moves, not once per panel render. Treat the result as
     read-only - callers share one object for the life of the stamp. */
  FB.kinOf = function (state) {
    const index = familyIndexOf(state);
    if (index.kin && index.kin.playerId === state.player.charId) {
      return index.kin.value;
    }
    const value = buildKin(state);
    index.kin = { playerId:state.player.charId, value:value };
    return value;
  };

  function buildKin(state) {
    const me = state.chars[state.player.charId];
    const seen = {}, byId = {};
    seen[me.id] = 1;
    function grp(list, relFn) {
      const out = [];
      for (const c of list) {
        if (!c || seen[c.id]) continue;
        seen[c.id] = 1;
        const rel = typeof relFn === 'function' ? relFn(c) : relFn;
        out.push({ c: c, rel: rel });
        byId[c.id] = rel;
      }
      return out;
    }
    function bySex(m, f) { return function (c) { return c.sex === 'f' ? f : m; }; }
    const parents = grp(parentsOf(state, me), bySex('Father', 'Mother'));
    let list = [];
    for (const p of parents) list = list.concat(parentsOf(state, p.c));
    const grandparents = grp(list, bySex('Grandfather', 'Grandmother'));
    const siblings = grp(siblingsOf(state, me), bySex('Brother', 'Sister'));
    const children = grp(childrenOf(state, me), bySex('Son', 'Daughter'));
    const stepchildren = grp(FB.stepchildrenOf(state, me),
      bySex('Stepson', 'Stepdaughter'));
    list = [];
    for (const k of children) list = list.concat(childrenOf(state, k.c));
    const grandchildren = grp(list, bySex('Grandson', 'Granddaughter'));
    list = [];
    for (const sib of siblings) list = list.concat(childrenOf(state, sib.c));
    const niecesNephews = grp(list, bySex('Nephew', 'Niece'));
    list = [];
    for (const pa of parents) list = list.concat(siblingsOf(state, pa.c));
    const unclesAunts = grp(list, bySex('Uncle', 'Aunt'));
    list = [];
    for (const u of unclesAunts) list = list.concat(childrenOf(state, u.c));
    const cousins = grp(list, 'Cousin');
    return { parents: parents, grandparents: grandparents, siblings: siblings,
      children: children, stepchildren: stepchildren,
      grandchildren: grandchildren, niecesNephews: niecesNephews,
      unclesAunts: unclesAunts, cousins: cousins, byId: byId };
  }

  /* Total tracked player-family records, living and dead — the number that
     must stay inside the localStorage quota. Iterative walk from the player
     character over parent/spouse/child links; dead records accumulate in the
     tree, so they count. Runs once a year from kinLifeTick. */
  FB.familySize = function (state) {
    const chars = state.chars || {};
    const me = chars[state.player.charId];
    if (!me) return 0;
    const seen = {};
    const stack = [me];
    let n = 0;
    while (stack.length) {
      const c = stack.pop();
      if (!c || seen[c.id]) continue;
      seen[c.id] = 1;
      n++;
      const links = [c.fatherId, c.motherId, c.spouseId];
      for (const id of links) {
        if (id && chars[id] && !seen[id]) stack.push(chars[id]);
      }
      for (const cid of (c.childrenIds || [])) {
        if (chars[cid] && !seen[cid]) stack.push(chars[cid]);
      }
    }
    return n;
  };

  /* ---------- titles ---------- */
  /* The bare rank word for any tier ("Count", "Emira"…) from the player's
     effective faith and sex — without profession/clergy overrides. */
  function rankTitleRecord(state, religionId, sex, tier) {
    const rel = FB.religionOf(religionId, state);
    const useSex = sex === 'f' ? 'f' : 'm';
    const titles = rel && rel.rankTitles && rel.rankTitles[useSex];
    if (Array.isArray(titles) && titles.length) {
      const index = FB.clamp(tier, 0, titles.length - 1);
      const found = FB.faithValue(state, religionId, 'rankTitles.' + useSex);
      return { religionId:religionId, sourceId:found.sourceId || religionId,
        sex:useSex, tier:index, word:titles[index] };
    }
    let group = FB.faithGroup(religionId, state) || 'christian';
    if (useSex === 'f' && FBDATA.titles[group + '_f']) group += '_f';
    const legacy = FBDATA.titles[group] || FBDATA.titles.christian;
    const index = FB.clamp(tier, 0, legacy.length - 1);
    return { group:group, tier:index, word:legacy[index] };
  }

  function renderRankTitle(record) {
    if (record.sourceId) {
      return FB.renderKey('religion.' + record.sourceId + '.rankTitles.' +
        record.sex + '.' + record.tier + '.default', { text:record.word }, {});
    }
    return FB.renderKey('title.' + record.group + '.' + record.tier + '.default',
      { text:record.word }, {});
  }

  function faithRoleRecord(state, religionId, profession, sex) {
    let path = null;
    if (profession === 'monk') path = 'roles.monastic' + (sex === 'f' ? 'F' : 'M');
    else if (profession === 'priest') path = 'roles.priest' + (sex === 'f' ? 'F' : 'M');
    if (!path) return null;
    const found = FB.faithValue(state, religionId, path);
    return found.value ? { path:path, sourceId:found.sourceId || religionId,
      word:found.value } : null;
  }

  function namedFaithRoleRecord(state, religionId, roleId) {
    const path = 'roles.' + roleId;
    const found = FB.faithValue(state, religionId, path);
    return found.value ? { path:path, sourceId:found.sourceId || religionId,
      word:found.value } : null;
  }

  function renderFaithRole(state, viewer, religionId, roleId, fallback) {
    const role = namedFaithRoleRecord(state, religionId, roleId);
    return role ? FB.faithDataText(state, viewer, religionId, role.path, {}) :
      FB.T(fallback);
  }

  function snapshotFaithRole(snapshot, state, religionId, roleId) {
    const role = namedFaithRoleRecord(state, religionId, roleId);
    if (!role) return false;
    snapshot.faithRolePath = role.path;
    snapshot.faithRoleReligion = role.sourceId;
    snapshot.faithRoleWord = role.word;
    return true;
  }

  FB.titleWordFor = function (state, tier) {
    const me = state.chars[state.player.charId];
    return renderRankTitle(rankTitleRecord(state, me.religion, me.sex, tier));
  };
  FB.titleFor = function (state) {
    const p = state.player;
    const me = state.chars[p.charId];
    if (FB.playerPope && FB.playerPope(state)) {
      return FB.religiousHeadTitle(state, me.religion);
    }
    if (FB.playerCardinal && FB.playerCardinal(state)) {
      return renderFaithRole(state, p.charId, me.religion,
        'cardinal', 'Cardinal');
    }
    const headed = FB.religionsHeadedBy(state, 'player');
    if (headed.length) return FB.religiousHeadTitle(state, headed[0]);
    if (FB.castellanyOf && FB.castellanyOf(state)) return FB.T('Castellan');
    let t = FB.titleWordFor(state, p.tier);
    if (p.tier <= 1 && p.profession && p.profession !== 'farmer') {
      const profNames = {
        craftsman:'Craftsman', merchant:'Merchant', soldier:'Soldier'
      };
      const role = faithRoleRecord(state, me.religion, p.profession, me.sex);
      if (role) t = FB.faithDataText(state, p.charId, me.religion, role.path, {});
      else if (profNames[p.profession]) t = FB.T(profNames[p.profession]);
    }
    if (state.player.flags.bishop &&
        (!FB.playerBishopricOnly || FB.playerBishopricOnly(state))) {
      t = renderFaithRole(state, p.charId, me.religion,
        'bishop', 'Bishop');
    }
    else if (state.player.flags.chief_qadi) {
      t = renderFaithRole(state, p.charId, me.religion,
        'grandQadi', 'Grand Qadi');
    }
    else if (state.player.flags.abbot && p.tier === 2) {
      t = renderFaithRole(state, p.charId, me.religion,
        me.sex === 'f' ? 'abbotF' : 'abbotM',
        me.sex === 'f' ? 'Abbess' : 'Abbot');
    }
    else if (state.player.flags.qadi && p.tier === 2) {
      t = renderFaithRole(state, p.charId, me.religion, 'qadi', 'Qadi');
    }
    return t;
  };

  /* the player's landed style: "Count of Anjou", "Duke of Normandy",
     "King of England" — falls back to the bare rank when unlanded */
  FB.styledTitle = function (state) {
    return FB.renderTitleSnapshot(FB.titleSnapshot(state));
  };

  FB.titleSnapshot = function (state) {
    const p = state.player;
    const me = state.chars[p.charId];
    const rank = rankTitleRecord(state, me.religion, me.sex, p.tier);
    let group = FB.faithGroup(me.religion, state) || 'christian';
    if (me.sex === 'f' && FBDATA.titles[group + '_f']) group += '_f';
    const snap = {
      group:group,
      religion:me.religion,
      titleReligion:rank.sourceId || null,
      titleSex:rank.sex || me.sex,
      tier:rank.tier,
      word:rank.word
    };
    if (FB.playerPope && FB.playerPope(state)) {
      snap.headReligion = me.religion;
      const head = FB.faithValue(state, me.religion, 'head.title');
      snap.headTitleReligion = head.sourceId || me.religion;
      snap.headTitle = head.value || 'Pope';
      return snap;
    }
    if (FB.playerCardinal && FB.playerCardinal(state)) {
      snap.special = 'cardinal';
      snapshotFaithRole(snap, state, me.religion, 'cardinal');
      return snap;
    }
    const headed = FB.religionsHeadedBy(state, 'player');
    if (headed.length) {
      const headReligion = headed[0];
      snap.headReligion = headReligion;
      const head = FB.faithValue(state, headReligion, 'head.title');
      snap.headTitleReligion = head.sourceId || headReligion;
      snap.headTitle = head.value;
      return snap;
    }
    const castellany = FB.castellanyOf && FB.castellanyOf(state);
    if (castellany) {
      snap.special = 'castellan';
      const castleCounty = FB.world && FB.world.byId[castellany.provinceId];
      snap.place = castleCounty ? castleCounty.name : castellany.provinceId;
      return snap;
    }
    if (p.tier <= 1 && p.profession && p.profession !== 'farmer') {
      const role = faithRoleRecord(state, me.religion, p.profession, me.sex);
      if (role) {
        snap.faithRolePath = role.path;
        snap.faithRoleReligion = role.sourceId;
        snap.faithRoleWord = role.word;
      } else if (p.profession === 'craftsman' || p.profession === 'merchant' ||
        p.profession === 'soldier') {
        snap.special = p.profession;
      }
    }
    if (p.flags.bishop &&
        (!FB.playerBishopricOnly || FB.playerBishopricOnly(state))) {
      snap.special = 'bishop';
      snapshotFaithRole(snap, state, me.religion, 'bishop');
      const bishopric = FB.bishopricOf && FB.bishopricOf(state, me);
      const see = bishopric && FB.world && FB.world.byId[bishopric.seeProvinceId];
      if (see) snap.place = see.name;
    }
    else if (p.flags.chief_qadi) {
      snap.special = 'grand_qadi';
      snapshotFaithRole(snap, state, me.religion, 'grandQadi');
    } else if (p.flags.abbot && p.tier === 2) {
      snap.special = me.sex === 'f' ? 'abbess' : 'abbot';
      snapshotFaithRole(snap, state, me.religion,
        me.sex === 'f' ? 'abbotF' : 'abbotM');
    } else if (p.flags.qadi && p.tier === 2) {
      snap.special = 'qadi';
      snapshotFaithRole(snap, state, me.religion, 'qadi');
    }
    if (!snap.place && p.tier === 4 && p.provs && p.provs.length) {
      const pr = FB.world && FB.world.byId[p.provs[0]];
      if (pr) snap.place = pr.name;
    } else if (p.tier === 5 && FB.playerDuchy) {
      const did = FB.playerDuchy(state);
      if (did && FBDATA.duchies[did]) snap.place = FBDATA.duchies[did].name;
    } else if (p.tier >= 6 && state.realms.player && state.realms.player.alive) {
      const rn = state.realms.player.name;
      if (rn.indexOf('Kingdom of ') === 0) snap.place = rn.slice(11);
      else if (rn.indexOf('Empire of ') === 0) snap.place = rn.slice(10);
    }
    return snap;
  };
  FB.rankTitleSnapshot = function (state, tier, place) {
    const current = FB.titleSnapshot(state);
    const rank = rankTitleRecord(state, current.religion,
      current.titleSex || 'm', tier);
    const snap = {
      group:current.group,
      religion:current.religion,
      titleReligion:rank.sourceId || null,
      titleSex:rank.sex || current.titleSex,
      tier:rank.tier,
      word:rank.word
    };
    if (place) snap.place = place;
    return snap;
  };
  /* Character-facing rank snapshots cannot borrow the protagonist's sex or
     faith: the family tree may be describing a woman, a convert, or a foreign
     ruler several generations away from the current head. */
  FB.characterRankTitleSnapshot = function (state, c, tier, place) {
    if (!c) return null;
    const rank = rankTitleRecord(state, c.religion, c.sex, tier);
    let group = FB.faithGroup(c.religion, state) || 'christian';
    if (c.sex === 'f' && FBDATA.titles[group + '_f']) group += '_f';
    const snap = {
      group:group,
      religion:c.religion,
      titleReligion:rank.sourceId || null,
      titleSex:rank.sex || c.sex,
      tier:rank.tier,
      word:rank.word
    };
    if (place) snap.place = place;
    return snap;
  };

  FB.realmTitlePlace = function (realm) {
    if (!realm || !realm.name) return '';
    return realm.name.replace(
      /^(?:County|Duchy|Kingdom|Empire|Realm) of\s+/i, '');
  };

  FB.realmRulerTitleSnapshot = function (state, realm, c) {
    if (!realm || !c) return null;
    return FB.characterRankTitleSnapshot(state, c,
      FB.clamp((realm.rank || 1) + 3, 4, 7),
      FB.realmTitlePlace(realm));
  };

  function copyTitleSnapshot(snapshot) {
    if (!snapshot) return null;
    const copy = {};
    for (const key in snapshot) {
      if (Object.prototype.hasOwnProperty.call(snapshot, key) &&
          snapshot[key] !== undefined) copy[key] = snapshot[key];
    }
    return copy;
  }

  /* A character owns their status history. Campaign peakTier is an end-screen
     statistic and cannot identify which life earned a crown. These additive,
     locale-neutral fields let deceased and retired relatives retain the exact
     highest ruling title the player actually saw them hold. */
  FB.noteCharacterStatus = function (state, c, statusTier, titleData) {
    if (!state || !c) return false;
    let changed = false;
    const tier = Number(statusTier);
    if (isFinite(tier)) {
      const nextTier = FB.clamp(Math.floor(tier), 0, 7);
      if (c.statusTier !== nextTier) {
        c.statusTier = nextTier;
        changed = true;
      }
    }
    let achieved = titleData && Number(titleData.tier);
    if (!isFinite(achieved) && isFinite(tier) && tier >= 3) achieved = tier;
    if (!isFinite(achieved) || achieved < 3) return changed;
    const snapshot = titleData || FB.characterRankTitleSnapshot(
      state, c, achieved, '');
    const former = c.highestTitleData;
    const formerTier = former ? Number(former.tier) : -1;
    if (!former || achieved > formerTier ||
        (achieved === formerTier && snapshot.place &&
          snapshot.place !== former.place)) {
      c.highestTitleData = copyTitleSnapshot(snapshot);
      changed = true;
    }
    return changed;
  };

  FB.playerStatusTitleSnapshot = function (state) {
    if (!state || !state.player || !state.chars) return null;
    const p = state.player;
    const c = state.chars[p.charId];
    if (!c) return null;
    const snap = FB.titleSnapshot(state);
    if (p.tier < 3 || snap.place || snap.headReligion) return snap;
    let place = '';
    if (p.tier <= 4) {
      const pid = p.tier === 4 && p.provs && p.provs.length
        ? p.provs[0] : p.provinceId;
      const province = FB.world && FB.world.byId[pid];
      place = province ? province.name : '';
    } else if (p.tier === 5 && FB.playerDuchy) {
      const did = FB.playerDuchy(state);
      place = did && FBDATA.duchies[did] ? FBDATA.duchies[did].name : '';
    } else {
      place = FB.realmTitlePlace(state.realms && state.realms.player);
    }
    if (place) snap.place = place;
    return snap;
  };

  FB.notePlayerStatus = function (state, titleData) {
    if (!state || !state.player || !state.chars) return false;
    const c = state.chars[state.player.charId];
    if (!c) return false;
    return FB.noteCharacterStatus(state, c, state.player.tier,
      titleData || FB.playerStatusTitleSnapshot(state));
  };

  FB.ensureCharacterStatusHistory = function (state) {
    if (!state || !state.chars || !state.player) return;
    const legends = state.legends || [];
    for (let i = 0; i < legends.length; i++) {
      const legend = legends[i];
      const c = legend && state.chars[legend.id];
      if (!c || !legend.titleData) continue;
      FB.noteCharacterStatus(state, c, legend.titleData.tier,
        legend.titleData);
    }
    const current = state.chars[state.player.charId];
    const firstLifePeak = state.generation === 1 && current &&
      state.peakTitleData && Number(state.peakTitleData.tier) >= 3
      ? state.peakTitleData : null;
    if (current) FB.noteCharacterStatus(state, current, state.player.tier,
      firstLifePeak || FB.playerStatusTitleSnapshot(state));
  };
  FB.renderTitleSnapshot = function (snapshot) {
    if (!snapshot) return '';
    if (snapshot.headReligion) {
      const sourceId = snapshot.headTitleReligion || snapshot.headReligion;
      const rel = FB.faithExists(sourceId) ? FB.religionOf(sourceId) : null;
      const source = rel && rel.head && rel.head.title || snapshot.headTitle;
      if (source) {
        return FB.renderKey('religion.' + sourceId + '.head.title.default',
          { text: source }, {});
      }
    }
    const arr = FBDATA.titles[snapshot.group] || FBDATA.titles.christian;
    const index = FB.clamp(snapshot.tier || 0, 0, arr.length - 1);
    const specialWords = {
      craftsman: 'Craftsman', merchant: 'Merchant', soldier: 'Soldier',
      scholar: 'Scholar', monk: 'Monk', nun: 'Nun', imam: 'Imam', godi: 'Godi', priest: 'Priest',
      bishop: 'Bishop', cardinal: 'Cardinal', pope: 'Pope',
      grand_qadi: 'Grand Qadi', abbot: 'Abbot', abbess: 'Abbess', qadi: 'Qadi',
      castellan:'Castellan'
    };
    const title = snapshot.faithRolePath && snapshot.faithRoleWord
      ? FB.renderKey('religion.' + snapshot.faithRoleReligion + '.' +
        snapshot.faithRolePath + '.default', { text:snapshot.faithRoleWord }, {})
      : snapshot.special && specialWords[snapshot.special]
      ? (snapshot.special === 'nun' ? FB.T('Nun') : FB.T(specialWords[snapshot.special]))
      : (snapshot.titleReligion && snapshot.word
        ? FB.renderKey('religion.' + snapshot.titleReligion + '.rankTitles.' +
          (snapshot.titleSex === 'f' ? 'f' : 'm') + '.' + index + '.default',
          { text:snapshot.word }, {})
        : (snapshot.word ? FB.T(snapshot.word) :
        FB.renderKey('title.' + snapshot.group + '.' + index + '.default',
          { text: arr[index] }, {})));
    return snapshot.place ? FB.T('{title} of {place}', {
      title: title, place: snapshot.place
    }) : title;
  };

  /* An AI realm ruler's style: "Emir Yusuf", "High King Ragnarr". Rank and
     sex select the effective title array inherited by the realm's faith. */
  function realmTemporalRankTitle(state, realm, sex) {
    const pr = FB.world && FB.world.byId[realm.capital];
    const stored = state && state.realms && state.realms[realm.id];
    const religionId = realm.religion ||
      (stored && FB.realmReligionId
        ? FB.realmReligionId(state, realm.id) : null) ||
      (pr ? pr.religion : 'catholic');
    return renderRankTitle(rankTitleRecord(state, religionId, sex,
      FB.clamp((realm.rank || 3) + 3, 4, 7)));
  }

  FB.realmRankTitle = function (state, realm) {
    const headed = FB.religionsHeadedBy(state, realm.id);
    if (headed.length) return FB.religiousHeadTitle(state, headed[0]);
    const sex = realm.ruler && realm.ruler.sex === 'f' ? 'f' : 'm';
    return realmTemporalRankTitle(state, realm, sex);
  };

  /* A court spouse shares the ruler's temporal rank; children use the
     historical English courtesy styles available without inventing a second,
     unsaved rank. Kings and emperors have princes/princesses, while the
     children of counts and dukes are lords/ladies. */
  FB.realmFamilyTitle = function (state, realm, character, role) {
    if (!realm || !character) return '';
    if (role === 'ruler') return FB.realmRankTitle(state, realm);
    if (role === 'consort') {
      return realmTemporalRankTitle(state, realm, character.sex);
    }
    const royal = (realm.rank || 1) >= 3;
    if (royal) return FB.T(character.sex === 'f' ? 'Princess' : 'Prince');
    return FB.T(character.sex === 'f' ? 'Lady' : 'Lord');
  };

  /* words for text templating */
  FB.holyWord = function (religionId, state) {
    return FB.faithDataText(state || FB.state, null, religionId,
      'words.cleric', {});
  };
  FB.godWord = function (religionId, state) {
    return FB.faithDataText(state || FB.state, null, religionId,
      'words.deity', {});
  };
  FB.templeWord = function (religionId, state) {
    return FB.faithDataText(state || FB.state, null, religionId,
      'words.temple', {});
  };

  /* Historical name retained for mods; Standing presentation owns the
     shared positive, neutral, and negative color thresholds. */
  FB.opClass = function (v) {
    v = FB.clamp(Number(v) || 0, -100, 100);
    return v >= 20 ? 'op-good' : v <= -20 ? 'op-bad' : 'op-mid';
  };
})();
