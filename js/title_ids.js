/* Rank-scoped de jure title ids and legacy prefix migration. */
window.FB = window.FB || {};
(function () {
  'use strict';
  var T = {};
  FB.titleIds = T;
  var prefixes = { duchy:'d_', kingdom:'k_', empire:'e_' };
  var plurals = { duchy:'duchies', kingdom:'kingdoms', empire:'empires' };
  function own(o, key) {
    return !!o && Object.prototype.hasOwnProperty.call(o, key);
  }
  function titleError(text, args) { return new Error(FB.T(text, args)); }
  function copy(value) {
    if (Array.isArray(value)) return value.map(copy);
    if (!value || typeof value !== 'object') return value;
    var out = {};
    for (var key in value) if (own(value, key)) out[key] = copy(value[key]);
    return out;
  }
  function slug(rank, id) {
    if (typeof id !== 'string' || !prefixes[rank]) return null;
    var prefix = prefixes[rank];
    if (/^[dke]_[a-z]/.test(id) && id.slice(0, 2) !== prefix) return null;
    var value = id.slice(0, 2) === prefix ? id.slice(2) : id;
    return /^[a-z][a-z0-9_]*$/.test(value) ? value : null;
  }
  function resolve(rank, id, table, where) {
    var canonical = slug(rank, id);
    if (!canonical || !own(table, canonical)) throw titleError(
      'Missing {rank} title {id} in {where}.',
      { rank:rank, id:id === undefined ? '?' : id, where:where });
    return canonical;
  }
  T.resolve = function (rank, id, table) {
    var canonical = slug(rank, id);
    return canonical && own(table || FBDATA[plurals[rank]], canonical)
      ? canonical : null;
  };
  function normalizeTable(table, rank, where) {
    var out = {};
    if (!table || typeof table !== 'object' || Array.isArray(table)) return out;
    for (var id in table) if (own(table, id)) {
      var canonical = slug(rank, id);
      if (!canonical) throw titleError('Invalid {rank} title id {id} in {where}.',
        { rank:rank, id:id, where:where });
      if (own(out, canonical)) throw titleError(
        'Ambiguous {rank} title aliases for {id} in {where}.',
        { rank:rank, id:canonical, where:where });
      out[canonical] = copy(table[id]);
    }
    return out;
  }
  function titleFields(value, tables, where) {
    if (Array.isArray(value)) return value.map(function (entry, index) {
      return titleFields(entry, tables, where + '[' + index + ']');
    });
    if (!value || typeof value !== 'object') return value;
    var out = {};
    for (var key in value) if (own(value, key))
      out[key] = titleFields(value[key], tables, where + '.' + key);
    if (typeof out.targetKingdom === 'string')
      out.targetKingdom = resolve('kingdom', out.targetKingdom,
        tables.kingdoms, where + '.targetKingdom');
    var titleRank = out.titleKind || out.kind;
    if (typeof out.titleId === 'string' && prefixes[titleRank])
      out.titleId = resolve(titleRank, out.titleId,
        tables[plurals[titleRank]], where + '.titleId');
    // A settlement asset has its own opaque id and a separate typed titleId.
    if (typeof out.id === 'string' && prefixes[out.kind] && !own(out, 'titleId'))
      out.id = resolve(out.kind, out.id, tables[plurals[out.kind]], where + '.id');
    if (typeof out.ambitionTitleRegion === 'string') {
      var regionRank = out.ambitionTitleRegion.slice(0, 2) === 'd_' ? 'duchy'
        : out.ambitionTitleRegion.slice(0, 2) === 'k_' ? 'kingdom' : null;
      if (regionRank) out.ambitionTitleRegion = resolve(regionRank,
        out.ambitionTitleRegion, tables[plurals[regionRank]],
        where + '.ambitionTitleRegion');
    }
    return out;
  }
  function holyWarConfig(religions, tables) {
    for (var religionId in religions) if (own(religions, religionId)) {
      var properties = religions[religionId].properties;
      var head = properties && properties.head || religions[religionId].head;
      var config = head && head.greatHolyWar;
      if (!config) continue;
      if (config.firstTarget) config.firstTarget = resolve('kingdom',
        config.firstTarget, tables.kingdoms, 'religions.' + religionId + '.firstTarget');
      if (Array.isArray(config.crisisKingdoms))
        config.crisisKingdoms = config.crisisKingdoms.map(function (id) {
          return resolve('kingdom', id, tables.kingdoms,
            'religions.' + religionId + '.crisisKingdoms');
        });
      for (var target of config.sacredTargets || [])
        target.kingdom = resolve('kingdom', target.kingdom, tables.kingdoms,
          'religions.' + religionId + '.sacredTargets');
    }
  }
  function ambitions(rows, tables) {
    for (var record of rows || []) {
      var rank = record.tier === 5 ? 'duchy' : record.tier === 6 ? 'kingdom' : null;
      if (rank && record.region) record.region = resolve(rank, record.region,
        tables[plurals[rank]], 'historicalAmbitions.' + record.id + '.region');
      if (record.island) record.island = resolve('duchy', record.island,
        tables.duchies, 'historicalAmbitions.' + record.id + '.island');
      if (Array.isArray(record.mainland)) record.mainland = record.mainland.map(function (id) {
        return resolve('duchy', id, tables.duchies,
          'historicalAmbitions.' + record.id + '.mainland');
      });
    }
  }
  function itemArtifactTitles(items, tables) {
    var out = copy(items);
    for (var id in out) if (own(out, id) && out[id] && out[id].artifact) {
      var artifact = out[id].artifact;
      for (var rank in plurals) if (own(plurals, rank)) {
        var plural = plurals[rank];
        if (Array.isArray(artifact[plural]))
          artifact[plural] = artifact[plural].map(function (titleId) {
            return resolve(rank, titleId, tables[plural],
              'mod.items.' + id + '.artifact.' + plural);
          });
      }
    }
    return out;
  }
  T.normalizeBookmark = function (definition) {
    if (!definition || typeof definition !== 'object') return definition;
    var where = 'bookmark ' + (definition.id || '?');
    var out = Object.assign({}, definition);
    out.empires = normalizeTable(definition.empires, 'empire', where);
    out.kingdoms = normalizeTable(definition.kingdoms, 'kingdom', where);
    out.duchies = normalizeTable(definition.duchies, 'duchy', where);
    for (var kid in out.kingdoms) if (own(out.kingdoms, kid))
      out.kingdoms[kid].empire = resolve('empire',
        out.kingdoms[kid].empire, out.empires, where + '.kingdoms.' + kid);
    for (var did in out.duchies) if (own(out.duchies, did))
      out.duchies[did].kingdom = resolve('kingdom',
        out.duchies[did].kingdom, out.kingdoms, where + '.duchies.' + did);
    out.provinces = Array.isArray(definition.provinces)
      ? definition.provinces.map(function (province) {
        if (!province || province.wasteland) return province;
        var row = Object.assign({}, province);
        row.duchy = resolve('duchy', province.duchy, out.duchies,
          where + '.province.' + (province.id || '?'));
        return row;
      }) : definition.provinces;
    if (definition.realms) out.realms = titleFields(definition.realms, out, where + '.realms');
    if (definition.scripted) out.scripted = titleFields(definition.scripted, out, where + '.scripted');
    return out;
  };
  T.normalizeMod = function (mod) {
    var out = Object.assign({}, mod), tables = {
      empires:Object.assign({}, FBDATA.empires),
      kingdoms:Object.assign({}, FBDATA.kingdoms),
      duchies:Object.assign({}, FBDATA.duchies)
    };
    for (var rank in plurals) if (own(plurals, rank)) {
      var plural = plurals[rank];
      if (!own(mod, plural)) continue;
      out[plural] = normalizeTable(mod[plural], rank, 'mod.' + plural);
      Object.assign(tables[plural], out[plural]);
    }
    for (var kid in out.kingdoms || {}) if (own(out.kingdoms, kid))
      out.kingdoms[kid].empire = resolve('empire', out.kingdoms[kid].empire,
        tables.empires, 'mod.kingdoms.' + kid);
    for (var did in out.duchies || {}) if (own(out.duchies, did))
      out.duchies[did].kingdom = resolve('kingdom', out.duchies[did].kingdom,
        tables.kingdoms, 'mod.duchies.' + did);
    if (Array.isArray(mod.provinces)) out.provinces = mod.provinces.map(function (row) {
      if (!row || row.wasteland || !row.duchy) return row;
      var result = Object.assign({}, row);
      result.duchy = resolve('duchy', row.duchy, tables.duchies,
        'mod.province.' + (row.id || '?'));
      return result;
    });
    if (own(mod, 'bookmarks')) {
      if (Array.isArray(mod.bookmarks))
        out.bookmarks = mod.bookmarks.map(T.normalizeBookmark);
      else {
        out.bookmarks = {};
        for (var id in mod.bookmarks) if (own(mod.bookmarks, id))
          out.bookmarks[id] = T.normalizeBookmark(mod.bookmarks[id]);
      }
    }
    for (var key of ['events','itemPools','scripted']) if (own(mod, key))
      out[key] = titleFields(mod[key], tables, 'mod.' + key);
    if (own(mod, 'items')) out.items = itemArtifactTitles(mod.items, tables);
    if (own(mod, 'religions')) {
      out.religions = titleFields(mod.religions, tables, 'mod.religions');
      holyWarConfig(out.religions, tables);
    }
    if (own(mod, 'historicalAmbitions')) {
      out.historicalAmbitions = copy(mod.historicalAmbitions);
      ambitions(out.historicalAmbitions, tables);
    }
    if (own(mod, 'marketEndowments')) {
      out.marketEndowments = copy(mod.marketEndowments);
      if (out.marketEndowments.duchies)
        out.marketEndowments.duchies = normalizeTable(
          out.marketEndowments.duchies, 'duchy', 'mod.marketEndowments.duchies');
    }
    return out;
  };
  T.migrateState = function (state, definition) {
    var tables = T.normalizeBookmark(definition || FBDATA);
    var result = titleFields(state, tables, 'save.state');
    if (result.faiths) holyWarConfig(result.faiths, tables);
    if (result.greatHolyWarHistory && Array.isArray(result.greatHolyWarHistory.campaigns))
      for (var call of result.greatHolyWarHistory.campaigns)
        if (call.target) call.target = resolve('kingdom', call.target,
          tables.kingdoms, 'save.state.greatHolyWarHistory.campaigns.target');
    return result;
  };
})();
