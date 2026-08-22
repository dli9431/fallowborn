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
    provinces:true, realms:true, empires:true, kingdoms:true, duchies:true,
    events:true, straits:true, crossingClasses:true, scripted:true,
    cultureTraditions:true, cultures:true, religions:true, traits:true,
    ailments:true, modifiers:true, buildings:true, forts:true,
    techDomains:true, techTraditions:true, tech:true, techCaps:true,
    techImpactReviews:true, unitClasses:true, holdings:true, careers:true,
    positions:true, localCouncilMotions:true, feudalServiceCharters:true,
    schooling:true, enterprises:true, auctionLotTypes:true,
    householdStandards:true, marketGoods:true, marketEndowmentTypes:true,
    marketEndowments:true, travelPurposes:true, travelSites:true,
    finance:true, plots:true, intrigue:true, items:true, itemPools:true,
    rulerTraits:true, raidingTraditions:true, politicalBlocs:true,
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
      if (own(value, key) && !allowed[key]) {
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

  function mergedIntrigue(additions) {
    const base = FBDATA.intrigue || {};
    const out = {};
    for (const key in base) if (own(base, key)) out[key] = base[key];
    out.methodProfiles = combinedTable(base.methodProfiles,
      additions && additions.methodProfiles, 'intrigue.methodProfiles');
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

  function validateBeforeApply(mod) {
    if (!plainObject(mod)) throw new Error('Mod data must be an object.');
    for (const key in mod) {
      if (own(mod, key) && !PUBLIC_KEYS[key]) {
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
    validateBeforeApply(mod);
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
    if (mod.events) mergeById(FBDATA.events, mod.events, 'id');
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
