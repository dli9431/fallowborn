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
