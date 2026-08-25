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
  let currencySupplied = false;
  let currencyInvalid = false;
  let legacyBookmarkLimited = false;

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

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
    catch (e) {
      if (FB.ui) FB.ui.toast('Could not store mod setting: {message}', { message: e.message });
      return;
    }
    location.reload();
  };

  M.count = function () { return readAll().length + readEnabled().length; };
  M.currencyInvalid = function () { return currencyInvalid; };
  M.bookmarkAvailable = function (id) {
    return id !== '1066' || !legacyBookmarkLimited;
  };
  M.bookmarkWarning = function () {
    return legacyBookmarkLimited
      ? 'Spring 1066 is hidden for new games because an active legacy mod changes the world without providing a complete 1066 bookmark. Existing matching saves can still load.'
      : '';
  };

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
    catch (e) {
      if (FB.ui) FB.ui.toast('Invalid JSON: {message}', { message: e.message });
      return;
    }
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
    catch (e) {
      if (FB.ui) FB.ui.toast('Could not store mod: {message}', { message: e.message });
      return;
    }
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

  function mergeTable(table, additions) {
    for (const k in additions) if (own(additions, k)) table[k] = additions[k];
  }

  /* This is the complete public top-level runtime-mod surface. Tables that
     are generated artifacts or engine aliases are intentionally absent. */
  const PUBLIC_KEYS = {
    name:true, bookmarks:true, defaultBookmark:true,
    startScenarios:true, familyPresets:true,
    focuses:true, deeds:true,
    provinces:true, realms:true, empires:true, kingdoms:true, duchies:true,
    events:true, straits:true, crossingClasses:true, scripted:true,
    cultureTraditions:true, cultures:true, religions:true, religiousPaths:true,
    traits:true,
    ailments:true, modifiers:true, buildings:true, forts:true,
    techDomains:true, techTraditions:true, tech:true, techCaps:true,
    techImpactReviews:true, unitClasses:true, holdings:true, careers:true,
    positions:true, localCouncilMotions:true, feudalServiceCharters:true,
    schooling:true, enterprises:true, auctionLotTypes:true,
    householdStandards:true, marketGoods:true, marketEndowmentTypes:true,
    marketEndowments:true, travelPurposes:true, travelSites:true,
    finance:true, plots:true, intrigue:true, items:true, itemPools:true,
    rulerTraits:true, raidingTraditions:true, councilSeats:true,
    councilRules:true, politicalBlocs:true,
    policies:true, elections:true, privileges:true, collectiveDemands:true,
    settlementNames:true, settlementSites:true, titles:true, papacy:true,
    currency:true, balance:true, land:true, seas:true, rivers:true,
    bounds:true
  };

  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function fail(path, message) {
    throw new Error('Mod data ' + path + ' ' + message);
  }

  function onlyFields(value, allowed, path) {
    if (!plainObject(value)) fail(path, 'must be an object.');
    for (const key in value) {
      if (own(value, key) && !own(allowed, key)) {
        fail(path + '.' + key, 'is not recognized.');
      }
    }
  }

  function combinedTable(base, additions, path) {
    const out = {};
    for (const key in (base || {})) {
      if (own(base, key)) out[key] = base[key];
    }
    if (additions !== undefined) {
      if (!plainObject(additions)) fail(path, 'must be an object.');
      for (const key in additions) {
        if (own(additions, key)) out[key] = additions[key];
      }
    }
    return out;
  }

  function finiteNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function validateIdList(list, path, known, allowEmpty) {
    if (!Array.isArray(list) || (!allowEmpty && !list.length)) {
      fail(path, 'must be ' + (allowEmpty ? 'an array.' : 'a non-empty array.'));
    }
    const seen = {};
    for (let i = 0; i < list.length; i++) {
      const id = list[i];
      if (typeof id !== 'string' || !id) {
        fail(path + '[' + i + ']', 'must be a non-empty id.');
      }
      if (seen[id]) fail(path, 'must not repeat ' + id + '.');
      if (known && !own(known, id)) fail(path, 'references unknown id ' + id + '.');
      seen[id] = true;
    }
  }

  function combinedList(base, additions, path) {
    if (!Array.isArray(additions)) fail(path, 'must be an array.');
    const out = (base || []).slice();
    const supplied = {};
    for (let i = 0; i < additions.length; i++) {
      const item = additions[i];
      if (!plainObject(item) || typeof item.id !== 'string' ||
          !/^[a-z][a-z0-9_]*$/.test(item.id)) {
        fail(path + '[' + i + '].id', 'must be a lowercase start-code id.');
      }
      if (supplied[item.id]) fail(path, 'must not repeat ' + item.id + '.');
      supplied[item.id] = true;
      let replaced = false;
      for (let j = 0; j < out.length; j++) {
        if (out[j].id === item.id) {
          out[j] = item;
          replaced = true;
          break;
        }
      }
      if (!replaced) out.push(item);
    }
    return out;
  }

  function cloneActionDefinition(definition) {
    const out = {};
    for (const key in definition) {
      if (!own(definition, key)) continue;
      const value = definition[key];
      if (key === 'choices' && Array.isArray(value)) {
        out[key] = value.map(function (choice) {
          return plainObject(choice) ? cloneActionDefinition(choice) : choice;
        });
      } else if ((key === 'visibility' || key === 'eligibility' ||
          key === 'costs' || key === 'effects' || key === 'seasonal' ||
          key === 'dailyEffects' || key === 'skillChances') &&
          plainObject(value)) {
        const nested = {};
        for (const field in value) {
          if (!own(value, field)) continue;
          nested[field] = Array.isArray(value[field])
            ? value[field].slice() : value[field];
        }
        out[key] = nested;
      } else {
        out[key] = Array.isArray(value) ? value.slice() : value;
      }
    }
    return out;
  }

  function actionOverrides(base, additions, kind) {
    const out = (base || []).map(cloneActionDefinition);
    if (additions === undefined) return out;
    if (!Array.isArray(additions)) fail(kind, 'must be an array.');
    const baselineAllowed = kind === 'focuses'
      ? { id:true, label:true, desc:true, order:true, eligibility:true }
      : { id:true, label:true, desc:true, order:true, group:true,
          cooldownDays:true, requiresTech:true, eligibility:true };
    const declarativeDeedAllowed = {
      id:true, handler:true, label:true, desc:true, order:true, group:true,
      cooldownDays:true, spendsDay:true, requiresTech:true, visibility:true,
      eligibility:true, costs:true, effects:true, queueEvent:true,
      capability:true, choices:true
    };
    const declarativeFocusAllowed = {
      id:true, handler:true, label:true, desc:true, order:true, contexts:true,
      vocational:true, requiresTech:true, visibility:true, eligibility:true,
      seasonal:true, dailyEffects:true, skillChances:true,
      capability:true, fallbackScore:true
    };
    const indexes = {};
    const supplied = {};
    for (let i = 0; i < out.length; i++) indexes[out[i].id] = i;
    for (let i = 0; i < additions.length; i++) {
      const override = additions[i];
      const path = kind + '[' + i + ']';
      if (!plainObject(override)) fail(path, 'must be an object.');
      if (typeof override.id !== 'string' ||
          !/^[a-z][a-z0-9_]*$/.test(override.id)) {
        fail(path + '.id', 'must be a lowercase action id.');
      }
      if (own(supplied, override.id)) fail(kind, 'must not repeat ' + override.id + '.');
      const existing = own(indexes, override.id)
        ? out[indexes[override.id]] : null;
      const declarativeHandler = kind === 'focuses'
        ? 'declarative_focus' : 'declarative_deed';
      const declarative =
        (!existing && override.handler === declarativeHandler) ||
        (existing && existing.handler === declarativeHandler);
      const declarativeAllowed = kind === 'focuses'
        ? declarativeFocusAllowed : declarativeDeedAllowed;
      onlyFields(override, declarative ? declarativeAllowed
        : baselineAllowed, path);
      if (!existing && !declarative) {
        fail(path + '.id', 'cannot add unknown baseline id ' + override.id + '.');
      }
      supplied[override.id] = true;
      if (declarative && override.handler !== declarativeHandler) {
        fail(path + '.handler', 'must be ' + declarativeHandler + '.');
      }
      /* Added actions and later replacements are complete records. Inheriting
         an omitted executable field from an earlier mod would make meaning
         depend on load order and hide the effective transaction from review. */
      const next = declarative ? { id:override.id } :
        cloneActionDefinition(existing);
      for (const key in override) {
        if (!own(override, key) || key === 'id') continue;
        if (key === 'choices' && Array.isArray(override[key])) {
          const wrappedChoices = {};
          wrappedChoices.choices = override[key];
          next[key] = cloneActionDefinition(wrappedChoices).choices;
        } else if ((key === 'visibility' || key === 'eligibility' ||
            key === 'costs' || key === 'effects' || key === 'seasonal' ||
            key === 'dailyEffects' || key === 'skillChances') &&
            plainObject(override[key])) {
          const wrapped = {};
          wrapped[key] = override[key];
          next[key] = cloneActionDefinition(wrapped)[key];
        } else {
          next[key] = Array.isArray(override[key])
            ? override[key].slice() : override[key];
        }
      }
      if (declarative && kind === 'deeds') {
        next.flow = next.capability === 'resource_choice'
          ? 'choices' : (next.spendsDay ? 'immediate' : 'no_day');
      }
      if (existing) out[indexes[override.id]] = next;
      else {
        indexes[override.id] = out.length;
        out.push(next);
      }
    }
    return out;
  }

  function prepareActionCatalogs(mod) {
    if (!own(mod, 'focuses') && !own(mod, 'deeds')) return null;
    if (!FB.validateActionData || !FB.installActionData) {
      fail('actions', 'cannot be configured before the action engine loads.');
    }
    const focuses = actionOverrides(FBDATA.focuses, mod.focuses, 'focuses');
    const deeds = actionOverrides(FBDATA.deeds, mod.deeds, 'deeds');
    const references = {
      tech:combinedTable(FBDATA.tech, mod.tech, 'tech'),
      careers:combinedTable(FBDATA.careers, mod.careers, 'careers'),
      traits:combinedTable(FBDATA.traits, mod.traits, 'traits'),
      religions:combinedTable(FBDATA.religions, mod.religions, 'religions'),
      cultures:combinedTable(FBDATA.cultures, mod.cultures, 'cultures'),
      events:(FBDATA.events || []).concat(own(mod, 'events')
        ? combinedList([], mod.events, 'events') : [])
    };
    const errors = FB.validateActionData(focuses, deeds, references);
    if (errors.length) fail('actions', errors.join(' '));
    return { focuses:focuses, deeds:deeds };
  }

  function requiredText(value, path) {
    if (typeof value !== 'string' || !value.trim()) {
      fail(path, 'must be a non-empty string.');
    }
  }

  function integerRange(value, min, max, path) {
    if (!finiteNumber(value) || Math.floor(value) !== value ||
        value < min || value > max) {
      fail(path, 'must be an integer from ' + min + ' to ' + max + '.');
    }
  }

  function startItemFits(def, slot) {
    if (!def || typeof def.slot !== 'string') return false;
    if (def.slot === 'hand') return slot === 'leftHand' || slot === 'rightHand';
    return def.slot === slot;
  }

  function validateStartEffects(effects, scenario, refs, path) {
    if (effects === undefined) return;
    onlyFields(effects, {
      landPlots:true, holdings:true, careerRank:true, careerExperience:true,
      flags:true, warService:true, items:true, skills:true, focus:true
    }, path);
    if (own(effects, 'landPlots')) {
      integerRange(effects.landPlots, 0, 20, path + '.landPlots');
    }
    if (own(effects, 'holdings')) {
      validateIdList(effects.holdings, path + '.holdings', refs.holdings, true);
      for (let i = 0; i < effects.holdings.length; i++) {
        if (!plainObject(refs.holdings[effects.holdings[i]])) {
          fail(path + '.holdings[' + i + ']', 'must resolve to a holding definition.');
        }
      }
    }
    if (own(effects, 'careerRank')) {
      const career = refs.careers[scenario.profession];
      if (typeof effects.careerRank !== 'string' || !career || !career.ranks ||
          !own(career.ranks, effects.careerRank)) {
        fail(path + '.careerRank', 'references an unknown rank for ' +
          scenario.profession + '.');
      }
    }
    if (own(effects, 'careerExperience')) {
      integerRange(effects.careerExperience, 0, 200,
        path + '.careerExperience');
    }
    if (own(effects, 'flags')) {
      if (!plainObject(effects.flags)) fail(path + '.flags', 'must be an object.');
      for (const flag in effects.flags) {
        if (!own(effects.flags, flag)) continue;
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(flag)) {
          fail(path + '.flags.' + flag, 'has an invalid flag id.');
        }
        const value = effects.flags[flag];
        if (typeof value !== 'boolean' && typeof value !== 'string' &&
            !finiteNumber(value)) {
          fail(path + '.flags.' + flag, 'must be a string, number, or boolean.');
        }
      }
    }
    if (own(effects, 'warService')) {
      integerRange(effects.warService, 0, 1000, path + '.warService');
    }
    if (own(effects, 'skills')) {
      if (!plainObject(effects.skills)) fail(path + '.skills', 'must be an object.');
      for (const skill in effects.skills) {
        if (!own(effects.skills, skill)) continue;
        if (['dip','mar','ste','int','lea'].indexOf(skill) < 0) {
          fail(path + '.skills.' + skill, 'is not a recognized skill.');
        }
        integerRange(effects.skills[skill], -20, 20,
          path + '.skills.' + skill);
      }
    }
    if (own(effects, 'focus')) {
      if (typeof effects.focus !== 'string' || !own(refs.focuses, effects.focus)) {
        fail(path + '.focus', 'references unknown focus ' + effects.focus + '.');
      }
    }
    if (own(effects, 'items')) {
      if (!Array.isArray(effects.items) || effects.items.length > 20) {
        fail(path + '.items', 'must be an array of at most 20 entries.');
      }
      for (let i = 0; i < effects.items.length; i++) {
        const entry = effects.items[i];
        const itemPath = path + '.items[' + i + ']';
        onlyFields(entry, { item:true, pool:true, quality:true, equip:true }, itemPath);
        if ((own(entry, 'item') ? 1 : 0) + (own(entry, 'pool') ? 1 : 0) !== 1) {
          fail(itemPath, 'must name exactly one item or pool.');
        }
        let ids;
        if (own(entry, 'item')) {
          if (typeof entry.item !== 'string' || !own(refs.items, entry.item) ||
              !plainObject(refs.items[entry.item])) {
            fail(itemPath + '.item', 'references unknown item ' + entry.item + '.');
          }
          ids = [entry.item];
        } else {
          if (typeof entry.pool !== 'string' || !own(refs.itemPools, entry.pool)) {
            fail(itemPath + '.pool', 'references unknown item pool ' + entry.pool + '.');
          }
          ids = refs.itemPools[entry.pool];
        }
        for (let j = 0; j < ids.length; j++) {
          if (!own(refs.items, ids[j]) || !plainObject(refs.items[ids[j]])) {
            fail(itemPath, 'references unknown item ' + ids[j] + '.');
          }
        }
        if (own(entry, 'quality') &&
            ['plain','well','masterwork'].indexOf(entry.quality) < 0) {
          fail(itemPath + '.quality', 'must be plain, well, or masterwork.');
        }
        if (own(entry, 'equip')) {
          if (typeof entry.equip !== 'string' ||
              ['head','neck','body','waist','feet','leftHand','rightHand','ring']
                .indexOf(entry.equip) < 0) {
            fail(itemPath + '.equip', 'is not a recognized loadout slot.');
          }
          for (let j = 0; j < ids.length; j++) {
            if (!startItemFits(refs.items[ids[j]], entry.equip)) {
              fail(itemPath + '.equip', 'does not fit item ' + ids[j] + '.');
            }
          }
        }
      }
    }
  }

  function validateStartScenarios(mod) {
    const scenarios = combinedList(FBDATA.startScenarios,
      mod.startScenarios, 'startScenarios');
    const refs = {
      careers:combinedTable(FBDATA.careers, mod.careers, 'careers'),
      holdings:combinedTable(FBDATA.holdings, mod.holdings, 'holdings'),
      items:combinedTable(FBDATA.items, mod.items, 'items'),
      itemPools:combinedTable(FBDATA.itemPools, mod.itemPools, 'itemPools'),
      focuses:{}
    };
    for (const focus of (FB.focuses || [])) refs.focuses[focus.id] = focus;
    if (Array.isArray(mod.focuses)) {
      for (const focus of mod.focuses) {
        if (plainObject(focus) && typeof focus.id === 'string') {
          refs.focuses[focus.id] = focus;
        }
      }
    }
    const baselineTiers = {
      serf:0, farmer:1, apprentice:1, monk:1, soldier:1, knight:2, baron:3
    };
    const found = {};
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const path = 'startScenarios.' + (scenario && scenario.id || i);
      onlyFields(scenario, {
        id:true, name:true, desc:true, tier:true, profession:true,
        gold:true, prestige:true, piety:true, sex:true,
        intro:true, intro_f:true, intro_muslim:true, intro_other:true,
        startEffects:true
      }, path);
      if (!/^[a-z][a-z0-9_]*$/.test(scenario.id || '')) {
        fail(path + '.id', 'must be a lowercase start-code id.');
      }
      if (found[scenario.id]) fail('startScenarios', 'must not repeat ' + scenario.id + '.');
      found[scenario.id] = scenario;
      requiredText(scenario.name, path + '.name');
      requiredText(scenario.desc, path + '.desc');
      requiredText(scenario.intro, path + '.intro');
      for (const introField of ['intro_f','intro_muslim','intro_other']) {
        if (own(scenario, introField)) {
          requiredText(scenario[introField], path + '.' + introField);
        }
      }
      integerRange(scenario.tier, 0, 3, path + '.tier');
      if (typeof scenario.profession !== 'string' ||
          !own(refs.careers, scenario.profession) ||
          !plainObject(refs.careers[scenario.profession])) {
        fail(path + '.profession', 'references unknown profession ' +
          scenario.profession + '.');
      }
      const career = refs.careers[scenario.profession];
      if (career.maleOnly && scenario.sex !== 'm') {
        fail(path + '.profession', 'requires a male-only scenario.');
      }
      if ((career.tierMin !== undefined && scenario.tier < career.tierMin) ||
          (career.tierMax !== undefined && scenario.tier > career.tierMax)) {
        fail(path + '.profession', 'is unavailable at tier ' + scenario.tier + '.');
      }
      for (const resource of ['gold','prestige','piety']) {
        if (!finiteNumber(scenario[resource]) || scenario[resource] < 0) {
          fail(path + '.' + resource, 'must be a non-negative number.');
        }
      }
      if (own(scenario, 'sex') && scenario.sex !== 'm' && scenario.sex !== 'f') {
        fail(path + '.sex', 'must be m or f.');
      }
      validateStartEffects(scenario.startEffects, scenario, refs,
        path + '.startEffects');
    }
    for (const id in baselineTiers) {
      if (!found[id]) fail('startScenarios', 'must retain baseline id ' + id + '.');
      if (found[id].tier !== baselineTiers[id]) {
        fail('startScenarios.' + id + '.tier', 'must remain ' + baselineTiers[id] + '.');
      }
    }
  }

  function validateFamilyPresets(mod) {
    const presets = combinedList(FBDATA.familyPresets,
      mod.familyPresets, 'familyPresets');
    const found = {};
    for (let i = 0; i < presets.length; i++) {
      const preset = presets[i];
      const path = 'familyPresets.' + (preset && preset.id || i);
      onlyFields(preset, {
        id:true, name:true, diff:true, desc:true, age:true,
        spouseAge:true, children:true, eldestMin:true
      }, path);
      if (!/^[a-z][a-z0-9_]*$/.test(preset.id || '')) {
        fail(path + '.id', 'must be a lowercase start-code id.');
      }
      if (found[preset.id]) fail('familyPresets', 'must not repeat ' + preset.id + '.');
      found[preset.id] = preset;
      requiredText(preset.name, path + '.name');
      requiredText(preset.diff, path + '.diff');
      requiredText(preset.desc, path + '.desc');
      if (preset.id === 'standard') {
        if (preset.age !== 0 || own(preset, 'spouseAge') ||
            own(preset, 'children') || own(preset, 'eldestMin')) {
          fail(path, 'must retain the historical age and unmarried family shape.');
        }
        continue;
      }
      integerRange(preset.age, 16, 80, path + '.age');
      const hasFamily = own(preset, 'spouseAge') || own(preset, 'children') ||
        own(preset, 'eldestMin');
      if (!hasFamily) continue;
      if (!Array.isArray(preset.spouseAge) || preset.spouseAge.length !== 2) {
        fail(path + '.spouseAge', 'must be a two-integer range.');
      }
      integerRange(preset.spouseAge[0], -40, 40, path + '.spouseAge[0]');
      integerRange(preset.spouseAge[1], -40, 40, path + '.spouseAge[1]');
      if (preset.spouseAge[0] > preset.spouseAge[1] ||
          preset.age + preset.spouseAge[0] < 16 ||
          preset.age + preset.spouseAge[1] > 80) {
        fail(path + '.spouseAge', 'must keep every possible spouse aged 16 to 80.');
      }
      if (!Array.isArray(preset.children) || preset.children.length !== 2) {
        fail(path + '.children', 'must be a two-integer range.');
      }
      integerRange(preset.children[0], 0, 8, path + '.children[0]');
      integerRange(preset.children[1], 0, 8, path + '.children[1]');
      if (preset.children[0] > preset.children[1]) {
        fail(path + '.children', 'must run from minimum to maximum.');
      }
      integerRange(preset.eldestMin, 1, 64, path + '.eldestMin');
      const oldestPossible = Math.min(preset.age,
        preset.age + preset.spouseAge[0]) - 16;
      if (preset.children[1] > 0 && preset.eldestMin > oldestPossible) {
        fail(path + '.eldestMin', 'must fit both parents’ possible ages.');
      }
    }
    for (const id of ['standard','established','elder']) {
      if (!found[id]) fail('familyPresets', 'must retain baseline id ' + id + '.');
    }
  }

  function mergedIntrigue(additions) {
    const base = FBDATA.intrigue || {};
    const out = {};
    for (const key in base) if (own(base, key)) out[key] = base[key];
    out.methodProfiles = combinedTable(base.methodProfiles,
      additions ? additions.methodProfiles : undefined,
      'intrigue.methodProfiles');
    if (additions) {
      for (const key in additions) {
        if (own(additions, key) && key !== 'methodProfiles') {
          out[key] = additions[key];
        }
      }
    }
    return out;
  }

  function validateIntrigue(mod) {
    const additions = own(mod, 'intrigue') ? mod.intrigue : null;
    if (additions) {
      onlyFields(additions, {
        maxAiSchemes:true, aiStartsPerYear:true,
        aiPlayerFacingPerYear:true, aiActorCooldownYears:true,
        leverageDays:true, captiveRansoms:true, methodProfiles:true
      }, 'intrigue');
    } else if (own(mod, 'intrigue')) {
      fail('intrigue', 'must be an object.');
    }
    const effective = mergedIntrigue(additions);
    const boundedIntegers = {
      maxAiSchemes:6, aiStartsPerYear:2, aiPlayerFacingPerYear:1
    };
    for (const key in boundedIntegers) {
      const value = effective[key];
      if (!finiteNumber(value) || Math.floor(value) !== value || value < 0 ||
          value > boundedIntegers[key]) {
        fail('intrigue.' + key, 'must be an integer from 0 to ' +
          boundedIntegers[key] + '.');
      }
    }
    if (!finiteNumber(effective.aiActorCooldownYears) ||
        effective.aiActorCooldownYears < 0) {
      fail('intrigue.aiActorCooldownYears', 'must be a non-negative number.');
    }
    if (!finiteNumber(effective.leverageDays) ||
        Math.floor(effective.leverageDays) !== effective.leverageDays ||
        effective.leverageDays < 1) {
      fail('intrigue.leverageDays', 'must be a positive integer.');
    }
    if (!Array.isArray(effective.captiveRansoms) ||
        !effective.captiveRansoms.length) {
      fail('intrigue.captiveRansoms', 'must be a non-empty array.');
    }
    for (let i = 0; i < effective.captiveRansoms.length; i++) {
      if (!finiteNumber(effective.captiveRansoms[i]) ||
          effective.captiveRansoms[i] < 0) {
        fail('intrigue.captiveRansoms[' + i + ']',
          'must be a non-negative number.');
      }
    }
    const profileFields = {
      progress:true, success:true, discovery:true,
      stationCost:true, martial:true
    };
    for (const profileId in effective.methodProfiles) {
      if (!own(effective.methodProfiles, profileId)) continue;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(profileId)) {
        fail('intrigue.methodProfiles.' + profileId,
          'has an invalid profile id.');
      }
      const profile = effective.methodProfiles[profileId];
      onlyFields(profile, profileFields,
        'intrigue.methodProfiles.' + profileId);
      if (own(profile, 'progress') &&
          (!finiteNumber(profile.progress) || profile.progress <= 0)) {
        fail('intrigue.methodProfiles.' + profileId + '.progress',
          'must be a positive number.');
      }
      for (const field of ['success','discovery']) {
        if (own(profile, field) && !finiteNumber(profile[field])) {
          fail('intrigue.methodProfiles.' + profileId + '.' + field,
            'must be a number.');
        }
      }
      for (const field of ['stationCost','martial']) {
        if (own(profile, field) && typeof profile[field] !== 'boolean') {
          fail('intrigue.methodProfiles.' + profileId + '.' + field,
            'must be true or false.');
        }
      }
    }
    const plots = combinedTable(FBDATA.plots, mod.plots, 'plots');
    for (const plotId in plots) {
      const methods = plots[plotId] && plots[plotId].methods;
      if (!Array.isArray(methods)) continue;
      for (let i = 0; i < methods.length; i++) {
        const profileId = methods[i] && methods[i].profile;
        if (profileId && !own(effective.methodProfiles, profileId)) {
          fail('plots.' + plotId + '.methods[' + i + '].profile',
            'references unknown intrigue profile ' + profileId + '.');
        }
      }
    }
  }

  function validateItemPools(mod) {
    const items = combinedTable(FBDATA.items, mod.items, 'items');
    const pools = combinedTable(FBDATA.itemPools, mod.itemPools, 'itemPools');
    for (const poolId in pools) {
      if (!own(pools, poolId)) continue;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(poolId)) {
        fail('itemPools.' + poolId, 'has an invalid pool id.');
      }
      validateIdList(pools[poolId], 'itemPools.' + poolId, items, false);
    }
  }

  function validateRulerTraits(mod) {
    const traits = combinedTable(FBDATA.traits, mod.traits, 'traits');
    validateIdList(mod.rulerTraits, 'rulerTraits', traits, false);
  }

  function validateRaidingTraditions(mod) {
    onlyFields(mod.raidingTraditions, {
      cultures:true, faiths:true, faithGroups:true
    }, 'raidingTraditions');
    const rules = {};
    const base = FBDATA.raidingTraditions || {};
    for (const key of ['cultures','faiths','faithGroups']) {
      rules[key] = own(mod.raidingTraditions, key)
        ? mod.raidingTraditions[key] : base[key];
    }
    const cultures = combinedTable(FBDATA.cultures, mod.cultures, 'cultures');
    const religions = combinedTable(FBDATA.religions, mod.religions, 'religions');
    validateIdList(rules.cultures, 'raidingTraditions.cultures',
      cultures, true);
    validateIdList(rules.faiths, 'raidingTraditions.faiths',
      religions, true);
    validateIdList(rules.faithGroups, 'raidingTraditions.faithGroups',
      religions, true);
    for (let i = 0; i < rules.faithGroups.length; i++) {
      const groupId = rules.faithGroups[i];
      if (religions[groupId] && religions[groupId].group) {
        fail('raidingTraditions.faithGroups[' + i + ']',
          'must name a root faith group.');
      }
    }
  }

  const BASELINE_RELIGIOUS_RANKS = {
    catholic_lay:['parishioner','almsgiver','pilgrim','church_patron'],
    catholic_monastic:['novice','professed','prior','abbot','bishop'],
    catholic_clerical:['clerk','acolyte','deacon','priest','archpriest','bishop'],
    muslim_lay:['believer','almsgiver','hajji','waqf_patron'],
    muslim_scholar:[
      'student','licensed_scholar','mudarris','mufti','qadi','chief_qadi'
    ],
    muslim_mosque:['mosque_servant','muezzin','imam','khatib','chief_imam']
  };

  function localReligiousRoutes(def) {
    if (!plainObject(def)) return undefined;
    if (plainObject(def.properties) && own(def.properties, 'religiousPaths')) {
      return def.properties.religiousPaths;
    }
    return own(def, 'religiousPaths') ? def.religiousPaths : undefined;
  }

  function validateReligiousPaths(mod) {
    const paths = combinedTable(FBDATA.religiousPaths,
      mod.religiousPaths, 'religiousPaths');
    const religions = combinedTable(FBDATA.religions,
      mod.religions, 'religions');
    const careers = combinedTable(FBDATA.careers, mod.careers, 'careers');
    for (const pathId in paths) {
      if (!own(paths, pathId)) continue;
      const path = 'religiousPaths.' + pathId;
      if (!/^[a-z][a-z0-9_]*$/.test(pathId)) {
        fail(path, 'has an invalid path id.');
      }
      const def = paths[pathId];
      onlyFields(def, {
        kind:true, faiths:true, systems:true, professions:true, ranks:true
      }, path);
      if (def.kind !== 'lay' && def.kind !== 'vocation') {
        fail(path + '.kind', 'must be lay or vocation.');
      }
      if (own(def, 'faiths')) {
        validateIdList(def.faiths, path + '.faiths', religions, false);
      }
      if (own(def, 'systems')) {
        validateIdList(def.systems, path + '.systems', null, false);
        for (let i = 0; i < def.systems.length; i++) {
          if (!/^[a-z][a-z0-9_]*$/.test(def.systems[i])) {
            fail(path + '.systems[' + i + ']',
              'must be a lowercase system id.');
          }
        }
      }
      if (own(def, 'professions')) {
        validateIdList(def.professions, path + '.professions', careers, false);
      }
      if (!Array.isArray(def.ranks) || !def.ranks.length ||
          def.ranks.length > 20) {
        fail(path + '.ranks', 'must be an array of 1 to 20 ranks.');
      }
      const rankIds = {};
      const flags = {};
      for (let i = 0; i < def.ranks.length; i++) {
        const rank = def.ranks[i];
        const rankPath = path + '.ranks[' + i + ']';
        onlyFields(rank, {
          id:true, name:true, name_f:true, age:true, years:true,
          learning:true, gold:true, prestige:true, piety:true,
          prestigeGain:true, pietyYield:true, station:true, tier:true,
          flag:true, maleOnly:true
        }, rankPath);
        if (typeof rank.id !== 'string' ||
            !/^[a-z][a-z0-9_]*$/.test(rank.id)) {
          fail(rankPath + '.id', 'must be a lowercase rank id.');
        }
        if (rankIds[rank.id]) fail(path + '.ranks',
          'must not repeat rank id ' + rank.id + '.');
        rankIds[rank.id] = true;
        requiredText(rank.name, rankPath + '.name');
        if (own(rank, 'name_f')) requiredText(rank.name_f, rankPath + '.name_f');
        for (const field of ['age','years','learning']) {
          if (own(rank, field)) integerRange(rank[field], 0, 100,
            rankPath + '.' + field);
        }
        for (const field of [
          'gold','prestige','piety','prestigeGain','pietyYield'
        ]) {
          if (own(rank, field) && (!finiteNumber(rank[field]) ||
              rank[field] < 0 || rank[field] > 100000)) {
            fail(rankPath + '.' + field,
              'must be a number from 0 to 100000.');
          }
        }
        if (own(rank, 'station')) integerRange(rank.station, 0, 4,
          rankPath + '.station');
        if (own(rank, 'tier')) integerRange(rank.tier, 0, 7,
          rankPath + '.tier');
        if (own(rank, 'maleOnly') && typeof rank.maleOnly !== 'boolean') {
          fail(rankPath + '.maleOnly', 'must be true or false.');
        }
        if (own(rank, 'flag')) {
          if (typeof rank.flag !== 'string' ||
              !/^[A-Za-z][A-Za-z0-9_]*$/.test(rank.flag)) {
            fail(rankPath + '.flag', 'has an invalid compatibility flag id.');
          }
          if (flags[rank.flag]) fail(path + '.ranks',
            'must not repeat compatibility flag ' + rank.flag + '.');
          flags[rank.flag] = true;
        }
      }
    }
    for (const pathId in BASELINE_RELIGIOUS_RANKS) {
      const expected = BASELINE_RELIGIOUS_RANKS[pathId];
      const def = paths[pathId];
      if (!def) fail('religiousPaths', 'must retain baseline id ' + pathId + '.');
      if (def.ranks.length < expected.length) {
        fail('religiousPaths.' + pathId + '.ranks',
          'must retain every baseline rank.');
      }
      for (let i = 0; i < expected.length; i++) {
        if (def.ranks[i].id !== expected[i]) {
          fail('religiousPaths.' + pathId + '.ranks[' + i + '].id',
            'must remain ' + expected[i] + '.');
        }
      }
    }
    for (const religionId in religions) {
      if (!own(religions, religionId)) continue;
      const routes = localReligiousRoutes(religions[religionId]);
      if (routes === undefined || routes === null) continue;
      const path = 'religions.' + religionId + '.properties.religiousPaths';
      onlyFields(routes, { lay:true, professions:true }, path);
      if (typeof routes.lay !== 'string' || !own(paths, routes.lay)) {
        fail(path + '.lay', 'references unknown religious path ' +
          routes.lay + '.');
      }
      if (paths[routes.lay].kind !== 'lay') {
        fail(path + '.lay', 'must reference a lay path.');
      }
      if (!plainObject(routes.professions)) {
        fail(path + '.professions', 'must be an object.');
      }
      for (const profession in routes.professions) {
        if (!own(routes.professions, profession)) continue;
        const pathId = routes.professions[profession];
        if (!own(careers, profession)) {
          fail(path + '.professions.' + profession,
            'references unknown profession ' + profession + '.');
        }
        if (typeof pathId !== 'string' || !own(paths, pathId)) {
          fail(path + '.professions.' + profession,
            'references unknown religious path ' + pathId + '.');
        }
        if (paths[pathId].kind !== 'vocation') {
          fail(path + '.professions.' + profession,
            'must reference a vocation path.');
        }
        if (Array.isArray(paths[pathId].professions) &&
            paths[pathId].professions.indexOf(profession) < 0) {
          fail(path + '.professions.' + profession,
            'must reference a path that allows profession ' + profession + '.');
        }
      }
    }
  }

  const BASELINE_COUNCIL_SEATS = [
    'seneschal','constable','treasurer','almoner','chamberlain'
  ];

  function validateCouncilDefinitions(mod) {
    const seats = combinedTable(FBDATA.councilSeats,
      mod.councilSeats, 'councilSeats');
    const traits = combinedTable(FBDATA.traits, mod.traits, 'traits');
    for (const seatId in seats) {
      if (!own(seats, seatId)) continue;
      const path = 'councilSeats.' + seatId;
      if (!/^[a-z][a-z0-9_]*$/.test(seatId)) {
        fail(path, 'has an invalid seat id.');
      }
      const def = seats[seatId];
      onlyFields(def, {
        name:true, desc:true, icon:true, bonusKey:true, bonusAmount:true,
        tierMin:true, holderEligibility:true
      }, path);
      requiredText(def.name, path + '.name');
      requiredText(def.desc, path + '.desc');
      requiredText(def.icon, path + '.icon');
      if (def.icon.length > 16) fail(path + '.icon', 'must be at most 16 characters.');
      if (typeof def.bonusKey !== 'string' ||
          !/^[a-z][a-z0-9_]*$/.test(def.bonusKey)) {
        fail(path + '.bonusKey', 'must be a lowercase bonus key.');
      }
      if (!finiteNumber(def.bonusAmount) || def.bonusAmount < 0 ||
          def.bonusAmount > 100) {
        fail(path + '.bonusAmount', 'must be a number from 0 to 100.');
      }
      integerRange(def.tierMin, 0, 7, path + '.tierMin');
      if (def.holderEligibility !== 'direct_vassal') {
        fail(path + '.holderEligibility', 'must be direct_vassal.');
      }
    }
    for (const seatId of BASELINE_COUNCIL_SEATS) {
      if (!own(seats, seatId)) {
        fail('councilSeats', 'must retain baseline id ' + seatId + '.');
      }
    }
    const rules = own(mod, 'councilRules')
      ? mod.councilRules : FBDATA.councilRules;
    onlyFields(rules, { schemerTraits:true }, 'councilRules');
    validateIdList(rules.schemerTraits, 'councilRules.schemerTraits',
      traits, true);
  }

  function validateSerfFreedomEventEffects(mod) {
    if (!own(mod, 'events')) return;
    if (!Array.isArray(mod.events)) fail('events', 'must be an array.');
    for (let eventIndex = 0; eventIndex < mod.events.length; eventIndex++) {
      const event = mod.events[eventIndex];
      if (!event || !Array.isArray(event.options)) continue;
      for (let optionIndex = 0; optionIndex < event.options.length; optionIndex++) {
        const option = event.options[optionIndex] || {};
        const branches = [
          { name:'effects', value:option.effects },
          { name:'success.effects', value:option.success && option.success.effects },
          { name:'failure.effects', value:option.failure && option.failure.effects }
        ];
        for (let branchIndex = 0; branchIndex < branches.length; branchIndex++) {
          const branch = branches[branchIndex];
          try {
            if (FB.validateSerfFreedomEffect) {
              FB.validateSerfFreedomEffect(branch.value);
            }
          } catch (error) {
            fail('events[' + eventIndex + '].options[' + optionIndex + '].' +
              branch.name, error.message || 'has invalid serfFreedom data.');
          }
        }
      }
    }
  }

  function validateBeforeApply(mod) {
    if (!plainObject(mod)) throw new Error('Mod data must be an object.');
    for (const key in mod) {
      if (own(mod, key) && !own(PUBLIC_KEYS, key)) {
        fail(key, 'is not a supported top-level mod key.');
      }
    }
    if (own(mod, 'name') && (typeof mod.name !== 'string' || !mod.name)) {
      fail('name', 'must be a non-empty string.');
    }
    if (own(mod, 'intrigue') || own(mod, 'plots')) validateIntrigue(mod);
    if (own(mod, 'itemPools')) validateItemPools(mod);
    if (own(mod, 'rulerTraits')) validateRulerTraits(mod);
    if (own(mod, 'raidingTraditions')) validateRaidingTraditions(mod);
    if (own(mod, 'startScenarios')) validateStartScenarios(mod);
    if (own(mod, 'familyPresets')) validateFamilyPresets(mod);
    if (own(mod, 'religiousPaths') || own(mod, 'religions')) {
      validateReligiousPaths(mod);
    }
    if (own(mod, 'councilSeats') || own(mod, 'councilRules')) {
      validateCouncilDefinitions(mod);
    }
    validateSerfFreedomEventEffects(mod);
    return { actions:prepareActionCatalogs(mod) };
  }

  /* Cap groups are configuration maps rather than atomic definitions. A mod
     can raise one unit/cost cap without silently dropping every sibling cap. */
  function mergeTechCaps(additions) {
    const nested = { costFloor:true, units:true, aiUnits:true };
    for (const k in additions) {
      if (!own(additions, k)) continue;
      const value = additions[k];
      if (nested[k] && value && typeof value === 'object' &&
          !Array.isArray(value) && FBDATA.techCaps[k] &&
          typeof FBDATA.techCaps[k] === 'object' &&
          !Array.isArray(FBDATA.techCaps[k])) {
        mergeTable(FBDATA.techCaps[k], value);
      } else {
        FBDATA.techCaps[k] = value;
      }
    }
  }

  /* A pre-settlement-site legacy mod replaces a whole province record and may
     therefore omit its new optional presentation list. Preserve the previous
     slot labels privately so world compilation can keep old saves and their
     numeric property references legible, while still generating fresh sites. */
  function retainLegacySettlementPresentation(replacements) {
    if (!Array.isArray(replacements)) return;
    for (const replacement of replacements) {
      if (!replacement || own(replacement, 'settlements')) continue;
      let previous = null;
      for (const province of (FBDATA.provinces || [])) {
        if (province && province.id === replacement.id) {
          previous = province;
          break;
        }
      }
      const entries = previous &&
        (previous._legacySettlementPresentation || previous.settlements);
      if (!Array.isArray(entries)) continue;
      Object.defineProperty(replacement, '_legacySettlementPresentation', {
        configurable:true,
        value:entries.map(function (entry) {
          return { name:entry.name, kind:entry.kind };
        }),
        writable:true
      });
    }
  }

  M.apply = function (mod) {
    const prepared = validateBeforeApply(mod);
    if (own(mod, 'marketGoods') || own(mod, 'marketEndowmentTypes') ||
        own(mod, 'marketEndowments')) {
      const marketGoods = own(mod, 'marketGoods')
        ? mod.marketGoods : FBDATA.marketGoods;
      const marketTypes = own(mod, 'marketEndowmentTypes')
        ? mod.marketEndowmentTypes : FBDATA.marketEndowmentTypes;
      const marketRegions = own(mod, 'marketEndowments')
        ? mod.marketEndowments : FBDATA.marketEndowments;
      const marketGeography = {
        provinces:(FBDATA.provinces || []).slice(),
        duchies:{}
      };
      for (const duchyId in (FBDATA.duchies || {})) {
        marketGeography.duchies[duchyId] = FBDATA.duchies[duchyId];
      }
      if (Array.isArray(mod.provinces)) {
        for (let i = 0; i < mod.provinces.length; i++) {
          marketGeography.provinces.push(mod.provinces[i]);
        }
      }
      for (const duchyId in (mod.duchies || {})) {
        marketGeography.duchies[duchyId] = mod.duchies[duchyId];
      }
      const marketFaults = FB.validateMarketData
        ? FB.validateMarketData(marketGoods, marketTypes, marketRegions,
          marketGeography)
        : ['market engine is unavailable.'];
      if (marketFaults.length) throw new Error(marketFaults.join(' '));
      if (own(mod, 'marketGoods')) FBDATA.marketGoods = marketGoods;
      if (own(mod, 'marketEndowmentTypes')) {
        FBDATA.marketEndowmentTypes = marketTypes;
      }
      if (own(mod, 'marketEndowments')) FBDATA.marketEndowments = marketRegions;
    }
    const legacyWorldKeys = [
      'provinces','realms','empires','kingdoms','duchies','straits',
      'crossingClasses','scripted','bounds','land','seas'
    ];
    let changesLegacyWorld = false;
    for (let wi = 0; wi < legacyWorldKeys.length; wi++) {
      if (own(mod, legacyWorldKeys[wi])) { changesLegacyWorld = true; break; }
    }
    let supplies1066 = false;
    if (mod.bookmarks) {
      if (Array.isArray(mod.bookmarks)) {
        for (const definition of mod.bookmarks) {
          if (!definition || !definition.id) continue;
          FBDATA.bookmarks[definition.id] = definition;
          if (definition.id === '1066') supplies1066 = true;
        }
      } else {
        for (const bookmarkId in mod.bookmarks) {
          if (!own(mod.bookmarks, bookmarkId)) continue;
          const definition = mod.bookmarks[bookmarkId];
          if (!definition || typeof definition !== 'object') continue;
          // The table key is authoritative, just like ids in merge-by-id arrays.
          definition.id = bookmarkId;
          FBDATA.bookmarks[bookmarkId] = definition;
          if (bookmarkId === '1066') supplies1066 = true;
        }
      }
    }
    if (changesLegacyWorld && !supplies1066) legacyBookmarkLimited = true;
    if (mod.events) {
      mergeById(FBDATA.events, mod.events, 'id');
      if (FB.invalidateEventIndex) FB.invalidateEventIndex();
    }
    if (mod.provinces) {
      retainLegacySettlementPresentation(mod.provinces);
      mergeById(FBDATA.provinces, mod.provinces, 'id');
    }
    if (mod.realms) mergeById(FBDATA.realms, mod.realms, 'id');
    if (mod.empires) for (const k in mod.empires) FBDATA.empires[k] = mod.empires[k];
    if (mod.kingdoms) for (const k in mod.kingdoms) FBDATA.kingdoms[k] = mod.kingdoms[k];
    if (mod.duchies) for (const k in mod.duchies) FBDATA.duchies[k] = mod.duchies[k];
    if (mod.straits) {
      for (const strait of mod.straits) FBDATA.straits.push(strait);
    }
    if (mod.crossingClasses) {
      for (const crossingKey in mod.crossingClasses) {
        if (own(mod.crossingClasses, crossingKey)) {
          FBDATA.crossingClasses[crossingKey] = mod.crossingClasses[crossingKey];
        }
      }
    }
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
    if (mod.cultureTraditions) {
      mergeTable(FBDATA.cultureTraditions, mod.cultureTraditions);
    }
    if (mod.cultures) {
      for (const k in mod.cultures) {
        if (!own(mod.cultures, k)) continue;
        const nextCulture = mod.cultures[k];
        const previousCulture = FBDATA.cultures[k];
        if (previousCulture && previousCulture.tradition && nextCulture &&
            typeof nextCulture === 'object' && !Array.isArray(nextCulture) &&
            !own(nextCulture, 'tradition')) {
          const compatibleCulture = {};
          for (const field in nextCulture) {
            if (own(nextCulture, field)) compatibleCulture[field] = nextCulture[field];
          }
          compatibleCulture.tradition = previousCulture.tradition;
          FBDATA.cultures[k] = compatibleCulture;
        } else {
          FBDATA.cultures[k] = nextCulture;
        }
      }
    }
    if (mod.settlementNames) for (const k in mod.settlementNames) FBDATA.settlementNames[k] = mod.settlementNames[k];
    /* Physical settlement sites merge by site id into the shared table.
       Per-county `settlements` presentations ride inside complete bookmark or
       legacy province replacements, never as a standalone patch. */
    if (mod.settlementSites) mergeTable(FBDATA.settlementSites, mod.settlementSites);
    if (mod.religiousPaths) mergeTable(FBDATA.religiousPaths,
      mod.religiousPaths);
    if (mod.religions) for (const k in mod.religions) FBDATA.religions[k] = mod.religions[k];
    if (mod.traits) for (const k in mod.traits) FBDATA.traits[k] = mod.traits[k];
    if (mod.ailments) for (const k in mod.ailments) FBDATA.ailments[k] = mod.ailments[k];
    if (mod.modifiers) for (const k in mod.modifiers) FBDATA.modifiers[k] = mod.modifiers[k];
    if (mod.buildings) for (const k in mod.buildings) FBDATA.buildings[k] = mod.buildings[k];
    if (mod.forts) {
      const modFortLevels = mod.forts.levels;
      for (const fortKey in mod.forts) {
        if (fortKey !== 'levels' && own(mod.forts, fortKey)) {
          FBDATA.forts[fortKey] = mod.forts[fortKey];
        }
      }
      if (modFortLevels) {
        mergeTable(FBDATA.forts.levels, modFortLevels);
        FBDATA.fortLevels = FBDATA.forts.levels;
      }
      if (FB.invalidateFortIndex) FB.invalidateFortIndex();
    }
    if (mod.tech) for (const k in mod.tech) FBDATA.tech[k] = mod.tech[k];
    if (mod.techDomains) mergeTable(FBDATA.techDomains, mod.techDomains);
    if (mod.techTraditions) mergeTable(FBDATA.techTraditions, mod.techTraditions);
    if (mod.techCaps) mergeTechCaps(mod.techCaps);
    if (mod.unitClasses) mergeTable(FBDATA.unitClasses, mod.unitClasses);
    if (mod.techImpactReviews && mod.techImpactReviews.features) {
      mergeTable(FBDATA.techImpactReviews.features,
        mod.techImpactReviews.features);
    }
    if (mod.holdings) for (const k in mod.holdings) FBDATA.holdings[k] = mod.holdings[k];
    if (mod.careers) for (const k in mod.careers) FBDATA.careers[k] = mod.careers[k];
    if (mod.positions) for (const k in mod.positions) FBDATA.positions[k] = mod.positions[k];
    if (mod.localCouncilMotions) {
      for (const k in mod.localCouncilMotions) {
        FBDATA.localCouncilMotions[k] = mod.localCouncilMotions[k];
      }
    }
    if (mod.feudalServiceCharters) {
      for (const k in mod.feudalServiceCharters) {
        FBDATA.feudalServiceCharters[k] = mod.feudalServiceCharters[k];
      }
    }
    if (mod.schooling) for (const k in mod.schooling) FBDATA.schooling[k] = mod.schooling[k];
    if (mod.enterprises) for (const k in mod.enterprises) FBDATA.enterprises[k] = mod.enterprises[k];
    if (mod.auctionLotTypes) mergeTable(FBDATA.auctionLotTypes,
      mod.auctionLotTypes);
    if (mod.householdStandards) {
      for (const k in mod.householdStandards) {
        FBDATA.householdStandards[k] = mod.householdStandards[k];
      }
    }
    if (mod.travelPurposes) {
      for (const k in mod.travelPurposes) FBDATA.travelPurposes[k] = mod.travelPurposes[k];
    }
    if (mod.travelSites) mergeById(FBDATA.travelSites, mod.travelSites, 'id');
    if (mod.finance) for (const k in mod.finance) FBDATA.finance[k] = mod.finance[k];
    if (mod.plots) for (const k in mod.plots) FBDATA.plots[k] = mod.plots[k];
    if (mod.items) for (const k in mod.items) FBDATA.items[k] = mod.items[k];
    if (mod.itemPools) mergeTable(FBDATA.itemPools, mod.itemPools);
    if (mod.startScenarios) {
      mergeById(FBDATA.startScenarios, mod.startScenarios, 'id');
    }
    if (mod.familyPresets) {
      mergeById(FBDATA.familyPresets, mod.familyPresets, 'id');
    }
    if (mod.councilSeats) mergeTable(FBDATA.councilSeats, mod.councilSeats);
    if (own(mod, 'councilRules')) FBDATA.councilRules = mod.councilRules;
    if (own(mod, 'rulerTraits')) {
      FBDATA.rulerTraits = mod.rulerTraits.slice();
      FB.RULER_TRAITS = FBDATA.rulerTraits;
    }
    if (mod.raidingTraditions) {
      for (const key of ['cultures','faiths','faithGroups']) {
        if (own(mod.raidingTraditions, key)) {
          FBDATA.raidingTraditions[key] = mod.raidingTraditions[key].slice();
        }
      }
    }
    if (mod.intrigue) {
      for (const key in mod.intrigue) {
        if (!own(mod.intrigue, key)) continue;
        if (key === 'methodProfiles') {
          mergeTable(FBDATA.intrigue.methodProfiles,
            mod.intrigue.methodProfiles);
        } else {
          FBDATA.intrigue[key] = mod.intrigue[key];
        }
      }
    }
    if (mod.titles) {
      for (const k in mod.titles) {
        FBDATA.titles[k] = mod.titles[k];
        /* Title tables predate faith properties. Mirror the four historical
           group keys into their new roots so an existing title-only mod keeps
           changing live rulers as well as old saved snapshots. */
        const female = k.slice(-2) === '_f';
        const rootId = female ? k.slice(0, -2) : k;
        const root = FBDATA.religions && FBDATA.religions[rootId];
        if (root && ['christian','muslim','pagan','jewish'].indexOf(rootId) >= 0) {
          root.properties = root.properties || {};
          root.properties.rankTitles = root.properties.rankTitles || {};
          root.properties.rankTitles[female ? 'f' : 'm'] = mod.titles[k];
          if (!root.properties.rankTitles.m) {
            root.properties.rankTitles.m = FBDATA.titles[rootId];
          }
          if (!root.properties.rankTitles.f) {
            root.properties.rankTitles.f = FBDATA.titles[rootId + '_f'] ||
              FBDATA.titles[rootId];
          }
        }
      }
    }
    if (mod.politicalBlocs) {
      for (const k in mod.politicalBlocs) {
        FBDATA.politicalBlocs[k] = mod.politicalBlocs[k];
      }
    }
    if (mod.policies) {
      for (const k in mod.policies) FBDATA.policies[k] = mod.policies[k];
    }
    if (mod.elections) {
      for (const k in mod.elections) FBDATA.elections[k] = mod.elections[k];
    }
    if (mod.privileges) {
      for (const k in mod.privileges) FBDATA.privileges[k] = mod.privileges[k];
    }
    if (mod.collectiveDemands) {
      for (const k in mod.collectiveDemands) {
        FBDATA.collectiveDemands[k] = mod.collectiveDemands[k];
      }
    }
    if (own(mod, 'papacy')) FBDATA.papacy = mod.papacy;
    if (own(mod, 'currency')) {
      FBDATA.currency = mod.currency;
      currencySupplied = true;
    }
    if (mod.balance) for (const k in mod.balance) FBDATA.balance[k] = mod.balance[k];
    if (mod.bounds) FBDATA.bounds = mod.bounds;
    if (mod.land) FBDATA.land = mod.land;
    if (mod.seas) FBDATA.seas = mod.seas;
    if (mod.rivers) FBDATA.rivers = mod.rivers;
    if (own(mod, 'defaultBookmark')) FBDATA.defaultBookmark = mod.defaultBookmark;
    if (prepared.actions) {
      FB.installActionData(prepared.actions.focuses, prepared.actions.deeds);
    }
    if ((mod.items || mod.cultures || mod.religions || mod.traits || mod.ailments) &&
        FB.clearPortraitCache) FB.clearPortraitCache();
    if ((mod.religions || mod.titles) && FB.invalidateReligionData) {
      FB.invalidateReligionData();
    }
  };

  M.applyStored = function () {
    currencySupplied = false;
    currencyInvalid = false;
    legacyBookmarkLimited = false;
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
    if (FB.configureCurrency) {
      currencyInvalid = !FB.configureCurrency(
        currencySupplied ? FBDATA.currency : null,
        currencySupplied,
        FBDATA.balance && FBDATA.balance.coinageSymbol
      );
    }
  };
})();
