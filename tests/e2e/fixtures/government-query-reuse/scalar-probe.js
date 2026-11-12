/* Browser-only parity and copy accounting for scalar government readers. */
(function () {
  'use strict';
  var H = window.GOV_SCALAR = {}, R = window.GOV_SCALAR_REFERENCE;
  H.copy = function (v) { return JSON.parse(JSON.stringify(v)); };
  function result(read) {
    try { return {value:read()}; }
    catch (error) { return {error:{name:error.name,message:error.message}}; }
  }
  function equal(actual, expected, label) {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(label + ': ' + JSON.stringify({actual:actual,expected:expected}));
  }
  H.compare = function (s, refs, contexts, ids) {
    var before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    refs.forEach(function (ref) {
      equal(result(function () { return FB.political.governmentFormId(s,ref); }), result(function () {
        var form = R.government(s,ref); return form ? form.formId : null;
      }), 'Scalar form');
      equal(result(function () { return FB.political.government(s,ref); }),
        result(function () { return R.government(s,ref); }), 'Detached government');
    });
    contexts.forEach(function (context) {
      ids.forEach(function (id) {
        equal(result(function () { return FB.systemEnabled(s,id,context); }),
          result(function () { return R.systemEnabled(s,id,context); }), 'System ' + id);
      });
    });
    equal(JSON.stringify(s),before,'Saved state'); equal(JSON.stringify(FBDATA),data,'Catalogue');
    equal(FB.getRngState(),rng,'RNG'); equal(FB.getUidCounter(),uid,'UID');
    return {refs:refs.length,systems:contexts.length * ids.length};
  };
  H.measure = function (read) {
    var Q = FB.political, actor = Q.actor, government = Q.government, scalar = Q.governmentFormId;
    var reference = R.government, stringify = JSON.stringify, parse = JSON.parse, depth = 0;
    var definitions = Object.keys(FBDATA.governmentForms).map(function (id) { return FBDATA.governmentForms[id]; });
    var encoded = [], counts = {scalarQueries:0,publicQueries:0,actorQueries:0,
      rulesStringifies:0,rulesParses:0,nestedRulesStringifies:0,nestedRulesParses:0};
    function publicRead(fn) {
      return function () { if (!depth) counts.publicQueries++; return fn.apply(this,arguments); };
    }
    Q.government = publicRead(government); R.government = publicRead(reference);
    Q.governmentFormId = function () {
      if (!depth) counts.scalarQueries++; return scalar.apply(this,arguments);
    };
    Q.actor = function () {
      if (!depth) counts.actorQueries++;
      depth++;
      try { return actor.apply(this,arguments); }
      finally { depth--; }
    };
    JSON.stringify = function (value) {
      var text = stringify.apply(this,arguments);
      if (definitions.indexOf(value) >= 0) {
        counts[depth ? 'nestedRulesStringifies' : 'rulesStringifies']++;
        encoded.push(text);
      }
      return text;
    };
    JSON.parse = function (text) {
      if (encoded.indexOf(text) >= 0) counts[depth ? 'nestedRulesParses' : 'rulesParses']++;
      return parse.apply(this,arguments);
    };
    try { return {value:read(),counts:counts}; }
    finally {
      Q.actor = actor; Q.government = government; Q.governmentFormId = scalar;
      R.government = reference; JSON.stringify = stringify; JSON.parse = parse;
    }
  };
})();
