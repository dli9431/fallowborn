/* Development-only pseudo-locale. The renderer derives expanded accented text
   from the authoritative English record, preserving tokens and emoji. */
window.FBDATA = window.FBDATA || {};
FBDATA.lang = FBDATA.lang || {};
FBDATA.lang.qps = {
  schema: 1,
  code: 'qps',
  name: 'Pseudo (development)',
  dir: 'ltr',
  pseudo: true,
  entries: {},
  words: {},
  pluralCategory: function (n) { return n === 1 ? 'one' : 'other'; }
};
