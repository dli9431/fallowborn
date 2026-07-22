/* Fallowborn — runtime mod loader (JSON merged over FBDATA)
   Mods persist in localStorage and re-apply on every page load,
   BEFORE the world is generated. Bundled mods (mods/*.js scripts)
   register into window.FBMODS and are toggled from the Mods dialog;
   the enabled ids persist in localStorage too. See docs/MODDING.md. */
window.FB = window.FB || {};
window.FBMODS = window.FBMODS || [];

(function () {
  'use strict';

  const M = {};
  FB.mods = M;
  const KEY = 'fb_mods';
  const BKEY = 'fb_mods_bundled';

  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }

  function readEnabled() {
    try { return JSON.parse(localStorage.getItem(BKEY) || '[]'); }
    catch (e) { return []; }
  }

  M.bundled = function () { return window.FBMODS; };

  M.isEnabled = function (id) { return readEnabled().indexOf(id) !== -1; };

  M.toggle = function (id) {
    const on = readEnabled();
    const i = on.indexOf(id);
    if (i === -1) on.push(id); else on.splice(i, 1);
    try { localStorage.setItem(BKEY, JSON.stringify(on)); }
    catch (e) { if (FB.ui) FB.ui.toast('Could not store mod setting: ' + e.message); return; }
    location.reload();
  };

  M.count = function () { return readAll().length + readEnabled().length; };

  /* the stored mods as {name, kb} for display — a mod may carry an
     optional cosmetic "name" field (ignored by the merge) */
  M.list = function () {
    const out = [];
    for (const text of readAll()) {
      let name = 'Unnamed mod';
      try {
        const m = JSON.parse(text);
        if (m && typeof m.name === 'string' && m.name) name = m.name;
      } catch (e) { name = 'Broken mod (bad JSON)'; }
      out.push({ name: name, kb: Math.max(1, Math.round(text.length / 1024)) });
    }
    return out;
  };

  /* a fingerprint of the active mod set — stored JSON mods plus the enabled
     bundled ids — stamped into saves so a life can refuse to wake up in the
     wrong world ('' = the unmodded base game). Every mutation of the mod
     store reloads the page, so the signature is constant per page load and
     computed once (serialize calls this on every autosave). */
  let _sig = null;
  M.sig = function () {
    if (_sig === null) _sig = computeSig();
    return _sig;
  };
  function computeSig() {
    const all = readAll();
    const on = readEnabled().slice().sort();
    if (!all.length && !on.length) return '';
    const joined = 'b:' + on.join(',') + '|' + all.join('|');
    let hsh = 5381;
    for (let i = 0; i < joined.length; i++) {
      hsh = ((hsh * 33) ^ joined.charCodeAt(i)) >>> 0;
    }
    return (all.length + on.length) + '-' + hsh.toString(36);
  }

  M.store = function (jsonText) {
    let mod;
    try { mod = JSON.parse(jsonText); }
    catch (e) { if (FB.ui) FB.ui.toast('Invalid JSON: ' + e.message); return; }
    if (typeof mod !== 'object' || mod === null) { if (FB.ui) FB.ui.toast('Mod must be a JSON object.'); return; }
    const all = readAll();
    // re-applying a mod (same text, or same "name") replaces the stored
    // copy rather than stacking another on the pile
    let idx = -1;
    for (let i = 0; i < all.length && idx < 0; i++) {
      if (all[i] === jsonText) idx = i;
      else if (mod.name) {
        try {
          const o = JSON.parse(all[i]);
          if (o && o.name === mod.name) idx = i;
        } catch (e) { /* unreadable stored mod — leave it be */ }
      }
    }
    if (idx >= 0) all[idx] = jsonText; else all.push(jsonText);
    try { localStorage.setItem(KEY, JSON.stringify(all)); }
    catch (e) { if (FB.ui) FB.ui.toast('Could not store mod: ' + e.message); return; }
    location.reload();
  };

  M.removeAt = function (i) {
    const all = readAll();
    if (i < 0 || i >= all.length) return;
    all.splice(i, 1);
    if (all.length) localStorage.setItem(KEY, JSON.stringify(all));
    else localStorage.removeItem(KEY);
    location.reload();
  };

  M.clear = function () {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BKEY);
    location.reload();
  };

  /* merge one mod object into FBDATA */
  function mergeById(list, additions, idKey) {
    for (const item of additions) {
      let replaced = false;
      for (let i = 0; i < list.length; i++) {
        if (list[i][idKey] === item[idKey]) { list[i] = item; replaced = true; break; }
      }
      if (!replaced) list.push(item);
    }
  }

  M.apply = function (mod) {
    if (mod.events) mergeById(FBDATA.events, mod.events, 'id');
    if (mod.provinces) mergeById(FBDATA.provinces, mod.provinces, 'id');
    if (mod.realms) mergeById(FBDATA.realms, mod.realms, 'id');
    if (mod.empires) for (const k in mod.empires) FBDATA.empires[k] = mod.empires[k];
    if (mod.kingdoms) for (const k in mod.kingdoms) FBDATA.kingdoms[k] = mod.kingdoms[k];
    if (mod.duchies) for (const k in mod.duchies) FBDATA.duchies[k] = mod.duchies[k];
    if (mod.straits) FBDATA.straits = FBDATA.straits.concat(mod.straits);
    // scripted entries are replaced only on a (year, realm) match — several
    // realms may act in the same year without clobbering one another
    if (mod.scripted) {
      for (const item of mod.scripted) {
        let replaced = false;
        for (let i = 0; i < FBDATA.scripted.length; i++) {
          if (FBDATA.scripted[i].year === item.year && FBDATA.scripted[i].realm === item.realm) {
            FBDATA.scripted[i] = item; replaced = true; break;
          }
        }
        if (!replaced) FBDATA.scripted.push(item);
      }
    }
    if (mod.cultures) for (const k in mod.cultures) FBDATA.cultures[k] = mod.cultures[k];
    if (mod.settlementNames) for (const k in mod.settlementNames) FBDATA.settlementNames[k] = mod.settlementNames[k];
    if (mod.religions) for (const k in mod.religions) FBDATA.religions[k] = mod.religions[k];
    if (mod.traits) for (const k in mod.traits) FBDATA.traits[k] = mod.traits[k];
    if (mod.buildings) for (const k in mod.buildings) FBDATA.buildings[k] = mod.buildings[k];
    if (mod.tech) for (const k in mod.tech) FBDATA.tech[k] = mod.tech[k];
    if (mod.holdings) for (const k in mod.holdings) FBDATA.holdings[k] = mod.holdings[k];
    if (mod.plots) for (const k in mod.plots) FBDATA.plots[k] = mod.plots[k];
    if (mod.items) for (const k in mod.items) FBDATA.items[k] = mod.items[k];
    if (mod.titles) for (const k in mod.titles) FBDATA.titles[k] = mod.titles[k];
    if (mod.balance) for (const k in mod.balance) FBDATA.balance[k] = mod.balance[k];
    if (mod.bounds) FBDATA.bounds = mod.bounds;
    if (mod.land) FBDATA.land = mod.land;
    if (mod.seas) FBDATA.seas = mod.seas;
    if (mod.rivers) FBDATA.rivers = mod.rivers;
  };

  M.applyStored = function () {
    const on = readEnabled();
    for (const mod of M.bundled()) {
      if (on.indexOf(mod.id) === -1) continue;
      try { M.apply(mod.data); }
      catch (e) { /* skip broken mod */ }
    }
    const all = readAll();
    for (const text of all) {
      try { M.apply(JSON.parse(text)); }
      catch (e) { /* skip broken mod */ }
    }
  };
})();
