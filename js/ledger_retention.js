/* Shared windowed retention for append-only ledgers.
   Owners describe each record as a graph node: live records are roots, and a
   record keeps every record it needs for validation or provenance. Settled
   records that no root reaches fold at a season boundary into bounded totals
   once they are older than FBDATA.balance.ledgerRetentionDays. Caps count only
   the live closure, so settled history never stops new commitments. Nothing
   here consumes RNG, allocates ids or reads the clock. */
(function () {
  'use strict';
  var L = FB.ledgerRetention = {}, DEFAULT_DAYS = 3600, MIN_DAYS = 360, MAX_DAYS = 360000;
  function own(v,k) { return !!v && Object.prototype.hasOwnProperty.call(v,k); }
  function object(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  L.DEFAULT_DAYS = DEFAULT_DAYS;
  L.MIN_DAYS = MIN_DAYS;
  // The window is a balance knob. A malformed or extreme override keeps a safe whole-year floor.
  L.days = function () {
    var v = FBDATA.balance && FBDATA.balance.ledgerRetentionDays;
    return typeof v === 'number' && isFinite(v) ? Math.min(MAX_DAYS,Math.max(MIN_DAYS,Math.floor(v))) : DEFAULT_DAYS;
  };
  // Records settled on or before this turn may fold.
  L.cutoff = function (s) { return s.turn - L.days(); };
  // The daily loop advances the date first, so day 1 is the first turn of a new season.
  L.due = function (s) { return !!s && Number.isSafeInteger(s.turn) && s.turn > 0 && !!s.date && s.date.day === 1; };
  /* A retention graph. cutoff null counts only live roots (the cap measure);
     a numeric cutoff also keeps records settled after it (the fold measure). */
  L.graph = function (cutoff) {
    var nodes = Object.create(null), keys = [];
    var g = {cutoff:cutoff};
    g.add = function (key,live,settled,needs) {
      if (nodes[key]) { nodes[key].root = nodes[key].root || !!live; return; }
      nodes[key] = {root:!!live || cutoff !== null && !(Number.isSafeInteger(settled) && settled <= cutoff),needs:(needs || []).slice()};
      keys.push(key);
    };
    g.need = function (from,to) { if (nodes[from]) nodes[from].needs.push(to); };
    g.has = function (key) { return !!nodes[key]; };
    g.keys = function () { return keys.slice(); };
    // Deterministic closure: membership never depends on insertion order.
    g.keep = function () {
      var keep = Object.create(null), stack = [];
      keys.forEach(function (key) { if (nodes[key].root) { keep[key] = true; stack.push(key); } });
      while (stack.length) {
        nodes[stack.pop()].needs.forEach(function (key) {
          if (!keep[key] && nodes[key]) { keep[key] = true; stack.push(key); }
        });
      }
      return keep;
    };
    return g;
  };
  L.count = function (keep,prefix) {
    var n = 0;
    for (var key in keep) if (key.indexOf(prefix) === 0) n++;
    return n;
  };
  L.folds = function (graph,keep) { return graph.keys().some(function (key) { return !keep[key]; }); };
  // Stable partition by kept key, preserving the original order of both halves.
  L.split = function (list,keyOf,keep) {
    var out = {kept:[],folded:[]};
    list.forEach(function (row,index) { (keep[keyOf(row,index)] ? out.kept : out.folded).push(row); });
    return out;
  };
  L.add = function (totals,field,amount) { totals[field] = (totals[field] || 0) + amount; };
  L.blank = function (fields) { var out = {}; fields.forEach(function (key) { out[key] = 0; }); return out; };
  // Exact nonnegative integer totals with exactly these fields.
  L.totals = function (value,fields) {
    return object(value) && Object.keys(value).length === fields.length && fields.every(function (key) {
      return own(value,key) && Number.isSafeInteger(value[key]) && value[key] >= 0;
    });
  };
  /* Stage a fold on detached copies of the named state roots, validate the
     whole staged state, then adopt it. A failed check leaves the state untouched;
     lastFailure keeps its message for diagnostics only and is never saved. */
  L.lastFailure = null;
  L.stage = function (s,roots,change,check) {
    var t = Object.assign({},s);
    roots.forEach(function (key) { if (s[key] !== undefined) t[key] = copy(s[key]); });
    if (!change(t)) return false;
    try { check(t); } catch (e) { L.lastFailure = String(e && e.message || e); return false; }
    L.lastFailure = null;
    roots.forEach(function (key) { if (t[key] === undefined) delete s[key]; else s[key] = t[key]; });
    return true;
  };
})();
