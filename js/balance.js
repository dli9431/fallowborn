/* Fallowborn: layered balance.
   FBDATA.balance is the active table every engine read uses. Campaign-wide
   layers compose into it in this order: the global table (data/map_data.js),
   the campaign's era (FBDATA.eras[id].balance), the bookmark
   (definition.balance) and then runtime mods. A government form
   (FBDATA.governmentForms[id].balance) sits between the era and the bookmark
   but tunes one realm, so it is read through FB.balanceFor at the sites where
   a realm is the subject.

   Only keys some layer names are ever rewritten. The table object keeps its
   identity, an unlayered key keeps its value, and plain reads of
   FBDATA.balance cost nothing extra. Activation composes the layers of the
   bookmark it installs; a restored save recomposes them from its stamped
   era. Nothing here is saved. */
window.FB = window.FB || {};

(function () {
  'use strict';
  var L = FB.balanceLayers = {};
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  /* key -> { present, value }: the global value before any layer or mod
     rewrote the key. Captured on first touch and never mutated. */
  var pristine = {};
  /* { key, value, merge } in mod application order; merge folds an object
     value's entries over the layers below instead of replacing it. */
  var modPatches = [];
  var modKeys = {};
  /* key -> value the era and bookmark layers compose for the campaign. */
  var campaign = {};
  /* keys the active bookmark names; they sit above government forms. */
  var bookmarkKeys = {};
  var current = { era:null, bookmark:null };

  function remember(key) {
    if (own(pristine, key)) return;
    pristine[key] = { present:own(FBDATA.balance, key), value:FBDATA.balance[key] };
  }

  function compose(key) {
    var base = pristine[key], present = base.present, value = base.value;
    if (own(campaign, key)) { present = true; value = campaign[key]; }
    for (var i = 0; i < modPatches.length; i++) {
      var patch = modPatches[i];
      if (patch.key !== key) continue;
      value = patch.merge && plainObject(value)
        ? Object.assign({}, value, patch.value) : patch.value;
      present = true;
    }
    if (present) FBDATA.balance[key] = value;
    else delete FBDATA.balance[key];
  }

  /* The value a layer's key is checked against: the global default, or the
     current value of a key a mod added. undefined for an unknown key. */
  function reference(key) {
    if (own(pristine, key) && pristine[key].present) return { value:pristine[key].value };
    if (own(FBDATA.balance, key) && !own(pristine, key)) return { value:FBDATA.balance[key] };
    if (own(modKeys, key)) return { value:FBDATA.balance[key] };
    return null;
  }

  function kindOf(value) {
    if (Array.isArray(value)) return 'list';
    if (value === null) return 'null';
    return typeof value;
  }

  /* Structured faults for one override table: { kind:'table' } when it is
     not an object, { kind:'unknown', key } for a key the balance table does
     not hold, { kind:'number', key } for a non-finite value over a numeric
     default, and { kind:'type', key } for any other change of value type. */
  L.problems = function (table) {
    if (table === undefined || table === null) return [];
    if (!plainObject(table)) return [{ kind:'table', key:null }];
    var out = [];
    for (var key in table) if (own(table, key)) {
      var ref = reference(key), value = table[key];
      if (!ref) out.push({ kind:'unknown', key:key });
      else if (typeof ref.value === 'number') {
        if (typeof value !== 'number' || !isFinite(value)) out.push({ kind:'number', key:key });
      } else if (ref.value !== null && ref.value !== undefined &&
          kindOf(value) !== kindOf(ref.value)) {
        out.push({ kind:'type', key:key });
      }
    }
    return out;
  };

  L.describe = function (problem) {
    if (problem.kind === 'table') return FB.T('balance overrides must be an object.');
    if (problem.kind === 'unknown')
      return FB.T('balance key {key} is not in the balance table.', { key:problem.key });
    if (problem.kind === 'number')
      return FB.T('balance key {key} must be a number.', { key:problem.key });
    return FB.T('balance key {key} must keep the type of its default.', { key:problem.key });
  };

  /* Worded faults for one override table, each prefixed by its owner. */
  L.validate = function (table, owner) {
    var problems = L.problems(table), out = [];
    for (var i = 0; i < problems.length; i++) {
      out.push(FB.T('{owner}: {problem}', { owner:owner, problem:L.describe(problems[i]) }));
    }
    return out;
  };

  function layerInto(target, table) {
    if (!plainObject(table)) return;
    for (var key in table) if (own(table, key) && reference(key)) target[key] = table[key];
  }

  /* Compose the era and bookmark layers into the active table. Keys the
     previous campaign set and this one does not return to the global value
     with mods reapplied. */
  L.activate = function (eraId, definition) {
    var eras = FBDATA.eras || {}, next = {}, nextBookmark = {}, keys = {}, key;
    var era = typeof eraId === 'string' && own(eras, eraId) ? eras[eraId] : null;
    layerInto(next, era && era.balance);
    layerInto(next, definition && definition.balance);
    layerInto(nextBookmark, definition && definition.balance);
    for (key in campaign) if (own(campaign, key)) keys[key] = true;
    for (key in next) if (own(next, key)) keys[key] = true;
    campaign = next;
    bookmarkKeys = nextBookmark;
    current = { era:era ? eraId : null,
      bookmark:definition && definition.id !== undefined ? String(definition.id) : null };
    for (key in keys) if (own(keys, key)) { remember(key); compose(key); }
  };

  /* Recompose for a campaign: its stamped era and its own bookmark, so a
     restored save gets the same active table it was played with. */
  L.applyCampaign = function (state) {
    var start = state && state.start;
    var definition = start && start.id !== undefined ? FB.campaignBookmark(state) : null;
    L.activate(FB.campaignEra ? FB.campaignEra(state) : null, definition || FB.activeBookmark);
  };

  /* A runtime mod's balance value: the last layer, applied in mod order. */
  L.applyMod = function (key, value, merge) {
    remember(key);
    modPatches.push({ key:key, value:value, merge:!!merge });
    modKeys[key] = true;
    compose(key);
  };

  /* The era and bookmark the active table was composed from, and the keys
     each layer names. For diagnostics and tests. */
  L.active = function () {
    return { era:current.era, bookmark:current.bookmark,
      campaignKeys:Object.keys(campaign).sort(),
      bookmarkKeys:Object.keys(bookmarkKeys).sort(),
      modKeys:Object.keys(modKeys).sort() };
  };

  /* One balance value for one realm: the active table with the realm's
     government-form override applied beneath the bookmark and mod layers.
     Costs one table read unless some form overrides the key. */
  FB.balanceFor = function (state, realmId, key) {
    var value = FBDATA.balance[key];
    if (own(bookmarkKeys, key) || own(modKeys, key)) return value;
    var forms = FBDATA.governmentForms || {}, overridden = false;
    for (var formId in forms) {
      if (own(forms, formId) && forms[formId] && own(forms[formId].balance, key)) {
        overridden = true;
        break;
      }
    }
    if (!overridden || realmId === undefined || realmId === null) return value;
    var government = FB.political && FB.political.government &&
      FB.political.government(state, { kind:'realm', id:realmId });
    var form = government && own(forms, government.formId) ? forms[government.formId] : null;
    return form && own(form.balance, key) ? form.balance[key] : value;
  };
})();
