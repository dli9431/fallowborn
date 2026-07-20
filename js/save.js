/* Fallowborn — save/load via localStorage */
window.FB = window.FB || {};

(function () {
  'use strict';

  const S = {};
  FB.save = S;
  const PREFIX = 'fb_';

  function key(slot) { return PREFIX + (slot === 'auto' ? 'auto' : 'slot' + slot); }

  S.serialize = function () {
    const s = FB.state;
    return JSON.stringify({
      v: 3,
      rng: FB.getRngState(),
      uid: FB.getUidCounter(),
      mods: FB.mods.sig(), // which world this life belongs to
      state: s,
      meta: {
        name: FB.fullName(s.chars[s.player.charId]),
        title: FB.titleFor(s),
        year: s.date.year,
        season: s.date.season
      }
    });
  };

  S.toSlot = function (slot) {
    try {
      localStorage.setItem(key(slot), S.serialize());
    } catch (e) {
      if (FB.ui) FB.ui.toast('Save failed: ' + e.message);
    }
  };

  S.autosave = function () { if (FB.state && !FB.state.player.dead) S.toSlot('auto'); };

  S.read = function (slot) {
    try {
      const raw = localStorage.getItem(key(slot));
      const d = raw ? JSON.parse(raw) : null;
      // saves from before the county-map & liege-hierarchy rework are unreadable
      return d && d.v === 3 ? d : null;
    } catch (e) { return null; }
  };

  S.slotMeta = function (slot) {
    const d = S.read(slot);
    if (!d || !d.meta) return null;
    return d.meta.name + ' — ' + d.meta.title + ', ' + FB.SEASONS[d.meta.season] + ' ' + d.meta.year;
  };

  S.hasAuto = function () { return !!S.read('auto'); };

  /* was this save made under a different mod set than the one now stored?
     (saves from before the stamp carry no `mods` field — let them through) */
  S.otherWorld = function (d) {
    return !!d && d.mods !== undefined && d.mods !== FB.mods.sig();
  };

  S.restore = function (data) {
    FB.setRngState(data.rng);
    FB.setUidCounter(data.uid);
    FB.state = data.state;
    return FB.state;
  };
})();
