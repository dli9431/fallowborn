// Browser-only instrumentation: no counters or frozen views enter game state.
(function () {
  'use strict';
  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze(value[key]); });
    return Object.freeze(value);
  }
  function canonical(value) {
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + canonical(value[key]);
    }).join(',') + '}';
  }
  window.snapshotProbe = {
    canonical:canonical,
    copy:function (value) { return JSON.parse(JSON.stringify(value)); },
    run:function (reference, action) {
      var S=FB.save, snapshot=S._validationSnapshot, expand=S.expandedSnapshot,
        register=S._registerValidationAlias, stringify=JSON.stringify, parse=JSON.parse,
        validators=[], expanding=false, requesting=false, views=[], stats={requests:0,builds:0,eligibleBuilds:0,stringifies:0,parses:0,
          aliases:[],visits:[],raw:true,equivalent:true}, result, error=null;
      Object.keys(FB.state && FB.state.stories || {}).forEach(function (id) {
        var story=FB.stories.get(id), validate=story.validate;
        if (typeof validate !== 'function') return;
        validators.push({story:story,validate:validate});
        story.validate=function (record,state) {
          stats.visits.push([id,stringify(record)]);
          stats.raw=stats.raw && record===state.stories[id] && !Object.isFrozen(record);
          return validate.apply(this,arguments);
        };
      });
      JSON.stringify=function () {
        if (expanding) stats.stringifies++;
        return stringify.apply(JSON,arguments);
      };
      JSON.parse=function () {
        if (expanding) stats.parses++;
        return parse.apply(JSON,arguments);
      };
      S.expandedSnapshot=function (state) {
        stats.builds++;
        if (requesting) stats.eligibleBuilds++;
        var view;
        expanding=true;
        try { view=(reference ? snapshotReference : expand)(state); }
        finally { expanding=false; }
        return requesting ? freeze(view) : view;
      };
      S._registerValidationAlias=function (raw,partial) {
        var changed=['chars','realms','buildings'].filter(function (key) {return raw[key]!==partial[key];});
        stats.aliases.push(changed.join(','));
        stats.equivalent=stats.equivalent && canonical(snapshotReference(raw))===canonical(snapshotReference(partial));
        return register(raw,partial);
      };
      S._validationSnapshot=function (state) {
        stats.requests++;
        var view;
        requesting=true;
        try { view=reference ? S.expandedSnapshot(state) : snapshot(state); }
        finally { requesting=false; }
        if (views.indexOf(view)<0) views.push(view);
        stats.equivalent=stats.equivalent && canonical(view)===canonical(snapshotReference(state));
        return view;
      };
      try { result=action(); } catch (e) { error=e.message; }
      finally {
        S._validationSnapshot=snapshot; S.expandedSnapshot=expand; S._registerValidationAlias=register;
        JSON.stringify=stringify; JSON.parse=parse;
        validators.forEach(function (row) { row.story.validate=row.validate; });
      }
      stats.views=views.length;
      return {stats:stats,result:result,error:error};
    }
  };
})();
