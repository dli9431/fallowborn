/* Fallowborn: government strategy registry.
   A government form (FBDATA.governmentForms) names one registered strategy
   per behavior slot, and engine consumers dispatch through the form instead
   of choosing rules by bookmark. Registration happens at script load only;
   strategy ids are referenced by government-form data and are never saved. */
window.FB = window.FB || {};

(function () {
  'use strict';
  var G = FB.governments = {};
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

  /* true: every form names this slot's strategy. false: a form may omit the
     slot, which then resolves to ENGINE_DEFAULT, today's shared code path,
     until a later change converts that consumer to dispatch by form. */
  var SLOTS = {
    holders:true, succession:true, territory:true, consent:true,
    levy:false, revenue:false, council:false, diplomacy:false, ai:false,
    vocabulary:false, ladder:false
  };
  var ENGINE_DEFAULT = 'engine_default';
  var ID = /^[a-z][a-z0-9_]*$/;
  var registry = {};
  for (var slotId in SLOTS) if (own(SLOTS, slotId)) registry[slotId] = {};

  G.slots = function () { return Object.keys(SLOTS); };
  G.engineDefault = ENGINE_DEFAULT;

  G.register = function (slot, id, strategy) {
    if (!own(SLOTS, slot))
      throw new Error('Unknown government strategy slot ' + slot + '.');
    if (typeof id !== 'string' || !ID.test(id))
      throw new Error('Invalid ' + slot + ' strategy id ' + id + '.');
    if (own(registry[slot], id))
      throw new Error('Duplicate ' + slot + ' strategy ' + id + '.');
    registry[slot][id] = strategy || {};
    return registry[slot][id];
  };

  G.strategy = function (slot, id) {
    return own(SLOTS, slot) && own(registry[slot], id) ? registry[slot][id] : null;
  };

  /* The strategy id each slot resolves to for a form, defaults filled in;
     null for an unknown form. */
  G.strategyIds = function (formId) {
    var forms = FBDATA.governmentForms;
    if (typeof formId !== 'string' || !own(forms, formId) || !forms[formId]) return null;
    var form = forms[formId], out = {};
    for (var slot in SLOTS) if (own(SLOTS, slot)) {
      out[slot] = own(form, slot) ? form[slot] : SLOTS[slot] ? null : ENGINE_DEFAULT;
    }
    return out;
  };

  /* Structured faults for one form: { kind:'unknown_form' } or
     { kind:'missing'|'unregistered', slot, id }. Callers word them. */
  G.problems = function (formId) {
    var ids = G.strategyIds(formId);
    if (!ids) return [{ kind:'unknown_form', id:formId }];
    var out = [];
    for (var slot in ids) if (own(ids, slot)) {
      if (ids[slot] === null) out.push({ kind:'missing', slot:slot, id:null });
      else if (!G.strategy(slot, ids[slot]))
        out.push({ kind:'unregistered', slot:slot, id:ids[slot] });
    }
    return out;
  };

  function describe(formId, problem) {
    if (problem.kind === 'unknown_form')
      return FB.T('Unknown government form {id}.', { id:String(formId) });
    if (problem.kind === 'missing')
      return FB.T('Government form {form} names no {slot} strategy.',
        { form:formId, slot:problem.slot });
    return FB.T('Government form {form} uses {slot} strategy {id}, which is not registered.',
      { form:formId, slot:problem.slot, id:String(problem.id) });
  }

  /* The resolved rule set of one form. Throws a named error for an unknown
     form or an unregistered strategy. */
  G.resolve = function (formId) {
    var problems = G.problems(formId);
    if (problems.length) throw new Error(describe(formId, problems[0]));
    var ids = G.strategyIds(formId), use = {};
    for (var slot in ids) if (own(ids, slot)) use[slot] = registry[slot][ids[slot]];
    return { id:formId, strategies:ids, use:use };
  };

  /* A living realm's current form, read through the saved authority record
     (FB.political.government); null when the realm or its form is unknown. */
  G.forRealm = function (state, rid) {
    var current = FB.political && FB.political.government &&
      FB.political.government(state, { kind:'realm', id:rid });
    return current && !G.problems(current.formId).length ? G.resolve(current.formId) : null;
  };

  G.validate = function () {
    var errors = [], forms = FBDATA.governmentForms;
    if (!forms || typeof forms !== 'object') return errors;
    for (var formId in forms) if (own(forms, formId)) {
      if (!ID.test(formId) || !forms[formId] || typeof forms[formId] !== 'object') {
        errors.push(FB.T('Invalid government form {id}.', { id:formId }));
        continue;
      }
      var problems = G.problems(formId);
      for (var i = 0; i < problems.length; i++) errors.push(describe(formId, problems[i]));
      errors.push.apply(errors, FB.systems.validateLayer(forms[formId].systems,
        FB.T('Government form {form}', { form:formId })));
      errors.push.apply(errors, FB.balanceLayers.validate(forms[formId].balance,
        FB.T('Government form {form}', { form:formId })));
    }
    return errors;
  };

  /* Built-in strategies whose consumers still run today's shared code.
     Holders strategies are registered by js/world.js, which owns county
     holder generation. consent.territorial lets a realm's territorial
     rule answer local civic consent; delegated leaves it to an office. */
  var BUILT_IN = {
    succession:{ dynastic:{}, office:{}, acclamation:{} },
    territory:{ fixed:{}, non_territorial:{} },
    consent:{ territorial:{ territorialConsent:true },
      delegated:{ territorialConsent:false } }
  };
  for (var builtSlot in BUILT_IN) if (own(BUILT_IN, builtSlot)) {
    for (var builtId in BUILT_IN[builtSlot]) if (own(BUILT_IN[builtSlot], builtId))
      G.register(builtSlot, builtId, BUILT_IN[builtSlot][builtId]);
  }
  for (var defaultSlot in SLOTS) if (own(SLOTS, defaultSlot) && !SLOTS[defaultSlot])
    G.register(defaultSlot, ENGINE_DEFAULT, {});
})();
