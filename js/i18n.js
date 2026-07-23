/* Fallowborn — internationalization core (localization plumbing).
   English ships in-code and is always the fallback; non-English overlays live in
   FBDATA.lang[locale] and load client-side only (never on the MP server). Phase 1
   is English-only and visibly inert: with no locale table present every accessor
   returns its in-code source string. See notes/i18n.md for the full design. */
window.FB = window.FB || {};
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  /* Locale overlays, one object per language, e.g.
       FBDATA.lang.fr = { 'ui:Reputation among the folk': '…',
                          'event.meet_suitor.text': '…',
                          words: { child: { m:'fils', f:'fille' } } }
     English is NOT stored here — it is the source in the data/code files. */
  FBDATA.lang = FBDATA.lang || {};

  const LANG_KEY = 'fb_lang';

  /* Current locale — a shell/display setting, persisted to localStorage, kept
     OUT of seeded state so a save renders identically in any language (see
     docs/designs/state-and-saves.md). */
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

  /* ---------- plurals: FB.pluralCategory + FB.plural ----------
     Replaces 'compan'+(n>1?'ies':'y'). English is {one, other}; Russian/Polish
     etc. ship their own tiny n->category rule (CLDR-shaped, a few lines each) via
     FB.registerPluralRule. Far short of ICU, which §3 rules out. */
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

  /* ---------- structured-data resolvers (id-keyed overlay) ----------
     The abstraction boundary that keeps the mutate-vs-shadow decision (§10)
     internal: every event/data text read goes through here, resolution stays
     private. A locale maps 'event.<id>.<path>' / '<kind>.<id>.<path>' ->
     translation; a miss uses the in-code English source (also the clearest
     documentation of what the content says). Locale lookup only ever feeds
     FB.fmt's INPUT, so the faith-variant and {token} layers compose beneath it
     untouched (§3 resolution order). */
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

  /* ---------- dynamic locale loader ----------
     file:// blocks fetch() of local files (why the whole data layer uses <script>
     tags), so a locale table is loaded by injecting a <script> tag. Keeps the base
     download lean; one file per language means a translator touches one file. */
  FB.hasLocale = function (loc) { return loc === 'en' || !!FBDATA.lang[loc]; };

  FB.availableLocales = function () {
    const out = ['en'];
    for (const k in FBDATA.lang) {
      if (FBDATA.lang.hasOwnProperty(k) && k !== 'en') out.push(k);
    }
    return out;
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
