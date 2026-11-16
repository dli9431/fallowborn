/* Pure declarative definition checks. Specs and predicates belong to trusted engine code. */
(function () {
  'use strict';
  var S = FB.schema = {};
  function own(o,k) { return !!o && Object.prototype.hasOwnProperty.call(o,k); }
  function object(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function reserved(k) { return k === '__proto__' || k === 'constructor' || k === 'prototype'; }
  function bound(v,c) { return typeof v === 'function' ? v(c) : v; }
  function reference(v,r,c) {
    var data = c.data || FBDATA;
    if (r.table) {
      var table = data, path = Array.isArray(r.table) ? r.table : [r.table];
      path.forEach(function (key) { table = own(table,key) ? table[key] : null; });
      if (!own(table,v)) return false;
    }
    if (r.provinces || r.bookmark) {
      var worlds = [c.bookmark];
      if (r.bookmark) {
        var id = c.root[r.bookmark];
        if (!own(data.bookmarks,id)) return false;
        var raw = data.bookmarks[id];
        if (r.deferUnreviewed && FB.bookmarkSources && FB.bookmarkSources.unreviewedReference &&
            FB.bookmarkSources.unreviewedReference(raw)) return true;
        worlds = FB.bookmarkRevisions(id,raw);
      }
      if (!worlds.some(function (world) {
        return world && (world.provinces || []).some(function (p) { return p.id === v && (!r.inhabited || !p.wasteland); });
      })) return false;
    }
    return true;
  }
  S.faults = function (value,spec,path,context) {
    var errors = [], base = Object.assign({root:value},context || {});
    function visit(v,d,p,c) {
      if (d.optional === true && v === undefined || d.optional === 'absent' && !own(c.parent,c.key)) return;
      var start = errors.length;
      function fail(at) { errors.push(FB.T('Invalid data at {path}.',{path:at || p})); }
      var type = d.type;
      if (type === 'object' ? !object(v) : type === 'array' ? !Array.isArray(v) :
          type === 'integer' ? !Number.isSafeInteger(v) : type === 'number' ? typeof v !== 'number' || !isFinite(v) :
          type && typeof v !== type) { fail(); return; }
      if (own(d,'value') && v !== d.value || d.enum && d.enum.indexOf(v) < 0) { fail(); return; }
      if (typeof v === 'number' && (d.min !== undefined && v < bound(d.min,c) || d.max !== undefined && v > bound(d.max,c) ||
          d.exclusiveMin !== undefined && v <= bound(d.exclusiveMin,c) || d.exclusiveMax !== undefined && v >= bound(d.exclusiveMax,c))) fail();
      if (typeof v === 'string' && (d.minLength !== undefined && v.length < d.minLength ||
          d.maxLength !== undefined && v.length > d.maxLength || d.nonblank && !v.trim() || d.pattern && !new RegExp(d.pattern).test(v))) fail();
      if (d.ref && !reference(v,d.ref,c)) fail();
      if (type === 'array') {
        if (d.minItems !== undefined && v.length < d.minItems || d.maxItems !== undefined && v.length > d.maxItems) { fail(); return; }
        if (d.unique && new Set(v).size !== v.length) fail();
        v.forEach(function (row,i) {
          var next = Object.assign({},c,{parent:v,key:i,path:p + '[' + i + ']'});
          if (d.items) visit(row,d.items,next.path,next);
          if (d.uniqueBy && v.some(function (other,j) {
            return i !== j && row && other && d.uniqueBy.some(function (key) {
              return typeof key === 'function' ? key(row) === key(other) : row[key] === other[key];
            });
          })) fail(next.path);
        });
      }
      if (type === 'object') {
        var keys = Object.keys(v), fields = d.fields;
        if (d.minProperties !== undefined && keys.length < d.minProperties || d.maxProperties !== undefined && keys.length > d.maxProperties) { fail(); return; }
        keys.forEach(function (key) {
          var next = Object.assign({},c,{parent:v,key:key,path:p + '.' + key});
          if (d.reservedKeys !== false && reserved(key) || fields && !own(fields,key) && !d.additional) { fail(next.path); return; }
          if (d.keys) visit(key,d.keys,next.path,next);
          if (d.values) visit(v[key],d.values,next.path,next);
        });
        if (fields) Object.keys(fields).forEach(function (key) {
          visit(v[key],fields[key],p + '.' + key,Object.assign({},c,{parent:v,key:key,path:p + '.' + key}));
        });
      }
      if (errors.length === start && d.test && !d.test(v,c)) fail();
    }
    path = path || 'data';
    visit(value,spec,path,Object.assign(base,{path:path}));
    return errors;
  };
  S.valid = function (value,spec,context) { return S.faults(value,spec,'data',context).length === 0; };
})();

/* Trusted event predicates register before catalogue preparation. This lives
   beside the schema helper so earlier owners can register in script order. */
(function () {
  'use strict';
  var R = FB.eventStateReaders = {}, readers = Object.create(null), sealed = false;
  function own(o,k) { return !!o && Object.prototype.hasOwnProperty.call(o,k); }
  function canonical(v) {
    if (!v || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function (k) {
      return JSON.stringify(k) + ':' + canonical(v[k]);
    }).join(',') + '}';
  }
  function availability(data,owner) {
    var ids = Object.keys(data.systems || {}).filter(function (id) { return data.systems[id].eventReaderOwner === owner; });
    return ids.length === 1 ? ids[0] : null;
  }
  function freeze(v) {
    if (v && typeof v === 'object') {
      Object.keys(v).forEach(function (k) { freeze(v[k]); }); Object.freeze(v);
    }
    return v;
  }
  R.register = function (def) {
    if (sealed || !def || !/^[a-z][a-z0-9_]*$/.test(def.id) || own(readers,def.id) ||
        typeof def.system !== 'string' || !def.args || def.args.type !== 'object' ||
        !def.args.fields || typeof def.read !== 'function') throw new Error('Invalid event state reader registration.');
    readers[def.id] = Object.freeze({id:def.id,system:def.system,args:freeze(def.args),read:def.read});
  };
  R.seal = function () { sealed = true; };
  R.list = function () {
    return Object.keys(readers).map(function (id) {
      var d = readers[id]; return {id:id,system:d.system,args:d.args};
    });
  };
  R.faults = function (calls,path,context) {
    R.seal(); context = context || {};
    var data = context.data || FBDATA;
    var faults = FB.schema.faults(calls,{type:'array',minItems:1,maxItems:16,items:{type:'object',fields:{
      reader:{type:'string'}, args:{type:'object'}, not:{type:'boolean',optional:'absent'}
    }}},path,context);
    if (faults.length) return faults;
    calls.forEach(function (call,i) {
      var at = path + '[' + i + ']', d = readers[call.reader], system = d && availability(data,d.system);
      if (!d || !system) faults.push(FB.T('Invalid data at {path}.',{path:at + '.reader'}));
      else {
        faults = faults.concat(FB.schema.faults(call.args,d.args,at + '.args',context));
        if (context.state && !FB.systemEnabled(context.state,system))
          faults.push(FB.T('Invalid data at {path}.',{path:at + '.reader'}));
      }
    });
    return faults;
  };
  R.test = function (s,calls,ctx,snapshot) {
    R.seal();
    if (!Array.isArray(calls) || !calls.length || calls.length > 16) return false;
    for (var i = 0; i < calls.length; i++) {
      var call = calls[i], d = call && readers[call.reader];
      // An unavailable owner is false even for a negated predicate.
      var system = d && availability(FBDATA,d.system);
      if (!d || !system || !FB.systemEnabled(s,system) ||
          typeof call.not !== 'undefined' && typeof call.not !== 'boolean') return false;
      var cache = snapshot && (snapshot.stateReaders || (snapshot.stateReaders = Object.create(null)));
      var key = cache && d.id + ':' + canonical(call.args) + ':' + canonical(ctx || {});
      var value;
      if (cache && own(cache,key)) value = cache[key];
      else {
        if (!FB.schema.valid(call.args,d.args)) return false;
        value = d.read(s,call.args,ctx || {}) === true;
        if (cache) cache[key] = value;
      }
      if (value === (call.not === true)) return false;
    }
    return true;
  };
})();
