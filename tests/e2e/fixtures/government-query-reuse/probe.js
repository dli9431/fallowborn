/* Browser-only helpers for detached reference comparisons and bounded ledgers. */
(function () {
  'use strict';
  var H = window.GOV_QUERY = {};
  H.copy = function (value) { return JSON.parse(JSON.stringify(value)); };
  H.result = function (read) {
    try { return {value:H.copy(read())}; }
    catch (error) { return {error:{name:error.name,message:error.message}}; }
  };
  H.pair = function (s,rid,read) {
    var A = FB.aristocracy, candidate = A.constituency;
    var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    var actual, expected;
    try {
      actual = H.result(function () { return read(s,rid); });
      A.constituency = window.GOV_QUERY_REFERENCE;
      expected = H.result(function () { return read(s,rid); });
    } finally { A.constituency = candidate; }
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error('Reference mismatch: ' + JSON.stringify({actual:actual,expected:expected}).slice(0,3000));
    if (before !== JSON.stringify(s) || rng !== FB.getRngState() || uid !== FB.getUidCounter())
      throw new Error('Query changed state or counters');
    return actual;
  };
  H.voices = function (s,rid) { return FB.aristocracy.constituency(s,rid); };
  H.consumers = function (s,rid) {
    var A = FB.aristocracy, R = FB.governmentRecognition, G = FB.governments;
    var voices = A.constituency(s,rid), candidates = R.candidates(s,rid), actor = {kind:'realm',id:rid};
    var fiscalCalls = [];
    var fiscal = voices.map(function (m) {
      var query = A.constituency, calls = [];
      A.constituency = function (state,id) {
        var result = query(state,id), data = A.state(state,id);
        calls.push({realmId:id,interests:data ? data.interests.length : 0,
          rights:state.authority.rights.length,appointments:state.authority.appointments.length,
          returned:result.length});
        return result;
      };
      try { return FB.settlementFiscalProjection(s,m.scope.id,0); }
      finally { A.constituency = query; fiscalCalls.push({county:m.scope.id,site:0,calls:calls}); }
    });
    return {voices:voices,members:R.members(s,rid),readiness:A.readiness(s,rid),
      fiscal:fiscal,fiscalCalls:fiscalCalls,
      taxes:voices.map(function (m) { return FB.countyTaxBase(s,m.scope.id); }),
      levy:FB.aiBaseHost(s,rid),
      assent:['grant','extraordinary_tax','levy','war','treaty'].map(function (op) {
        return G.call(s,rid,'consent','decision',{actor:actor,operation:op,scope:{}});
      }),
      support:R.members(s,rid).map(function (m) {
        return R.supportQuote(s,m.principal,rid,m.id,candidates[0] && candidates[0].id,A.profile(s,rid).defaultTerms);
      }),
      accession:R.accessionQuote(s,rid,'abdication')};
  };
  H.history = function (s,rid,count,kind) {
    var m = FB.aristocracy.state(s,rid).interests[0];
    var office = s.authority.appointments.filter(function (r) { return r.id === m.appointmentId; })[0];
    var right = s.authority.rights.filter(function (r) { return r.id === m.rightIds[0]; })[0];
    for (var i = 0; i < count; i++) {
      var a = H.copy(office), r = H.copy(right);
      a.id = 'appointment-' + s.authority.nextId++; a.status = 'expired'; a.endTurn = s.turn;
      delete a.publicTerms; delete a.provincialTerms;
      r.id = 'custom-' + s.authority.nextId++; r.status = 'lapsed';
      if (kind !== 'rights') s.authority.appointments.unshift(a);
      if (kind !== 'appointments') s.authority.rights.unshift(r);
    }
    FB.save.v4.validateAuthority(s.authority,s);
  };
  H.measure = function (s,rid,query) {
    var counts = {rightsInspected:0,appointmentsInspected:0,rightsFilters:0,assignmentSearches:0,
      dictionaries:0,appointmentEntries:0,membershipBuckets:0,requestedMemberships:0,selectedRows:0,sortComparisons:0,orders:[]};
    var originalRights = s.authority.rights, originalAppointments = s.authority.appointments;
    var filter = Array.prototype.filter, sort = Array.prototype.sort, push = Array.prototype.push, create = Object.create;
    var selections = new Map();
    function tracked(rows,key) {
      return new Proxy(rows,{get:function (target,keyRead) {
        if (typeof keyRead === 'string' && /^(0|[1-9][0-9]*)$/.test(keyRead)) counts[key]++;
        return target[keyRead];
      }});
    }
    var rights = tracked(originalRights,'rightsInspected'), assigned = tracked(originalAppointments,'appointmentsInspected');
    s.authority.rights = rights; s.authority.appointments = assigned;
    Array.prototype.filter = function (callback,receiver) {
      if (this === rights) counts.rightsFilters++;
      if (this === assigned) counts.assignmentSearches++;
      return filter.call(this,callback,receiver);
    };
    Object.create = function (proto,properties) {
      var result = create(proto,properties);
      if (proto !== null) return result;
      counts.dictionaries++;
      return new Proxy(result,{set:function (target,key,value) {
        if (!Object.prototype.hasOwnProperty.call(target,key)) {
          if (Array.isArray(value)) counts.membershipBuckets++;
          else counts.appointmentEntries++;
        }
        target[key] = value; return true;
      }});
    };
    Array.prototype.push = function (entry) {
      if (arguments.length === 1 && typeof entry === 'number') counts.requestedMemberships++;
      if (arguments.length === 1 && entry && typeof entry === 'object' && originalRights.indexOf(entry) >= 0) {
        counts.selectedRows++;
        var order = selections.get(this);
        if (!order) { order = []; selections.set(this,order); push.call(counts.orders,order); }
        push.call(order,originalRights.indexOf(entry));
      }
      return push.apply(this,arguments);
    };
    Array.prototype.sort = function (compare) {
      if (!selections.has(this)) return sort.call(this,compare);
      return sort.call(this,function (a,b) { counts.sortComparisons++; return compare(a,b); });
    };
    var result;
    try { result = query(s,rid); }
    finally {
      s.authority.rights = originalRights; s.authority.appointments = originalAppointments;
      Array.prototype.filter = filter; Array.prototype.sort = sort; Array.prototype.push = push; Object.create = create;
    }
    return {counts:counts,value:H.copy(result)};
  };
})();
