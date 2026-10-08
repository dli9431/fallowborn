/* Fallowborn: the lexicon resolver (FBDATA.lexicons, data/lexicons.js).
   Political words resolve through one layered lookup: culture, then faith
   (nearest ancestor first), then government form, then era, then base, the
   most specific layer that defines a term winning. Running text reaches it
   through {term:...} placeholders (js/i18n.js), rank titles through
   FB.lexicon.rank and structured data relabels through FB.lexicon.label.
   Saved term snapshots retain the English source and catalog key, never a
   rendered translation or simulation rule. */
window.FB = window.FB || {};

(function () {
  'use strict';
  var L = FB.lexicon = {};
  /* Layer keys of FBDATA.lexicons, most specific first. */
  var LAYERS = ['cultures', 'faiths', 'governments', 'eras'];
  var FORMS = { one:true, other:true, title:true };
  var ID = /^[a-z][a-z0-9_]*$/;
  /* termId -> { layer:true } for every non-base layer that defines it, so
     a term no period overrides skips context resolution entirely. Rebuilt
     after mods or tests change FBDATA.lexicons (FB.lexicon.reset). */
  var index = null;

  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function data() { return FBDATA.lexicons || {}; }
  function entry(layer, id) {
    var table = data()[layer];
    return id && plain(table) && own(table, id) && plain(table[id]) ? table[id] : null;
  }

  L.reset = function () { index = null; };
  function definers() {
    if (index) return index;
    index = { terms:{}, rank:{}, labels:{} };
    for (var li = 0; li < LAYERS.length; li++) {
      var table = data()[LAYERS[li]];
      if (!plain(table)) continue;
      for (var id in table) if (own(table, id) && plain(table[id])) {
        var e = table[id];
        for (var termId in e.terms || {}) if (own(e.terms, termId)) {
          (index.terms[termId] = index.terms[termId] || {})[LAYERS[li]] = true;
        }
        if (e.rank) index.rank[LAYERS[li]] = true;
        if (plain(e.labels)) index.labels[LAYERS[li]] = true;
      }
    }
    return index;
  }

  /* viewer undefined means the player; null means no viewer at all. */
  function viewerChar(state, viewer) {
    if (!state || !state.chars || viewer === null) return null;
    if (viewer && typeof viewer === 'object') return viewer;
    var id = viewer || (state.player && state.player.charId);
    return id && own(state.chars, id) ? state.chars[id] : null;
  }

  /* The ids each layer reads for one lookup, resolved on first use so a
     lookup pays only for the layers that could answer it. ctx may name
     viewer (a character or id; default the player, null for none), realm,
     faith, culture
     and sex; explicit values win over the viewer's. */
  function resolver(state, ctx) {
    ctx = ctx || {};
    var cache = {}, c;
    var get = {
      viewer:function () { return viewerChar(state, ctx.viewer); },
      eras:function () { return state && FB.campaignEra ? FB.campaignEra(state) : null; },
      governments:function () {
        var subject = r('viewer');
        if (ctx.realm !== undefined && ctx.realm !== null) {
          subject = typeof ctx.realm === 'string'
            ? state && state.realms && state.realms[ctx.realm] : ctx.realm;
        }
        return state && subject ? FB.station.context(subject, state).formId : null;
      },
      faiths:function () {
        var faith = ctx.faith || ((c = r('viewer')) ? c.religion : null);
        return !faith ? [] : FB.faithLineage ? FB.faithLineage(faith, state) : [faith];
      },
      cultures:function () { return ctx.culture || ((c = r('viewer')) ? c.culture : null); },
      sex:function () { return ctx.sex || ((c = r('viewer')) ? c.sex : null); }
    };
    function r(field) {
      if (!own(cache, field)) cache[field] = get[field]();
      return cache[field];
    }
    return r;
  }
  /* Every context id at once, for diagnostics and tests. faith is the
     lineage, nearest first. */
  L.context = function (state, ctx) {
    var r = resolver(state, ctx);
    return { era:r('eras'), government:r('governments'), faith:r('faiths'),
      culture:r('cultures'), sex:r('sex') };
  };
  function layerIds(r, layer) {
    if (layer === 'faiths') return r('faiths');
    var id = r(layer);
    return id ? [id] : [];
  }

  /* Entries in resolution order, most specific first, for the layers in
     `only` (a { layer:true } map). Each row is { source, entry }, where
     source is 'eras.late_antique', 'faiths.muslim' and so on. */
  function candidates(r, only) {
    var out = [];
    for (var li = 0; li < LAYERS.length; li++) {
      var layer = LAYERS[li];
      if (!only[layer]) continue;
      var ids = layerIds(r, layer);
      for (var i = 0; i < ids.length; i++) {
        var e = entry(layer, ids[i]);
        if (e) out.push({ source:layer + '.' + ids[i], entry:e });
      }
    }
    return out;
  }

  function capitalize(text) {
    text = String(text);
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  /* The defining record of one term: { source, termId, value } with value
     the term entry from the winning layer, or null for an unknown term. */
  L.find = function (state, termId, ctx) {
    var only = definers().terms[termId];
    if (only) {
      var rows = candidates(resolver(state, ctx), only);
      for (var i = 0; i < rows.length; i++) {
        if (own(rows[i].entry.terms, termId)) {
          return { source:rows[i].source, termId:termId, value:rows[i].entry.terms[termId] };
        }
      }
    }
    var base = data().base;
    return base && plain(base.terms) && own(base.terms, termId)
      ? { source:'base', termId:termId, value:base.terms[termId] } : null;
  };

  function formOf(value, form, sex) {
    var set = sex === 'f' && plain(value.f) ? value.f : value;
    if (form === 'title') {
      if (typeof set.title === 'string') return { path:'title', text:set.title };
      return { path:'one', text:set.one, capital:true };
    }
    return { path:form, text:set[form] };
  }
  function termKey(found, path, sex) {
    var head = found.source === 'base' ? 'lexicon.base' : 'lexicon.' + found.source;
    var value = found.value;
    var sexPart = sex === 'f' && plain(value.f) ? '.f' : '';
    return head + '.terms.' + found.termId + sexPart + '.' + path + '.default';
  }

  /* Capture the winning word before its realm changes or disappears. */
  L.termSnapshot = function (state, termId, ctx) {
    ctx = ctx || {};
    var found = L.find(state, termId, ctx);
    if (!found) return { text:termId };
    var form = own(FORMS, ctx.form) ? ctx.form : 'one';
    var sex = plain(found.value.f) ? resolver(state, ctx)('sex') : null;
    var picked = formOf(found.value, form, sex);
    if (typeof picked.text !== 'string') return { text:termId };
    return { key:termKey(found, picked.path, sex), text:picked.text,
      capital:!!(picked.capital || ctx.capital) };
  };
  L.renderTermSnapshot = function (snapshot) {
    if (!snapshot || typeof snapshot.text !== 'string') return '';
    var text = snapshot.key
      ? FB.renderKey(snapshot.key, { text:snapshot.text }, {}) : snapshot.text;
    return snapshot.capital ? capitalize(text) : text;
  };

  /* One term, localized. ctx.form is one (default), other or title;
     ctx.capital capitalizes the first letter. An unknown term renders its
     id so a broken placeholder stays visible. */
  FB.term = function (state, termId, ctx) {
    return L.renderTermSnapshot(L.termSnapshot(state, termId, ctx));
  };

  /* The {term:...} placeholder body after "term:" or "Term:", for example
     "vassal.other". scope is { state, viewer } from the rendering path; the
     live game state and its player are the default. */
  L.token = function (spec, capital, scope) {
    var dot = spec.indexOf('.');
    var termId = dot >= 0 ? spec.slice(0, dot) : spec;
    var form = dot >= 0 ? spec.slice(dot + 1) : 'one';
    var state = scope && scope.state || FB.state || null;
    return FB.term(state, termId, { viewer:scope && scope.viewer || undefined,
      form:form, capital:capital });
  };

  /* The rank ladder word for tier 0 to 7. Faith-layer entries come from
     FBDATA.lexicons.faiths or, for a modded or runtime faith, from its own
     properties.rankTitles. Returns { source, faithId, sex, tier, word }. */
  L.rank = function (state, tier, ctx) {
    var r = resolver(state, ctx);
    var sex = r('sex') === 'f' ? 'f' : 'm';
    var bandIndex = Math.max(0, Math.min(FB.station.bandCount - 1, Math.floor(Number(tier) || 0)));
    function hasBand(titles) {
      return plain(titles) && Array.isArray(titles[sex]) &&
        typeof titles[sex][bandIndex] === 'string' && !!titles[sex][bandIndex];
    }
    var lineage = r('faiths');
    var legacy = lineage.length && FB.faithValue
      ? FB.faithValue(state, lineage[0], 'rankTitles') : null;
    var legacySource = legacy && plain(legacy.value) ? legacy.sourceId || lineage[0] : null;
    var only = definers().rank, found = null;
    var institutionId = r('governments'), institution = entry('governments', institutionId);
    if (institution && institution.institutionalRanks && hasBand(institution.rank))
      found = { source:'governments.' + institutionId, titles:institution.rank, faithId:null };
    for (var li = 0; li < LAYERS.length && !found; li++) {
      var layer = LAYERS[li];
      if (!only[layer] && !(layer === 'faiths' && legacySource)) continue;
      var ids = layerIds(r, layer);
      for (var i = 0; i < ids.length && !found; i++) {
        var e = entry(layer, ids[i]);
        if (e && hasBand(e.rank)) {
          found = { source:layer + '.' + ids[i], titles:e.rank,
            faithId:layer === 'faiths' ? ids[i] : null };
        } else if (layer === 'faiths' && ids[i] === legacySource && hasBand(legacy.value)) {
          found = { source:'religion.' + ids[i], titles:legacy.value, faithId:ids[i] };
        }
      }
    }
    if (!found) found = { source:'base', titles:data().base.rank, faithId:null };
    var list = Array.isArray(found.titles[sex]) ? found.titles[sex] : found.titles.m;
    var index = bandIndex;
    return { source:found.source, faithId:found.faithId, sex:sex, tier:index, word:list[index] };
  };

  /* The catalog key of a rank word from L.rank or a saved title snapshot. */
  L.rankKey = function (source, sex, tier) {
    var s = sex === 'f' ? 'f' : 'm';
    if (String(source).indexOf('religion.') === 0) {
      return source + '.rankTitles.' + s + '.' + tier + '.default';
    }
    return 'lexicon.' + source + '.rank.' + s + '.' + tier + '.default';
  };
  L.renderRank = function (record) {
    return FB.renderKey(L.rankKey(record.source, record.sex, record.tier),
      { text:record.word }, {});
  };

  /* A display relabel for structured data text, rendered, or null when no
     layer relabels it. Unit classes are relabelled through their role: a
     unitRole label names the role's default class. */
  L.label = function (state, viewer, kind, id, path) {
    if (!state) return null;
    var only = definers().labels;
    var any = false;
    for (var k in only) if (own(only, k)) { any = true; break; }
    if (!any) return null;
    var field = path || 'name';
    var lookupKind = kind, lookupId = id;
    if (kind === 'unitClass') {
      var role = FB.unitClassRole ? FB.unitClassRole(id) : null;
      if (!role || !FB.unitRoleClass || FB.unitRoleClass(role) !== id) return null;
      lookupKind = 'unitRole';
      lookupId = role;
    }
    var rows = candidates(resolver(state, { viewer:viewer }), only);
    for (var i = 0; i < rows.length; i++) {
      var labels = rows[i].entry.labels;
      var byId = plain(labels) && plain(labels[lookupKind]) ? labels[lookupKind][lookupId] : null;
      if (plain(byId) && typeof byId[field] === 'string') {
        return FB.renderKey('lexicon.' + rows[i].source + '.labels.' + lookupKind + '.' +
          lookupId + '.' + field + '.default', { text:byId[field] }, {});
      }
    }
    return null;
  };

  /* Data faults for the bookmark validator. extra maps a layer to ids a
     mod is adding in the same change (faiths or cultures), counted as known. */
  L.validate = function (extra) {
    var errors = [], lex = FBDATA.lexicons;
    function fault(where, text) { errors.push('Lexicon ' + where + ': ' + text); }
    function checkTerms(where, terms, base) {
      if (terms === undefined) return;
      if (!plain(terms)) { fault(where, 'terms must be an object.'); return; }
      for (var termId in terms) if (own(terms, termId)) {
        var value = terms[termId];
        if (!ID.test(termId)) fault(where, 'invalid term id ' + termId + '.');
        else if (!base && !own(lex.base.terms, termId)) {
          fault(where, 'term ' + termId + ' is not a base term.');
        }
        var sets = plain(value) ? [value].concat(plain(value.f) ? [value.f] : []) : [];
        if (!sets.length) fault(where, 'term ' + termId + ' needs one and other forms.');
        for (var si = 0; si < sets.length; si++) {
          if (typeof sets[si].one !== 'string' || typeof sets[si].other !== 'string' ||
              (sets[si].title !== undefined && typeof sets[si].title !== 'string')) {
            fault(where, 'term ' + termId + ' needs one and other forms.');
          }
        }
      }
    }
    function checkRank(where, rank, ladder) {
      if (rank === undefined) return;
      if (!FB.station.titlesValid(rank, ladder)) {
        fault(where, 'rank needs m and f labels for every used ladder band.');
      }
    }
    if (!plain(lex) || !plain(lex.base) || !plain(lex.base.terms) || !plain(lex.base.rank)) {
      return ['Lexicon base terms and rank ladder are missing.'];
    }
    checkTerms('base', lex.base.terms, true);
    checkRank('base', lex.base.rank);
    var tables = { eras:FBDATA.eras, governments:FBDATA.governmentForms,
      faiths:FBDATA.religions, cultures:FBDATA.cultures };
    for (var li = 0; li < LAYERS.length; li++) {
      var layer = LAYERS[li], table = lex[layer];
      if (table === undefined) continue;
      if (!plain(table)) { fault(layer, 'must be an object.'); continue; }
      for (var id in table) if (own(table, id)) {
        var where = layer + '.' + id, e = table[id];
        if (!plain(e)) { fault(where, 'must be an object.'); continue; }
        if (e.institutionalRanks !== undefined && (layer !== 'governments' || typeof e.institutionalRanks !== 'boolean'))
          fault(where, 'institutionalRanks must be a government boolean.');
        if (!own(tables[layer], id) && !(extra && own(extra[layer], id))) {
          fault(where, 'names an unknown ' + layer + ' id.');
        }
        checkTerms(where, e.terms, false);
        checkRank(where, e.rank, layer === 'eras' ? FB.station.definition({ era:id }, null) :
          layer === 'governments' ? FB.station.definition({ formId:id }, null) : undefined);
        if (e.labels !== undefined && !plain(e.labels)) fault(where, 'labels must be an object.');
      }
    }
    return errors;
  };
})();
