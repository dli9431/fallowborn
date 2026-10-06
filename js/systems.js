/* Optional systems: registry default -> era -> government -> faith -> bookmark.
   Queries are read-only, consume no RNG, and never stamp derived answers in saves. */
window.FB = window.FB || {};
(function () {
  'use strict';
  var S = FB.systems = {};
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function known(id) { return typeof id === 'string' && own(FBDATA.systems, id); }
  function requireId(id) {
    if (!known(id)) throw new Error('Unknown system ' + String(id) + '.');
  }
  S.ids = function () { return Object.keys(FBDATA.systems || {}); };
  S.known = known;

  /* Boolean maps remain supported for inherited faith definitions. Other
     layers may use the same map or {enable:[ids], disable:[ids]}. */
  S.validateLayer = function (layer, owner) {
    if (layer === undefined || layer === null) return [];
    var errors = [];
    function fault(text) { errors.push(FB.T('{owner}: {problem}', { owner:owner, problem:text })); }
    if (!plain(layer)) { fault(FB.T('systems must be an object.')); return errors; }
    var seen = {};
    for (var key in layer) if (own(layer, key)) {
      if (key === 'enable' || key === 'disable') {
        if (!Array.isArray(layer[key])) { fault(FB.T('systems.{list} must be a list.', { list:key })); continue; }
        for (var i = 0; i < layer[key].length; i++) {
          var id = layer[key][i];
          if (!known(id)) fault(FB.T('Unknown system {id}.', { id:String(id) }));
          else if (seen[id]) fault(FB.T('System {id} is declared more than once.', { id:id }));
          else seen[id] = true;
        }
      } else {
        if (!known(key)) fault(FB.T('Unknown system {id}.', { id:key }));
        else if (typeof layer[key] !== 'boolean') fault(FB.T('System {id} must be a boolean.', { id:key }));
        if (seen[key]) fault(FB.T('System {id} is declared more than once.', { id:key }));
        seen[key] = true;
      }
    }
    return errors;
  };
  function override(layer, id, previous) {
    if (!plain(layer)) return previous;
    if (own(layer, id) && typeof layer[id] === 'boolean') return layer[id];
    if (Array.isArray(layer.enable) && layer.enable.indexOf(id) >= 0) return true;
    if (Array.isArray(layer.disable) && layer.disable.indexOf(id) >= 0) return false;
    return previous;
  }
  /* Authoring uses declared scopes before characters or politics exist. */
  S.enabledForBookmark = function (bm, id, faith, government) {
    if (!known(id) || !plain(FBDATA.systems[id])) return false;
    var eraId = FB.bookmarkEra(bm), era = FBDATA.eras[eraId];
    var form = FBDATA.governmentForms[government || era && era.defaultGovernment];
    var rel = faith && FB.faithExists(faith, null) ? FB.religionOf(faith, null) : null;
    var value = override(era && era.systems, id, FBDATA.systems[id].defaultEnabled);
    value = override(form && form.systems, id, value);
    value = override(rel && rel.systems, id, value);
    if (id === 'great_holy_wars' && typeof bm.greatHolyWars === 'boolean') value = bm.greatHolyWars;
    return override(bm.systems, id, value) === true;
  };
  S.layerMap = function (layer) {
    var out = {};
    S.ids().forEach(function (id) {
      var value = override(layer, id, null);
      if (value !== null) out[id] = value;
    });
    return out;
  };
  function bookmark(state, context) {
    if (context && context.bookmark) return context.bookmark;
    var start = state && state.start;
    return start && start.id !== undefined && FB.bookmark ? FB.bookmark(start.id) : FB.activeBookmark;
  }
  function scope(state, context) {
    context = context || {};
    var explicit = context.character !== undefined || context.realm !== undefined || context.faith !== undefined;
    var c = context.character;
    if (typeof c === 'string') c = state && state.chars && state.chars[c];
    if (!explicit) c = state && state.player && state.chars && state.chars[state.player.charId];
    var rid = context.realm;
    if (plain(rid)) rid = rid.id;
    if (!rid && c && state) {
      rid = state.player && c.id === state.player.charId
        ? state.realms && state.realms.player && state.realms.player.alive ? 'player' : state.player.liege
        : FB.realmIdForRulerCharacter ? FB.realmIdForRulerCharacter(state, c) : null;
      if (!rid) {
        var pid = FB.characterResidence ? FB.characterResidence(state, c) : null;
        rid = pid && (state.holder && state.holder[pid] || state.owner && state.owner[pid]);
      }
    }
    var realm = rid && state && state.realms && state.realms[rid];
    var faith = context.faith !== undefined ? context.faith : c ? c.religion : realm && realm.religion;
    if (context.faith === undefined && !faith && state && rid && FB.realmReligionId) faith = FB.realmReligionId(state, rid);
    var form = state && rid && FB.political && FB.political.government
      ? FB.political.government(state, { kind:'realm', id:rid }) : null;
    return { faith:faith, government:form && form.formId || state && state.start && state.start.defaultGovernment };
  }
  FB.systemEnabled = function (state, id, context) {
    requireId(id);
    var def = FBDATA.systems[id], bm = bookmark(state, context);
    var final = override(bm && bm.systems, id, null);
    if (final !== null) return final;
    if (id === 'great_holy_wars' && bm && typeof bm.greatHolyWars === 'boolean') return bm.greatHolyWars;
    var eraId = state && FB.campaignEra ? FB.campaignEra(state) : bm && FB.bookmarkEra ? FB.bookmarkEra(bm) : null;
    var era = eraId && FBDATA.eras && FBDATA.eras[eraId];
    var resolved = scope(state, context);
    var government = resolved.government || era && era.defaultGovernment;
    var form = government && FBDATA.governmentForms && FBDATA.governmentForms[government];
    var value = override(era && era.systems, id, def.defaultEnabled);
    value = override(form && form.systems, id, value);
    var religion = resolved.faith && FB.faithExists && FB.faithExists(resolved.faith, state)
      ? FB.religionOf(resolved.faith, state) : null;
    value = override(religion && religion.systems, id, value);
    return value === true;
  };
  /* World hooks must not depend on the player's personal faith. First test
     the unscoped rules, then the faiths and live realms that can enable them. */
  FB.systemAvailable = function (state, id) {
    requireId(id);
    var bm = bookmark(state);
    var final = override(bm && bm.systems, id, null);
    if (final !== null) return final;
    if (id === 'great_holy_wars' && bm && typeof bm.greatHolyWars === 'boolean') return bm.greatHolyWars;
    if (FB.systemEnabled(state, id, { faith:null, realm:null })) return true;
    var faiths = FBDATA.religions || {};
    for (var faith in faiths) if (own(faiths, faith) && FB.systemEnabled(state, id, { faith:faith })) return true;
    for (var generated in state && state.faiths || {}) {
      if (FB.systemEnabled(state, id, { faith:generated })) return true;
    }
    for (var rid in state && state.realms || {}) {
      if (state.realms[rid] && state.realms[rid].alive && FB.systemEnabled(state, id, { realm:rid })) return true;
    }
    return false;
  };
  FB.systemContentEnabled = function (state, definition, context) {
    if (!definition) return false;
    var ids = definition.systems || (definition.system ? [definition.system] : []);
    for (var i = 0; i < ids.length; i++) if (!FB.systemEnabled(state, ids[i], context)) return false;
    return true;
  };
  S.validateContent = function (definition, owner) {
    if (!definition || typeof definition !== 'object') return [];
    var errors = [], ids = definition.systems;
    if (definition.system !== undefined) {
      if (ids !== undefined) errors.push(FB.T('{owner}: declare system or systems, not both.', { owner:owner }));
      ids = [definition.system];
    }
    if (ids !== undefined) {
      if (!Array.isArray(ids) || !ids.length) errors.push(FB.T('{owner}: systems must be a nonempty list.', { owner:owner }));
      else errors.push.apply(errors, S.validateLayer({ enable:ids }, owner));
    }
    ['trigger','require'].forEach(function (key) {
      if (definition[key]) errors.push.apply(errors, S.validateContent(definition[key], owner + '.' + key));
    });
    ['options','choices'].forEach(function (key) {
      if (Array.isArray(definition[key])) definition[key].forEach(function (option, index) {
        errors.push.apply(errors, S.validateContent(option, owner + '.' + key + '.' + index));
      });
    });
    return errors;
  };
  S.validate = function () {
    var errors = [], defs = FBDATA.systems || {};
    for (var id in defs) if (own(defs, id)) {
      var def = defs[id];
      if (!/^[a-z][a-z0-9_]*$/.test(id) || !plain(def) || def.id !== id ||
          typeof def.defaultEnabled !== 'boolean' || typeof def.desc !== 'string' ||
          !Array.isArray(def.modules) || !def.modules.length) {
        errors.push(FB.T('Invalid system definition {id}.', { id:id }));
      }
    }
    return errors;
  };
  S.validateCatalogs = function () {
    var errors = S.validate();
    var tables = ['focuses','deeds','events','traits','policies','privileges',
      'elections','politicalBlocs','religiousPaths','feudalServiceCharters',
      'tenureArchetypes','councilSeats','careers','buildings','unitClasses','items','enterprises',
      'startScenarios','eventPacks','ambitions','ailments','modifiers','holdings','positions',
      'localCouncilMotions','schooling','auctionLotTypes','householdStandards','marketGoods',
      'marketEndowmentTypes','travelPurposes','travelSites','finance','plots','collectiveDemands',
      'countyCommunityPolicies'];
    tables.forEach(function (name) {
      var table = FBDATA[name] || {};
      for (var key in table) if (own(table, key)) {
        errors.push.apply(errors, S.validateContent(table[key], name + '.' + key));
      }
    });
    return errors;
  };
})();
