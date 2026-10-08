/* Fallowborn: government strategy registry.
   A government form (FBDATA.governmentForms) names one registered strategy
   per behavior slot, and engine consumers dispatch through the form instead
   of choosing rules by bookmark. Registration happens at script load only;
   default strategy ids are referenced by government-form data; an optional
   royal succession policy override is saved with the compact genealogy. */
window.FB = window.FB || {};

(function () {
  'use strict';
  var G = FB.governments = {};
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

  /* Required slots remain explicit. Optional omissions in existing JSON mods
     use deprecated engine_default aliases of the named, validated defaults. */
  var SLOTS = {
    holders:true, succession:true, territory:true, consent:true,
    levy:false, revenue:false, council:false, diplomacy:false, ai:false,
    ladder:false
  };
  var ENGINE_DEFAULT = 'engine_default';
  var ID = /^[a-z][a-z0-9_]*$/;
  var registry = {};
  var contracts = {};
  var defaults = { holders:'direct', territory:'fixed', succession:'dynastic', consent:'territorial', levy:'feudal_levy', revenue:'demesne_revenue',
    council:'royal_council', diplomacy:'territorial_diplomacy',
    ai:'realm_decisions', ladder:'inherited_ladder' };
  var realmCache = new WeakMap();
  G.invalidate = function () { realmCache = new WeakMap(); };
  G.contract = function (slot, methods) { contracts[slot] = methods.slice(); G.invalidate(); };
  G.interfaces = function () { return JSON.parse(JSON.stringify(contracts)); };

  for (var slotId in SLOTS) if (own(SLOTS, slotId)) registry[slotId] = {};

  G.slots = function () { return Object.keys(SLOTS); };
  G.engineDefault = ENGINE_DEFAULT;

  G.register = function (slot, id, strategy) {
    if (!own(SLOTS, slot))
      throw new Error('Unknown government strategy slot ' + slot + '.');
    if (typeof id !== 'string' || !ID.test(id))
      throw new Error('Invalid ' + slot + ' strategy id ' + id + '.');
    if (id === ENGINE_DEFAULT || own(registry[slot], id))
      throw new Error('Duplicate ' + slot + ' strategy ' + id + '.');
    if (!strategy || typeof strategy !== 'object' || Array.isArray(strategy) ||
        !Object.keys(strategy).length)
      throw new Error('Empty government strategy ' + slot + '.' + id + '.');
    registry[slot][id] = strategy;
    G.invalidate();
    return registry[slot][id];
  };

  G.strategy = function (slot, id) {
    if (id === ENGINE_DEFAULT) id = defaults[slot];
    var entry = own(SLOTS, slot) && own(registry[slot], id) ? registry[slot][id] : null;
    if (entry && entry.delegate) {
      var target = registry[slot][entry.delegate];
      return target && !target.delegate ? Object.assign({}, target, entry) : null;
    }
    return entry;
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
    if (own(FBDATA.governmentForms[formId], 'vocabulary'))
      out.push({ kind:'retired', slot:'vocabulary' });
    for (var slot in ids) if (own(ids, slot)) {
      if (ids[slot] === null) out.push({ kind:'missing', slot:slot, id:null });
      else if (!G.strategy(slot, ids[slot]))
        out.push({ kind:'unregistered', slot:slot, id:ids[slot] });
      else {
        var strategy = G.strategy(slot, ids[slot]);
        if ((contracts[slot] || []).some(function (method) {
          return typeof strategy[method] !== 'function';
        })) out.push({ kind:'incomplete', slot:slot, id:ids[slot] });
      }
    }
    var params = FBDATA.governmentForms[formId].strategyParameters;
    var succession = G.strategy('succession', ids.succession);
    var selection = FBDATA.governmentForms[formId].selectionProfile;
    if (succession && succession.publicCrown && (!selection || !selection.candidatePool || !selection.procedure ||
        FB.governmentSelection && FB.governmentSelection.profileFaults(selection).length)) out.push({ kind:'parameters' });
    var profileId = FBDATA.governmentForms[formId].administrationProfileId;
    if (profileId !== undefined && (!FBDATA.administrationProfiles || !own(FBDATA.administrationProfiles, profileId)))
      out.push({ kind:'parameters' });
    if (params !== undefined) {
      var valid = params && typeof params === 'object' && !Array.isArray(params);
      if (valid) Object.keys(params).forEach(function (slot) {
        var value = params[slot];
        if (!value || typeof value !== 'object' || Array.isArray(value)) { valid = false; return; }
        if (slot === 'council') {
          if (Object.keys(value).some(function (key) { return key !== 'seats'; }) ||
              !Array.isArray(value.seats) || value.seats.some(function (id, i) {
                return typeof id !== 'string' || !own(FBDATA.councilSeats, id) || value.seats.indexOf(id) !== i;
              })) valid = false;
        } else if (slot === 'ai') {
          if (Object.keys(value).some(function (key) { return key !== 'warChance'; }) ||
              typeof value.warChance !== 'number' || !isFinite(value.warChance) ||
              value.warChance < 0 || value.warChance > 1) valid = false;
        } else valid = false;
      });
      if (!valid) out.push({ kind:'parameters' });
    }
    return out;
  };

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

  /* The resolved rule set of one form. Throws a named error for an unknown
     form or an unregistered strategy. */
  G.resolve = function (formId) {
    var problems = G.problems(formId);
    if (problems.length) throw new Error(describe(formId, problems[0]));
    var ids = G.strategyIds(formId), use = {};
    for (var slot in ids) if (own(ids, slot)) use[slot] = G.strategy(slot, ids[slot]);
    return { id:formId, strategies:ids, use:use };
  };

  /* A living realm's current form, read through the saved authority record
     (FB.political.government); null when the realm or its form is unknown. */
  G.forRealm = function (state, rid) {
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
      var resolved = !G.problems(id).length ? G.resolve(id) : null;
      row = cache.realms[rid] = { id:id, definition:definition, resolved:resolved };
      if (FB.game && FB.game._fastForwardTiming)
        FB.game._fastForwardTiming.count('Government strategy resolutions');
    }
    return row.resolved;
  };

  /* A court policy is campaign state, not a historical-date instruction. */
  G.successionForRealm = function (state, rid) {
    var realm = state && state.realms && state.realms[rid];
    var policy = realm && realm.succession && realm.succession.policyId;
    var form = G.forRealm(state, rid);
    if (form && form.use.succession.selectionManaged) return form.use.succession;
    return policy ? G.strategy('succession', policy) : form ? form.use.succession : G.strategy('succession', 'dynastic');
  };

  function maleLine(member, succession) {
    var seen = {}, current = member;
    while (current && !seen[current.id]) {
      if (current.id === succession.founderId) return true;
      if (current.sex !== 'm') return false;
      seen[current.id] = true;
      current = succession.members[current.fatherId || current.parentId];
    }
    return false;
  }

  function seniorEligible(member, succession, year) {
    return !!member && member.id !== succession.rulerMemberId &&
      member.alive !== false && member.role !== 'consort' &&
      member.sex === 'm' && year - member.born >= 16 && maleLine(member, succession);
  }

  G.validate = function () {
    var errors = [], forms = FBDATA.governmentForms;
    if (FB.validateAdministrationProfiles) errors.push.apply(errors, FB.validateAdministrationProfiles());
    if (!forms || typeof forms !== 'object') return errors;
    for (var formId in forms) if (own(forms, formId)) {
      if (!ID.test(formId) || !forms[formId] || typeof forms[formId] !== 'object') {
        errors.push(FB.T('Invalid government form {id}.', { id:formId }));
        continue;
      }
      var problems = G.problems(formId);
      for (var i = 0; i < problems.length; i++) errors.push(describe(formId, problems[i]));
      var catalogue = forms[formId].officeCatalogue;
      if (catalogue !== undefined && (!Array.isArray(catalogue) || catalogue.some(function (id, index) {
        var office = FBDATA.authorityOffices && FBDATA.authorityOffices[id];
        return !office || !office.appointment || catalogue.indexOf(id) !== index;
      }))) errors.push(FB.T('Invalid office catalogue for government {id}.', { id:formId }));
      var ladder = forms[formId].ladder && G.strategy('ladder', forms[formId].ladder);
      if (forms[formId].selectionProfile !== undefined && FB.governmentSelection)
        errors.push.apply(errors, FB.governmentSelection.profileFaults(forms[formId].selectionProfile).map(function (detail) {
          return FB.T('Invalid selection profile for government {id}: {detail}', { id:formId, detail:FB.T(detail) });
        }));
      errors.push.apply(errors, FB.station.validateLadder(ladder, formId, true));
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
    ladder:{
      roman_civic:{ bands:{
        2:{ promotion:{ route:'standing', next:3, cost:{ gold:50, prestige:20, piety:0 },
          paths:[{ roles:['civic'], years:5, wealth:100, prestige:60 }, { office:true, prestige:30 }] } },
        4:{ succession:'personal' }, 5:{ succession:'personal' },
        6:{ succession:'personal' }, 7:{ succession:'personal' }
      } },
      federate_polity:{ bands:{
        2:{ succession:'personal', promotion:{ route:'standing', next:3, cost:{ gold:40, prestige:20, piety:0 },
          paths:[{ roles:['arms'], years:5, prestige:60 }, { office:true, prestige:30 }, { wealth:250, prestige:80 }] } },
        3:{ succession:'personal' },
        1:{ promotion:{ route:'standing', next:2, cost:{ gold:20, prestige:10, piety:0 },
          paths:[{ roles:['arms'], years:2, prestige:20 }, { office:true, prestige:10 }, { wealth:120, prestige:40 }] } }
      } }
    },
    succession:{
      dynastic:{ eligible:function (member, succession, year, frontier) {
        return !!member && frontier.indexOf(member.id) >= 0;
      } },
      agnatic_seniority:{
        requiresFounder:true,
        annualRefresh:true,
        eligible:seniorEligible,
        order:function (succession, year, frontier) {
          var candidates = Object.keys(succession.members).map(function (id) {
            return succession.members[id];
          }).filter(function (member) { return seniorEligible(member, succession, year); });
          candidates.sort(function (a, b) {
            return a.born - b.born || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
          });
          return candidates.length ? candidates.map(function (member) { return member.id; }) : frontier;
        }
      },
      office:{ delegate:'dynastic' }, acclamation:{ delegate:'dynastic' }
    },
    territory:{ fixed:{ movingCourt:false }, non_territorial:{ movingCourt:true } },
    consent:{ territorial:{ territorialConsent:true },
      delegated:{ territorialConsent:false } }
  };
  for (var builtSlot in BUILT_IN) if (own(BUILT_IN, builtSlot)) {
    for (var builtId in BUILT_IN[builtSlot]) if (own(BUILT_IN[builtSlot], builtId))
      G.register(builtSlot, builtId, BUILT_IN[builtSlot][builtId]);
  }
  G.register('ladder', 'inherited_ladder', { bands:{} });

  /* Adapters preserve the public call sites and the exact legacy evaluation
     order. A strategy receives named context fields, never an argument bag.
     Install only after the owning module's final override has loaded. */
  G.bind = function (slot, strategyId, method, name, fields, realm) {
    var original = FB[name], strategy = G.strategy(slot, strategyId);
    if (typeof original !== 'function') throw new Error('Missing government consumer ' + name);
    strategy[method] = function (state, rid, context) {
      var args = [state];
      fields.forEach(function (field) { args.push(context[field]); });
      return original.apply(FB, args);
    };
    FB[name] = function (state) {
      var context = {}, args = arguments;
      fields.forEach(function (field, i) { context[field] = args[i + 1]; });
      var rid = typeof realm === 'function' ? realm(state, context) : context[realm] || 'player';
      return G.call(state, rid, slot, method, context);
    };
  };
  G.call = function (state, rid, slot, method, context, resolved) {
    var form = resolved || G.forRealm(state, rid);
    if (!form && state && state.realms && state.realms[rid] && state.realms[rid].alive) {
      var saved = state.authority && state.authority.governments && state.authority.governments[rid];
      G.resolve(saved && saved.formId || state.start && state.start.defaultGovernment || 'territorial');
    }
    var strategy = form ? form.use[slot] : G.strategy(slot, defaults[slot]);
    if (!strategy || typeof strategy[method] !== 'function')
      throw new Error('Missing government method ' + slot + '.' + method);
    return strategy[method](state, rid, context || {});
  };
  G.parameters = function (state, rid, slot) {
    var form = G.forRealm(state, rid);
    var definition = form && FBDATA.governmentForms[form.id];
    var params = definition && definition.strategyParameters && definition.strategyParameters[slot];
    var out = {};
    if (params) Object.keys(params).forEach(function (key) {
      out[key] = Array.isArray(params[key]) ? params[key].slice() : params[key];
    });
    return out;
  };
  G.countyRealm = function (state, context) {
    return state.holder && state.holder[context.provinceId] || state.owner && state.owner[context.provinceId];
  };
})();
