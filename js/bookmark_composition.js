/* Trusted, detached world/start ownership units. Ordinary JSON mods retain
   their own atomic validation and fingerprint owner in js/mods.js. */
(function () {
  'use strict';
  var owners = Object.create(null);
  var catalogs = ['geographies','cultures','cultureDoctrineDefaults','religions','governmentForms',
    'settlementSites','settlementLayouts','administrationProfiles','aristocraticProfiles',
    'civicProfiles','constituencyProfiles','ecclesiasticalProfiles','mobileProfiles','storyInstances'];
  function own(value, key) { return !!value && Object.prototype.hasOwnProperty.call(value, key); }
  function plain(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
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
  function data(value) {
    var count = 0, ancestors = [];
    function walk(row, depth) {
      if (++count > 250000 || depth > 64) throw new Error('Composition exceeds its data limits.');
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
      fields(patch, ['bookmarkIds'], 'availability.' + id);
      if (!prior || !prior.availability || !Array.isArray(prior.availability.bookmarkIds) ||
          !Array.isArray(patch.bookmarkIds) || patch.bookmarkIds.length !== 1 || patch.bookmarkIds[0] !== bookmarkId)
        throw new Error('Invalid additive composition availability: ' + id);
      if (prior.availability.bookmarkIds.indexOf(bookmarkId) >= 0) return;
      if (payload.religions && own(payload.religions, id)) throw new Error('Overlapping faith ownership: ' + id);
      var next = copy(prior); next.availability.bookmarkIds.push(bookmarkId);
      payload.religions = payload.religions || {}; payload.religions[id] = next;
    });
  }
  function preparePayload(payload, worldId, base, complete) {
    var normalized = FB.titleIds.normalizeMod(payload);
    return {payload:normalized, prepared:FB.mods.prepareComposition(normalized, worldId, base, complete)};
  }
  function addStart(world, unit) {
    var id = unit.definition.id;
    [world].concat(Object.keys(world.revisions || {}).map(function (key) { return world.revisions[key]; }))
      .forEach(function (layer) {
        if (Array.isArray(layer.starts) && layer.starts.indexOf(id) < 0) layer.starts.push(id);
      });
    if (unit.locations !== undefined) {
      world.startLocations = world.startLocations || {};
      world.startLocations[id] = copy(unit.locations);
    }
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
  function build(input, live) {
    data(input);
    var spec = copy(input);
    fields(spec, ['id','source','bookmark','catalogs','availability','starts'], 'composition');
    if (typeof spec.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(spec.id) || !plain(spec.bookmark))
      throw new Error('Composition needs an owner id and a complete bookmark.');
    var fingerprint = stable(spec);
    if (own(owners, spec.id) && owners[spec.id] !== fingerprint)
      throw new Error('Published composition owner has changed: ' + spec.id);
    var worldId = spec.bookmark.id, units = spec.starts === undefined ? [] : spec.starts, ids = Object.create(null);
    if (typeof worldId !== 'string' || !/^[a-z0-9][a-z0-9_]*$/.test(worldId))
      throw new Error('Composition bookmark needs a stable id.');
    if (!Array.isArray(units) || units.length > 512) throw new Error('Composition starts must be a bounded list.');
    var report = {id:spec.id, source:source(spec.source), bookmarkId:worldId, ready:false, worldFaults:[], starts:[]};
    units.forEach(function (unit) {
      fields(unit, ['definition','storyInstances','locations','requires','source'], 'start unit');
      var id = unit.definition && unit.definition.id;
      if (typeof id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(id) || own(ids, id))
        throw new Error('Invalid or duplicate start ownership: ' + id);
      ids[id] = true;
      report.starts.push({id:id, source:source(unit.source) || report.source, ready:false, revision:null, faults:[]});
    });
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
    var base = preparePayload(payload, worldId, live), stage = base.prepared.data;
    messages(base.payload.storyInstances);
    var accepted = Object.create(null), pending = units.map(function (unit, index) { return index; });
    while (pending.length) {
      var progress = false;
      pending.slice().forEach(function (index) {
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
            if (!Array.isArray(unit.definition.bookmarkIds) || unit.definition.bookmarkIds.length !== 1 || unit.definition.bookmarkIds[0] !== worldId)
              throw new Error('Start unit must select exactly its owning bookmark.');
            var old = stage.startScenarios.filter(function (row) { return row && row.id === status.id; });
            if (old.length > 1 || old.length && !equal(old[0], unit.definition))
              throw new Error('Conflicting composition start: ' + status.id);
            var patch = {bookmarks:{}, startScenarios:[copy(unit.definition)]};
            patch.bookmarks[worldId] = copy(stage.bookmarks[worldId]); addStart(patch.bookmarks[worldId], unit);
            merge(patch, {storyInstances:unit.storyInstances === undefined ? {} : unit.storyInstances}, stage);
            var next = preparePayload(patch, worldId, stage);
            messages(next.prepared.data.storyInstances, live);
            stage = next.prepared.data; accepted[status.id] = true; status.ready = true;
          } catch (error) { status.revision = error.compositionRevision || null; status.faults.push(error.message); }
        }
        pending.splice(pending.indexOf(index), 1); progress = true;
      });
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
    var final = preparePayload(finalPayload, worldId, live, true);
    messages(final.payload.storyInstances);
    if (own(live.bookmarks, worldId) && !equal(live.bookmarks[worldId], final.payload.bookmarks[worldId]))
      throw new Error('Conflicting composition world: ' + worldId);
    report.ready = true;
    return {report:report, payload:final.payload, prepared:final.prepared, fingerprint:fingerprint};
  }
  function publication(plan, live) {
    var next = Object.assign({}, live), changed = false, payload = plan.payload;
    Object.keys(payload).forEach(function (table) {
      if (table === 'startScenarios') {
        var rows = live.startScenarios.slice();
        payload.startScenarios.forEach(function (start) {
          if (rows.some(function (row) { return row && row.id === start.id; })) return;
          rows.push(copy(start)); changed = true;
        });
        if (rows.length !== live.startScenarios.length) next.startScenarios = rows;
      } else {
        var result = Object.assign({}, live[table]), touched = false;
        Object.keys(payload[table]).forEach(function (id) {
          var value = plan.prepared.data[table][id];
          if (own(live[table], id) && equal(live[table][id], value)) return;
          result[id] = value; touched = true; changed = true;
        });
        if (touched) next[table] = result;
      }
    });
    return {data:next, changed:changed};
  }
  FB.bookmarkCompositions = {
    prepare:function (input) {
      var live = FBDATA, before = JSON.stringify(live), english = JSON.stringify(FB.englishMessages());
      var registry = FB.stories.list(), plan, failure, published;
      try {
        if (FB.state) throw new Error('Compositions publish before a campaign starts.');
        plan = build(input, live);
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
  };
})();
