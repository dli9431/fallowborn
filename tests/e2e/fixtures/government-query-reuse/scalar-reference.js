/* Unchanged government selection and system resolution from js/authority.js
   and js/systems.js at d67ba17812036710ec605c046e9a006818bf2d33.
   Development-only oracle; only namespace bindings point at this reference. */
(function () {
  'use strict';
  var R = window.GOV_SCALAR_REFERENCE = {}, Q = FB.political;
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function records(s) {
    var a = s && s.authority;
    return a && typeof a === 'object' && !Array.isArray(a) ? a : null;
  }
  function defaultForm(s) {
    return s.start && s.start.defaultGovernment || 'territorial';
  }
  R.government = function (s, realmRef) {
    if (!realmRef || realmRef.kind !== 'realm' || !Q.actor(s, realmRef)) return null;
    var a = records(s), stored = a && a.governments &&
      own(a.governments, realmRef.id) ? a.governments[realmRef.id] : null;
    var formId = stored && stored.formId || defaultForm(s);
    var rules = FBDATA.governmentForms[formId];
    return rules ? { realmId:realmRef.id, formId:formId,
      eliteCultureId:stored && stored.eliteCultureId || null,
      eliteFaithId:stored && stored.eliteFaithId || null,
      legalIdentityId:stored && stored.legalIdentityId || null,
      tolerance:stored && stored.tolerance || 'preference',
      taxation:stored && stored.taxation || 'equal',
      justicePolicy:stored && stored.justicePolicy || 'personal',
      rules:copy(rules), sinceTurn:stored && stored.sinceTurn !== undefined
        ? stored.sinceTurn : null } : null;
  };
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function text(value) { return typeof value === 'string' && !!value; }
  function known(id) { return typeof id === 'string' && own(FBDATA.systems, id); }
  function requireId(id) {
    if (!known(id)) throw new Error('Unknown system ' + String(id) + '.');
  }
  function override(layer, id, previous) {
    if (!plain(layer)) return previous;
    if (own(layer, id) && typeof layer[id] === 'boolean') return layer[id];
    if (Array.isArray(layer.enable) && layer.enable.indexOf(id) >= 0) return true;
    if (Array.isArray(layer.disable) && layer.disable.indexOf(id) >= 0) return false;
    return previous;
  }
  function bookmark(state, context) {
    if (context && context.bookmark) return context.bookmark;
    var start = state && state.start;
    return start && start.id !== undefined && FB.bookmark ? FB.campaignBookmark(state) : FB.activeBookmark;
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
    var form = state && rid && FB.political && R.government
      ? R.government(state, { kind:'realm', id:rid }) : null;
    return { faith:faith, government:form && form.formId || state && state.start && state.start.defaultGovernment };
  }
  R.systemEnabled = function (state, id, context) {
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
  R.systemAvailable = function (state, id) {
    requireId(id);
    var bm = bookmark(state);
    var final = override(bm && bm.systems, id, null);
    if (final !== null) return final;
    if (id === 'great_holy_wars' && bm && typeof bm.greatHolyWars === 'boolean') return bm.greatHolyWars;
    if (R.systemEnabled(state, id, { faith:null, realm:null })) return true;
    var faiths = FBDATA.religions || {};
    for (var faith in faiths) if (own(faiths, faith) && R.systemEnabled(state, id, { faith:faith })) return true;
    for (var generated in state && state.faiths || {}) {
      if (R.systemEnabled(state, id, { faith:generated })) return true;
    }
    for (var rid in state && state.realms || {}) {
      if (state.realms[rid] && state.realms[rid].alive && R.systemEnabled(state, id, { realm:rid })) return true;
    }
    return false;
  };
  R.scope = scope;
})();
