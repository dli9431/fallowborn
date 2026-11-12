/* Unchanged resolved-form construction, realm cache and dispatch from
   js/governments.js at 9ce6727e2bc7882a95e0c6c8984c22d96a074df0.
   Development-only oracle: namespace/cache bindings point at R; unchanged
   validation, strategy selection and registry access still use G. */
(function () {
  'use strict';
  var G = FB.governments, R = window.GOV_RESOLVER_REFERENCE = {};
  var realmCache = new WeakMap();
  var defaults = { holders:'direct', territory:'fixed', succession:'dynastic', consent:'territorial', levy:'feudal_levy', revenue:'demesne_revenue',
    council:'royal_council', diplomacy:'territorial_diplomacy',
    ai:'realm_decisions', ladder:'inherited_ladder' };
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  R.invalidate = function () { realmCache = new WeakMap(); };

  function describe(formId, problem) {
    if (problem.kind === 'unknown_form')
      return FB.T('Unknown government form {id}.', { id:String(formId) });
    if (problem.kind === 'parameters')
      return FB.T('Invalid strategy parameters for government {form}.', { form:formId });
    if (problem.kind === 'retired')
      return FB.T('Government form {form} names the retired vocabulary slot. Use the government lexicon layer.', { form:formId });
    if (problem.kind === 'incomplete')
      return FB.T('Government form {form} uses incomplete {slot} strategy {id}.',
        { form:formId, slot:problem.slot, id:problem.id });
    if (problem.kind === 'missing')
      return FB.T('Government form {form} names no {slot} strategy.',
        { form:formId, slot:problem.slot });
    return FB.T('Government form {form} uses {slot} strategy {id}, which is not registered.',
      { form:formId, slot:problem.slot, id:String(problem.id) });
  }

  R.resolve = function (formId) {
    var problems = G.problems(formId);
    if (problems.length) throw new Error(describe(formId, problems[0]));
    var ids = G.strategyIds(formId), use = {};
    for (var slot in ids) if (own(ids, slot)) use[slot] = G.strategy(slot, ids[slot]);
    return { id:formId, strategies:ids, use:use };
  };

  R.forRealm = function (state, rid) {
    if (!state || !state.realms || !state.realms[rid] || !state.realms[rid].alive) return null;
    var stored = state.authority && state.authority.governments && state.authority.governments[rid];
    var id = stored && stored.formId || state.start && state.start.defaultGovernment || 'territorial';
    var cache = realmCache.get(state);
    if (!cache || cache.turn !== state.turn || cache.forms !== FBDATA.governmentForms) {
      cache = { turn:state.turn, forms:FBDATA.governmentForms, realms:Object.create(null) };
      realmCache.set(state, cache);
    }
    var row = cache.realms[rid], definition = FBDATA.governmentForms[id];
    if (!row || row.id !== id || row.definition !== definition) {
      var resolved = !G.problems(id).length ? R.resolve(id) : null;
      row = cache.realms[rid] = { id:id, definition:definition, resolved:resolved };
      if (FB.game && FB.game._fastForwardTiming)
        FB.game._fastForwardTiming.count('Government strategy resolutions');
    }
    return row.resolved;
  };

  R.call = function (state, rid, slot, method, context, resolved) {
    var form = resolved || R.forRealm(state, rid);
    if (!form && state && state.realms && state.realms[rid] && state.realms[rid].alive) {
      var saved = state.authority && state.authority.governments && state.authority.governments[rid];
      R.resolve(saved && saved.formId || state.start && state.start.defaultGovernment || 'territorial');
    }
    var strategy = form ? form.use[slot] : G.strategy(slot, defaults[slot]);
    if (!strategy || typeof strategy[method] !== 'function')
      throw new Error('Missing government method ' + slot + '.' + method);
    return strategy[method](state, rid, context || {});
  };
}());
