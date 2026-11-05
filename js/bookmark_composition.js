/* Trusted, detached world/start ownership units. Ordinary JSON mods retain
   their own atomic validation and fingerprint owner in js/mods.js. */
window.FB = window.FB || {};
(function () {
  'use strict';
  var owners = Object.create(null);
  var sourceReports = Object.create(null);
  var startStream = {ids:[],known:Object.create(null),groups:Object.create(null)};
  var storyStream = {ids:[],known:Object.create(null),groups:Object.create(null)};
  var faithOrders = Object.create(null), faithCaptures = Object.create(null);
  var catalogs = ['geographies','cultures','cultureDoctrineDefaults','religions','governmentForms','legalTraditions',
    'settlementSites','settlementLayouts','administrationProfiles','aristocraticProfiles',
    'civicProfiles','constituencyProfiles','ecclesiasticalProfiles','mobileProfiles','storyInstances',
    'religiousInstitutionProfiles','religiousActivities','religiousPatronage'];
  function own(value, key) { return !!value && Object.prototype.hasOwnProperty.call(value, key); }
  function plain(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  }
  function copy(value) {
    var memo = new WeakMap();
    function clone(row) {
      if (!row || typeof row !== 'object') return row;
      if (memo.has(row)) return memo.get(row);
      var result = Array.isArray(row) ? [] : {};
      memo.set(row,result);
      Object.keys(row).forEach(function (key) { result[key] = clone(row[key]); });
      return result;
    }
    return clone(value);
  }
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (plain(value)) return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + stable(value[key]);
    }).join(',') + '}';
    return JSON.stringify(value);
  }
  function equal(a, b) { return stable(a) === stable(b); }
  function fields(value, allowed, label) {
    if (!plain(value)) throw new Error(label + ' must be an object.');
    Object.keys(value).forEach(function (key) {
      if (allowed.indexOf(key) < 0) throw new Error(label + ': unknown field ' + key + '.');
    });
  }
  function data(value,limit) {
    var count = 0, ancestors = [];
    function walk(row, depth) {
      if (++count > (limit || 250000) || depth > 64) throw new Error('Composition exceeds its data limits.');
      if (row === null || typeof row === 'string' || typeof row === 'boolean') return;
      if (typeof row === 'number' && isFinite(row)) return;
      if (!Array.isArray(row) && !plain(row)) throw new Error('Composition must contain plain JSON data.');
      if (ancestors.indexOf(row) >= 0) throw new Error('Composition data contains a cycle.');
      if (Object.getOwnPropertySymbols && Object.getOwnPropertySymbols(row).length)
        throw new Error('Composition data contains symbol fields.');
      ancestors.push(row);
      Object.getOwnPropertyNames(row).forEach(function (key) {
        if (Array.isArray(row) && key === 'length') return;
        if (key === '__proto__') throw new Error('Composition data contains a reserved field.');
        var descriptor = Object.getOwnPropertyDescriptor(row, key);
        if (!descriptor.enumerable) throw new Error('Composition data contains a hidden field.');
        if (descriptor.get || descriptor.set) throw new Error('Composition data contains an accessor.');
        walk(row[key], depth + 1);
      });
      if (Array.isArray(row) && (Object.keys(row).length !== row.length || Object.keys(row).some(function (key) {
        return !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= row.length;
      })))
        throw new Error('Composition lists must be dense plain arrays.');
      ancestors.pop();
    }
    walk(value, 0);
  }
  function source(value) {
    if (value !== undefined && value !== null && (typeof value !== 'string' || !value || value.length > 240))
      throw new Error('Composition source must be a nonempty bounded label.');
    return value || null;
  }
  function predecessorIds(value, id, limit, label) {
    if (!Array.isArray(value) || value.length > limit || value.some(function (ref,i) {
      return typeof ref !== 'string' || !ref || ref.length > 200 || ref === id || value.indexOf(ref) !== i;
    })) throw new Error(label + ' must be a bounded unique predecessor list.');
  }
  function afterIndex(rows, prefix, records) {
    var at = 0;
    prefix.forEach(function (id) {
      var index = records ? rows.findIndex(function (row) { return row && row.id === id; }) : rows.indexOf(id);
      if (index >= 0) at = Math.max(at,index + 1);
    });
    return at;
  }
  function captureOwner(id) {
    if (typeof id !== 'string' || id.length > 200 || !/^[a-z][a-z0-9_]*$/.test(id))
      throw new Error('Composition capture needs a bounded owner/group id.');
  }
  function appendObserved(order, known, ids, limit) {
    var additions = [];
    ids.forEach(function (id) { if (!own(known,id) && additions.indexOf(id) < 0) additions.push(id); });
    if (order.length + additions.length > limit) throw new Error('Composition logical order exceeds its limit.');
    additions.forEach(function (id) { known[id] = true; order.push(id); });
  }
  /* Capture source positions without invoking engine validators or installing
     declarations. Live append-only contributors join the same logical order. */
  function captureGroup(owner, group, definitions, live, stream, limit, kind) {
    captureOwner(owner); captureOwner(group);
    var label = 'Composition ' + kind + ' group ' + owner + '/' + group;
    if (!Array.isArray(definitions) || definitions.length > 512) throw new Error(label + ': invalid declarations.');
    var ids = [], key = JSON.stringify([owner,group]);
    for (var i = 0; i < definitions.length; i++) {
      var row = definitions[i], descriptor = plain(row) && Object.getOwnPropertyDescriptor(row,'id');
      var id = descriptor && descriptor.value;
      if (typeof id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(id) || id.length > 200 || ids.indexOf(id) >= 0)
        throw new Error(label + ': invalid or duplicate declaration id.');
      ids.push(id);
    }
    if (own(stream.groups,key)) {
      if (!equal(stream.groups[key].ids,ids)) throw new Error(label + ': captured ids changed; reload the sources.');
      return copy(stream.groups[key].positions);
    }
    if (!Array.isArray(live)) throw new Error(label + ': missing live catalogue.');
    var liveIds = [];
    live.forEach(function (row) {
      var descriptor = plain(row) && Object.getOwnPropertyDescriptor(row,'id');
      var id = descriptor && descriptor.value;
      if (typeof id === 'string' && id && id.length <= 200) liveIds.push(id);
    });
    appendObserved(stream.ids,stream.known,liveIds,limit);
    if (stream.ids.length + ids.length > limit || Object.keys(stream.groups).length >= limit)
      throw new Error(label + ': logical order exceeds its limit.');
    ids.forEach(function (id) { if (own(stream.known,id)) throw new Error(label + ': declaration already captured or installed: ' + id); });
    var positions = {};
    ids.forEach(function (id) { positions[id] = stream.ids.slice(); stream.known[id] = true; stream.ids.push(id); });
    stream.groups[key] = {ids:ids.slice(),positions:positions};
    return copy(positions);
  }
  function captureStarts(owner, group, definitions) {
    return captureGroup(owner,group,definitions,sourceData().startScenarios,startStream,4096,'start');
  }
  function sourceData() { return FB.bookmarkSources && FB.bookmarkSources.current() || FBDATA; }
  function captureStories(owner, group, declarations) {
    if (!plain(declarations)) throw new Error('Composition story capture needs a declaration map.');
    function rows(table) {
      return Object.keys(table || {}).map(function (id) {
        var descriptor = Object.getOwnPropertyDescriptor(table,id), row = descriptor && descriptor.value;
        var key = plain(row) && Object.getOwnPropertyDescriptor(row,'id');
        if (!key || key.value !== id) throw new Error('Composition story capture needs matching plain ids.');
        return row;
      });
    }
    return captureGroup(owner,group,rows(declarations),rows(sourceData().storyInstances),storyStream,2048,'story');
  }
  function captureAvailability(owner, patches) {
    captureOwner(owner); data(patches);
    if (!plain(patches)) throw new Error('Composition availability capture must be a map.');
    var fingerprint = stable(patches);
    if (own(faithCaptures,owner)) {
      if (faithCaptures[owner].fingerprint !== fingerprint) throw new Error('Composition availability capture changed: ' + owner);
      return copy(faithCaptures[owner].patches);
    }
    var result = copy(patches), planned = [], source = sourceData();
    Object.keys(patches).forEach(function (id) {
      var patch = patches[id], faith = own(source.religions,id) && source.religions[id];
      fields(patch,['bookmarkIds'],'availability capture.' + id);
      predecessorIds(patch.bookmarkIds,null,1,'availability capture.' + id);
      if (patch.bookmarkIds.length !== 1) throw new Error('Availability capture needs one owning bookmark: ' + id);
      if (!faith) Object.keys(source.bookmarkCompositionSources || {}).some(function (key) {
        var input = source.bookmarkCompositionSources[key] && source.bookmarkCompositionSources[key].input;
        var table = input && input.catalogs && input.catalogs.religions;
        if (!own(table,id)) return false;
        faith = table[id]; return true;
      });
      var live = faith && faith.availability && faith.availability.bookmarkIds;
      predecessorIds(live,null,512,'availability capture source.' + id);
      var current = own(faithOrders,id) ? faithOrders[id] : {ids:[],known:Object.create(null)};
      // Prepare every edge first: an invalid capture installs no partial event.
      var order = current.ids.slice(), known = Object.assign(Object.create(null),current.known);
      appendObserved(order,known,live,512);
      var bookmarkId = patch.bookmarkIds[0], index = order.indexOf(bookmarkId);
      result[id].afterBookmarkIds = index >= 0 ? order.slice(0,index) : order.slice();
      appendObserved(order,known,[bookmarkId],512);
      planned.push({id:id,order:{ids:order,known:known}});
    });
    planned.forEach(function (row) { faithOrders[row.id] = row.order; });
    faithCaptures[owner] = {fingerprint:fingerprint,patches:copy(result)};
    return copy(result);
  }
  function reset() {
    FB.invalidateCultureData(); FB.invalidateReligionData(); FB.lexicon.reset(); FB.governments.invalidate();
  }
  /* Definitions are immutable by id. Site references omit optional metadata;
     faith references retain availability edges added by other world owners. */
  function compatible(table, old, row) {
    if (table === 'settlementSites') return Object.keys(row).every(function (key) {
      return equal(old[key], row[key]);
    });
    if (table === 'religions' && old.availability && row.availability &&
        Array.isArray(old.availability.bookmarkIds) && Array.isArray(row.availability.bookmarkIds) &&
        row.availability.bookmarkIds.every(function (id) { return old.availability.bookmarkIds.indexOf(id) >= 0; })) {
      var reference = copy(old); reference.availability.bookmarkIds = row.availability.bookmarkIds;
      return equal(reference, row);
    }
    return equal(old, row);
  }
  function merge(payload, additions, base) {
    if (!plain(additions)) throw new Error('Composition catalogues must be an object.');
    Object.keys(additions).forEach(function (table) {
      if (catalogs.indexOf(table) < 0 || !plain(additions[table]))
        throw new Error('Unsupported composition catalogue: ' + table);
      Object.keys(additions[table]).forEach(function (id) {
        var row = additions[table][id], prior = own(payload[table], id) ? payload[table] : base[table];
        var old = prior && prior[id];
        if (!plain(row) && !Array.isArray(row)) throw new Error(table + '.' + id + ': invalid declaration.');
        if (own(prior, id)) {
          if (!compatible(table, old, row)) throw new Error('Conflicting composition declaration: ' + table + '.' + id);
        } else {
          payload[table] = payload[table] || {};
          payload[table][id] = copy(row);
        }
      });
    });
  }
  function availability(payload, patches, bookmarkId, base) {
    if (!plain(patches)) throw new Error('Composition availability must be an object.');
    Object.keys(patches).forEach(function (id) {
      var patch = patches[id], prior = base.religions[id];
      fields(patch, ['bookmarkIds','afterBookmarkId','afterBookmarkIds'], 'availability.' + id);
      if (!prior || !prior.availability || !Array.isArray(prior.availability.bookmarkIds) ||
          !Array.isArray(patch.bookmarkIds) || patch.bookmarkIds.length !== 1 || patch.bookmarkIds[0] !== bookmarkId)
        throw new Error('Invalid additive composition availability: ' + id);
      if (own(patch,'afterBookmarkIds')) {
        if (own(patch,'afterBookmarkId')) throw new Error('Overlapping composition availability placement: ' + id);
        predecessorIds(patch.afterBookmarkIds,bookmarkId,512,'availability.' + id);
      }
      if (own(patch,'afterBookmarkId') && patch.afterBookmarkId !== null &&
          (typeof patch.afterBookmarkId !== 'string' || patch.afterBookmarkId === bookmarkId ||
            prior.availability.bookmarkIds.indexOf(patch.afterBookmarkId) < 0))
        throw new Error('Invalid composition availability anchor: ' + id);
      if (prior.availability.bookmarkIds.indexOf(bookmarkId) >= 0) return;
      if (payload.religions && own(payload.religions, id)) throw new Error('Overlapping faith ownership: ' + id);
      var next = copy(prior), at = !own(patch,'afterBookmarkId') ? next.availability.bookmarkIds.length :
        patch.afterBookmarkId === null ? 0 : next.availability.bookmarkIds.indexOf(patch.afterBookmarkId) + 1;
      if (own(patch,'afterBookmarkIds')) at = afterIndex(next.availability.bookmarkIds,patch.afterBookmarkIds,false);
      next.availability.bookmarkIds.splice(at,0,bookmarkId);
      payload.religions = payload.religions || {}; payload.religions[id] = next;
    });
  }
  function storyPlacements(target, unit) {
    if (unit.storyAfter === undefined) return;
    if (!plain(unit.storyAfter)) throw new Error('Composition story placement must be a map.');
    Object.keys(unit.storyAfter).forEach(function (id) {
      if (!own(unit.storyInstances,id)) throw new Error('Story placement must belong to its start graph: ' + id);
      predecessorIds(unit.storyAfter[id],id,2048,'story placement.' + id);
      target[id] = copy(unit.storyAfter[id]);
    });
  }
  function orderedStories(base, additions, placements) {
    var combined = Object.assign({},base,additions), ids = Object.keys(base || {});
    Object.keys(additions || {}).forEach(function (id) {
      if (own(base,id)) return;
      var at = own(placements,id) ? afterIndex(ids,placements[id],false) : ids.length;
      ids.splice(at,0,id);
    });
    var result = {};
    ids.forEach(function (id) { result[id] = combined[id]; });
    return result;
  }
  function preparePayload(payload, worldId, base, complete, placements) {
    var normalized = FB.titleIds.normalizeMod(payload);
    var reviewBase = base;
    if (payload.storyInstances && placements && Object.keys(placements).length) {
      reviewBase = Object.assign({},base);
      reviewBase.storyInstances = orderedStories(base.storyInstances,payload.storyInstances,placements);
    }
    // Normalize for proof only. Bundled publication retains authored title
    // spellings so conversion cannot silently change mod fingerprints.
    return {payload:copy(payload), prepared:FB.mods.prepareComposition(normalized, worldId, reviewBase, complete)};
  }
  function addStart(world, unit) {
    var id = unit.definition.id;
    if (unit.bindings !== undefined) {
      fields(unit.bindings,['root','revisions'],'start bindings');
      if (unit.locations !== undefined) throw new Error('A start cannot own both locations and explicit bindings.');
      var revisions = unit.bindings.revisions === undefined ? {} : unit.bindings.revisions;
      if (!plain(revisions)) throw new Error('Start binding revisions must be a map.');
      Object.keys(revisions).forEach(function (revision) {
        if (!own(world.revisions,revision)) throw new Error('Unknown start binding revision: ' + revision);
      });
      function apply(layer, binding, revision) {
        try {
          if (binding === undefined) binding = {};
          fields(binding,['offered','after','locations','trackOverride'],'start binding');
          if (own(binding,'offered') && typeof binding.offered !== 'boolean')
            throw new Error('Start binding offered must be boolean.');
          if (Array.isArray(layer.starts)) {
            if (!own(binding,'offered')) throw new Error('An explicit start list needs an explicit offered binding.');
            if (binding.offered) {
              if (binding.after !== undefined && (!Array.isArray(binding.after) || binding.after.length > 512 ||
                  binding.after.some(function (anchor,i) {
                    return typeof anchor !== 'string' || !anchor || anchor.length > 200 || anchor === id || binding.after.indexOf(anchor) !== i;
                  }))) throw new Error('Start binding after must be a unique predecessor list.');
              var at = layer.starts.length;
              if (binding.after !== undefined) {
                at = 0;
                binding.after.forEach(function (anchor) {
                  var index = layer.starts.indexOf(anchor);
                  if (index >= 0) at = Math.max(at,index + 1);
                });
              }
              layer.starts.splice(at,0,id);
            } else if (binding.after !== undefined || binding.trackOverride !== undefined)
              throw new Error('An excluded start binding cannot own placement or tracks.');
          } else if (own(binding,'offered') || binding.after !== undefined)
            throw new Error('Offered bindings require an explicit start list.');
          if (binding.locations !== undefined) {
            if (!plain(layer.startLocations)) throw new Error('Location bindings require an explicit startLocations table.');
            layer.startLocations[id] = copy(binding.locations);
          }
          if (binding.trackOverride !== undefined) {
            if (layer.startTrackOverrides === undefined) layer.startTrackOverrides = {schema:1,entries:{}};
            if (!plain(layer.startTrackOverrides) || !plain(layer.startTrackOverrides.entries))
              throw new Error('Track bindings require a valid startTrackOverrides table.');
            layer.startTrackOverrides.entries[id] = copy(binding.trackOverride);
          }
        } catch (error) { error.compositionRevision = revision; throw error; }
      }
      apply(world,unit.bindings.root,null);
      Object.keys(world.revisions || {}).forEach(function (revision) { apply(world.revisions[revision],revisions[revision],revision); });
      return;
    }
    [world].concat(Object.keys(world.revisions || {}).map(function (key) { return world.revisions[key]; }))
      .forEach(function (layer) {
        if (Array.isArray(layer.starts) && layer.starts.indexOf(id) < 0) layer.starts.push(id);
      });
    if (unit.locations !== undefined) {
      world.startLocations = world.startLocations || {};
      world.startLocations[id] = copy(unit.locations);
    }
  }
  // Optional starts change only these binding paths. Geography, courts and
  // every other retained world field stay shared with the detached proof.
  function bindingCopy(world) {
    function layer(row) {
      var result = Object.assign({},row);
      if (Array.isArray(row.starts)) result.starts = row.starts.slice();
      if (plain(row.startLocations)) result.startLocations = Object.assign({},row.startLocations);
      if (plain(row.startTrackOverrides)) result.startTrackOverrides = Object.assign({},row.startTrackOverrides,
        {entries:Object.assign({},row.startTrackOverrides.entries)});
      return result;
    }
    var result = layer(world);
    if (world.revisions) {
      result.revisions = {};
      Object.keys(world.revisions).forEach(function (id) { result.revisions[id] = layer(world.revisions[id]); });
    }
    return result;
  }
  function messages(declarations, live) {
    var found = Object.create(null), english = FB.englishMessages();
    Object.keys(declarations || {}).forEach(function (id) {
      if (live && own(live.storyInstances, id)) return;
      var news = declarations[id].news || {};
      Object.keys(news).forEach(function (id) {
        var row = news[id], old = own(found, row.key) ? found[row.key] : english[row.key];
        if (old && (old.text !== row.text || old.forms !== undefined))
          throw new Error('Conflicting composition message: ' + row.key);
        found[row.key] = {text:row.text};
      });
    });
  }
  function build(input, live, native, authored) {
    data(input,native ? 8000000 : 250000);
    var spec = copy(input);
    fields(spec, ['id','source','bookmark','catalogs','availability','starts','startAfter'], 'composition');
    if (typeof spec.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(spec.id) || !plain(spec.bookmark))
      throw new Error('Composition needs an owner id and a complete bookmark.');
    var fingerprint = stable(authored || spec);
    if (own(owners, spec.id) && owners[spec.id] !== fingerprint)
      throw new Error('Published composition owner has changed: ' + spec.id);
    var worldId = spec.bookmark.id, units = spec.starts === undefined ? [] : spec.starts, ids = Object.create(null);
    if (typeof worldId !== 'string' || !/^[a-z0-9][a-z0-9_]*$/.test(worldId))
      throw new Error('Composition bookmark needs a stable id.');
    if (!Array.isArray(units) || units.length > 512) throw new Error('Composition starts must be a bounded list.');
    var report = {id:spec.id, source:source(spec.source), bookmarkId:worldId, ready:false, worldFaults:[], starts:[]};
    units.forEach(function (unit) {
      fields(unit, ['definition','storyInstances','locations','bindings','requires','source','after','storyAfter','faults'], 'start unit');
      var id = unit.definition && unit.definition.id;
      if (typeof id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(id) || own(ids, id))
        throw new Error('Invalid or duplicate start ownership: ' + id);
      ids[id] = true;
      report.starts.push({id:id, source:source(unit.source) || report.source, ready:false, revision:null, faults:[]});
    });
    if (spec.startAfter !== undefined && (typeof spec.startAfter !== 'string' || own(ids, spec.startAfter) ||
        live.startScenarios.filter(function (start) { return start && start.id === spec.startAfter; }).length !== 1))
      throw new Error('Composition startAfter must name one existing unowned start.');
    /* Start-owned references are installed only after that start validates.
       A world-owned dependency on an optional start is an ownership error. */
    [spec.bookmark].concat(Object.keys(spec.bookmark.revisions || {}).map(function (key) {
      return spec.bookmark.revisions[key];
    })).forEach(function (layer) {
      Object.keys(ids).forEach(function (id) {
        if (Array.isArray(layer.starts) && layer.starts.indexOf(id) >= 0 ||
            own(layer.startLocations, id) || layer.startTrackOverrides && own(layer.startTrackOverrides.entries, id))
          throw new Error('World duplicates start-owned binding: ' + id);
      });
    });
    var payload = {bookmarks:{}}; payload.bookmarks[worldId] = copy(spec.bookmark);
    merge(payload, spec.catalogs === undefined ? {} : spec.catalogs, live);
    if (plain(spec.availability)) Object.keys(spec.availability).forEach(function (id) {
      if (own(spec.catalogs && spec.catalogs.religions, id)) throw new Error('Overlapping faith ownership: ' + id);
    });
    availability(payload, spec.availability === undefined ? {} : spec.availability, worldId, live);
    var mandatoryBase = live;
    if (native && live.bookmarkCompositionReferences) {
      mandatoryBase = Object.assign({},live,{startScenarios:live.bookmarkCompositionReferences});
    }
    var base = preparePayload(payload, worldId, mandatoryBase), stage = base.prepared.data;
    // World graphs can require a reachable personal party. Those declaration
    // references prove the mandatory graph but do not publish optional starts.
    if (native) stage.startScenarios = live.startScenarios;
    messages(base.payload.storyInstances);
    var accepted = Object.create(null), storyOrder = Object.create(null), pending = units.map(function (unit, index) { return index; });
    while (pending.length) {
      var progress = false;
      function reviewStart(index) {
        var unit = units[index], status = report.starts[index], required = unit.requires === undefined ? [] : unit.requires;
        if (!Array.isArray(required) || required.length > 32 || required.some(function (id, i) {
          return typeof id !== 'string' || !own(ids, id) || required.indexOf(id) !== i || id === status.id;
        })) {
          status.faults.push('Invalid start-unit dependency list.');
        } else if (required.some(function (id) {
          return pending.some(function (i) { return report.starts[i].id === id; });
        })) return;
        else if (required.some(function (id) { return !accepted[id]; })) status.faults.push('Required start unit was rejected.');
        if (!status.faults.length) {
          try {
            if (unit.faults !== undefined) {
              if (!Array.isArray(unit.faults) || !unit.faults.length || unit.faults.length > 32 || unit.faults.some(function (fault) {
                return typeof fault !== 'string' || !fault;
              })) throw new Error('Start assembly faults must be nonempty messages.');
              throw new Error(unit.faults.join('\n'));
            }
            if (unit.after !== undefined) {
              if (spec.startAfter !== undefined) throw new Error('A start cannot own both global and per-unit placement.');
              predecessorIds(unit.after,status.id,4096,'start placement.' + status.id);
            }
            if (!native && (!Array.isArray(unit.definition.bookmarkIds) || unit.definition.bookmarkIds.length !== 1 || unit.definition.bookmarkIds[0] !== worldId))
              throw new Error('Start unit must select exactly its owning bookmark.');
            var old = stage.startScenarios.filter(function (row) { return row && row.id === status.id; });
            if (old.length > 1 || old.length && !equal(old[0], unit.definition))
              throw new Error('Conflicting composition start: ' + status.id);
            var patch = {bookmarks:{}, startScenarios:[copy(unit.definition)]};
            patch.bookmarks[worldId] = native ? bindingCopy(stage.bookmarks[worldId]) : copy(stage.bookmarks[worldId]);
            addStart(patch.bookmarks[worldId], unit);
            merge(patch, {storyInstances:unit.storyInstances === undefined ? {} : unit.storyInstances}, stage);
            var nextOrder = Object.assign(Object.create(null),storyOrder);
            storyPlacements(nextOrder,unit);
            var next = native ? prepareStart(patch,worldId,stage,nextOrder) : preparePayload(patch, worldId, stage, false, nextOrder);
            messages(next.prepared.data.storyInstances, live);
            stage = next.prepared.data; storyOrder = nextOrder; accepted[status.id] = true; status.ready = true;
          } catch (error) { status.revision = error.compositionRevision || null; status.faults.push(error.message); }
        }
        pending.splice(pending.indexOf(index), 1); progress = true;
      }
      function reviewGroup(indices) {
        if (native && indices.length > 1) {
          try {
            var batch = prepareStartBatch(indices.map(function (index) { return units[index]; }),
              worldId,stage,spec.startAfter,ids,accepted,storyOrder);
            messages(batch.prepared.data.storyInstances,live);
            stage = batch.prepared.data; storyOrder = batch.storyOrder;
            indices.forEach(function (index) {
              var status = report.starts[index];
              accepted[status.id] = true; status.ready = true;
              pending.splice(pending.indexOf(index),1);
            });
            progress = true;
            return;
          } catch (batchError) { /* Smaller groups isolate the failing unit. */ }
          // Keep authored order and accepted dependencies. A bad optional
          // start must not force every healthy sibling through its own world
          // preparation and growing story compilation.
          var middle = Math.ceil(indices.length / 2);
          reviewGroup(indices.slice(0,middle));
          reviewGroup(indices.slice(middle));
        } else indices.forEach(reviewStart);
      }
      reviewGroup(pending.slice());
      if (!progress) {
        pending.forEach(function (index) { report.starts[index].faults.push('Cyclic start-unit dependencies.'); });
        pending = [];
      }
    }
    /* Validation may follow dependencies, but publication keeps authored order. */
    var finalPayload = copy(base.payload), world = finalPayload.bookmarks[worldId];
    units.forEach(function (unit) {
      if (!accepted[unit.definition.id]) return;
      addStart(world, unit);
      finalPayload.startScenarios = finalPayload.startScenarios || [];
      finalPayload.startScenarios.push(copy(unit.definition));
      merge(finalPayload, {storyInstances:unit.storyInstances || {}}, live);
    });
    var final = preparePayload(finalPayload, worldId, live, true, storyOrder);
    messages(final.payload.storyInstances);
    if (own(live.bookmarks, worldId) && !equal(live.bookmarks[worldId], final.payload.bookmarks[worldId]))
      throw new Error('Conflicting composition world: ' + worldId);
    report.ready = true;
    var placements = Object.create(null);
    units.forEach(function (unit) { if (accepted[unit.definition.id] && unit.after !== undefined) placements[unit.definition.id] = copy(unit.after); });
    return {report:report, payload:final.payload, prepared:final.prepared, fingerprint:fingerprint,
      startAfter:spec.startAfter,placements:placements,storyPlacements:storyOrder,native:!!native};
  }
  function prepareStartBatch(units, worldId, base, startAfter, ids, accepted, previousOrder) {
    var patch = {bookmarks:{},startScenarios:[]}, order = Object.assign(Object.create(null),previousOrder);
    patch.bookmarks[worldId] = bindingCopy(base.bookmarks[worldId]);
    var waiting = units.slice(), included = Object.assign(Object.create(null),accepted);
    while (waiting.length) {
      var progress = false;
      waiting.slice().forEach(function (unit) {
        var id = unit.definition.id, required = unit.requires === undefined ? [] : unit.requires;
        if (!Array.isArray(required) || required.length > 32 || required.some(function (ref,i) {
          return typeof ref !== 'string' || !own(ids,ref) || required.indexOf(ref) !== i || ref === id;
        })) throw new Error('Invalid start-unit dependency list.');
        if (required.some(function (ref) { return !included[ref]; })) return;
        if (unit.faults !== undefined) throw new Error('Start assembly needs individual review.');
        if (unit.after !== undefined) {
          if (startAfter !== undefined) throw new Error('A start cannot own both global and per-unit placement.');
          predecessorIds(unit.after,id,4096,'start placement.' + id);
        }
        var old = base.startScenarios.filter(function (row) { return row && row.id === id; });
        if (old.length > 1 || old.length && !equal(old[0],unit.definition))
          throw new Error('Conflicting composition start: ' + id);
        addStart(patch.bookmarks[worldId],unit);
        patch.startScenarios.push(copy(unit.definition));
        merge(patch,{storyInstances:unit.storyInstances === undefined ? {} : unit.storyInstances},base);
        storyPlacements(order,unit);
        included[id] = true; waiting.splice(waiting.indexOf(unit),1); progress = true;
      });
      if (!progress) throw new Error('Cyclic start-unit dependencies.');
    }
    var result = prepareStart(patch,worldId,base,order);
    result.storyOrder = order;
    return result;
  }
  /* Native source batches have already proved their mandatory world. Adding
     one optional binding needs the canonical start/graph owners, then the
     complete final world proof. It does not repeat every world check per unit. */
  function prepareStart(payload, worldId, base, placements) {
    // The mandatory world was normalized already. Bindings introduce no title
    // fields, so another complete world normalization is unnecessary here.
    var mod = payload, live = FBDATA;
    var stage = Object.assign({},base), candidate = Object.assign({},base.bookmarks);
    candidate[worldId] = mod.bookmarks[worldId]; stage.bookmarks = candidate;
    var ids = mod.startScenarios.map(function (row) { return row.id; });
    stage.startScenarios = base.startScenarios.filter(function (row) { return ids.indexOf(row.id) < 0; }).concat(mod.startScenarios);
    stage.storyInstances = orderedStories(base.storyInstances,mod.storyInstances,placements);
    try {
      window.FBDATA = stage; reset();
      var stories = FB.stories.compile(stage.storyInstances || {});
      var worlds = FB.bookmarkRevisions(worldId,stage.bookmarks[worldId]);
      var reports = worlds.map(function (world) {
        try { return FB.startRequirementReports(mod.startScenarios,world,null,stories); }
        catch (error) { error.compositionRevision = world.revision || null; throw error; }
      });
      mod.startScenarios.forEach(function (scenario,index) {
        var hosted = false;
        worlds.forEach(function (world,worldIndex) {
          try {
            var report = reports[worldIndex][index];
            if (report.selectorFaults.length || report.faults.length) throw new Error(report.selectorFaults.concat(report.faults).join(' '));
            if (!report.matches || !report.applicable) return;
            var faults = FB.mods.startDefinitionFaults(scenario,world,stories);
            if (faults.length) throw new Error(faults.join(' '));
            hosted = true;
          } catch (error) { error.compositionRevision = world.revision || null; throw error; }
        });
        if (!hosted) throw new Error('Start is not hosted by its composition world: ' + scenario.id);
      });
      return {prepared:{data:stage,stories:stories}};
    } finally { window.FBDATA = live; reset(); }
  }
  function publication(plan, live) {
    var next = Object.assign({}, live), changed = false, payload = plan.payload;
    Object.keys(payload).forEach(function (table) {
      if (table === 'startScenarios') {
        var rows = live.startScenarios.slice(), additions = [];
        payload.startScenarios.forEach(function (start) {
          var existing = rows.findIndex(function (row) { return row && row.id === start.id; });
          if (existing >= 0) {
            if (plan.native && !equal(rows[existing],start)) { rows[existing] = copy(start); changed = true; }
            return;
          }
          additions.push(copy(start)); changed = true;
        });
        if (additions.length) {
          if (plan.startAfter !== undefined) {
            var at = rows.findIndex(function (row) { return row && row.id === plan.startAfter; }) + 1;
            Array.prototype.splice.apply(rows, [at,0].concat(additions));
          } else additions.forEach(function (start) {
            var at = own(plan.placements,start.id) ? afterIndex(rows,plan.placements[start.id],true) : rows.length;
            rows.splice(at,0,start);
          });
          next.startScenarios = rows;
        }
        if (plan.native && changed) next.startScenarios = rows;
      } else {
        var result = Object.assign({}, live[table]), touched = false;
        Object.keys(payload[table]).forEach(function (id) {
          var value = payload[table][id];
          if (own(live[table], id) && equal(live[table][id], value)) return;
          result[id] = copy(value); touched = true; changed = true;
        });
        if (touched) next[table] = table === 'storyInstances' ? orderedStories(live[table],result,plan.storyPlacements) : result;
      }
    });
    return {data:next, changed:changed};
  }
  function publishReviewed(plan) {
    var live = FBDATA, payload = {}, result = copy(plan.report);
    result.published = false; result.reused = false;
    if (FB.state || !FB.bookmarkSources || !FB.bookmarkSources.isPublishing()) {
      result.worldFaults.push('Reviewed source publication requires its active boot batch.'); return result;
    }
    try {
      // Earlier accepted dates may now provide compatible shared records.
      // Reuse them, check graph/message collisions, and compile the combined
      // registry. The complete world/start proof itself is unchanged.
      Object.keys(plan.payload).forEach(function (root) {
        if (root === 'bookmarks' || root === 'startScenarios') { payload[root] = plan.payload[root]; return; }
        var rows = {};
        Object.keys(plan.payload[root]).forEach(function (id) {
          var row = plan.payload[root][id];
          if (own(live[root],id)) {
            if (!compatible(root,live[root][id],row)) {
              // Native proof can replace an older foundation declaration. It
              // may do so only while that exact reviewed record is unchanged;
              // a conflicting intervening publication still requires review.
              if (!own(plan.replacements[root],id) || !equal(live[root][id],plan.replacements[root][id]))
                throw new Error('Conflicting composition declaration: ' + root + '.' + id);
              rows[id] = row;
            }
          } else rows[id] = row;
        });
        if (Object.keys(rows).length) payload[root] = rows;
      });
      messages(plan.payload.storyInstances);
      var next = publication(Object.assign({},plan,{payload:payload}),live);
      window.FBDATA = next.changed ? next.data : live; reset();
      if (next.data.storyInstances !== live.storyInstances) {
        var stories = FB.stories.compile(FBDATA.storyInstances || {});
        FB.stories.publish(stories,Object.keys(payload.storyInstances || {}));
      }
      if (FB.game) FB.game.SCENARIOS = FBDATA.startScenarios;
      owners[result.id] = plan.fingerprint;
      result.published = true; result.reused = !next.changed;
      return result;
    } catch (error) {
      window.FBDATA = live;
      if (FB.game) FB.game.SCENARIOS = live.startScenarios;
      reset(); result.worldFaults.push(error.message); return result;
    }
  }
  FB.bookmarkCompositions = {
    captureStarts:captureStarts,
    captureStories:captureStories,
    captureAvailability:captureAvailability,
    sourceOrder:function (view) {
      appendObserved(startStream.ids,startStream.known,(view.startScenarios || []).filter(function (row) {
        return row && typeof row.id === 'string';
      }).map(function (row) { return row.id; }),4096);
      appendObserved(storyStream.ids,storyStream.known,Object.keys(view.storyInstances || {}),2048);
      return {starts:startStream.ids.slice(),stories:storyStream.ids.slice()};
    },
    prepareSource:function (input,base,authored) { return prepare(input,base,authored); },
    reviewSource:function (input,base) { return prepare(input,base,undefined,true); },
    /* Sources stage data before engine loading. Publication waits until all
       validators/factories exist, ahead of the bundled mod baseline snapshot. */
    publishPending:function (progress, done) {
      if (FB.bookmarkSources && FB.bookmarkSources.ready()) {
        if (!FB.bookmarkSources.hasPublished()) return FB.bookmarkSources.publish(progress,done);
        FB.bookmarkSources.replay();
      }
      var pending = FBDATA.bookmarkCompositionSources || {};
      Object.keys(pending).forEach(function (key) {
        if (FB.bookmarkSources && FB.bookmarkSources.owns(key)) return;
        var source = pending[key], report;
        try {
          fields(source,['source','bookmarkId','startAfter','availabilityAfter','input','faults'],'composition source');
          if (source.faults !== undefined) {
            if (!Array.isArray(source.faults) || !source.faults.length || source.faults.some(function (fault) {
              return typeof fault !== 'string' || !fault;
            })) throw new Error('Composition source faults must be nonempty messages.');
            throw new Error(source.faults.join('\n'));
          }
          if (plain(source.input) && (source.input.id !== key ||
              !plain(source.input.bookmark) || source.input.bookmark.id !== source.bookmarkId))
            throw new Error('Composition source ownership does not match its envelope.');
          report = FB.bookmarkCompositions.prepare(source.input).publish();
          if (!report.id) report.id = key;
          if (!report.source && typeof source.source === 'string') report.source = source.source;
          if (!report.bookmarkId && typeof source.bookmarkId === 'string') report.bookmarkId = source.bookmarkId;
        } catch (error) {
          report = {id:key,source:source && typeof source.source === 'string' ? source.source : null,
            bookmarkId:source && typeof source.bookmarkId === 'string' ? source.bookmarkId : null,
            ready:false,published:false,reused:false,worldFaults:[error.message],starts:[]};
        }
        sourceReports[key] = copy(report);
        var definition = {id:report.bookmarkId};
        FB.recordBookmarkRuntimeFaults('world_definition',definition,null,report.worldFaults,report.source);
        (report.starts || []).forEach(function (start) {
          FB.recordBookmarkRuntimeFaults('start_requirements',Object.assign({},definition,{revision:start.revision}),
            {id:start.id},start.faults,start.source);
        });
      });
      var results = FB.bookmarkCompositions.sourceReports();
      if (done) done(null,results);
      return results;
    },
    sourceReports:function () {
      var native = FB.bookmarkSources && FB.bookmarkSources.ready() ? FB.bookmarkSources.reports() : [];
      return native.concat(Object.keys(sourceReports).map(function (id) { return copy(sourceReports[id]); }));
    },
    prepare:function (input) { return prepare(input); }
  };
  function prepare(input, sourceBase, authored, reviewOnly) {
      var live = FBDATA, before, english, registry, plan, failure, published;
      try {
        if (!FB.mods || !FB.stories || !FB.titleIds || !FB.buildingSeasons || typeof FB.englishMessages !== 'function')
          throw new Error('Composition validation requires the complete engine.');
        // A sealed native batch reviews once, then checks compatibility with
        // its own preceding publications. Ordinary tickets retain snapshots.
        if (!reviewOnly) {
          before = JSON.stringify(live); english = JSON.stringify(FB.englishMessages()); registry = FB.stories.list();
        }
        if (FB.state) throw new Error('Compositions publish before a campaign starts.');
        plan = build(input, sourceBase || live, !!sourceBase, authored);
        if (reviewOnly) {
          plan.replacements = {};
          Object.keys(plan.payload).forEach(function (root) {
            if (root === 'bookmarks' || root === 'startScenarios') return;
            Object.keys(plan.payload[root]).forEach(function (id) {
              if (!sourceBase || own(sourceBase[root],id) || !own(live[root],id) || compatible(root,live[root][id],plan.payload[root][id])) return;
              plan.replacements[root] = plan.replacements[root] || {};
              plan.replacements[root][id] = copy(live[root][id]);
            });
          });
          plan.prepared = null;
        }
      } catch (error) {
        function label(key) {
          var descriptor = plain(input) && Object.getOwnPropertyDescriptor(input, key);
          return descriptor && typeof descriptor.value === 'string' ? descriptor.value : null;
        }
        var worldDescriptor = plain(input) && Object.getOwnPropertyDescriptor(input, 'bookmark');
        var world = worldDescriptor && worldDescriptor.value;
        var idDescriptor = plain(world) && Object.getOwnPropertyDescriptor(world, 'id');
        failure = {id:label('id'), source:label('source'), bookmarkId:idDescriptor && typeof idDescriptor.value === 'string' ? idDescriptor.value : null,
          ready:false, revision:error.compositionRevision || null, worldFaults:[error.message], starts:[]};
      }
      function report() { return copy(plan ? plan.report : failure); }
      return {
        report:report,
        preview:function () { return plan ? copy(plan.payload) : null; },
        publish:function () {
          if (published) return copy(published);
          var result = report(); result.published = false; result.reused = false;
          if (!plan) return result;
          if (reviewOnly) return publishReviewed(plan);
          if (FB.state || FBDATA !== live || JSON.stringify(FBDATA) !== before || JSON.stringify(FB.englishMessages()) !== english ||
              registry.length !== FB.stories.list().length || registry.some(function (row, i) { return FB.stories.list()[i] !== row; })) {
            result.worldFaults.push('Composition review is stale; prepare it again.'); return result;
          }
          try {
            var next = publication(plan, live);
            reset(); window.FBDATA = next.changed ? next.data : live;
            if (FB.game) FB.game.SCENARIOS = FBDATA.startScenarios;
            if (next.data.storyInstances !== live.storyInstances)
              FB.stories.publish(plan.prepared.stories, Object.keys(plan.payload.storyInstances || {}));
            owners[result.id] = plan.fingerprint;
            result.published = true; result.reused = !next.changed;
            published = copy(result);
            return result;
          } catch (error) {
            window.FBDATA = live;
            if (FB.game) FB.game.SCENARIOS = live.startScenarios;
            reset(); result.worldFaults.push(error.message); return result;
          }
        }
      };
  }
})();
