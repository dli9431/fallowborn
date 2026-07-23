/* Fallowborn — internationalization scaffold.
   English ships in-code and is always the fallback. Phase 1 is English-only and
   visibly inert: with no locale table present every accessor returns its in-code
   source string. Several APIs below are deliberately preliminary; the rich
   catalog, branch-first lookup, manifest/boot lifecycle, and durable-message
   boundary must be finalized before a real locale is authored. */
window.FB = window.FB || {};
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  /* Preliminary flat locale overlays, one object per language, e.g.
       FBDATA.lang.xx = { 'ui:Reputation among the folk': '…',
                          'event.meet_suitor.text': '…',
                          words: { child: { m:'…', f:'…' } } }
     Do not author a real locale against this transitional shape: the target is
     the schema-versioned {entries,words,pluralCategory} catalog in the design.
     English is not stored here — it remains authoritative in source. */
  FBDATA.lang = FBDATA.lang || {};

  const LANG_KEY = 'fb_lang';

  /* Current locale — a shell/display setting, persisted to localStorage, kept
     OUT of seeded state so a save renders identically in any language. */
  FB.locale = (function () {
    try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; }
  })();

  function table() { return FBDATA.lang[FB.locale] || null; }

  /* ---------- plain substitution: {identifier} <- params ----------
     The one text primitive shared by every entry point. Braces survive
     translation and each locale sets word order around them; an unknown token is
     left verbatim, matching FB.fmt's behavior. */
  FB.tsub = function (str, params) {
    if (typeof str !== 'string' || !params || str.indexOf('{') < 0) return str;
    return str.replace(/\{(\w+)\}/g, function (m, k) {
      return (params[k] !== undefined && params[k] !== null) ? String(params[k]) : m;
    });
  };

  /* ---------- UI strings: English-as-key ----------
     FB.T('Reputation among the folk') — the English string is the key. A miss
     falls back to English, so unwrapped or not-yet-translated strings simply
     render English. Optional params do {token} substitution. */
  FB.T = function (str, params) {
    const t = table();
    const s = (t && t['ui:' + str]) || str;
    return FB.tsub(s, params);
  };

  /* ---------- chronicle entries ----------
     One state.log entry -> display text. A structured entry nests its durable
     descriptor at `msg:{ key, params }` and re-renders in the current locale
     (provisionally through FB.T until the opaque English registry lands); a
     legacy entry carries a pre-rendered `t` string and shows verbatim. */
  FB.newsText = function (entry) {
    if (!entry) return '';
    if (entry.msg && entry.msg.key !== undefined) return FB.T(entry.msg.key, entry.msg.params);
    return entry.t || '';
  };

  /* ---------- closed-vocabulary lexicon: FB.word(concept, features) ----------
     Replaces the (sex==='f'?'daughter':'son') splices. English lexicon in-code;
     a locale overrides via FBDATA.lang[loc].words. features are JSON-safe
     semantics (sex today, room for tier/case later). The English fallback IS the
     current ternary result, so unconverted sites keep working. Lexicon-shaped
     precedent: FB.SKILL_NAMES (model.js), FBDATA.titles (map_data.js). */
  const WORDS_EN = {
    child:   { m: 'son',     f: 'daughter', x: 'child' },
    parent:  { m: 'father',  f: 'mother',   x: 'parent' },
    sibling: { m: 'brother', f: 'sister',   x: 'sibling' },
    spouse:  { m: 'husband', f: 'wife',     x: 'spouse' },
    monarch: { m: 'king',    f: 'queen',    x: 'monarch' },
    noble:   { m: 'lord',    f: 'lady',     x: 'noble' },
    pronoun: { m: 'he',      f: 'she',      x: 'they' },
    possess: { m: 'his',     f: 'her',      x: 'their' }
  };
  FB.word = function (concept, features) {
    const t = table();
    const lex = (t && t.words) || WORDS_EN;
    const set = lex[concept] || WORDS_EN[concept];
    if (!set) return concept;
    const sex = features && features.sex;
    return set[sex] || set.x || set.m || concept;
  };

  /* ---------- provisional plural helpers ----------
     pluralCategory survives in the target structured selector. FB.plural is only
     a Phase 1 scaffold and must not become a prose-building API: complete phrases
     belong in structured plural/value records. */
  const PLURAL_RULES = {
    en: function (n) { return n === 1 ? 'one' : 'other'; }
  };
  FB.registerPluralRule = function (locale, fn) { PLURAL_RULES[locale] = fn; };
  FB.pluralCategory = function (locale, n) {
    return (PLURAL_RULES[locale] || PLURAL_RULES.en)(Math.abs(n));
  };
  FB.plural = function (count, forms) {
    const cat = FB.pluralCategory(FB.locale, count);
    const f = (forms[cat] !== undefined) ? forms[cat]
      : (forms.other !== undefined ? forms.other : forms.one);
    return FB.tsub(f, { n: count });
  };

  /* ---------- preliminary structured-data resolvers ----------
     These establish the id/path accessor boundary and English fallback. Before a
     real locale ships they must become owner-aware and select the English faith
     branch before looking up and hashing that exact localized branch. */
  function getPath(obj, path) {
    if (!path) return obj;
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length && cur != null; i++) cur = cur[parts[i]];
    return cur;
  }

  FB.eventText = function (state, ev, path, ctx) {
    const t = table();
    const src = (t && ev && ev.id && t['event.' + ev.id + '.' + path]) || getPath(ev, path);
    return FB.fmt(state, src, ctx);
  };

  FB.dataText = function (state, kind, id, def, path, ctx) {
    const t = table();
    const key = kind + '.' + id + (path ? '.' + path : '');
    const src = (t && t[key]) || (path ? getPath(def, path) : def);
    return FB.fmt(state, src, ctx);
  };

  /* ---------- preliminary dynamic locale loader ----------
     file:// requires script injection rather than fetch. The target loader uses a
     fixed locale manifest, loads the saved choice during boot, version-stamps only
     HTTP(S) URLs, validates after mods, and switches by page reload. */
  FB.hasLocale = function (loc) { return loc === 'en' || !!FBDATA.lang[loc]; };

  FB.availableLocales = function () {
    const out = ['en'];
    for (const k in FBDATA.lang) {
      if (FBDATA.lang.hasOwnProperty(k) && k !== 'en') out.push(k);
    }
    return out;
  };

  /* Display name for a locale. A locale file may name itself in its own tongue
     via FBDATA.lang[loc].langName; else fall back to a built-in name, then code. */
  const LOCALE_NAMES = { en: 'English' };
  FB.localeName = function (loc) {
    const t = FBDATA.lang[loc];
    return (t && t.langName) || LOCALE_NAMES[loc] || loc;
  };

  FB.loadLocale = function (loc, cb) {
    if (loc === 'en' || FBDATA.lang[loc]) { if (cb) cb(true); return; }
    const s = document.createElement('script');
    s.src = 'data/lang_' + loc + '.js';
    s.onload = function () { if (cb) cb(!!FBDATA.lang[loc]); };
    s.onerror = function () { if (cb) cb(false); };
    document.head.appendChild(s);
  };

  FB.setLocale = function (loc, cb) {
    FB.loadLocale(loc, function (ok) {
      FB.locale = ok ? loc : 'en';
      try { localStorage.setItem(LANG_KEY, FB.locale); } catch (e) { /* private mode */ }
      if (cb) cb(FB.locale);
    });
  };
})();
