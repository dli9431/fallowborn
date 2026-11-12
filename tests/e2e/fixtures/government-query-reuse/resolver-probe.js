/* Browser-only resolver parity and validation-pass accounting. */
(function () {
  'use strict';
  var H = window.GOV_RESOLVER = {}, G = FB.governments, R = GOV_RESOLVER_REFERENCE;
  H.copy = function (value) { return JSON.parse(JSON.stringify(value)); };
  H.result = function (read) {
    try { return {value:read()}; }
    catch (error) { return {error:{name:error.name,message:error.message}}; }
  };
  H.equal = function (actual, expected, label) {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(label + ': ' + JSON.stringify({actual:actual,expected:expected}));
  };
  H.resolved = function (actual, expected) {
    H.equal(actual && actual.id,expected && expected.id,'Resolved id');
    if (!actual || !expected) {
      if (actual !== expected) throw new Error('Null resolution differs');
      return;
    }
    H.equal(Object.keys(actual),Object.keys(expected),'Resolved fields');
    H.equal(actual.strategies,expected.strategies,'Strategy ids');
    H.equal(Object.keys(actual.use),Object.keys(expected.use),'Use slots');
    Object.keys(actual.use).forEach(function (slot) {
      var a = actual.use[slot], b = expected.use[slot], id = actual.strategies[slot];
      // Delegates create fresh outer objects, retaining every member reference.
      // Nondelegates keep the registered object itself, including on cache hits.
      if (G.strategy(slot,id) === G.strategy(slot,id) && a !== b)
        throw new Error('Registered strategy reference differs: ' + slot);
      H.equal(Object.keys(a),Object.keys(b),'Strategy members ' + slot);
      Object.keys(a).forEach(function (key) {
        if (a[key] !== b[key]) throw new Error('Strategy member reference differs: ' + slot + '.' + key);
      });
    });
  };
  H.resolve = function (id) {
    var actual = H.result(function () { return G.resolve(id); });
    var expected = H.result(function () { return R.resolve(id); });
    H.equal(actual.error,expected.error,'Public error');
    if (!actual.error) H.resolved(actual.value,expected.value);
    return actual;
  };
  H.compare = function (s,rid) {
    var actual = H.result(function () { return G.forRealm(s,rid); });
    var expected = H.result(function () { return R.forRealm(s,rid); });
    H.equal(actual.error,expected.error,'Realm error');
    if (!actual.error) H.resolved(actual.value,expected.value);
    H.equal(H.result(function () { return G.call(s,rid,'territory','profile',{marker:'query'}); }),
      H.result(function () { return R.call(s,rid,'territory','profile',{marker:'query'}); }), 'Dispatch');
    H.equal(H.result(function () { return G.call(s,rid,'territory','absent'); }),
      H.result(function () { return R.call(s,rid,'territory','absent'); }), 'Missing method');
    return actual;
  };
  H.pure = function (s,read) {
    var state = JSON.stringify(s), data = JSON.stringify(FBDATA), signature = FB.mods.sig();
    var rng = FB.getRngState(), uid = FB.getUidCounter(), value = read();
    H.equal(JSON.stringify(s),state,'State'); H.equal(JSON.stringify(FBDATA),data,'Catalogue');
    H.equal(FB.mods.sig(),signature,'Mod signature');
    H.equal(FB.getRngState(),rng,'RNG'); H.equal(FB.getUidCounter(),uid,'UID');
    return value;
  };
  H.measure = function (read) {
    var problems = G.problems, ids = G.strategyIds, profile = FB.governmentSelection.profileFaults;
    var counts = {problems:0,strategyIds:0,profiles:0};
    G.problems = function () { counts.problems++; return problems.apply(this,arguments); };
    G.strategyIds = function () { counts.strategyIds++; return ids.apply(this,arguments); };
    FB.governmentSelection.profileFaults = function () { counts.profiles++; return profile.apply(this,arguments); };
    try { return {result:H.result(read),counts:counts}; }
    finally {
      G.problems = problems; G.strategyIds = ids; FB.governmentSelection.profileFaults = profile;
    }
  };
}());
