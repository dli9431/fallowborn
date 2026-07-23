/* Fallowborn — save/load via localStorage */
window.FB = window.FB || {};

(function () {
  'use strict';

  const S = {};
  FB.save = S;
  const PREFIX = 'fb_';

  function key(slot) { return PREFIX + (slot === 'auto' ? 'auto' : 'slot' + slot); }

  /* storage probe — some browsers refuse localStorage outright (iOS in-app
     webviews, "block all cookies", old private modes); better to know at boot
     than to lose a dynasty silently. Ephemeral storage (private mode, iframe
     eviction) passes this probe — the export path below is the answer there. */
  S.available = (function () {
    try {
      const k = PREFIX + 'probe';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  /* told once per page load, the first time a life reaches the screen */
  S.warnIfBlocked = function () {
    if (S.available || S._warned || !FB.ui) return;
    S._warned = true;
    FB.ui.toast('⚠ This browser is blocking save storage — lives won’t persist here. Menu → 💾 Save game → 📤 Export keeps a life as text.');
  };

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
        titleData: FB.titleSnapshot(s),
        year: s.date.year,
        season: s.date.season
      }
    });
  };

  S.toSlot = function (slot) {
    try {
      localStorage.setItem(key(slot), S.serialize());
      return true;
    } catch (e) {
      if (FB.ui) {
        if (S.available) FB.ui.toast('Save failed: {message}', { message: e.message });
        else FB.ui.toast('⚠ This browser is blocking save storage — use 📤 Export (Menu → 💾 Save game) to keep your life as text.');
      }
      return false;
    }
  };

  /* an observe session is never saved — it must not bury a real life */
  S.autosave = function () {
    if (FB.state && !FB.state.player.dead && !(FB.game && FB.game.observe)) S.toSlot('auto');
  };

  /* export/import — a life as portable text. localStorage is a hostage on
     some mobile browsers (evicted in third-party iframes and in-app webviews,
     dropped in private mode); a copied string outlives all of that and moves
     a life between devices. btoa/atob take binary strings, so the JSON is
     UTF-8 wrapped; the FBS1. tag marks the format and catches stray pastes. */
  const XPRE = 'FBS1.';
  S.exportState = function () {
    return XPRE + btoa(unescape(encodeURIComponent(S.serialize())));
  };
  S.parseExport = function (text) {
    try {
      const t = String(text || '').replace(/\s+/g, '');
      if (t.indexOf(XPRE) !== 0) return null;
      const d = JSON.parse(decodeURIComponent(escape(atob(t.slice(XPRE.length)))));
      return d && d.v === 3 ? d : null;
    } catch (e) { return null; }
  };

  S.read = function (slot) {
    try {
      const raw = localStorage.getItem(key(slot));
      const d = raw ? JSON.parse(raw) : null;
      // saves from before the county-map & liege-hierarchy rework are unreadable
      return d && d.v === 3 ? d : null;
    } catch (e) { return null; }
  };

  /* label for an already-read save object — lets callers parse a slot once */
  S.metaOf = function (d) {
    if (!d || !d.meta) return null;
    const title = d.meta.titleData ? FB.renderTitleSnapshot(d.meta.titleData) :
      FB.L(d.meta.title || '');
    return FB.T('{name} — {title}, {season} {year}', {
      name: d.meta.name,
      title: title,
      season: FB.seasonName(d.meta.season),
      year: d.meta.year
    });
  };
  S.slotMeta = function (slot) { return S.metaOf(S.read(slot)); };

  S.hasAuto = function () { return !!S.read('auto'); };

  /* was this save made under a different mod set than the one now stored?
     (saves from before the stamp carry no `mods` field — let them through) */
  S.otherWorld = function (d) {
    return !!d && d.mods !== undefined && d.mods !== FB.mods.sig();
  };

  /* Saves from before parents were recorded know the first generation's
     brothers and sisters only by role and house; mother and father were never
     named, and the family tree showed "Unrecorded" in their place. Give such a
     line its parents back — long dead, as the years demand — linked like any
     newborn's, so the tree and the kin lists read whole again. */
  function backfillParents(s) {
    const me = s.chars && s.player ? s.chars[s.player.charId] : null;
    if (!me || FB.parentsOf(s, me).length) return;
    const kids = [me];
    for (const id in s.chars) {
      const k = s.chars[id];
      if (k.id !== me.id && k.role === 'sibling' && k.dyn && k.dyn === me.dyn) kids.push(k);
    }
    let first = me.born, last = me.born;
    for (const k of kids) { if (k.born < first) first = k.born; if (k.born > last) last = k.born; }
    const dad = FB.makeCharacter(s, {
      sex: 'm', culture: me.culture, religion: me.religion,
      born: first - FB.ri(20, 40), role: 'parent', quality: 1
    });
    const mom = FB.makeCharacter(s, {
      sex: 'f', culture: me.culture, religion: me.religion,
      born: first - FB.ri(18, 34), role: 'parent'
    });
    dad.dyn = me.dyn;
    dad.health = 8; mom.health = 8;
    dad.spouseId = mom.id; mom.spouseId = dad.id;
    // gone before the story resumes, but not before the last child was born
    dad.dead = mom.dead = true;
    dad.died = Math.max(last, s.date.year - FB.ri(0, 15));
    mom.died = Math.max(last, s.date.year - FB.ri(0, 15));
    for (const k of kids) {
      k.fatherId = dad.id; k.motherId = mom.id;
      dad.childrenIds.push(k.id); mom.childrenIds.push(k.id);
    }
  }

  S.restore = function (data) {
    FB.setRngState(data.rng);
    FB.setUidCounter(data.uid);
    FB.state = data.state;
    // the realm cache is keyed by state.turn, which two lives can share
    FB.invalidateRealmCache();
    backfillParents(FB.state);
    return FB.state;
  };
})();
