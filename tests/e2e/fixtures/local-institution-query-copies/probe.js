/* Browser-only bounded seasonal comparison and transient copy counters. */
(function () {
  'use strict';
  var H = window.INSTITUTION_COPIES = {};
  H.copy = function (v) { return JSON.parse(JSON.stringify(v)); };
  H.stageTurn = function (s, turn) { s.date = FB.dateAtTurn(s, turn); s.turn = turn; };
  H.pair = function (input, options) {
    options = options || {};
    var rng = FB.getRngState(), uid = FB.getUidCounter(), data = JSON.stringify(FBDATA);
    var callbacks = ['religiousInstitutionCompact','religiousInstitutionAI','religiousActivityAI'];
    var outputs = [], counts = [];
    [FB.referenceLocalInstitutionsSeason, FB.localInstitutionsSeason].forEach(function (run) {
      var s = H.copy(input), saved = {}, trace = [], depth = 0, inCallback = 0, measuring = true;
      if (options.callbacks === 'create') s.localInstitutions = {};
      var n = { lists:0, copies:0, callbackLists:0, callbackCopies:0, items:[] };
      FB.state = s; FB.setRngState(rng); FB.setUidCounter(uid); FB.rebuildRulerIndex(s);
      function wrap(name, fn) { saved[name] = FB[name]; FB[name] = fn; }
      callbacks.forEach(function (name, index) {
        var original = FB[name];
        wrap(name, function () {
          trace.push([name, s.localInstitutionPeriod === undefined ? null : s.localInstitutionPeriod]);
          inCallback++;
          try {
            if (options.callbacks === 'create' && index === 2) s.localInstitutions = H.copy(input.localInstitutions);
            if (options.callbacks === 'remove' && index === 2) delete s.localInstitutions;
            if (!options.callbacks && original) return original.apply(this, arguments);
          } finally { inCallback--; }
        });
      });
      ['ensureLocalInstitutions','localInstitutionSettle','localInstitutionMediate'].forEach(function (name) {
        var original = FB[name];
        wrap(name, function (state, id) {
          trace.push([name, state.localInstitutionPeriod, id || null]);
          return original.apply(this, arguments);
        });
      });
      var list = FB.localInstitutionList;
      wrap('localInstitutionList', function () {
        if (!measuring) return list.apply(this, arguments);
        n[inCallback ? 'callbackLists' : 'lists']++;
        depth++;
        try {
          var result = list.apply(this, arguments);
          if (!inCallback) n.items.push(result.length);
          return result;
        } finally { depth--; }
      });
      window.localInstitutionCopyProbe = function () {
        if (depth) n[inCallback ? 'callbackCopies' : 'copies']++;
      };
      try {
        run(s);
        measuring = false;
        delete window.localInstitutionCopyProbe;
        // Capture both the complete live graph and the actual save envelope.
        // Serialization may prune chronicle entries, identically on both sides.
        var live = JSON.stringify(s), save = FB.save.serialize();
        outputs.push(JSON.stringify({live:live, save:save, after:JSON.stringify(s), trace:trace,
          rng:FB.getRngState() >>> 0, uid:FB.getUidCounter(), signature:FB.mods.sig(),
          fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s))}));
        counts.push(n);
      } finally {
        Object.keys(saved).forEach(function (name) { FB[name] = saved[name]; });
        delete window.localInstitutionCopyProbe;
      }
    });
    if (outputs[0] !== outputs[1]) throw new Error('Seasonal state, save, callbacks or settlement differ');
    if (data !== JSON.stringify(FBDATA)) throw new Error('Seasonal read mutated installed data');
    if (counts[0].callbackLists !== counts[1].callbackLists || counts[0].callbackCopies !== counts[1].callbackCopies)
      throw new Error('Religious callback queries changed');
    return { reference:counts[0], candidate:counts[1], period:FB.state.localInstitutionPeriod,
      settlements:FB.state.localInstitutions && Object.keys(FB.state.localInstitutions).filter(function (id) {
        return FB.state.localInstitutions[id].history.length;
      }).length };
  };
})();
