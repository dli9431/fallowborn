/* Trusted source adapters share a private authoring view. Engine consumers see
   only complete, canonically accepted worlds at main's publication boundary. */
(function () {
  'use strict';
  var C = FB.bookmarkSources = {}, view = null, active = null, frozen = null;
  var published = null, publishedData = null, bodies = Object.create(null), seen = Object.create(null);
  var foundationSnapshot = null;
  var faults = [], origins = Object.create(null), starts = Object.create(null), graphs = Object.create(null);
  var ownership = Object.create(null), orders = null, declared = [];
  var usedGraphs = Object.create(null), catalogUses = Object.create(null);
  var publishing = false, setup = null, setupFaults = Object.create(null);
  var retainedTransitions = [];
  /* Per-date source loading. Every contributor is recorded at its original
     document position. Boot runs the eager subset exactly as before; a later
     date load replays all recorded contributors from the pristine authoring
     root in that same order (see data/bookmark_manifest.js). */
  var manifest = null, files = Object.create(null), fileOrder = [], manifestFaults = [];
  var recorded = [], sequence = 0, pristine = null, stageProduced = Object.create(null);
  var replaying = false, deltaPrimary = -1, lastStagePrimary = -1, finishBase = null, lastSandbox = null;
  var loadQueue = [], batch = null, batchSerial = 0, publicFaults = [];
  // File load states and recorded public-foundation delta kinds.
  var PENDING = 0, LOADING = 1, FETCHED = 2, MISSING = 3, LOADED = 4;
  var WHOLE_ROOT = 1, LIST_ROW = 2, TABLE_ENTRY = 3;
  function normalPath(value) { return String(value || '').split(/[?#]/)[0]; }
  function scriptIndex(element) {
    var index = element ? Array.prototype.indexOf.call(document.scripts, element) : -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  }
  function documentScript(path) {
    return Array.prototype.filter.call(document.scripts, function (script) {
      var url = normalPath(script.src);
      return !!url && !script.hasAttribute('data-bookmark-source') && url.slice(-path.length - 1) === '/' + path;
    })[0] || null;
  }
  function record(row) { row.seq = sequence++; recorded.push(row); return row; }
  // A declared date absent from this candidate (not loaded, or withheld) is
  // a bare identity reference {id}. Bookmark-scoped shared declarations are
  // reviewed with that date itself, never against this placeholder. Detached
  // candidates copy their tables, so the placeholder is recognized by shape.
  function reference(id) { return {id:id}; }
  C.unreviewedReference = function (world) {
    if (!world || typeof world !== 'object' || Array.isArray(world) || Object.keys(world).length !== 1 ||
        typeof world.id !== 'string' || declared.indexOf(world.id) < 0) return false;
    return !C.dateLoaded(world.id) || !frozen || !own(frozen.bookmarks,world.id);
  };
  function compareRows(a, b) { return a.primary - b.primary || a.secondary - b.secondary || a.seq - b.seq; }
  function copyTransition(value) {
    var count = 0, units = 0, parents = [];
    function clone(row,depth) {
      if (++count > 250000 || depth > 64) throw new Error('Retained catalogue declaration exceeds its data limits.');
      if (typeof row === 'string') units += row.length;
      if (units > 4194304) throw new Error('Retained catalogue declaration exceeds its text limit.');
      if (row === null || typeof row === 'string' || typeof row === 'boolean' || typeof row === 'number' && isFinite(row)) return row;
      if (!row || typeof row !== 'object' ||
          !Array.isArray(row) && Object.getPrototypeOf(row) !== Object.prototype && Object.getPrototypeOf(row) !== null ||
          parents.indexOf(row) >= 0 || Object.getOwnPropertySymbols && Object.getOwnPropertySymbols(row).length)
        throw new Error('Retained catalogue declarations require plain JSON data.');
      parents.push(row);
      var result = Array.isArray(row) ? [] : {};
      Object.getOwnPropertyNames(row).forEach(function (key) {
        if (Array.isArray(row) && key === 'length') return;
        var field = Object.getOwnPropertyDescriptor(row,key);
        if (key === '__proto__' || !field.enumerable || !own(field,'value')) throw new Error('Retained catalogue declarations require plain JSON data.');
        units += key.length; result[key] = clone(field.value,depth + 1);
      });
      if (Array.isArray(row) && (Object.keys(row).length !== row.length || Object.keys(row).some(function (key) {
        return !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= row.length;
      }))) throw new Error('Retained catalogue declarations require dense arrays.');
      parents.pop(); return result;
    }
    return clone(value,0);
  }
  // Native source metadata survives selected-date publication, but is never a
  // public data root, mod input, campaign record or executable restore hook.
  C.retainCatalogueTransition = function (definition) {
    if (frozen) throw new Error('Retained catalogue declarations are sealed.');
    if (retainedTransitions.length >= 8) throw new Error('Too many retained catalogue declarations.');
    retainedTransitions.push(copyTransition(definition));
  };
  C.retainedCatalogueTransitions = function () { return retainedTransitions.map(copyTransition); };
  C.hasRetainedCatalogueTransitions = function () { return retainedTransitions.length > 0; };
  var catalogs = ['geographies','cultures','cultureDoctrineDefaults','religions','governmentForms','legalTraditions',
    'settlementSites','settlementLayouts','administrationProfiles','aristocraticProfiles',
    'civicProfiles','constituencyProfiles','ecclesiasticalProfiles','mobileProfiles',
    'religiousInstitutionProfiles','religiousActivities','religiousPatronage'];
  var legacyRoots = ['provinces','realms','duchies','kingdoms','empires','straits','scripted','crossingClasses'];
  var protectedRoots = catalogs.concat(['bookmarks','startScenarios','storyInstances'],legacyRoots);
  // Capture synchronous authoring work that runs before main's load profiler.
  // This is local-only and consumed once at menu boot, never a content cache.
  var timing = null, timingRestores = [];
  var localTiming = window.location.protocol === 'file:' ||
    ((window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
      /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(window.location.hostname));
  if (localTiming && (window.FB_LOAD_TIMING === true || /(?:^|[?&])loadTiming=1(?:&|$)/.test(window.location.search)))
    timing = {rows:Object.create(null),stack:[],workMs:0};
  function startupMeasure(label,work,receiver,args) {
    if (!timing) return work.apply(receiver,args || []);
    var entry = {started:performance.now(),children:0};
    timing.stack.push(entry);
    try { return work.apply(receiver,args || []); }
    finally {
      var elapsed = performance.now() - entry.started;
      timing.stack.pop();
      if (timing.stack.length) timing.stack[timing.stack.length - 1].children += elapsed;
      else timing.workMs += elapsed;
      var row = timing.rows[label] || (timing.rows[label] = {label:label,calls:0,totalMs:0,selfMs:0,maxMs:0});
      row.calls++; row.totalMs += elapsed; row.selfMs += Math.max(0,elapsed - entry.children);
      row.maxMs = Math.max(row.maxMs,elapsed);
    }
  }
  C.takeStartupTiming = function () {
    var result = timing;
    timingRestores.forEach(function (restore) { restore(); });
    timingRestores = []; timing = null;
    return result;
  };
  function own(o,k) { return !!o && Object.prototype.hasOwnProperty.call(o,k); }
  function copy(o) {
    var memo = new WeakMap();
    function clone(row) {
      if (!row || typeof row !== 'object') return row;
      if (memo.has(row)) return memo.get(row);
      var result = Array.isArray(row) ? [] : {};
      memo.set(row,result);
      Object.keys(row).forEach(function (key) { result[key] = clone(row[key]); });
      FB.contentValues.copied(row,result);
      return result;
    }
    return clone(o);
  }
  function list(o) { return Array.isArray(o) ? o : []; }
  function canonical(o) {
    return FB.contentValues.canonical(o);
  }
  function error(source,ids,message) {
    faults.push({source:source,bookmarks:ids.slice(),message:message});
    if (published && FB.recordBookmarkRuntimeFaults) ids.forEach(function (id) { FB.recordBookmarkRuntimeFaults('world_definition',{id:id},null,[message],source); });
  }
  function sameValue(a,b) { return a === b || a !== a && b !== b; }
  // Keep the public graph's property values, not a second mutable authoring
  // view. Inspect each shared object once, including aliases between roots.
  // Unchanged strings and numbers need no JSON conversion on the next stage.
  function captureFoundations(roots) {
    var objects = [], visited = new WeakSet(), supported = true;
    function visit(value) {
      if (typeof value === 'function') { supported = false; return; }
      if (!value || typeof value !== 'object' || visited.has(value) || !supported) return;
      visited.add(value);
      var array = Array.isArray(value), proto = Object.getPrototypeOf(value);
      if ((array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) ||
          typeof value.toJSON === 'function') { supported = false; return; }
      var keys = array ? null : Object.keys(value), count = array ? value.length : keys.length;
      var row = {object:value,proto:proto,keys:keys,values:[]};
      objects.push(row);
      for (var i = 0; i < count; i++) {
        var key = array ? i : keys[i], field = Object.getOwnPropertyDescriptor(value,key);
        // Sparse arrays, accessors and custom JSON objects retain the ordinary
        // serialization path. Native declarations are dense, plain data.
        if (!field || !own(field,'value')) { supported = false; return; }
        row.values.push(field.value); visit(field.value);
      }
    }
    var values = roots.map(function (root) {
      var field = Object.getOwnPropertyDescriptor(FBDATA,root);
      if (!field || !own(field,'value')) { supported = false; return null; }
      visit(field.value); return field.value;
    });
    return supported ? {data:FBDATA,roots:roots,values:values,objects:objects} : null;
  }
  function foundationsUnchanged(roots) {
    var snapshot = foundationSnapshot;
    if (!snapshot || snapshot.data !== FBDATA || roots.length !== snapshot.roots.length) return false;
    for (var i = 0; i < roots.length; i++) {
      if (roots[i] !== snapshot.roots[i] || !sameValue(FBDATA[roots[i]],snapshot.values[i])) return false;
    }
    for (var n = 0; n < snapshot.objects.length; n++) {
      var row = snapshot.objects[n], object = row.object;
      if (Object.getPrototypeOf(object) !== row.proto || typeof object.toJSON === 'function') return false;
      if (!row.keys) {
        if (object.length !== row.values.length) return false;
        for (var j = 0; j < row.values.length; j++) if (!sameValue(object[j],row.values[j])) return false;
      } else {
        var keys = Object.keys(object);
        if (keys.length !== row.keys.length) return false;
        for (var k = 0; k < keys.length; k++) {
          if (keys[k] !== row.keys[k] || !sameValue(object[keys[k]],row.values[k])) return false;
        }
      }
    }
    return true;
  }
  // Public foundation changes observed between eager contributors are kept
  // as ordered deltas, so a replay sees them at the same contributor.
  function recordDelta(row) {
    row.primary = deltaPrimary; row.secondary = 0; row.boot = true;
    record(row);
    // A lazily loaded run that sits after eager scripts in this interval
    // could have preceded the change; its order would be ambiguous.
    fileOrder.forEach(function (path) {
      var file = files[path];
      if (file.secondary !== 1 || !(file.primary > lastStagePrimary && file.primary < deltaPrimary)) return;
      manifestFaults.push({source:'data/bookmark_manifest.js',bookmarks:file.runDates.slice(),
        message:'Public foundation ' + row.root + ' changed between ' + file.after + ' and the next eager contributor; lazily loaded sources cannot be ordered against it.'});
    });
  }
  function syncFoundations(roots,initial) {
    roots.forEach(function (root) {
      var text = JSON.stringify(FBDATA[root]);
      if (!own(seen,root)) {
        if (!initial) {
          view[root] = copy(FBDATA[root]);
          recordDelta({delta:WHOLE_ROOT,root:root,value:copy(FBDATA[root])});
        }
        seen[root] = text;
        if (root === 'startScenarios') view[root].forEach(function (row) { if (row && row.id) starts[row.id] = 'data/starts.js'; });
      }
      else if (seen[root] !== text) {
        // Only unconverted shared foundations can write the public side while
        // sources load. Preserve private additions while observing new rows.
        var prior = JSON.parse(seen[root]);
        if (Array.isArray(FBDATA[root])) {
          FBDATA[root].forEach(function (row) {
            if (!row || !row.id || prior.some(function (old) { return old && old.id === row.id && JSON.stringify(old) === JSON.stringify(row); })) return;
            view[root] = view[root].filter(function (old) { return !old || old.id !== row.id; }); view[root].push(copy(row));
            recordDelta({delta:LIST_ROW,root:root,value:copy(row)});
          });
        } else Object.keys(FBDATA[root] || {}).forEach(function (id) {
          if (!own(prior,id) || JSON.stringify(prior[id]) !== JSON.stringify(FBDATA[root][id])) {
            view[root][id] = copy(FBDATA[root][id]);
            recordDelta({delta:TABLE_ENTRY,root:root,id:id,value:copy(FBDATA[root][id])});
          }
        });
        seen[root] = text;
      }
    });
  }
  function refresh() {
    var initial = !view, roots = [];
    // The pristine root is the authoring view's starting point for replays.
    if (initial) { view = copy(FBDATA); pristine = copy(view); }
    Object.keys(FBDATA).forEach(function (root) {
      if (protectedRoots.indexOf(root) < 0) { if (!initial) view[root] = FBDATA[root]; }
      else roots.push(root);
    });
    if (initial || !foundationsUnchanged(roots)) {
      syncFoundations(roots,initial);
      foundationSnapshot = captureFoundations(roots);
    }
    protectedRoots.forEach(function (root) {
      if (legacyRoots.indexOf(root) < 0 && !own(view,root)) view[root] = root === 'startScenarios' ? [] : {};
    });
  }
  function stamp(table) {
    var result = Object.create(null);
    Object.keys(table || {}).forEach(function (id) { result[id] = JSON.stringify(table[id]); });
    return result;
  }
  C.current = function () { return active; };
  C.inspect = function () {
    var source = frozen || view || FBDATA;
    return {starts:list(source.startScenarios).map(function (row) { return row && row.id; }),bookmarks:Object.keys(source.bookmarks || {})};
  };
  C.matches = function (row,id,era) {
    return !!row && (row.bookmarkIds === undefined || Array.isArray(row.bookmarkIds) && row.bookmarkIds.indexOf(id) >= 0) &&
      (row.eras === undefined || Array.isArray(row.eras) && row.eras.indexOf(era) >= 0);
  };
  // The script element a lazily injected contributor is running from.
  function lazyFile() {
    var script = document.currentScript, path = script && script.getAttribute && script.getAttribute('data-bookmark-source');
    var file = path && own(files,path) ? files[path] : null;
    return file && batch && file.state === LOADING && batch.paths.indexOf(path) >= 0 ? file : null;
  }
  C.stage = function (spec,fn) {
    if (!spec || typeof spec.source !== 'string' || !Array.isArray(spec.bookmarks) || typeof fn !== 'function')
      throw new Error('Invalid trusted source adapter.');
    (spec.catalogs || []).forEach(function (root) { if (catalogs.indexOf(root) < 0) throw new Error('Unknown source catalogue: ' + root); });
    if (frozen) {
      var file = lazyFile();
      // A manifest date's contributor records its declaration for the replay.
      if (file) { bodies[spec.source] = String(fn); record({primary:file.primary,secondary:file.secondary,spec:spec,fn:fn,batch:batch.id}); return; }
      if (bodies[spec.source] !== String(fn)) error(spec.source,spec.bookmarks,'Source authoring is sealed; reload changed declarations.');
      return;
    }
    deltaPrimary = scriptIndex(document.currentScript);
    refresh(); bodies[spec.source] = String(fn);
    record({primary:deltaPrimary,secondary:0,spec:spec,fn:fn,boot:true});
    lastStagePrimary = deltaPrimary;
    author(spec,fn);
  };
  function author(spec,fn) {
    var before = {}, roots = spec.catalogs || [];
    roots.forEach(function (root) { before[root] = stamp(view[root]); });
    var priorStarts = view.startScenarios, priorStories = view.storyInstances;
    var priorWorlds = Object.assign({},view.bookmarks), priorRoots = Object.create(null);
    Object.keys(view).forEach(function (root) { if (protectedRoots.indexOf(root) < 0) priorRoots[root] = view[root]; });
    var oldWorlds = Object.keys(view.bookmarks), previous = active, previousSource = C.source; active = view; C.source = spec.source;
    try { fn(view); } catch (e) { error(spec.source,spec.bookmarks,e.message); }
    finally { active = previous; C.source = previousSource; }
    if (!Array.isArray(view.startScenarios)) { error(spec.source,spec.bookmarks,'Source start catalogue must be a list.'); view.startScenarios = priorStarts; }
    if (!view.storyInstances || typeof view.storyInstances !== 'object' || Array.isArray(view.storyInstances)) {
      error(spec.source,spec.bookmarks,'Source story catalogue must be a map.'); view.storyInstances = priorStories;
    }
    if (!view.bookmarks || typeof view.bookmarks !== 'object' || Array.isArray(view.bookmarks)) {
      error(spec.source,spec.bookmarks,'Source world catalogue must be a map.'); view.bookmarks = priorWorlds;
    }
    Object.keys(priorWorlds).forEach(function (id) { if (!own(view.bookmarks,id) && spec.bookmarks.indexOf(id) < 0) view.bookmarks[id] = priorWorlds[id]; });
    Object.keys(view.bookmarks).forEach(function (id) { if (!origins[id]) origins[id] = oldWorlds.indexOf(id) < 0 ? spec.source : 'data/bookmarks.js'; });
    roots.forEach(function (root) {
      ownership[root] = ownership[root] || Object.create(null);
      if (root === 'legalTraditions') Object.keys(before[root]).forEach(function (id) {
        if (canonical(JSON.parse(before[root][id])) === canonical(view[root] && view[root][id])) return;
        error(spec.source,spec.bookmarks,'Conflicting trusted shared declaration: ' + root + '.' + id);
        view[root] = view[root] || {};
        view[root][id] = JSON.parse(before[root][id]);
      });
      Object.keys(view[root] || {}).forEach(function (id) {
        if (before[root][id] === JSON.stringify(view[root][id])) return;
        var owners = (spec.shared || []).indexOf(root) >= 0 ? [] : spec.bookmarks;
        var prior = ownership[root][id] || [];
        ownership[root][id] = prior.concat(owners.filter(function (owner) { return prior.indexOf(owner) < 0; }));
      });
    });
    view.startScenarios.forEach(function (row) { if (row && row.id && !starts[row.id]) starts[row.id] = spec.source; });
    Object.keys(view.storyInstances).forEach(function (id) {
      if (!graphs[id]) graphs[id] = spec.source;
    });
    // Source tables remain inspectable authoring metadata. Protected runtime
    // roots never cross this seam during data loading. A replay keeps its
    // unprotected roots private until publishSandbox merges the difference.
    Object.keys(view).forEach(function (root) {
      if (protectedRoots.indexOf(root) >= 0) return;
      if (!own(priorRoots,root) || priorRoots[root] !== view[root]) stageProduced[root] = true;
      if (!replaying) FBDATA[root] = view[root];
    });
  }
  C.scope = function (id,fn) {
    try { return fn(); }
    catch (e) { error(C.source || 'trusted source',[id],e.message); }
  };
  C.finish = function (ids) {
    if (frozen) return;
    deltaPrimary = scriptIndex(document.currentScript);
    refresh(); seal(ids);
    // Manifest files present in the document already ran in place.
    fileOrder.forEach(function (path) { if (documentScript(path)) { files[path].state = LOADED; files[path].boot = true; } });
    validateManifest();
  };
  function seal(ids) {
    declared = ids.slice();
    frozen = copy(view); orders = FB.bookmarkCompositions.sourceOrder(frozen);
    Object.keys(frozen.bookmarkCompositionSources || {}).forEach(function (owner) {
      var row = frozen.bookmarkCompositionSources[owner], input = row.input;
      if (!input) return;
      Object.keys(input.catalogs || {}).forEach(function (root) {
        if (catalogs.indexOf(root) < 0) return;
        frozen[root] = frozen[root] || {}; ownership[root] = ownership[root] || Object.create(null);
        Object.keys(input.catalogs[root] || {}).forEach(function (id) {
          var value = input.catalogs[root][id], old = frozen[root][id];
          var same = canonical(old) === canonical(value);
          if (old && !same && root === 'settlementSites') same = Object.keys(value).every(function (key) { return canonical(old[key]) === canonical(value[key]); });
          if (old && !same) { error(row.source,[row.bookmarkId],'Conflicting trusted shared declaration: ' + root + '.' + id); return; }
          if (!old) frozen[root][id] = copy(value);
          ownership[root][id] = (ownership[root][id] || []).concat([row.bookmarkId]);
        });
      });
      Object.keys(input.availability || {}).forEach(function (id) {
        var patch = input.availability[id], faith = frozen.religions[id], ownId = input.bookmark.id;
        var ids = faith && faith.availability && faith.availability.bookmarkIds;
        if (!Array.isArray(ids) || ids.indexOf(ownId) >= 0) return;
        var at = ids.length;
        if (Array.isArray(patch.afterBookmarkIds)) {
          at = 0; patch.afterBookmarkIds.forEach(function (ref) { var index = ids.indexOf(ref); if (index >= 0) at = Math.max(at,index + 1); });
        } else if (own(patch,'afterBookmarkId')) at = patch.afterBookmarkId === null ? 0 : ids.indexOf(patch.afterBookmarkId) + 1;
        ids.splice(at,0,ownId);
      });
    });
    // A replay starts again from the foundations present before the first seal.
    if (!finishBase) {
      finishBase = Object.create(null);
      catalogs.forEach(function (root) { finishBase[root] = FBDATA[root]; });
    }
    catalogs.forEach(function (root) {
      var shared = Object.assign({},finishBase[root]);
      Object.keys(frozen[root] || {}).forEach(function (id) {
        if (!ownership[root] || !own(ownership[root],id) || !ownership[root][id].length) shared[id] = copy(frozen[root][id]);
      });
      FBDATA[root] = shared;
    });
    // Existing converted sources participate in the same known-world proof.
    FBDATA.bookmarkCompositionSources = frozen.bookmarkCompositionSources || {};
    view = null; foundationSnapshot = null; seen = Object.create(null);
  }
  C.ready = function () { return !!frozen; };
  /* Display-only projections of the sealed authoring view. Nothing here is
     published or accepted for play; selection still runs the canonical gate. */
  C.menuData = function (mods) {
    var source = frozen || view || FBDATA;
    var worlds = Object.assign(Object.create(null),source.bookmarks), scenarios = Object.create(null), presets = Object.create(null);
    var layouts = Object.assign(Object.create(null),source.settlementLayouts), cultures = Object.assign(Object.create(null),source.cultures);
    var religions = Object.assign(Object.create(null),source.religions), quick = Object.create(null);
    function add(rows,table) { list(rows).forEach(function (row) { if (row && typeof row.id === 'string') table[row.id] = row; }); }
    add(source.startScenarios,scenarios); add(FBDATA.familyPresets,presets); add(FBDATA.quickStarts,quick);
    Object.keys(source.bookmarkCompositionSources || {}).forEach(function (id) {
      var row = source.bookmarkCompositionSources[id], input = row && row.input;
      if (!input || !input.bookmark) return;
      worlds[input.bookmark.id] = input.bookmark;
      list(input.starts).forEach(function (unit) { if (unit && unit.definition) scenarios[unit.definition.id] = unit.definition; });
    });
    // A date whose sources have not loaded is listed from its manifest summary.
    Object.keys(manifest ? manifest.dates : {}).forEach(function (id) {
      if (!C.dateLoaded(id)) worlds[id] = Object.assign({id:id},copy(manifest.dates[id].summary));
    });
    list(mods).forEach(function (mod) {
      if (!mod || typeof mod !== 'object') return;
      if (Array.isArray(mod.bookmarks)) add(mod.bookmarks,worlds);
      else Object.keys(mod.bookmarks || {}).forEach(function (id) {
        if (mod.bookmarks[id] && typeof mod.bookmarks[id] === 'object') worlds[id] = Object.assign({},mod.bookmarks[id],{id:id});
      });
      add(mod.startScenarios,scenarios); add(mod.familyPresets,presets); add(mod.quickStarts,quick);
      Object.assign(layouts,mod.settlementLayouts); Object.assign(cultures,mod.cultures); Object.assign(religions,mod.religions);
    });
    function selected(world) {
      if (!world || typeof world !== 'object') return null;
      if (!world.revisions) return world;
      return Object.assign({},world,world.revisions.baseline,world.revisions[world.revision || 'baseline']);
    }
    function summary(world) {
      return {id:world.id,name:world.name,desc:world.desc,date:copy(world.date),era:world.era};
    }
    var result = {bookmarks:[],quickStarts:[]};
    Object.keys(worlds).forEach(function (id) {
      var world = selected(worlds[id]);
      if (world && world.hidden !== true && world.date && typeof world.date.year === 'number' && isFinite(world.date.year)) result.bookmarks.push(summary(world));
    });
    result.bookmarks.sort(function (a,b) { return a.date.year - b.date.year || a.date.season - b.date.season; });
    Object.keys(quick).forEach(function (id) {
      var definition = quick[id], world = selected(worlds[definition.bookmarkId]);
      var scenario = scenarios[definition.scenarioId], preset = presets[definition.familyPreset];
      if (!world || world.hidden === true || !world.date || !scenario || !preset ||
          typeof definition.characterName !== 'string' || (definition.sex !== 'm' && definition.sex !== 'f') ||
          !C.matches(scenario,world.id,world.era)) return;
      if (scenario.hidden && !FBDATA.reviewOpenStarts ||
          !scenario.alwaysUnlocked && !FBDATA.reviewOpenStarts && FB.startProgression &&
          !FB.startProgression.isTierUnlocked(scenario.tier)) return;
      if (scenario.familyPresets && !own(scenario.familyPresets,preset.id)) return;
      var province = list(world.provinces).find(function (row) { return row && row.id === definition.provinceId; });
      if (!province || province.wasteland) return;
      var layout = layouts[world.settlementLayout === undefined ? world.id : world.settlementLayout];
      var sites = province.settlements || layout && layout[province.id] || [];
      var index = list(sites).findIndex(function (row) { return row && row.site === definition.settlementSite; });
      if (index < 0) return;
      result.quickStarts.push({definition:copy(definition),details:{bookmark:summary(world),
        scenario:{tier:scenario.tier,profession:scenario.profession,startAge:scenario.startAge},preset:{age:preset.age},
        province:{id:province.id,name:province.name},settlement:{site:sites[index].site,name:sites[index].name},settlementIdx:index,
        community:{culture:definition.culture,religion:definition.religion},
        culture:{name:(cultures[definition.culture] || {}).name || definition.culture},
        religion:{name:(religions[definition.religion] || {}).name || definition.religion}}});
    });
    return result;
  };
  function graphClosure(ids,table) {
    var result = {}, visiting = Object.create(null);
    function visit(id) {
      if (own(result,id) || visiting[id] || !own(table,id)) return;
      visiting[id] = true; var row = table[id];
      list(row && row.requires).forEach(visit);
      [row && row.registrationBefore,row && row.registrationAfter].forEach(function (ref) { if (typeof ref === 'string') visit(ref); });
      if (row && row.type === 'household_refuge') list(row.partyIds).concat(list(row.threatIds)).forEach(visit);
      result[id] = copy(row); delete visiting[id];
    }
    ids.forEach(visit); return result;
  }
  function layers(world) { return [world].concat(Object.keys(world.revisions || {}).map(function (id) { return world.revisions[id]; })).filter(function (row) { return row && typeof row === 'object'; }); }
  function bind(layer,original,id) {
    var row = {};
    if (!original || typeof original !== 'object' || !layer || typeof layer !== 'object') return row;
    if (Array.isArray(original.starts)) {
      var index = original.starts.indexOf(id); row.offered = index >= 0;
      if (index >= 0) row.after = original.starts.slice(0,index);
      layer.starts = layer.starts.filter(function (ref) { return ref !== id; });
    }
    if (own(original.startLocations,id)) { row.locations = copy(original.startLocations[id]); delete layer.startLocations[id]; }
    if (original.startTrackOverrides && own(original.startTrackOverrides.entries,id)) {
      row.trackOverride = copy(original.startTrackOverrides.entries[id]);
      delete layer.startTrackOverrides.entries[id];
      if (!Object.keys(layer.startTrackOverrides.entries).length) delete layer.startTrackOverrides;
    }
    return row;
  }
  function catalogsFor(spec,id,source) {
    var result = spec.catalogs || {}, visited = Object.create(null);
    var profiles = ['administrationProfiles','aristocraticProfiles','civicProfiles','constituencyProfiles',
      'ecclesiasticalProfiles','mobileProfiles','religiousInstitutionProfiles'];
    function need(root,key) {
      if (typeof key !== 'string' || !own(source[root],key)) return;
      var token = root + '/' + key;
      if (visited[token]) return;
      visited[token] = true;
      catalogUses[root] = catalogUses[root] || Object.create(null);
      var users = catalogUses[root][key] = catalogUses[root][key] || [];
      if (users.indexOf(id) < 0) users.push(id);
      var value = own(result[root],key) ? result[root][key] : source[root][key];
      if (!own(result[root],key) && (!own(FBDATA[root],key) || canonical(FBDATA[root][key]) !== canonical(value))) {
        result[root] = result[root] || {}; result[root][key] = copy(value);
      }
      walk(value,root);
      if (root === 'cultures') {
        need(root,value && value.parent); need('cultureDoctrineDefaults',key);
      } else if (root === 'religions') {
        need(root,value && value.parent);
        need('legalTraditions',value && value.properties && value.properties.legalTradition);
      }
      else if (root === 'governmentForms') law(value && value.legalTradition,true);
      else if (root === 'geographies') need(root,value && value.extends);
      else if (root === 'legalTraditions' && value && value.jurisdiction) {
        var jurisdiction = value.jurisdiction;
        need(root,jurisdiction.mixed); need(root,jurisdiction.assessor);
        Object.keys(jurisdiction.cultures || {}).forEach(function (culture) {
          need('cultures',culture); need(root,jurisdiction.cultures[culture]);
        });
      }
    }
    function names(root,value) { list(value).forEach(function (key) { need(root,key); }); }
    function law(value,delegate) {
      if (typeof value === 'string') { if (!delegate || value !== 'faith') need('legalTraditions',value); return; }
      if (!value || typeof value !== 'object') return;
      law(value.default,delegate);
      ['cultures','realms'].forEach(function (selector) {
        Object.keys(value[selector] || {}).forEach(function (key) {
          if (selector === 'cultures') need('cultures',key);
          need('legalTraditions',value[selector][key]);
        });
      });
    }
    function walk(value,kind) {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(function (row) { walk(row,kind); }); return; }
      Object.keys(value).forEach(function (key) {
        var item = value[key];
        if (['culture','cultureId','startCulture','defaultCulture'].indexOf(key) >= 0) need('cultures',item);
        else if (key === 'cultures') names('cultures',item);
        else if (['religion','religionId','faithId','startReligion'].indexOf(key) >= 0) need('religions',item);
        else if (key === 'faithIds' || key === 'religions') names('religions',item);
        else if (key === 'religiousHeads' && item) Object.keys(item).forEach(function (faith) { need('religions',faith); });
        else if (key === 'geography') need('geographies',item);
        else if (key === 'settlementLayout' || key === 'defaultLayout') need('settlementLayouts',item);
        else if (key === 'site' || key === 'siteId') need('settlementSites',item);
        else if (key === 'government' || key === 'governmentForm' || key === 'settlementForm') need('governmentForms',item);
        else if (key === 'governingIdentity' && item) {
          need('legalTraditions',item.legalIdentityId);
          need('cultures',item.eliteCultureId); need('religions',item.eliteFaithId);
        }
        else if (key === 'constituency') need('constituencyProfiles',item);
        else if (key === 'homeAuthorityPolicies' && item) Object.keys(item).forEach(function (form) { need('governmentForms',form); });
        else if (key === 'profileId' || key === 'profile' || /ProfileId$/.test(key)) profiles.forEach(function (root) { need(root,item); });
        else if (key === 'activityId') need('religiousActivities',item);
        else if (key === 'activityIds' || key === 'activities') names('religiousActivities',item);
        else if (key === 'patronageIds' || key === 'patronage') names('religiousPatronage',item);
        // Selector ids are permissions, never catalogue dependencies. In
        // particular a faith's bookmarkIds must not pull unrelated layouts.
        if (key !== 'availability' && key !== 'openings') walk(item,kind);
      });
    }
    Object.keys(result).forEach(function (root) {
      if (catalogs.indexOf(root) >= 0) Object.keys(result[root]).forEach(function (key) { need(root,key); });
    });
    // These shared catalogues are validated for every candidate. Their typed
    // identity references remain dependencies even outside the owning date.
    ['religiousAffiliations','religiousInstitutionProfiles','religiousActivities','religiousPatronage'].forEach(function (root) {
      walk(FBDATA[root]);
    });
    names('religions',FBDATA.rulerFaithTargets);
    Object.keys(FBDATA.legalTraditions || {}).forEach(function (key) { need('legalTraditions',key); });
    Object.keys(FBDATA.governmentForms || {}).forEach(function (key) {
      law(FBDATA.governmentForms[key] && FBDATA.governmentForms[key].legalTradition,true);
    });
    law(FBDATA.faithDefaults && FBDATA.faithDefaults.legalTradition);
    law(FBDATA.authoringDefaults && FBDATA.authoringDefaults.intrigueLaw);
    // Starting any campaign validates the whole event catalogue, including
    // events authored for other dates, so the community identities those
    // events name remain dependencies of every date.
    function events(value) {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(events); return; }
      if (value.community && typeof value.community === 'object')
        walk({cultureId:value.community.culture,faithId:value.community.religion});
      Object.keys(value).forEach(function (key) {
        var item = value[key], probe = {};
        if (key === 'countyCulture' || key === 'settlementCulture') walk({cultureId:item});
        else if (key === 'countyFaith' || key === 'settlementFaith') walk({faithId:item});
        else if (key === 'countyCommunityShare' && item && typeof item.kind === 'string') {
          probe[item.kind + 'Id'] = item.target; walk(probe);
        }
        events(item);
      });
    }
    events(FBDATA.events);
    walk(spec.bookmark);
    spec.starts.forEach(function (unit) { walk(unit.definition); walk(unit.bindings); walk(unit.storyInstances); });
    walk(result.storyInstances);
    FB.bookmarkRevisions(id,spec.bookmark).forEach(function (world) {
      need('geographies',FB.bookmarkGeography(world));
      var geography = source.geographies[FB.bookmarkGeography(world)];
      need('settlementLayouts',world.settlementLayout !== undefined ? world.settlementLayout :
        own(source.settlementLayouts,id) ? id : geography && geography.defaultLayout);
    });
    ['religiousActivities','religiousPatronage'].forEach(function (root) {
      Object.keys(source[root] || {}).forEach(function (key) {
        if (list(source[root][key] && source[root][key].openings).some(function (opening) { return opening && opening.id === id; })) need(root,key);
      });
    });
    spec.catalogs = result;
  }
  function prefix(list,id) { var at = list.indexOf(id); return at < 0 ? [] : list.slice(0,at); }
  function inputs(only) {
    var result = [], source = frozen, converted = source.bookmarkCompositionSources || {};
    var convertedIds = Object.keys(converted).map(function (key) { return converted[key].bookmarkId; });
    var allStarts = source.startScenarios, selectorWorlds = Object.assign({},source.bookmarks);
    declared.forEach(function (id) { if (!own(selectorWorlds,id)) selectorWorlds[id] = reference(id); });
    declared.forEach(function (id) {
      if (only !== undefined && id !== only) return;
      if (!C.dateLoaded(id)) { result.push({id:'native_' + id,source:'data/bookmark_manifest.js',bookmarkId:id,faults:[notLoaded(id)]}); return; }
      if (convertedIds.indexOf(id) >= 0) return;
      var original = source.bookmarks[id];
      var entry = {id:'native_' + id,source:origins[id] || 'data/bookmarks.js',bookmarkId:id};
      try {
      var failures = faults.concat(manifestFaults).filter(function (fault) { return fault.bookmarks.indexOf(id) >= 0; });
      if (failures.length || !original) { entry.faults = failures.map(function (fault) { return fault.source + ': ' + fault.message; }); if (!entry.faults.length) entry.faults.push('Missing complete source world.'); result.push(entry); return; }
      if (original.id !== id) throw new Error('Source world id differs from its declared owner.');
      var world = copy(original), mandatory = [];
      layers(original).forEach(function (layer) { mandatory = mandatory.concat(list(layer.stories)); });
      var common = graphClosure(mandatory,source.storyInstances), units = [];
      Object.keys(common).forEach(function (key) { usedGraphs[key] = true; });
      allStarts.forEach(function (definition) {
        if (!definition || typeof definition.id !== 'string') return;
        var selectors = FB.startSelectorReport(definition,original,undefined,{bookmarks:selectorWorlds,eras:source.eras});
        if (!selectors.faults.length && !selectors.matches && !layers(original).some(function (layer) { return Array.isArray(layer.starts) && layer.starts.indexOf(definition.id) >= 0; })) return;
        var unit = {definition:copy(definition),source:starts[definition.id] || 'data/starts.js',after:prefix(orders.starts,definition.id)};
        unit.bindings = {root:bind(world,original,definition.id),revisions:{}};
        Object.keys(world.revisions || {}).forEach(function (revision) { unit.bindings.revisions[revision] = bind(world.revisions[revision],original.revisions[revision],definition.id); });
        var tracks = list(definition.tracks).slice();
        Object.keys(unit.bindings.revisions).map(function (key) { return unit.bindings.revisions[key]; }).concat([unit.bindings.root]).forEach(function (binding) {
          if (binding.trackOverride) tracks = tracks.concat(list(binding.trackOverride.tracks));
        });
        unit.storyInstances = graphClosure(tracks,source.storyInstances);
        Object.keys(unit.storyInstances).forEach(function (key) { usedGraphs[key] = true; });
        Object.keys(common).forEach(function (key) { delete unit.storyInstances[key]; });
        unit.storyAfter = {};
        Object.keys(unit.storyInstances).forEach(function (key) { unit.storyAfter[key] = prefix(orders.stories,key); });
        units.push(unit);
      });
      entry.input = {id:entry.id,source:entry.source,bookmark:world,catalogs:{storyInstances:common},starts:units};
      catalogsFor(entry.input,id,source); result.push(entry);
      } catch (e) { delete entry.input; entry.faults = [e.message]; result.push(entry); }
    });
    Object.keys(converted).forEach(function (key) {
      if (only !== undefined && converted[key].bookmarkId !== only) return;
      var row = copy(converted[key]); row.id = key;
      if (row.input && (row.input.id !== key || !row.input.bookmark || row.input.bookmark.id !== row.bookmarkId)) {
        row.faults = ['Composition source ownership does not match its envelope.']; result.push(row); return;
      }
      if (row.input) {
        catalogsFor(row.input,row.bookmarkId,source);
        Object.keys(row.input.availability || {}).forEach(function (id) {
          row.input.catalogs.religions = row.input.catalogs.religions || {};
          row.input.catalogs.religions[id] = copy(source.religions[id]);
        });
        delete row.input.availability;
      }
      var failures = faults.concat(manifestFaults).filter(function (fault) { return fault.bookmarks.indexOf(row.bookmarkId) >= 0; });
      if (failures.length) row.faults = failures.map(function (fault) { return fault.source + ': ' + fault.message; });
      result.push(row);
    });
    return result;
  }
  function proof(input,known) {
    var base = Object.assign({},FBDATA);
    base.bookmarks = Object.assign({},known); delete base.bookmarks[input.bookmark.id];
    Object.keys(input.catalogs || {}).forEach(function (root) {
      base[root] = Object.assign({},FBDATA[root]);
      Object.keys(input.catalogs[root]).forEach(function (id) { delete base[root][id]; });
    });
    // Core declarations are validated only as explicit units; an unrelated bad
    // start cannot poison another world's final exhaustive authoring proof.
    var owned = input.starts.map(function (unit) { return unit.definition.id; });
    base.startScenarios = (FBDATA.startScenarios || []).filter(function (row) { return row && owned.indexOf(row.id) < 0; });
    base.bookmarkCompositionReferences = frozen.startScenarios;
    // An opening's graph is reviewed by its own world, not by every world
    // that happens to share the global contract template catalogue.
    base.federateServiceStarts = {};
    Object.keys(FBDATA.federateServiceStarts || {}).forEach(function (id) {
      if (own(input.catalogs.storyInstances,id) || own(FBDATA.storyInstances,id)) base.federateServiceStarts[id] = FBDATA.federateServiceStarts[id];
    });
    return base;
  }
  function retainTrackReplacement(input,rejected) {
    var original = frozen.bookmarks[input.bookmark.id], changed = false;
    if (!original) return false;
    function layerPolicy(layer,key) {
      var policy = layer && layer.startTrackOverrides;
      if (!policy || !policy.entries || !Object.keys(policy.entries).length ||
          !Object.keys(policy.entries).every(function (id) { return rejected[id]; })) return;
      var effective = key === null ? original : Object.assign({},original,original.revisions.baseline,layer);
      input.starts.forEach(function (unit) {
        var definition = unit.definition, binding = key === null ? unit.bindings.root : unit.bindings.revisions[key];
        if (!binding || binding.offered === false || !C.matches(definition,input.bookmark.id,effective.era) ||
            Array.isArray(effective.starts) && effective.starts.indexOf(definition.id) < 0) return;
        var replacement = {tracks:list(definition.tracks).slice()};
        if (definition.trackLocations !== undefined) replacement.trackLocations = copy(definition.trackLocations);
        if (canonical(binding.trackOverride) !== canonical(replacement)) changed = true;
        binding.trackOverride = replacement;
      });
    }
    layerPolicy(original,null);
    Object.keys(original.revisions || {}).forEach(function (id) { layerPolicy(original.revisions[id],id); });
    return changed;
  }
  function report(row,message) { return {id:row.id,source:row.source,bookmarkId:row.bookmarkId,ready:false,published:false,reused:false,worldFaults:[message],starts:[]}; }
  function resetSetup() {
    if (!setup) return;
    var prior = setup; setup = null;
    FB.balanceLayers.activate(null,null);
    window.FBDATA = prior.base;
    FB.activeBookmark = null; FB.activeBookmarkId = null; FB.activeEra = null;
    FB.activeGeography = null; FB.activeGeographyId = null; FB.world = null;
    FB.game.SCENARIOS = FBDATA.startScenarios;
    FB.invalidateCultureData(); FB.invalidateReligionData(); FB.lexicon.reset(); FB.governments.invalidate();
    FB.stories.publish(FB.stories.compile(FBDATA.storyInstances || {}),[]);
    var english = FB.englishMessages();
    Object.keys(english).forEach(function (key) { if (!own(prior.english,key)) delete english[key]; });
    Object.assign(english,prior.english);
    usedGraphs = Object.create(null); catalogUses = Object.create(null);
  }
  C.setupId = function () { return setup && setup.id; };
  // A failed save switch must be able to return to its previous accepted
  // source session. This token is transient; it never enters a save.
  C.checkpoint = function () {
    var priorSetup = setup, priorPublished = published, priorData = publishedData;
    var priorGraphs = usedGraphs, priorUses = catalogUses;
    return function () {
      setup = priorSetup; published = priorPublished; publishedData = priorData;
      usedGraphs = priorGraphs; catalogUses = priorUses;
    };
  };
  C.setupUnavailable = function (id) { return own(setupFaults,id); };
  // Selector references can name other declared dates without installing their
  // unreviewed worlds into the playable catalogue. Detached validation must
  // still resolve references against its own candidate, not the setup session.
  C.setupKnowsBookmark = function (id) {
    return !!setup && setup.data === FBDATA && declared.indexOf(id) >= 0;
  };
  // Global native selector tables can retain references to a withheld date.
  // This answers reference identity only, never availability or world validity.
  // Detached mod/composition candidates cannot borrow this live source context.
  C.nativeSelectorKnowsBookmark = function (id) {
    return (!!setup && setup.data === FBDATA || !!published && publishedData === FBDATA) &&
      declared.indexOf(id) >= 0;
  };
  C.prepareSetup = function (id) {
    if (publishing || published || FB.state) throw new Error('Setup preparation requires an unstarted, unpublished campaign.');
    if (!C.dateLoaded(id)) throw new Error(notLoaded(id));
    if (own(setupFaults,id)) throw new Error(setupFaults[id]);
    if (setup && setup.id === id) return copy(setup.report);
    resetSetup();
    setup = {id:id,base:FBDATA,english:Object.assign({},FB.englishMessages()),report:null};
    // Activation installs world fields and normalizes technologies. Keep those
    // edits away from the exact baseline later captured by the mod installer.
    window.FBDATA = Object.assign({},FBDATA,{tech:copy(FBDATA.tech),balance:copy(FBDATA.balance)});
    publishing = true;
    try {
      var entry = inputs(id)[0], known = Object.assign({},frozen.bookmarks);
      declared.forEach(function (key) { if (!own(known,key)) known[key] = reference(key); });
      if (!entry) throw new Error('Unknown bookmark: ' + id);
      if (entry.faults) throw new Error(entry.faults.join('\n'));
      // A cold setup still contains the original public foundation records.
      // Native sources can legitimately replace those records (including site
      // coordinates and inherited culture names). Use the canonical detached
      // publication path for this single transaction. Complete publication
      // reuses reviews with guarded snapshots of replaced foundation records.
      var result = FB.bookmarkCompositions.prepareSource(entry.input,proof(entry.input,known),entry.input).publish();
      if (!result.published) throw new Error(result.worldFaults.join('\n'));
      setup.data = FBDATA;
      setup.report = result;
      result.starts.forEach(function (unit) { FB.recordBookmarkRuntimeFaults('start_requirements',{id:id,revision:unit.revision},{id:unit.id},unit.faults,unit.source); });
      return copy(result);
    } catch (error) {
      resetSetup();
      setupFaults[id] = error.message;
      FB.recordBookmarkRuntimeFaults('world_definition',{id:id},null,[error.message]);
      throw error;
    } finally { publishing = false; }
  };
  // Both callers use the same ordered work. The menu callback path yields
  // between completed units; synchronous authoring callers keep their API.
  C.publish = function (progress, done) {
    function returned(rows) { if (done) done(null,rows); return rows; }
    if (!FB.mods || !FB.stories || !FB.buildingSeasons || typeof FB.startSelectorReport !== 'function')
      return returned([report({id:'native_sources',source:'trusted source draft',bookmarkId:null},'Composition validation requires the complete engine.')]);
    if (published && publishedData === FBDATA) return returned(copy(published).map(function (row) { if (row.published) row.reused = true; return row; }));
    if (publishing || FB.state) throw new Error('Source publication requires an idle, unstarted campaign.');
    resetSetup();
    setupFaults = Object.create(null);
    publishing = true;
    var tasks = [], cursor = 0, result;
    function addTask(label, status, work) {
      tasks.push({status:status,run:function () { return FB.loadTiming ? FB.loadTiming.measure(label,work) : work(); }});
    }
    function plan() {
    var entries = FB.loadTiming ? FB.loadTiming.measure('Assemble source envelopes',inputs) : inputs();
    var known = Object.assign({},frozen.bookmarks), rejected = Object.create(null), reviews = [], tickets = [];
    declared.forEach(function (id) { if (!known[id]) known[id] = reference(id); });
    entries.forEach(function (row) { if (row.input) known[row.bookmarkId] = row.input.bookmark; });
    entries.forEach(function (row) {
      addTask('Review date ' + row.bookmarkId,{stage:'review',bookmarkId:row.bookmarkId},function () {
      var ticket = row.faults ? null : FB.bookmarkCompositions.reviewSource(row.input,proof(row.input,known));
      tickets.push(ticket);
      var review = row.faults ? report(row,row.faults.join('\n')) : ticket.report();
      review.id = row.id; review.bookmarkId = row.bookmarkId;
      if (!review.source) review.source = row.source;
      reviews.push(review);
      review.starts.forEach(function (unit) { if (!unit.ready) rejected[unit.id] = true; });
      });
    });
    var failed, results = [];
    addTask('Collect shared source failures',{stage:'shared-review'},function () {
    failed = entries.filter(function (row,i) { return !reviews[i].ready; }).map(function (row) { return row.bookmarkId; });
    entries.forEach(function (row) {
      if (!row.input) return;
      row.input.starts.forEach(function (unit) {
        var ids = unit.definition.bookmarkIds;
        if (Array.isArray(ids) && ids.some(function (id) { return failed.indexOf(id) >= 0; })) rejected[unit.definition.id] = true;
      });
    });
    });
    entries.forEach(function (row,i) {
      addTask('Publish date ' + row.bookmarkId,{stage:'publish',bookmarkId:row.bookmarkId},function () {
      if (!reviews[i].ready) { results.push(Object.assign({published:false,reused:false},reviews[i])); return; }
      var sourceRecord = {source:row.source,bookmarkId:row.bookmarkId,input:copy(row.input)};
      FBDATA.bookmarkCompositionSources[row.id] = sourceRecord;
      // A locally rejected unit is already absent from this ticket. Only a
      // newly rejected accepted unit, changed binding or removed permission
      // invalidates its proof; failures elsewhere cannot discard every review.
      var changed = reviews[i].starts.some(function (unit) { return unit.ready && rejected[unit.id]; }), input;
      if (failed.length || row.input.starts.some(function (unit) { return rejected[unit.definition.id]; })) {
        input = copy(row.input);
        input.starts = input.starts.filter(function (unit) { return !rejected[unit.definition.id]; });
        changed = retainTrackReplacement(input,rejected) || changed;
        Object.keys(input.catalogs.religions || {}).forEach(function (id) {
          var availability = input.catalogs.religions[id].availability;
          if (!availability || !Array.isArray(availability.bookmarkIds)) return;
          var kept = availability.bookmarkIds.filter(function (ref) { return failed.indexOf(ref) < 0; });
          if (kept.length !== availability.bookmarkIds.length) changed = true;
          availability.bookmarkIds = kept;
        });
      }
      var outcome = !changed ? tickets[i].publish() : null;
      tickets[i] = null;
      if (!outcome || !outcome.published) {
        // Changed or conflicting content still goes through the complete
        // canonical proof. Keep the original owner fingerprint for replay.
        input = input || copy(row.input);
        outcome = FB.bookmarkCompositions.prepareSource(input,proof(input,known),row.input).publish();
      }
      if (!outcome.published && failed.indexOf(row.bookmarkId) < 0) {
        failed.push(row.bookmarkId);
        row.input.starts.forEach(function (unit) { rejected[unit.definition.id] = true; });
      }
      // Preserve the original rejected-unit diagnostics in the final report.
      var accepted = outcome.starts;
      outcome.starts = reviews[i].starts.map(function (unit) {
        return rejected[unit.id] ? Object.assign({},unit,{ready:false,faults:unit.faults.length ? unit.faults : ['Shared start was rejected in another offered world.']}) :
          accepted.find(function (next) { return next.id === unit.id; }) || unit;
      });
      results.push(outcome);
      });
    });
    addTask('Publish unattached declarations',{stage:'shared-publish'},function () {
    // Keep legitimate unused catalogue declarations without making them a
    // dependency of an otherwise independent political world.
    var healthy = entries.find(function (row,i) { return reviews[i].ready && own(FBDATA.bookmarks,row.bookmarkId); });
    if (healthy) {
      var extra = {}, extraGraphs = {};
      catalogs.forEach(function (root) {
        Object.keys(frozen[root] || {}).forEach(function (key) {
          var value = copy(frozen[root][key]);
          if (root === 'religions' && value && value.availability && Array.isArray(value.availability.bookmarkIds))
            value.availability.bookmarkIds = value.availability.bookmarkIds.filter(function (id) { return failed.indexOf(id) < 0; });
          if (own(FBDATA[root],key) && canonical(FBDATA[root][key]) === canonical(value)) return;
          var users = catalogUses[root] && catalogUses[root][key], owners = ownership[root] && ownership[root][key];
          if (users && users.every(function (id) { return failed.indexOf(id) >= 0; }) ||
              !users && owners && owners.length && owners.every(function (id) { return failed.indexOf(id) >= 0; })) return;
          extra[root] = extra[root] || {}; extra[root][key] = value;
        });
      });
      Object.keys(frozen.storyInstances).forEach(function (id) {
        if (!usedGraphs[id] && !own(FBDATA.storyInstances,id)) extraGraphs[id] = copy(frozen.storyInstances[id]);
      });
      if (Object.keys(extraGraphs).length) extra.storyInstances = extraGraphs;
      if (Object.keys(extra).length) {
        var standalone = {id:'native_unattached_declarations',source:'trusted source declarations',
          bookmark:copy(FBDATA.bookmarks[healthy.bookmarkId]),catalogs:extra,starts:[]};
        var unbound = FB.bookmarkCompositions.reviewSource(standalone,proof(standalone,known)).publish();
        unbound.bookmarkId = null; results.push(unbound);
      }
    }
    });
    addTask('Finalize source catalogue',{stage:'finalize'},function () {
    var next = Object.assign({},FBDATA), worlds = Object.assign({},FBDATA.bookmarks);
    failed.forEach(function (id) { delete worlds[id]; }); next.bookmarks = worlds;
    next.startScenarios = FBDATA.startScenarios.filter(function (row) { return !rejected[row.id]; });
    // Both declaration and scenario order are authored data. Standalone shared
    // declarations join the same spine after all independent units are known.
    next.startScenarios.sort(function (a,b) { return orders.starts.indexOf(a.id) - orders.starts.indexOf(b.id); });
    var ordered = {}, declarations = FBDATA.storyInstances || {};
    orders.stories.forEach(function (id) { if (own(declarations,id)) ordered[id] = declarations[id]; });
    Object.keys(declarations).forEach(function (id) { if (!own(ordered,id)) ordered[id] = declarations[id]; });
    next.storyInstances = ordered;
    if (failed.length) {
      next.religions = Object.assign({},next.religions);
      Object.keys(next.religions).forEach(function (id) {
        var faith = next.religions[id], selectors = faith && faith.availability && faith.availability.bookmarkIds;
        if (!Array.isArray(selectors) || !selectors.some(function (id) { return failed.indexOf(id) >= 0; })) return;
        next.religions[id] = copy(faith);
        next.religions[id].availability.bookmarkIds = selectors.filter(function (id) { return failed.indexOf(id) < 0; });
      });
    }
    if (!own(worlds,next.defaultBookmark)) next.defaultBookmark = Object.keys(worlds)[0];
    legacyRoots.forEach(function (root) { if (own(frozen,root)) next[root] = copy(frozen[root]); });
    window.FBDATA = next; if (FB.game) FB.game.SCENARIOS = next.startScenarios;
    FB.invalidateCultureData(); FB.invalidateReligionData(); FB.lexicon.reset(); FB.governments.invalidate();
    FB.stories.publish(FB.stories.compile(next.storyInstances),[]);
    results.forEach(function (row) {
      FB.recordBookmarkRuntimeFaults('world_definition',{id:row.bookmarkId},null,row.worldFaults,row.source);
      row.starts.forEach(function (unit) { FB.recordBookmarkRuntimeFaults('start_requirements',{id:row.bookmarkId,revision:unit.revision},{id:unit.id},unit.faults,unit.source); });
    });
    published = copy(results); publishedData = FBDATA; result = copy(results);
    });
    }
    if (!done) {
      try {
        plan();
        while (cursor < tasks.length) tasks[cursor++].run();
        return result;
      } finally { publishing = false; }
    }
    function step() {
      var error = null;
      try {
        if (!tasks.length) plan();
        else tasks[cursor++].run();
        // The bar describes completed work; the label names what will run
        // after the next paint, so a long review has its own visible status.
        if (progress) progress(cursor / tasks.length,cursor < tasks.length ? tasks[cursor].status : {stage:'complete'});
      } catch (failure) { error = failure; }
      if (error || cursor === tasks.length) {
        publishing = false;
        done(error,result);
      } else requestAnimationFrame(function () { setTimeout(step,0); });
    }
    try { if (progress) progress(0,{stage:'prepare'}); }
    catch (failure) { publishing = false; done(failure); return; }
    requestAnimationFrame(function () { setTimeout(step,0); });
  };
  C.isPublishing = function () { return publishing; };
  C.reports = function () { return published ? copy(published) : []; };
  C.hasPublished = function () { return !!published; };
  C.owns = function (id) { return !!published && published.some(function (row) { return row.id === id; }); };
  C.replay = function () { if (published) published.forEach(function (row) { if (row.published) row.reused = true; }); };

  /* ---------- Per-date source manifest ---------- */
  function notLoaded(id) { return FB.T('Bookmark {bookmark} has not finished loading.',{bookmark:id}); }
  // data/bookmark_manifest.js registers once, after this module and before
  // any contributor. Each run follows one eager script in document order.
  C.manifest = function (definition) {
    if (manifest || frozen || view) throw new Error('The bookmark source manifest must register once before sources load.');
    if (!definition || typeof definition !== 'object' || !definition.dates || typeof definition.dates !== 'object' || !Array.isArray(definition.runs))
      throw new Error('Invalid bookmark source manifest.');
    // Hosted staging already versions the manifest tag. Inherit that key for
    // injected sources too, including itch builds that only stamp index.html.
    // A query-free file:// document keeps query-free local source paths.
    var version = document.currentScript && document.currentScript.src.match(/[?&]v=([^&#]*)/);
    var versionQuery = version ? '?v=' + version[1] : '';
    var dates = Object.create(null);
    Object.keys(definition.dates).forEach(function (id) {
      var row = definition.dates[id];
      if (!row || typeof row.name !== 'string' || typeof row.desc !== 'string' || typeof row.era !== 'string' ||
          !row.date || typeof row.date.year !== 'number' || typeof row.date.season !== 'number' || typeof row.date.day !== 'number')
        throw new Error('Invalid bookmark manifest summary: ' + id);
      dates[id] = {summary:{name:row.name,desc:row.desc,date:{year:row.date.year,season:row.date.season,day:row.date.day},era:row.era},
        requires:list(row.requires).slice(),files:[]};
      if (row.hidden === true) dates[id].summary.hidden = true;
    });
    definition.runs.forEach(function (run) {
      if (!run || typeof run.after !== 'string' || !Array.isArray(run.files) || !run.files.length) throw new Error('Invalid bookmark manifest run.');
      var after = normalPath(run.after), anchor = documentScript(after), runDates = [];
      run.files.forEach(function (entry) { list(entry && entry[1]).forEach(function (id) { if (runDates.indexOf(id) < 0) runDates.push(id); }); });
      if (!anchor) manifestFaults.push({source:'data/bookmark_manifest.js',bookmarks:runDates,message:'Missing manifest anchor script: ' + after});
      run.files.forEach(function (entry, index) {
        var url = entry && entry[0], path = normalPath(url), ids = list(entry && entry[1]);
        if (typeof url !== 'string' || !/^data\/[a-z0-9_]+\.js$/.test(path) || !ids.length || own(files,path))
          throw new Error('Invalid or duplicate bookmark manifest file: ' + url);
        ids.forEach(function (id) {
          if (!own(dates,id)) throw new Error('Bookmark manifest file names an undeclared date: ' + path);
          dates[id].files.push(path);
        });
        files[path] = {path:path,url:url.indexOf('?') < 0 ? url + versionQuery : url,dates:ids.slice(),after:after,runDates:runDates,primary:anchor ? scriptIndex(anchor) : -1,
          secondary:index + 1,state:PENDING,boot:false};
        fileOrder.push(path);
      });
    });
    manifest = {dates:dates};
  };
  function validateManifest() {
    if (!manifest) return;
    Object.keys(manifest.dates).forEach(function (id) {
      var problems = [];
      if (declared.indexOf(id) < 0) problems.push('Bookmark manifest date is not a declared source date: ' + id);
      manifest.dates[id].requires.forEach(function (ref) { if (!own(manifest.dates,ref) && declared.indexOf(ref) < 0) problems.push('Unknown required date ' + ref + ' for ' + id); });
      problems.forEach(function (message) { manifestFaults.push({source:'data/bookmark_manifest.js',bookmarks:[id],message:message}); });
    });
  }
  // Manifest dates and their required dates, in a stable first-seen order.
  function closure(ids) {
    var result = [];
    function visit(id) {
      if (result.indexOf(id) >= 0) return;
      result.push(id);
      if (manifest && own(manifest.dates,id)) manifest.dates[id].requires.forEach(visit);
    }
    ids.forEach(visit); return result;
  }
  function missing(ids) {
    if (!manifest) return [];
    var paths = [];
    closure(ids === null || ids === undefined ? Object.keys(manifest.dates) : list(ids).map(String)).forEach(function (id) {
      if (!own(manifest.dates,id)) return;
      manifest.dates[id].files.forEach(function (path) { if (files[path].state !== LOADED && paths.indexOf(path) < 0) paths.push(path); });
    });
    return paths.sort(function (a,b) { return compareRows(files[a],files[b]) || fileOrder.indexOf(a) - fileOrder.indexOf(b); });
  }
  C.dateLoaded = function (id) {
    if (!manifest || !own(manifest.dates,String(id))) return true;
    return !missing([String(id)]).length;
  };
  C.datesLoaded = function (ids) { return !missing(ids).length; };
  // Inspection only: the manifest's dates, files and load states.
  C.manifestReport = function () {
    return {registered:!!manifest,dates:manifest ? Object.keys(manifest.dates).map(function (id) {
      var row = manifest.dates[id];
      return {id:id,summary:copy(row.summary),requires:row.requires.slice(),files:row.files.slice(),loaded:C.dateLoaded(id)};
    }) : [],files:fileOrder.map(function (path) {
      var file = files[path];
      return {path:path,url:file.url,dates:file.dates.slice(),after:file.after,loaded:file.state === LOADED,boot:file.boot};
    }),faults:manifestFaults.map(function (fault) { return copy(fault); }),publicFaults:publicFaults.slice()};
  };
  /* Load the sources of the named dates (null means every manifest date),
     then replay all recorded contributors. Requests are serialized; a date
     already present completes synchronously. A failed file withdraws the
     whole batch, leaving the prior catalogue intact and the files retryable. */
  C.loadDates = function (ids, done, progress) {
    var request = {ids:ids,done:typeof done === 'function' ? done : function () {},progress:progress};
    if (batch || loadQueue.length) { loadQueue.push(request); return; }
    startLoad(request);
  };
  function drainLoads() { if (!batch && loadQueue.length) startLoad(loadQueue.shift()); }
  function startLoad(request) {
    var paths, failure = null;
    try {
      paths = missing(request.ids);
      if (paths.length && (publishing || published || FB.state))
        throw new Error('Bookmark sources can load only before campaign content is prepared.');
      paths.forEach(function (path) { if (files[path].primary < 0) throw new Error('Missing manifest anchor script: ' + files[path].after); });
    } catch (error) { failure = error; }
    if (failure || !paths.length) { request.done(failure); drainLoads(); return; }
    // Injected contributors write the base root, never a setup snapshot.
    resetSetup();
    var current = batch = {id:++batchSerial,request:request,paths:paths,scripts:[],remaining:paths.length,failed:[]};
    paths.forEach(function (path) {
      var file = files[path], script = document.createElement('script');
      file.state = LOADING;
      script.src = file.url;
      script.async = false;
      script.setAttribute('data-bookmark-source',path);
      script.onload = function () { settleFile(current,file,true); };
      script.onerror = function () { settleFile(current,file,false); };
      current.scripts.push(script);
      (document.body || document.head).appendChild(script);
    });
  }
  function settleFile(current, file, ok) {
    if (batch !== current || file.state !== LOADING) return;
    file.state = ok ? FETCHED : MISSING;
    if (!ok) current.failed.push(file.path);
    current.remaining--;
    if (current.request.progress) {
      try { current.request.progress((current.paths.length - current.remaining) / current.paths.length); }
      catch (ignored) { /* Progress display never affects loading. */ }
    }
    if (!current.remaining) completeLoad(current);
  }
  function completeLoad(current) {
    var failure = null;
    if (current.failed.length) {
      recorded = recorded.filter(function (row) { return row.batch !== current.id; });
      current.paths.forEach(function (path) { files[path].state = PENDING; });
      current.scripts.forEach(function (script) { if (script.parentNode) script.parentNode.removeChild(script); });
      failure = new Error(FB.T('Bookmark data could not be loaded: {files}. Check the connection and try again.',{files:current.failed.join(', ')}));
      failure.retryable = true;
    } else {
      try {
        reauthor();
        current.paths.forEach(function (path) { files[path].state = LOADED; });
      } catch (error) {
        recorded = recorded.filter(function (row) { return row.batch !== current.id; });
        current.paths.forEach(function (path) { files[path].state = PENDING; });
        failure = error;
      }
    }
    batch = null;
    try { current.request.done(failure); }
    finally { drainLoads(); }
  }
  function defaultRoots() {
    protectedRoots.forEach(function (root) {
      if (legacyRoots.indexOf(root) < 0 && !own(view,root)) view[root] = root === 'startScenarios' ? [] : {};
    });
  }
  function applyDelta(row) {
    if (row.delta === WHOLE_ROOT) view[row.root] = copy(row.value);
    else if (row.delta === LIST_ROW) {
      view[row.root] = list(view[row.root]).filter(function (old) { return !old || old.id !== row.value.id; });
      view[row.root].push(copy(row.value));
    } else {
      if (!view[row.root] || typeof view[row.root] !== 'object') view[row.root] = {};
      view[row.root][row.id] = copy(row.value);
    }
  }
  // Author recorded contributors from the pristine root. Unprotected roots
  // stay private to the replay; public roots created outside contributors
  // (ordinary data tables, inert literal tables) are read in place.
  function replayRows(rows) {
    faults = []; origins = Object.create(null); starts = Object.create(null); graphs = Object.create(null);
    ownership = Object.create(null); catalogUses = Object.create(null); usedGraphs = Object.create(null);
    view = copy(pristine); seen = Object.create(null); foundationSnapshot = null;
    list(view.startScenarios).forEach(function (row) { if (row && row.id) starts[row.id] = 'data/starts.js'; });
    // Sealing owns the public composition-source table; contributors rebuild it.
    Object.keys(FBDATA).forEach(function (root) {
      if (protectedRoots.indexOf(root) < 0 && root !== 'bookmarkCompositionSources' && !own(view,root) && !stageProduced[root])
        view[root] = FBDATA[root];
    });
    FB.bookmarkCompositions.resetSourceSession();
    replaying = true;
    try {
      rows.slice().sort(compareRows).forEach(function (row) {
        if (!row.fn) { applyDelta(row); return; }
        defaultRoots(); author(row.spec,row.fn);
      });
      defaultRoots();
    } finally { replaying = false; }
    return view;
  }
  function sourceOwnerIds() {
    return ['native_unattached_declarations'].concat(declared.map(function (id) { return 'native_' + id; }),
      Object.keys(frozen && frozen.bookmarkCompositionSources || {}));
  }
  function reauthor() {
    var state = {view:view,frozen:frozen,orders:orders,declared:declared,faults:faults,origins:origins,starts:starts,graphs:graphs,
      ownership:ownership,catalogUses:catalogUses,usedGraphs:usedGraphs,seen:seen,foundationSnapshot:foundationSnapshot,
      stageProduced:Object.assign(Object.create(null),stageProduced),catalogs:{},sources:FBDATA.bookmarkCompositionSources};
    catalogs.forEach(function (root) { state.catalogs[root] = FBDATA[root]; });
    var ids = declared.slice();
    if (!pristine) throw new Error('Bookmark sources have no recorded authoring root.');
    // Owner fingerprints of the smaller source set no longer apply.
    FB.bookmarkCompositions.resetSourceSession(sourceOwnerIds());
    try {
      // The first replay reproduces the eager boot contributors privately, so
      // public tables receive only the difference made by the new dates.
      var previous = lastSandbox || replayRows(recorded.filter(function (row) { return row.boot; }));
      var next = replayRows(recorded);
      frozen = null; seal(ids);
      publishSandbox(previous,next);
      lastSandbox = next;
    } catch (error) {
      view = state.view; frozen = state.frozen; orders = state.orders; declared = state.declared; faults = state.faults;
      origins = state.origins; starts = state.starts; graphs = state.graphs; ownership = state.ownership;
      catalogUses = state.catalogUses; usedGraphs = state.usedGraphs; seen = state.seen; foundationSnapshot = state.foundationSnapshot;
      stageProduced = state.stageProduced;
      catalogs.forEach(function (root) { FBDATA[root] = state.catalogs[root]; });
      FBDATA.bookmarkCompositionSources = state.sources;
      throw error;
    }
    setupFaults = Object.create(null);
    FB.invalidateCultureData(); FB.invalidateReligionData(); FB.lexicon.reset(); FB.governments.invalidate();
  }
  /* ---------- Merging a replay's unprotected roots into public data ---------- */
  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  }
  function same(a,b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return sameValue(a,b);
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    var keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (var i = 0; i < keys.length; i++) if (!own(b,keys[i]) || !same(a[keys[i]],b[keys[i]])) return false;
    return true;
  }
  // Insert keys new to the replay after their nearest earlier replay key,
  // keeping public-only keys (ordinary data scripts) where they are.
  function insertKeys(target, before, after) {
    var order = Object.keys(target), keys = Object.keys(after), values = Object.create(null);
    keys.forEach(function (key, i) {
      if (own(target,key)) return;
      var at = -1;
      for (var j = i - 1; j >= 0 && at < 0; j--) at = order.indexOf(keys[j]);
      order.splice(at + 1,0,key);
    });
    order.forEach(function (key) { values[key] = own(target,key) ? target[key] : copy(after[key]); });
    order.forEach(function (key) { delete target[key]; });
    order.forEach(function (key) { target[key] = values[key]; });
  }
  function patchList(path, target, before, after) {
    var b = before.map(canonical), a = after.map(canonical), j = 0, inserts = [];
    for (var i = 0; i < a.length; i++) {
      if (j < b.length && a[i] === b[j]) { j++; continue; }
      inserts.push({value:after[i],previous:j - 1});
    }
    if (j < b.length) { publicFaults.push('Replay removed or reordered entries in ' + path + '; public data was kept.'); return target; }
    if (!inserts.length) return target;
    var t = target.map(canonical), position = [], k = 0;
    b.forEach(function (row, n) { while (k < t.length && t[k] !== row) k++; position[n] = k < t.length ? k++ : -1; });
    for (var m = inserts.length - 1; m >= 0; m--) {
      var p = inserts[m].previous, at = p < 0 ? (b.length && position[0] >= 0 ? position[0] : target.length) :
        position[p] >= 0 ? position[p] + 1 : target.length;
      target.splice(at,0,copy(inserts[m].value));
    }
    return target;
  }
  function patch(path, target, before, after) {
    if (same(before,after)) return target;
    if (plainObject(before) && plainObject(after) && plainObject(target)) {
      Object.keys(before).forEach(function (key) { if (!own(after,key)) delete target[key]; });
      var added = false;
      Object.keys(after).forEach(function (key) {
        if (!own(before,key) || !own(target,key)) { added = true; return; }
        var value = patch(path + '.' + key,target[key],before[key],after[key]);
        if (value !== target[key]) target[key] = value;
      });
      if (added) insertKeys(target,before,after);
      return target;
    }
    if (Array.isArray(before) && Array.isArray(after) && Array.isArray(target)) return patchList(path,target,before,after);
    return copy(after);
  }
  function publishSandbox(previous, next) {
    Object.keys(next).forEach(function (root) {
      if (protectedRoots.indexOf(root) >= 0 || root === 'bookmarkCompositionSources' || next[root] === FBDATA[root]) return;
      if (!own(FBDATA,root)) { FBDATA[root] = copy(next[root]); return; }
      var value = patch(root,FBDATA[root],previous[root],next[root]);
      if (value !== FBDATA[root]) FBDATA[root] = value;
    });
  }
  if (timing) {
    var originalStage = C.stage, originalFinish = C.finish, originalRefresh = refresh;
    var originalSync = syncFoundations, originalCapture = captureFoundations;
    var timedStage = C.stage = function (spec) { return startupMeasure('Author source ' + (spec && spec.source || 'unknown'),originalStage,this,arguments); };
    var timedFinish = C.finish = function () { return startupMeasure('Seal native source declarations',originalFinish,this,arguments); };
    refresh = function () { return startupMeasure('Synchronize shared source foundations',originalRefresh,this,arguments); };
    syncFoundations = function () { return startupMeasure('Read changed source foundations',originalSync,this,arguments); };
    captureFoundations = function () { return startupMeasure('Snapshot shared source foundations',originalCapture,this,arguments); };
    timingRestores.push(function () {
      if (C.stage === timedStage) C.stage = originalStage;
      if (C.finish === timedFinish) C.finish = originalFinish;
      refresh = originalRefresh;
      syncFoundations = originalSync; captureFoundations = originalCapture;
    });
  }
})();
