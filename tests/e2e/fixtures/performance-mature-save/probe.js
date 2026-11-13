/* Browser-only, directly staged save diagnostics. Timings are observations, not
   speed thresholds. Counted passes run separately from elapsed samples. */
(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function utf8(text) { return new TextEncoder().encode(text).length; }
  function size(value) { return utf8(JSON.stringify(value)); }
  function canonical(value) {
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + canonical(value[key]);
    }).join(',') + '}';
  }
  function savedFacts(text) {
    var value = JSON.parse(text);
    value.rng = value.rng >>> 0;
    return canonical(value);
  }
  function row(value) {
    return value === undefined ? {present:false,count:0,utf8Bytes:0} :
      {present:true,count:Object.keys(value).length,utf8Bytes:size(value)};
  }
  function inventory(s) {
    var out = {roots:{},authority:{},production:{},history:{},summary:{possession:0,disputed:0,abandoned:0}},
      a = s.authority || {}, p = s.production || {}, cutoff = FB.ledgerRetention.cutoff(s),
      groups = {eligible:[],withinWindow:[],permanent:[]}, kinds = {}, totals = copy(out.summary);
    ['authority','production','siteResources','buildingOperations','buildingSeasons','siegeSupport',
      'localInstitutions','governmentSupport','tournaments','chronicle','chars','realms','armies'].forEach(function (key) {
      out.roots[key] = row(s[key]);
    });
    ['appointments','recognitions','contracts','rights','receipts','governments'].forEach(function (key) {
      out.authority[key] = row(a[key]);
    });
    (a.rights || []).forEach(function (right) {
      right.history.forEach(function (entry) {
        (kinds[entry.event] || (kinds[entry.event] = [])).push(entry);
        var observable = Object.prototype.hasOwnProperty.call(totals,entry.event) && !entry.evidence && entry.turn < s.turn;
        groups[observable ? entry.turn <= cutoff ? 'eligible' : 'withinWindow' : 'permanent'].push(entry);
        if (Object.prototype.hasOwnProperty.call(totals,entry.event)) totals[entry.event]++;
      });
      Object.keys(totals).forEach(function (kind) {
        var n = right.retiredHistory && right.retiredHistory[kind] || 0;
        out.summary[kind] += n; totals[kind] += n;
      });
    });
    Object.keys(groups).forEach(function (key) { out.history[key] = row(groups[key]); });
    out.history.kinds = {};
    Object.keys(kinds).forEach(function (key) { out.history.kinds[key] = row(kinds[key]); });
    out.history.withSummariesUtf8Bytes = size((a.rights || []).map(function (r) {
      return {history:r.history,retiredHistory:r.retiredHistory};
    }));
    out.history.exactTotals = totals;
    ['assets','lots','batches'].forEach(function (key) { out.production[key] = row(p[key]); });
    out.production.retired = p.retired || null;
    if (s.production) {
      var P = FB.production, graph = P.retentionGraph(s,cutoff), keep = graph.keep(), live = P.retentionGraph(s,null).keep();
      out.production.nodes = {};
      graph.keys().forEach(function (key) {
        var kind = key.split(':')[0], item = out.production.nodes[kind] ||
          (out.production.nodes[kind] = {total:0,liveClosure:0,windowOnly:0,eligible:0});
        item.total++;
        if (live[key]) item.liveClosure++; else if (keep[key]) item.windowOnly++; else item.eligible++;
      });
    }
    return out;
  }
  function timed(action) {
    var start = performance.now(), value = action();
    return {ms:performance.now() - start,value:value};
  }
  function counts(action) {
    var S = FB.save, P = FB.production, R = FB.ledgerRetention, graph = R.graph,
      expand = S.expandedSnapshot, snapshot = S._validationSnapshot, authority = S.v4.validateAuthority,
      inputs = [], out = {graphs:[],snapshotRequests:0,snapshotBuilds:0,expandedInputUtf8Bytes:0,authorityValidations:0};
    R.graph = function (cutoff) {
      var g = graph(cutoff), add = g.add, keep = g.keep, item = {cutoff:cutoff,nodes:0,closures:0};
      out.graphs.push(item);
      g.add = function () { item.nodes++; return add.apply(g,arguments); };
      g.keep = function () { item.closures++; return keep.apply(g,arguments); };
      return g;
    };
    var retention = P.retentionGraph;
    P.retentionGraph = function (s,cutoff) {
      if (inputs.indexOf(s) < 0) inputs.push(s);
      var g = retention.apply(P,arguments);
      out.graphs[out.graphs.length - 1].input = inputs.indexOf(s);
      return g;
    };
    S.expandedSnapshot = function (s) {
      out.snapshotBuilds++; out.expandedInputUtf8Bytes += size(s);
      return expand.apply(S,arguments);
    };
    S._validationSnapshot = function () { out.snapshotRequests++; return snapshot.apply(S,arguments); };
    S.v4.validateAuthority = function () { out.authorityValidations++; return authority.apply(S.v4,arguments); };
    try { action(); } finally {
      R.graph = graph; P.retentionGraph = retention; S.expandedSnapshot = expand;
      S._validationSnapshot = snapshot; S.v4.validateAuthority = authority;
    }
    return out;
  }
  function measure() {
    var S = FB.save, samples = [], text = S.serialize(), before = canonical(FB.state);
    for (var i = 0; i < 3; i++) {
      var s = FB.state;
      samples.push({authorityValidationMs:timed(function () { S.v4.validateAuthority(s.authority,s); }).ms,
        platformValidationMs:timed(function () { S._validatePlatform(s); }).ms,
        publicDetachedExpansionMs:timed(function () { S.expandedSnapshot(s); }).ms,
        serializeInclusiveMs:timed(function () { return S.serialize(); }).ms});
    }
    return {inventory:inventory(FB.state),samples:samples,jsonUtf8Bytes:utf8(text),jsonUtf16CodeUnits:text.length,
      serializeCounts:counts(function () { S.serialize(); }),
      unchanged:before === canonical(FB.state),text:text};
  }
  window.matureSaveProbe = {
    run:function (compact) {
      var S = FB.save, rng = FB.getRngState() >>> 0, uid = FB.getUidCounter(), catalogue = JSON.stringify(FBDATA);
      // Finish ordinary load normalization once, before the matched workload.
      // No years of daily play are represented by this directly staged state.
      S.restore(JSON.parse(S.serialize()));
      var before = measure(), source = copy(FB.state), compaction = [], twins = [];
      for (var i = 0; i < 3; i++) {
        var twin = copy(source), sample = timed(function () { return compact(twin); });
        compaction.push({ms:sample.ms,changed:sample.value}); twins.push(canonical(twin));
      }
      var compactCounts = counts(function () { compact(copy(source)); });
      var changed = compact(FB.state), deterministic = twins.every(function (text) { return text === canonical(copy(FB.state)); });
      var after = measure(), facts = savedFacts(after.text), restores = [], persistence = [], noops = [];
      for (var n = 0; n < 3; n++) {
        var input = JSON.parse(after.text), inputFacts = canonical(input);
        var restored = timed(function () { S.restore(input); });
        restores.push({ms:restored.ms,completeParity:facts === savedFacts(S.serialize()),inputUnchanged:inputFacts === canonical(input)});
        var noop = timed(function () { return compact(FB.state); });
        noops.push({ms:noop.ms,changed:noop.value});
      }
      var slotKey = FB.storageKey('fb_slot3'), previous = localStorage.getItem(slotKey), original = S.serialize;
      try {
        for (var j = 0; j < 3; j++) {
          var serializationMs = 0, accepted = null;
          S.serialize = function () {
            var sample = timed(function () { return original.apply(S,arguments); });
            serializationMs += sample.ms; return sample.value;
          };
          var write = timed(function () { S.toSlot(3,function (ok) { accepted = ok; }); });
          S.serialize = original;
          var raw = localStorage.getItem(slotKey), read = timed(function () { return S.read(3); });
          var exported = timed(function () { return S.exportState(); });
          persistence.push({slotInclusiveMs:write.ms,slotSerializeMs:serializationMs,
            encodingVerificationAndWriteResidualMs:write.ms - serializationMs,readDecodeParseMs:read.ms,
            exportInclusiveMs:exported.ms,accepted:accepted,storedPrefix:raw.slice(0,5),
            storedUtf16CodeUnits:raw.length,keyAndValueUtf16BudgetBytes:2 * (slotKey.length + raw.length),
            storedStringUtf8Bytes:utf8(raw),exportUtf8Bytes:utf8(exported.value),
            slotParity:facts === savedFacts(JSON.stringify(read.value)),
            exportParity:facts === savedFacts(JSON.stringify(S.parseExport(exported.value)))});
        }
      } finally {
        S.serialize = original;
        if (previous === null) localStorage.removeItem(slotKey); else localStorage.setItem(slotKey,previous);
      }
      delete before.text; delete after.text;
      return {browser:navigator.userAgent,gameVersion:FB.VERSION,seed:FB.state.seed,
        bookmark:FB.state.start,turn:FB.state.turn,date:FB.state.date,
        retentionDays:FB.ledgerRetention.days(),cutoff:FB.ledgerRetention.cutoff(FB.state),backend:S.storageBackend(),
        savedStateKeys:Object.keys(JSON.parse(S.serialize()).state).sort(),format:S.FORMAT,signature:FB.mods.sig(),
        before:before,after:after,compaction:compaction,compactCounts:compactCounts,changed:changed,
        deterministic:deterministic,restores:restores,noops:noops,persistence:persistence,
        identity:rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter(),catalogue:catalogue === JSON.stringify(FBDATA),
        failure:FB.ledgerRetention.lastFailure};
    }
  };
})();
