/* Fallowborn — browser localization, catalog loading, and pure rendering.
   English remains authoritative in source and is always the final fallback. */
window.FB = window.FB || {};
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  const CATALOG_SCHEMA = 1;
  const HASH_SCHEMA = 1;
  const LANG_KEY = 'fb_lang';
  const TOKEN_RX = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  const LOCALES = [
    { code: 'en', name: 'English', dir: 'ltr', status: 'supported', file: null },
    { code: 'fr', name: 'Français', dir: 'ltr', status: 'preview', file: 'data/lang_fr.js' },
    { code: 'de', name: 'Deutsch', dir: 'ltr', status: 'preview', file: 'data/lang_de.js' },
    { code: 'it', name: 'Italiano', dir: 'ltr', status: 'preview', file: 'data/lang_it.js' },
    { code: 'es', name: 'Español', dir: 'ltr', status: 'preview', file: 'data/lang_es.js' },
    { code: 'qps', name: 'Pseudo (development)', dir: 'ltr', status: 'development',
      file: 'data/lang_qps.js', development: true }
  ];
  const EN_WORDS = {
    child: { m: 'son', f: 'daughter', x: 'child' },
    parent: { m: 'father', f: 'mother', x: 'parent' },
    sibling: { m: 'brother', f: 'sister', x: 'sibling' },
    spouse: { m: 'husband', f: 'wife', x: 'spouse' },
    monarch: { m: 'king', f: 'queen', x: 'monarch' },
    noble: { m: 'lord', f: 'lady', x: 'noble' },
    pronoun: { m: 'he', f: 'she', x: 'they' },
    possess: { m: 'his', f: 'her', x: 'their' }
  };
  const diagnostics = [];
  let requested = 'en';
  let activeCatalog = null;
  let pendingCatalog = null;
  let lastKey = '';

  FBDATA.lang = FBDATA.lang || {};
  FB.locale = 'en';
  FB.LOCALES = LOCALES.slice();
  FB.I18N_CATALOG_SCHEMA = CATALOG_SCHEMA;
  FB.I18N_HASH_SCHEMA = HASH_SCHEMA;

  function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function localeDef(code) {
    for (let i = 0; i < LOCALES.length; i++) if (LOCALES[i].code === code) return LOCALES[i];
    return null;
  }
  function devMode() {
    return location && location.search && /(?:\?|&)i18nDev=1(?:&|$)/.test(location.search);
  }
  function note(kind, key, detail) {
    if (diagnostics.length >= 250) return;
    diagnostics.push({ kind: kind, key: key || '', detail: detail || '' });
  }
  function stable(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
      const bits = [];
      for (let i = 0; i < value.length; i++) bits.push(stable(value[i]));
      return '[' + bits.join(',') + ']';
    }
    const keys = Object.keys(value).sort();
    const out = [];
    for (let j = 0; j < keys.length; j++) out.push(JSON.stringify(keys[j]) + ':' + stable(value[keys[j]]));
    return '{' + out.join(',') + '}';
  }
  function tokensOfRecord(record) {
    const found = {};
    function add(value) {
      if (typeof value === 'string') {
        let m;
        TOKEN_RX.lastIndex = 0;
        while ((m = TOKEN_RX.exec(value))) found[m[1]] = 1;
      } else if (value && typeof value === 'object') {
        for (const key in value) if (own(value, key)) add(value[key]);
      }
    }
    add(record);
    return Object.keys(found).sort();
  }
  function tokenInstancesOfRecord(record) {
    const found = [];
    function add(value) {
      if (typeof value === 'string') {
        let m;
        TOKEN_RX.lastIndex = 0;
        while ((m = TOKEN_RX.exec(value))) found.push(m[1]);
      } else if (value && typeof value === 'object') {
        for (const key in value) if (own(value, key)) add(value[key]);
      }
    }
    add(record);
    return found.sort();
  }
  function canonical(record) {
    return stable({
      schema: HASH_SCHEMA,
      record: record,
      tokens: tokensOfRecord(record)
    });
  }
  function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function sourceHash(record) {
    return 'h' + HASH_SCHEMA + '-' + hashString(canonical(plainRecord(record)));
  }
  function sourceKey(text) { return 'src.' + hashString(String(text)); }
  function plainRecord(source) {
    if (source && typeof source === 'object') {
      if (typeof source.text === 'string') return { text: source.text };
      if (source.forms) return { forms: source.forms };
    }
    return { text: String(source === undefined || source === null ? '' : source) };
  }
  function validLeaf(value, depth) {
    depth = depth || 0;
    if (depth > 1) return false;
    if (typeof value === 'string') return true;
    if (!value || typeof value !== 'object') return false;
    if (value.select !== 'plural' && value.select !== 'value') return false;
    if (typeof value.param !== 'string' || !value.param || !value.cases || typeof value.cases !== 'object') return false;
    if (!own(value.cases, 'other')) return false;
    for (const key in value.cases) {
      if (!own(value.cases, key)) continue;
      const child = value.cases[key];
      if (typeof child !== 'string') {
        if (!child || typeof child !== 'object' || child.select === undefined) return false;
        for (const nested in child.cases || {}) {
          if (own(child.cases, nested) && typeof child.cases[nested] !== 'string') return false;
        }
        if (!validLeaf(child, depth + 1)) return false;
      }
    }
    return true;
  }
  function validEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;
    if (typeof entry.text === 'string') return entry.forms === undefined;
    return entry.text === undefined && validLeaf(entry.forms);
  }
  const PLURAL_CASES = {
    zero: 1, one: 1, two: 1, few: 1, many: 1, other: 1
  };
  function alignedRecords(source, translated, leafCheck) {
    const sourceRecord = plainRecord(source);
    const targetRecord = plainRecord(translated);
    if (typeof sourceRecord.text === 'string') {
      return typeof targetRecord.text === 'string' &&
        leafCheck(sourceRecord.text, targetRecord.text);
    }
    if (!sourceRecord.forms || !targetRecord.forms) return false;
    function alignedLeaf(sourceLeaf, targetLeaf, depth) {
      if (typeof sourceLeaf === 'string') {
        return typeof targetLeaf === 'string' && leafCheck(sourceLeaf, targetLeaf);
      }
      if (!sourceLeaf || !targetLeaf || typeof sourceLeaf !== 'object' ||
        typeof targetLeaf !== 'object' || depth > 1 ||
        sourceLeaf.select !== targetLeaf.select ||
        sourceLeaf.param !== targetLeaf.param ||
        !sourceLeaf.cases || !targetLeaf.cases) return false;
      const sourceCases = sourceLeaf.cases;
      const targetCases = targetLeaf.cases;
      for (const sourceCase in sourceCases) {
        if (!own(sourceCases, sourceCase)) continue;
        if (!own(targetCases, sourceCase) ||
          !alignedLeaf(sourceCases[sourceCase], targetCases[sourceCase], depth + 1)) {
          return false;
        }
      }
      for (const targetCase in targetCases) {
        if (!own(targetCases, targetCase) || own(sourceCases, targetCase)) continue;
        /* A target language may require CLDR plural categories that English
           does not select. Their source contract is English's `other` form.
           Exact-value selectors may not invent semantic cases. */
        if (sourceLeaf.select !== 'plural' || !own(PLURAL_CASES, targetCase) ||
          !alignedLeaf(sourceCases.other, targetCases[targetCase], depth + 1)) {
          return false;
        }
      }
      return true;
    }
    return alignedLeaf(sourceRecord.forms, targetRecord.forms, 0);
  }
  function leafShape(value) {
    if (typeof value === 'string') return 'text';
    if (!value || typeof value !== 'object') return 'invalid';
    const keys = Object.keys(value.cases || {}).sort();
    const cases = [];
    for (let i = 0; i < keys.length; i++) {
      cases.push([keys[i], leafShape(value.cases[keys[i]])]);
    }
    return [value.select, value.param, cases];
  }
  function recordShape(record) {
    const plain = plainRecord(record);
    return typeof plain.text === 'string'
      ? ['record-text']
      : ['record-forms', leafShape(plain.forms)];
  }
  function sameShape(source, translated) {
    return alignedRecords(source, translated, function () { return true; });
  }
  function pluralCategory(catalog, n) {
    if (catalog && typeof catalog.pluralCategory === 'function') {
      const result = catalog.pluralCategory(Math.abs(Number(n)));
      if (/^(?:zero|one|two|few|many|other)$/.test(result)) return result;
    }
    return Math.abs(Number(n)) === 1 ? 'one' : 'other';
  }
  function selectLeaf(leaf, params, catalog, depth) {
    if (typeof leaf === 'string') return leaf;
    if (!validLeaf(leaf) || depth > 1) return '';
    const value = params ? params[leaf.param] : undefined;
    const choice = leaf.select === 'plural'
      ? pluralCategory(catalog, value)
      : String(value === undefined || value === null ? 'other' : value);
    const next = own(leaf.cases, choice) ? leaf.cases[choice] : leaf.cases.other;
    return selectLeaf(next, params, catalog, depth + 1);
  }
  function renderRecord(record, params, catalog) {
    const text = record.forms ? selectLeaf(record.forms, params || {}, catalog, 0) : record.text;
    return FB.tsub(text, params);
  }
  function displayMessageParams(params, context) {
    const out = {};
    const state = context && context.state;
    const viewer = context && context.viewer;
    for (const key in (params || {})) {
      if (!own(params, key)) continue;
      const value = params[key];
      if (value && typeof value === 'object' && value.$data && value.id) {
        const tables = {
          item: FBDATA.items, building: FBDATA.buildings, holding: FBDATA.holdings,
          plot: FBDATA.plots, tech: FBDATA.tech, trait: FBDATA.traits,
          ailment: FBDATA.ailments, culture: FBDATA.cultures, religion: FBDATA.religions
        };
        const def = tables[value.$data] && tables[value.$data][value.id];
        out[key] = def && state
          ? FB.dataText(state, viewer, value.$data, value.id, def, value.path || 'name', {})
          : value.id;
        if (value.transform === 'lower') out[key] = String(out[key]).toLowerCase();
        if (def && value.icon) out[key] = (def.icon || '') + (def.icon ? ' ' : '') + out[key];
      } else if (value && typeof value === 'object' && value.$message &&
        typeof value.$message.key === 'string') {
        out[key] = FB.renderMessage(value.$message, context || {});
      } else if (value && typeof value === 'object' && value.$title) {
        out[key] = FB.renderTitleSnapshot(value.$title);
      } else {
        out[key] = value;
      }
    }
    return out;
  }
  function sameTokens(source, translated) {
    return alignedRecords(source, translated, function (sourceLeaf, targetLeaf) {
      return stable(tokenInstancesOfRecord(sourceLeaf)) ===
        stable(tokenInstancesOfRecord(targetLeaf));
    });
  }
  function emojiList(record) {
    const text = stable(plainRecord(record));
    const base = '(?:[\\u2600-\\u27BF]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF])';
    const found = text.match(new RegExp(base +
      '(?:[\\uFE0E\\uFE0F]|[\\uD83C][\\uDFFB-\\uDFFF]|\\u200D' + base + ')*', 'g')) || [];
    return found.sort().join('');
  }
  function sameEmoji(source, translated) {
    return alignedRecords(source, translated, function (sourceLeaf, targetLeaf) {
      return emojiList(sourceLeaf) === emojiList(targetLeaf);
    });
  }
  function pseudoText(text) {
    const map = {
      A: 'Å', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'Ë', F: 'Ƒ', G: 'Ğ', H: 'Ħ', I: 'Ï',
      J: 'Ĵ', K: 'Ķ', L: 'Ŀ', M: 'M', N: 'Ñ', O: 'Ö', P: 'Þ', Q: 'Q', R: 'Ŕ',
      S: 'Š', T: 'Ŧ', U: 'Ü', V: 'V', W: 'Ŵ', X: 'X', Y: 'Ÿ', Z: 'Ž',
      a: 'å', b: 'ƀ', c: 'ç', d: 'ð', e: 'ë', f: 'ƒ', g: 'ğ', h: 'ħ', i: 'ï',
      j: 'ĵ', k: 'ķ', l: 'ŀ', m: 'm', n: 'ñ', o: 'ö', p: 'þ', q: 'q', r: 'ŕ',
      s: 'š', t: 'ŧ', u: 'ü', v: 'v', w: 'ŵ', x: 'x', y: 'ÿ', z: 'ž'
    };
    const chunks = String(text).split(/(\{[A-Za-z_][A-Za-z0-9_]*\})/g);
    for (let i = 0; i < chunks.length; i += 2) {
      chunks[i] = chunks[i].replace(/[A-Za-z]/g, function (c) { return map[c] || c; });
    }
    const joined = chunks.join('');
    const expansion = new Array(Math.max(2, Math.round(joined.length * 0.3) + 1)).join('~');
    return '⟦' + joined + ' ' + expansion + '⟧';
  }
  function pseudoRecord(source) {
    function walk(value, key) {
      if (typeof value === 'string') {
        return key === 'select' || key === 'param' ? value : pseudoText(value);
      }
      const out = {};
      for (const childKey in value) {
        if (own(value, childKey)) out[childKey] = walk(value[childKey], childKey);
      }
      return out;
    }
    return walk(source, '');
  }
  function translatedEntry(key, source) {
    lastKey = key;
    if (!activeCatalog || FB.locale === 'en') return null;
    if (activeCatalog.pseudo) return pseudoRecord(source);
    const entry = activeCatalog.entries && activeCatalog.entries[key];
    if (!entry) return null;
    if (!validEntry(entry)) { note('invalid', key, 'record shape'); return null; }
    if (!sameShape(source, entry)) { note('invalid', key, 'selector shape'); return null; }
    const expected = sourceHash(source);
    if (entry.hash !== expected) { note('stale', key, entry.hash || 'missing hash'); return null; }
    if (!sameTokens(source, entry)) { note('tokens', key, 'placeholder mismatch'); return null; }
    if (!sameEmoji(source, entry)) { note('emoji', key, 'emoji mismatch'); return null; }
    return entry;
  }
  function lookup(key, source) {
    const record = plainRecord(source);
    const translated = translatedEntry(key, record);
    if (translated) return translated;
    /* Generated source aliases let repeated display text share one translation
       while owner-aware event/data keys remain the preferred stable identity. */
    const alias = sourceKey(record.text !== undefined ? record.text : stable(record.forms));
    if (alias !== key) {
      const viaSource = translatedEntry(alias, record);
      if (viaSource) return viaSource;
    }
    if (FB.locale !== 'en') note('missing', key, '');
    return record;
  }
  function viewerChar(state, viewer) {
    if (!state) return null;
    if (viewer && typeof viewer === 'object') return viewer;
    if (typeof viewer === 'string' && state.chars) return state.chars[viewer] || null;
    return null;
  }
  function branchOf(state, viewer, value) {
    if (!value || typeof value !== 'object' || value.text !== undefined || value.forms) {
      return { branch: 'default', value: value };
    }
    const c = viewerChar(state, viewer);
    const rel = c && FB.religionOf ? FB.religionOf(c.religion) : null;
    const group = rel ? rel.group : 'default';
    return {
      branch: own(value, group) ? group : 'default',
      value: own(value, group) ? value[group] : value.default
    };
  }
  function getPath(obj, path) {
    if (!path) return obj;
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length && cur != null; i++) cur = cur[parts[i]];
    return cur;
  }
  function displayParams(state, viewer, source, ctx) {
    if (FB.textParams) return FB.textParams(state, viewer, source, ctx, false);
    return ctx || {};
  }
  function renderSource(state, viewer, key, source, ctx) {
    if (source === undefined || source === null) return '';
    const record = plainRecord(source);
    const params = displayParams(state, viewer, source, ctx);
    return renderRecord(lookup(key, record), params, activeCatalog);
  }

  FB.i18nHash = function (record) { return sourceHash(plainRecord(record)); };
  FB.i18nSourceKey = sourceKey;
  FB.i18nDiagnostics = function () { return diagnostics.slice(); };
  FB.pluralCategory = function (locale, n) {
    const cat = locale === FB.locale ? activeCatalog : FBDATA.lang[locale];
    return pluralCategory(cat, n);
  };
  FB.tsub = function (text, params) {
    if (typeof text !== 'string' || !params || text.indexOf('{') < 0) return text;
    return text.replace(TOKEN_RX, function (whole, key) {
      const value = params[key];
      return value === undefined || value === null ? whole : String(value);
    });
  };
  FB.T = function (english, params) {
    const source = { text: String(english) };
    return renderRecord(lookup('ui:' + english, source), params || {}, activeCatalog);
  };
  FB.TC = function (context, english, params) {
    const key = 'ui@' + encodeURIComponent(String(context)) + ':' + english;
    return renderRecord(lookup(key, { text: String(english) }), params || {}, activeCatalog);
  };
  FB.L = function (english, params) {
    const source = { text: String(english) };
    return renderRecord(lookup(sourceKey(source.text), source), params || {}, activeCatalog);
  };
  FB.renderKey = function (key, englishRecord, params) {
    const source = plainRecord(englishRecord);
    return renderRecord(lookup(key, source), params || {}, activeCatalog);
  };
  FB.renderMessage = function (message, context) {
    if (!message || typeof message.key !== 'string') return '';
    const source = FB.englishMessage(message.key) || (FBDATA.lang.en && FBDATA.lang.en.entries &&
      FBDATA.lang.en.entries[message.key]);
    if (!source) { note('unknown-message', message.key, ''); return message.key; }
    const params = displayMessageParams(message.params || {}, context || {});
    return renderRecord(lookup(message.key, source), params, activeCatalog);
  };
  FB.newsText = function (entry, state, viewer) {
    if (!entry) return '';
    return entry.msg ? FB.renderMessage(entry.msg, { state: state, viewer: viewer }) : (entry.t || '');
  };
  FB.word = function (concept, features) {
    const words = (activeCatalog && activeCatalog.words) || {};
    const set = words[concept] || EN_WORDS[concept];
    if (!set) return concept;
    const value = features && (features.sex || features.value);
    const word = set[value] || set.x || set.other || set.m || concept;
    return activeCatalog && activeCatalog.pseudo ? pseudoText(word) : word;
  };
  FB.eventText = function (state, viewer, ev, path, ctx) {
    const selected = branchOf(state, viewer, getPath(ev, path));
    return renderSource(state, viewer,
      'event.' + ev.id + '.' + path + '.' + selected.branch, selected.value, ctx);
  };
  FB.eventMessage = function (state, viewer, ev, path, ctx) {
    const selected = branchOf(state, viewer, getPath(ev, path));
    const key = 'event.' + ev.id + '.' + path + '.' + selected.branch;
    const params = FB.textParams
      ? FB.textParams(state, viewer, selected.value, ctx, true)
      : (ctx || {});
    FB.registerMessage(key, plainRecord(selected.value));
    return FB.message(key, params);
  };
  FB.dataText = function (state, viewer, kind, id, def, path, ctx) {
    const selected = branchOf(state, viewer, path ? getPath(def, path) : def);
    const suffix = path ? '.' + path : '';
    return renderSource(state, viewer,
      kind + '.' + id + suffix + '.' + selected.branch, selected.value, ctx);
  };
  FB.formatSource = function (state, viewer, source, ctx) {
    const selected = branchOf(state, viewer, source);
    const raw = selected.value;
    const key = sourceKey(typeof raw === 'string' ? raw : stable(raw));
    return renderSource(state, viewer, key, raw, ctx);
  };

  function validateCatalog(catalog, code) {
    if (!catalog || catalog.schema !== CATALOG_SCHEMA || catalog.code !== code ||
      typeof catalog.name !== 'string' || !/^(?:ltr|rtl)$/.test(catalog.dir) ||
      !catalog.entries || typeof catalog.entries !== 'object' ||
      typeof catalog.pluralCategory !== 'function') return false;
    for (const key in catalog.entries) {
      if (own(catalog.entries, key) && !validEntry(catalog.entries[key])) return false;
    }
    return true;
  }
  function setDocumentMeta(code, dir) {
    document.documentElement.setAttribute('lang', code === 'qps' ? 'en-x-pseudo' : code);
    document.documentElement.setAttribute('dir', dir || 'ltr');
  }
  function useEnglish(reason) {
    if (reason) note('fallback', requested, reason);
    FB.locale = 'en';
    activeCatalog = FBDATA.lang.en || null;
    pendingCatalog = null;
    setDocumentMeta('en', 'ltr');
    try { localStorage.setItem(LANG_KEY, 'en'); } catch (e) { /* storage may be unavailable */ }
  }
  function applyStatic(root) {
    /* English is the committed source of truth: static index.html already holds
       correct English, using charset-safe HTML entities (&mdash;, &#9881;, …)
       for every non-ASCII glyph. Overwriting textContent with the raw data-i18n
       attribute value gains nothing for English, and when a host serves
       index.html as non-UTF-8 (itch.io does) it swaps that safe entity text for
       a mojibake raw literal — the em-dash/⚙ garble seen on the title screen.
       Skip English entirely, matching localizeTree/translateKnownText. */
    if (FB.locale === 'en') return;
    const scope = root || document;
    const nodes = scope.querySelectorAll('[data-i18n]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const source = el.getAttribute('data-i18n') || el.textContent;
      el.textContent = FB.T(source);
    }
    const attrs = [
      ['data-i18n-title', 'title'],
      ['data-i18n-placeholder', 'placeholder'],
      ['data-i18n-aria-label', 'aria-label']
    ];
    for (let a = 0; a < attrs.length; a++) {
      const list = scope.querySelectorAll('[' + attrs[a][0] + ']');
      for (let j = 0; j < list.length; j++) {
        const sourceAttr = list[j].getAttribute(attrs[a][0]) || list[j].getAttribute(attrs[a][1]);
        list[j].setAttribute(attrs[a][1], FB.T(sourceAttr));
      }
    }
  }
  FB.localizeDocument = applyStatic;

  const knownTranslationCache = Object.create ? Object.create(null) : {};
  let translatedExactValues = null;
  function isTranslatedOutput(source) {
    if (!activeCatalog || activeCatalog.pseudo) return false;
    if (!translatedExactValues) {
      translatedExactValues = Object.create ? Object.create(null) : {};
      function add(value, key) {
        if (typeof value === 'string') {
          if (key !== 'select' && key !== 'param') translatedExactValues[value] = 1;
        } else if (value && typeof value === 'object') {
          for (const child in value) {
            if (own(value, child) && child !== 'hash') add(value[child], child);
          }
        }
      }
      for (const key in activeCatalog.entries) {
        if (own(activeCatalog.entries, key)) add(activeCatalog.entries[key], '');
      }
    }
    return own(translatedExactValues, source);
  }
  function knownTranslation(source) {
    if (own(knownTranslationCache, source)) return knownTranslationCache[source];
    /* Explicitly localized output can share spelling with another English
       source. Do not feed it through the legacy exact-node pass a second time. */
    if (isTranslatedOutput(source)) return null;
    const entries = FBDATA.lang.en && FBDATA.lang.en.entries;
    const key = sourceKey(source);
    const record = entries && entries[key];
    if (!record || record.text !== source) return null;
    const translated = renderRecord(lookup(key, { text: source }), {}, activeCatalog);
    knownTranslationCache[source] = translated;
    return translated;
  }
  function translateKnownText(text) {
    if (FB.locale === 'en' || typeof text !== 'string' || !text) return text;
    const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
    const core = match ? match[2] : text;
    const exact = knownTranslation(core);
    if (exact !== null) return (match ? match[1] : '') + exact + (match ? match[3] : '');
    return text;
  }
  FB.translateKnown = function (text) { return translateKnownText(text); };
  FB.localizeTree = function (root) {
    if (!root || FB.locale === 'en') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    for (let i = 0; i < textNodes.length; i++) {
      const parent = textNodes[i].parentNode;
      if (!parent || /^(?:SCRIPT|STYLE|TEXTAREA)$/.test(parent.nodeName) ||
        (parent.closest && parent.closest('[data-i18n-ignore]'))) continue;
      textNodes[i].nodeValue = translateKnownText(textNodes[i].nodeValue);
    }
    const attrs = ['title', 'placeholder', 'aria-label'];
    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (let e = 0; e < elements.length; e++) {
      if (elements[e].closest && elements[e].closest('[data-i18n-ignore]')) continue;
      for (let a = 0; a < attrs.length; a++) {
        if (elements[e].hasAttribute(attrs[a])) {
          elements[e].setAttribute(attrs[a],
            translateKnownText(elements[e].getAttribute(attrs[a])));
        }
      }
    }
  };

  FB.availableLocales = function () {
    return LOCALES.filter(function (loc) { return !loc.development || devMode(); });
  };
  FB.localeName = function (code) {
    const def = localeDef(code);
    return def ? def.name : code;
  };
  FB.localeStatus = function (code) {
    const def = localeDef(code);
    return def ? def.status : 'unknown';
  };
  FB.loadSelectedLocale = function (done) {
    try { requested = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { requested = 'en'; }
    const def = localeDef(requested);
    if (!def || (def.development && !devMode())) {
      requested = 'en';
      try { localStorage.setItem(LANG_KEY, 'en'); } catch (e) { /* storage may be unavailable */ }
    }
    if (requested === 'en') { pendingCatalog = FBDATA.lang.en || null; done(true); return; }
    const script = document.createElement('script');
    let src = localeDef(requested).file;
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      src += '?v=' + encodeURIComponent(FB.VERSION);
    }
    script.src = src;
    script.onload = function () {
      pendingCatalog = FBDATA.lang[requested] || null;
      done(!!pendingCatalog);
    };
    script.onerror = function () { pendingCatalog = null; done(false); };
    document.head.appendChild(script);
  };
  FB.finalizeLocale = function (loaded) {
    diagnostics.length = 0;
    if (requested === 'en') {
      FB.locale = 'en';
      activeCatalog = FBDATA.lang.en || null;
      setDocumentMeta('en', 'ltr');
    } else if (!loaded || !validateCatalog(pendingCatalog, requested)) {
      useEnglish(loaded ? 'catalog validation failed' : 'catalog failed to load');
    } else {
      FB.locale = requested;
      activeCatalog = pendingCatalog;
      setDocumentMeta(requested, activeCatalog.dir);
    }
    FB.i18nReport = FB.validateLocaleCoverage(FB.locale);
    if (FB.locale !== 'en' && FB.i18nReport.translated !== FB.i18nReport.total) {
      useEnglish('catalog coverage validation failed');
      FB.i18nReport = FB.validateLocaleCoverage('en');
    }
    applyStatic(document);
    return FB.locale;
  };
  FB.setLocale = function (code) {
    const def = localeDef(code);
    if (!def || (def.development && !devMode())) return false;
    try { localStorage.setItem(LANG_KEY, code); } catch (e) { return false; }
    /* A language change deliberately reloads every cached display surface.
       Preserve an active life first; autosave already excludes observe mode
       and dead states. */
    if (FB.state && FB.save && FB.save.autosave) FB.save.autosave();
    location.reload();
    return true;
  };
  FB.validateLocaleCoverage = function (code) {
    const source = FBDATA.lang.en && FBDATA.lang.en.entries ? FBDATA.lang.en.entries : {};
    const catalog = code === 'en' ? FBDATA.lang.en : FBDATA.lang[code];
    const report = {
      locale: code, total: 0, translated: 0, missing: [], stale: [],
      invalid: [], tokens: [], emoji: [], coverage: 0, supported: false
    };
    for (const key in source) {
      if (!own(source, key) || key.indexOf('meta.') === 0) continue;
      report.total++;
      if (code === 'en') { report.translated++; continue; }
      if (catalog && catalog.pseudo) { report.translated++; continue; }
      const entry = catalog && catalog.entries && catalog.entries[key];
      if (!entry) { report.missing.push(key); continue; }
      if (!validEntry(entry)) { report.invalid.push(key); continue; }
      if (!sameShape(source[key], entry)) { report.invalid.push(key); continue; }
      if (entry.hash !== sourceHash(source[key])) { report.stale.push(key); continue; }
      if (!sameTokens(source[key], entry)) { report.tokens.push(key); continue; }
      if (!sameEmoji(source[key], entry)) { report.emoji.push(key); continue; }
      report.translated++;
    }
    report.coverage = report.total ? report.translated / report.total : 1;
    const def = localeDef(code);
    report.supported = !!def && def.status === 'supported' && report.coverage === 1 &&
      !report.invalid.length && !report.tokens.length && !report.emoji.length && !report.stale.length;
    return report;
  };

  document.addEventListener('keydown', function (ev) {
    if (!devMode() || !ev.altKey || !ev.shiftKey || ev.key.toLowerCase() !== 'i') return;
    const text = lastKey || '(no localization lookup yet)';
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
    note('copied-key', text, '');
  });
})();
