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
  var catalogs = ['geographies','cultures','cultureDoctrineDefaults','religions','governmentForms',
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
      return result;
    }
    return clone(o);
  }
  function list(o) { return Array.isArray(o) ? o : []; }
  function canonical(o) {
    if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
    if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map(function (key) { return JSON.stringify(key) + ':' + canonical(o[key]); }).join(',') + '}';
    return JSON.stringify(o);
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
  function syncFoundations(roots,initial) {
    roots.forEach(function (root) {
      var text = JSON.stringify(FBDATA[root]);
      if (!own(seen,root)) {
        if (!initial) view[root] = copy(FBDATA[root]); seen[root] = text;
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
          });
        } else Object.keys(FBDATA[root] || {}).forEach(function (id) {
          if (!own(prior,id) || JSON.stringify(prior[id]) !== JSON.stringify(FBDATA[root][id])) view[root][id] = copy(FBDATA[root][id]);
        });
        seen[root] = text;
      }
    });
  }
  function refresh() {
    var initial = !view, roots = [];
    if (initial) view = copy(FBDATA);
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
  C.stage = function (spec,fn) {
    if (!spec || typeof spec.source !== 'string' || !Array.isArray(spec.bookmarks) || typeof fn !== 'function')
      throw new Error('Invalid trusted source adapter.');
    if (frozen) {
      if (bodies[spec.source] !== String(fn)) error(spec.source,spec.bookmarks,'Source authoring is sealed; reload changed declarations.');
      return;
    }
    refresh(); bodies[spec.source] = String(fn);
    var before = {}, roots = spec.catalogs || [];
    roots.forEach(function (root) { if (catalogs.indexOf(root) < 0) throw new Error('Unknown source catalogue: ' + root); before[root] = stamp(view[root]); });
    var priorStarts = view.startScenarios, priorStories = view.storyInstances;
    var priorWorlds = Object.assign({},view.bookmarks);
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
    // roots never cross this seam during data loading.
    Object.keys(view).forEach(function (root) { if (protectedRoots.indexOf(root) < 0) FBDATA[root] = view[root]; });
  };
  C.scope = function (id,fn) {
    try { return fn(); }
    catch (e) { error(C.source || 'trusted source',[id],e.message); }
  };
  C.finish = function (ids) {
    if (frozen) return;
    refresh(); declared = ids.slice();
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
    catalogs.forEach(function (root) {
      var shared = Object.assign({},FBDATA[root]);
      Object.keys(frozen[root] || {}).forEach(function (id) {
        if (!ownership[root] || !own(ownership[root],id) || !ownership[root][id].length) shared[id] = copy(frozen[root][id]);
      });
      FBDATA[root] = shared;
    });
    // Existing converted sources participate in the same known-world proof.
    FBDATA.bookmarkCompositionSources = frozen.bookmarkCompositionSources || {};
    view = null; foundationSnapshot = null; seen = Object.create(null);
  };
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
      } else if (root === 'religions') need(root,value && value.parent);
      else if (root === 'geographies') need(root,value && value.extends);
    }
    function names(root,value) { list(value).forEach(function (key) { need(root,key); }); }
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
    Object.keys(FBDATA.legalTraditions || {}).forEach(function (key) {
      var jurisdiction = FBDATA.legalTraditions[key].jurisdiction;
      Object.keys(jurisdiction && jurisdiction.cultures || {}).forEach(function (culture) { need('cultures',culture); });
    });
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
    declared.forEach(function (id) { if (!own(selectorWorlds,id)) selectorWorlds[id] = {id:id}; });
    declared.forEach(function (id) {
      if (only !== undefined && id !== only) return;
      if (convertedIds.indexOf(id) >= 0) return;
      var original = source.bookmarks[id];
      var entry = {id:'native_' + id,source:origins[id] || 'data/bookmarks.js',bookmarkId:id};
      try {
      var failures = faults.filter(function (fault) { return fault.bookmarks.indexOf(id) >= 0; });
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
      var failures = faults.filter(function (fault) { return fault.bookmarks.indexOf(row.bookmarkId) >= 0; });
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
      declared.forEach(function (key) { if (!own(known,key)) known[key] = {id:key}; });
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
    declared.forEach(function (id) { if (!known[id]) known[id] = {id:id}; });
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
