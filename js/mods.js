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
  const KEY = FB.storageKey('fb_mods');
  const BKEY = FB.storageKey('fb_mods_bundled');
  const legacyWorldBookmarkId = FBDATA.defaultBookmark;
  let currencySupplied = false;
  let currencyInvalid = false;
  let legacyBookmarkLimited = false;
  let effectiveFingerprint = '';
  let modFailure = '';
  const authoringRoots = ['positionRules','policyGovernance','marketRaidYields','authoringDefaults','actionPolicies','rulerFaithTargets','federateServiceStarts','federateMigrations','rankPrestigeYearly','historicalAmbitions','federateContractTerms','tenureArchetypes','tenureDuties','tenureRights','freedomBargaining','freedomTerms','storyInstances','focusRoutines','deedRoutines','deedEvents','eventChances','eventSubscriptions','tournamentRules','councilSeatRoles','enterpriseMechanics','specializationMarketEffects','householdStandardDemand','abbeys','householdServiceRoles','religiousOfficeRanks','papacyRules','travelRules','travelDefaults','parliamentAgendas','agencyRules','quickStarts','traitMechanics','authorityOffices','legitimacySources','customaryBases'];
  const authoredRoots = Object.create(null);
  let baseCatalogues = null;
  var timingAllowed = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname);
  var timingEnabled = timingAllowed && /(?:^|[?&])modTiming=1(?:&|$)/.test(location.search);
  var timingRows = [];
  M.timing = {
    enable:function (on) { timingEnabled = timingAllowed && !!on; timingRows = []; return timingEnabled; },
    read:function () { return timingRows.map(function (row) { return Object.assign({}, row); }); }
  };
  function timeStart() { return timingEnabled ? performance.now() : null; }
  function timeEnd(kind, start, facts) {
    if (start === null) return;
    var row = Object.assign({ operation:kind, elapsedMs:performance.now() - start }, facts || {});
    timingRows.push(row); if (timingRows.length > 64) timingRows.shift();
  }
  function captureBaseCatalogues() {
    if (baseCatalogues || FB.platform.isCrazyGames) return;
    var started = timeStart(), definitions = {};
    // Retain read-only auxiliary references; copy only the authorable inputs.
    // Generated locale/music catalogues never enter this serialized snapshot.
    Object.keys(PUBLIC_KEYS).concat(['faithDefaults','defaultGeography']).forEach(function (key) {
      if (own(FBDATA, key)) definitions[key] = FBDATA[key];
    });
    var serialized = null;
    try {
      serialized = JSON.stringify(definitions);
      baseCatalogues = Object.assign({}, FBDATA, JSON.parse(serialized));
    } finally {
      timeEnd('base_snapshot', started, { roots:Object.keys(definitions).length,
        jsonCodeUnits:serialized === null ? 0 : serialized.length, accepted:!!baseCatalogues });
    }
  }

  M.assertReady = function () {
    if (modFailure) throw new Error(modFailure);
  };

  /* Canonical JSON and synchronous SHA-256 keep file:// saves independent of
     WebCrypto availability. This runs at mod installation, never per tick. */
  M.fingerprint = function (value) {
    function canonical(row) {
      if (Array.isArray(row)) return '[' + row.map(canonical).join(',') + ']';
      if (row && typeof row === 'object') return '{' + Object.keys(row).sort().map(function (key) {
        return JSON.stringify(key) + ':' + canonical(row[key]);
      }).join(',') + '}';
      return JSON.stringify(row);
    }
    var text = canonical(JSON.parse(JSON.stringify(value))), bytes = [];
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length &&
          text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff)
        c = 0x10000 + ((c - 0xd800) << 10) + text.charCodeAt(++i) - 0xdc00;
      else if (c >= 0xd800 && c <= 0xdfff) c = 0xfffd;
      if (c < 128) bytes.push(c);
      else if (c < 2048) bytes.push(192 | c >> 6, 128 | c & 63);
      else if (c < 65536) bytes.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
      else bytes.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
    }
    var bits = bytes.length * 8;
    bytes.push(128);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var high = Math.floor(bits / 4294967296), low = bits >>> 0;
    for (i = 3; i >= 0; i--) bytes.push(high >>> (i * 8) & 255);
    for (i = 3; i >= 0; i--) bytes.push(low >>> (i * 8) & 255);
    var h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    function rotate(n, by) { return n >>> by | n << (32 - by); }
    for (var offset = 0; offset < bytes.length; offset += 64) {
      var w = [], a = h[0], b = h[1], c0 = h[2], d = h[3], e = h[4], f = h[5], g = h[6], h0 = h[7];
      for (i = 0; i < 64; i++) {
        if (i < 16) {
          var j = offset + i * 4;
          w[i] = bytes[j] << 24 | bytes[j + 1] << 16 | bytes[j + 2] << 8 | bytes[j + 3];
        } else {
          var x = w[i - 15], y = w[i - 2];
          w[i] = (w[i - 16] + (rotate(x,7) ^ rotate(x,18) ^ x >>> 3) +
            w[i - 7] + (rotate(y,17) ^ rotate(y,19) ^ y >>> 10)) | 0;
        }
        var t1 = (h0 + (rotate(e,6) ^ rotate(e,11) ^ rotate(e,25)) +
          ((e & f) ^ (~e & g)) + k[i] + w[i]) | 0;
        var t2 = ((rotate(a,2) ^ rotate(a,13) ^ rotate(a,22)) + ((a & b) ^ (a & c0) ^ (b & c0))) | 0;
        h0 = g; g = f; f = e; e = (d + t1) | 0; d = c0; c0 = b; b = a; a = (t1 + t2) | 0;
      }
      [a,b,c0,d,e,f,g,h0].forEach(function (n, index) { h[index] = (h[index] + n) | 0; });
    }
    return h.map(function (n) { return ('00000000' + (n >>> 0).toString(16)).slice(-8); }).join('');
  };

  function own(obj, key) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function readAll() {
    if (FB.platform.isCrazyGames) return [];
    try {
      var rows = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(rows) || rows.some(function (row) { return typeof row !== 'string'; }))
        throw new Error('Expected a list of JSON mods.');
      return rows;
    } catch (e) { modFailure = 'Unreadable stored mod configuration: ' + e.message; return []; }
  }

  function readEnabled() {
    if (FB.platform.isCrazyGames) return [];
    try {
      var rows = JSON.parse(localStorage.getItem(BKEY) || '[]');
      if (!Array.isArray(rows) || rows.some(function (row, i) { return typeof row !== 'string' || rows.indexOf(row) !== i; }))
        throw new Error('Expected unique bundled mod ids.');
      return rows;
    } catch (e) { modFailure = 'Unreadable enabled mod configuration: ' + e.message; return []; }
  }

  M.bundled = function () { return window.FBMODS; };

  M.isEnabled = function (id) { return readEnabled().indexOf(id) !== -1; };

  M.toggle = function (id) {
    if (FB.platform.isCrazyGames) return false;
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
    return !modFailure && (id !== '1066' || !legacyBookmarkLimited);
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

  /* The signature binds stored configuration to the validated effective data,
     including bundled payloads and inherited definitions. The unmodded base
     remains ''. Every successful apply invalidates this session cache. */
  let _sig = null;
  M.sig = function () {
    M.assertReady();
    if (_sig === null) _sig = computeSig();
    return _sig;
  };
  function computeSig() {
    if (FB.platform.isCrazyGames) return 'crazygames-content-1';
    const all = readAll();
    const on = readEnabled().slice().sort();
    M.assertReady();
    if (!all.length && !on.length && !effectiveFingerprint) return '';
    if (!effectiveFingerprint) throw new Error('The active mod catalogue has not been validated.');
    return 'effective-1-' + M.fingerprint({stored:all, bundled:on, catalogue:effectiveFingerprint});
  }

  M.store = function (jsonText) {
    if (FB.platform.isCrazyGames) return false;
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
    const requirementErrors = validateStoredStack(all);
    if (timingEnabled && window.console && console.info) console.info('Mod authoring timing', JSON.stringify(M.timing.read()));
    if (requirementErrors.length) {
      if (FB.ui) FB.ui.toast('Mod requirements failed: {message}', { message:requirementErrors.join(' ') });
      return false;
    }
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
    rulerFaithTargets:true, federateServiceStarts:true, federateMigrations:true,
    actionPolicies:true, deedRoutines:true,
    rankPrestigeYearly:true,
    historicalAmbitions:true, federateContractTerms:true,
    name:true, bookmarks:true, defaultBookmark:true, eras:true, wardrobes:true,
    startScenarios:true, familyPresets:true, quickStarts:true, storyInstances:true,
    authorityOffices:true, legitimacySources:true, customaryBases:true,
    focuses:true, focusRoutines:true, deedEvents:true, deeds:true, deedSections:true, countyCommunityPolicies:true,
    provinces:true, realms:true, empires:true, kingdoms:true, duchies:true,
    events:true, eventPacks:true, eventChances:true, eventSubscriptions:true, straits:true, crossingClasses:true, scripted:true,
    cultureTraditions:true, cultures:true, cultureDoctrineDefaults:true,
    doctrineCatalogs:true, religions:true, religiousPaths:true, religiousOfficeRanks:true,
    religiousAffiliations:true, religiousInstitutionProfiles:true, religiousActivities:true, religiousPatronage:true,
    traits:true, traitMechanics:true,
    ailments:true, modifiers:true, buildings:true, forts:true,
    techDomains:true, techTraditions:true, tech:true, techCaps:true,
    capabilities:true,
    techImpactReviews:true, unitClasses:true, holdings:true, careers:true,
    positionRules:true, policyGovernance:true, marketRaidYields:true, authoringDefaults:true,
    positions:true, localCouncilMotions:true, feudalServiceCharters:true,
    tenureArchetypes:true, tenureDuties:true, tenureRights:true, freedomTerms:true, freedomBargaining:true,
    schooling:true, abbeys:true, householdServiceRoles:true, enterprises:true, enterpriseMechanics:true, specializationMarketEffects:true, householdStandardDemand:true, auctionLotTypes:true,
    householdStandards:true, marketGoods:true, marketEndowmentTypes:true,
    marketEndowments:true, travelPurposes:true, travelRules:true, travelDefaults:true, travelSites:true, tournaments:true, tournamentRules:true,
    finance:true, plots:true, intrigue:true, legalTraditions:true, justiceSentences:true, governmentForms:true, administrationProfiles:true, aristocraticProfiles:true, items:true, itemPools:true,
    rulerTraits:true, raidingTraditions:true, councilSeats:true, constituencyProfiles:true, mobileProfiles:true, civicProfiles:true, ecclesiasticalProfiles:true,
    councilRules:true, councilSeatRoles:true, politicalBlocs:true, parliamentAgendas:true, agencyRules:true,
    policies:true, elections:true, privileges:true, collectiveDemands:true,
    settlementNames:true, settlementSites:true, settlementLayouts:true, titles:true, papacy:true, papacyRules:true,
    currency:true, balance:true, land:true, seas:true, rivers:true,
    bounds:true, geographies:true, seasonKinds:true, climateZones:true,
    lexicons:true, architectureStyles:true
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
      } else if ((key === 'availability' || key === 'visibility' || key === 'eligibility' ||
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
      ? { id:true, label:true, desc:true, order:true, eligibility:true,
          system:true, systems:true }
      : { id:true, label:true, desc:true, order:true, group:true, layoutGroup:true,
          section:true, actionTypeSection:true, availableWhileTraveling:true,
          cooldownDays:true, requiresTech:true, eligibility:true,
          system:true, systems:true };
    const declarativeDeedAllowed = {
      id:true, handler:true, label:true, desc:true, order:true, group:true,
      layoutGroup:true,
      section:true, actionTypeSection:true, availableWhileTraveling:true,
      cooldownDays:true, spendsDay:true, requiresTech:true, visibility:true,
      eligibility:true, costs:true, effects:true, queueEvent:true,
      capability:true, choices:true, system:true, systems:true
    };
    const declarativeFocusAllowed = {
      id:true, handler:true, label:true, desc:true, order:true, contexts:true,
      vocational:true, requiresTech:true, visibility:true, eligibility:true,
      seasonal:true, dailyEffects:true, skillChances:true,
      capability:true, fallbackScore:true, system:true, systems:true
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
        } else if ((key === 'availability' || key === 'visibility' || key === 'eligibility' ||
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
      if (kind === 'deeds' && own(override, 'group') && !own(override, 'section')) {
        next.section = override.group;
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
    if (!own(mod, 'focuses') && !own(mod, 'deeds') && !own(mod, 'deedSections') && !own(mod, 'focusRoutines') && !own(mod, 'deedEvents') && !own(mod, 'deedRoutines') && !own(mod, 'actionPolicies')) return null;
    if (!FB.validateActionData || !FB.installActionData) {
      fail('actions', 'cannot be configured before the action engine loads.');
    }
    const focuses = actionOverrides(FBDATA.focuses, mod.focuses, 'focuses');
    const deeds = actionOverrides(FBDATA.deeds, mod.deeds, 'deeds');
    const sections = (FBDATA.deedSections || []).map(cloneActionDefinition);
    if (own(mod, 'deedSections')) {
      if (!Array.isArray(mod.deedSections)) fail('deedSections', 'must be an array.');
      const supplied = {};
      for (const addition of mod.deedSections) {
        if (!plainObject(addition) || typeof addition.id !== 'string') {
          fail('deedSections', 'must contain section records with ids.');
        }
        if (own(supplied, addition.id)) fail('deedSections', 'must not repeat ' + addition.id + '.');
        supplied[addition.id] = true;
        const index = sections.findIndex(function (section) { return section.id === addition.id; });
        if (index < 0) sections.push(cloneActionDefinition(addition));
        else sections[index] = Object.assign(sections[index], cloneActionDefinition(addition));
      }
    }
    const references = {
      deedSections:sections,
      actionPolicies:FBDATA.actionPolicies, focusRoutines:FBDATA.focusRoutines, deedEvents:FBDATA.deedEvents, deedRoutines:FBDATA.deedRoutines,
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
    return { focuses:focuses, deeds:deeds, sections:sections };
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

  /* Bookmark definitions after this mod: its own replace or add by id. */
  function combinedBookmarks(mod) {
    const out = combinedTable(FBDATA.bookmarks, undefined, 'bookmarks');
    if (Array.isArray(mod.bookmarks)) {
      const supplied = {};
      for (let i = 0; i < mod.bookmarks.length; i++) {
        const definition = mod.bookmarks[i], path = 'bookmarks[' + i + ']';
        if (!plainObject(definition) || typeof definition.id !== 'string' || !/^[a-z0-9_]+$/i.test(definition.id))
          fail(path + '.id', 'must be a bookmark id.');
        if (own(supplied, definition.id)) fail(path + '.id', 'must not repeat ' + definition.id + '.');
        supplied[definition.id] = true;
        out[definition.id] = definition;
      }
    } else if (plainObject(mod.bookmarks)) {
      for (const id in mod.bookmarks) {
        if (own(mod.bookmarks, id) && plainObject(mod.bookmarks[id])) {
          out[id] = mod.bookmarks[id];
        }
      }
    }
    return out;
  }

  /* Start rules a scenario carries as data (docs/MODDING.md): where it is
     offered, its fixed birthplace and identity, its family shapes and its
     player-track stories. */
  function validateStartRules(scenario, rules, path, stories) {
    function freshBookmark(id) {
      var raw = rules.bookmarks[id];
      return FB.bookmarkRevisions(id, raw).find(function (bm) {
        return (bm.revision || 'baseline') === (raw.revision || 'baseline');
      });
    }
    /* A fixed start is checked in each world revision that offers
       it: one that lists it, or, without a starts list, one holding its fixed
       birthplace. A start no revision offers keeps the fresh-world check. */
    function offeringBookmarks(id, scenario) {
      var all = FB.bookmarkRevisions(id, rules.bookmarks[id]);
      var offered = all.filter(function (bm) {
        return Array.isArray(bm.starts) ? bm.starts.indexOf(scenario.id) >= 0
          : FB.startProvinceAllowed(scenario, bm, scenario.fixedProvinceId);
      });
      return offered.length ? offered : [freshBookmark(id)];
    }
    if (own(scenario, 'bookmarkIds')) {
      validateIdList(scenario.bookmarkIds, path + '.bookmarkIds', rules.bookmarks);
    }
    if (own(scenario, 'eras')) {
      validateIdList(scenario.eras, path + '.eras', FBDATA.eras || {});
    }
    if (own(scenario, 'alwaysUnlocked') && typeof scenario.alwaysUnlocked !== 'boolean') {
      fail(path + '.alwaysUnlocked', 'must be true or false.');
    }
    if (own(scenario, 'hidden') && typeof scenario.hidden !== 'boolean') fail(path + '.hidden', 'must be true or false.');
    if (own(scenario, 'birthplaces')) {
      const rule = scenario.birthplaces, rulePath = path + '.birthplaces';
      if (!rule || typeof rule !== 'object' || Array.isArray(rule) || !Object.keys(rule).length) {
        fail(rulePath, 'must name at least one birthplace selector.');
      } else {
        onlyFields(rule, { institutions:true, capitalsOf:true, realms:true, counties:true, storyCounties:true }, rulePath);
        ['institutions', 'capitalsOf', 'realms', 'counties'].forEach(function (key) {
          if (own(rule, key) && (!Array.isArray(rule[key]) || !rule[key].length || rule[key].some(function (id, index) {
            return typeof id !== 'string' || !id || rule[key].indexOf(id) !== index;
          }))) fail(rulePath + '.' + key, 'must be a non-empty list of unique ids.');
        });
        if (Array.isArray(rule.capitalsOf)) rule.capitalsOf.forEach(function (id) {
          if (typeof id === 'string' && !own(FBDATA.governmentForms || {}, id)) {
            fail(rulePath + '.capitalsOf', 'unknown government form ' + id + '.');
          }
        });
        if (own(rule, 'storyCounties') && (rule.storyCounties !== true || !scenario.trackLocations)) {
          fail(rulePath + '.storyCounties', 'must be true and needs trackLocations.');
        }
      }
    }
    if (own(scenario, 'onboarding') && scenario.onboarding !== 'ruler') fail(path + '.onboarding', 'must be ruler.');
    if (own(scenario, 'rulerRealmId')) {
      // Delegated leadership seats a representative, who may be unnamed.
      const delegated = !!scenario.governmentForm && FBDATA.governmentForms[scenario.governmentForm] &&
        !FB.governments.problems(scenario.governmentForm).length &&
        !!(FB.governments.resolve(scenario.governmentForm).use.succession.delegatedLeadership ||
          FB.governments.resolve(scenario.governmentForm).use.succession.commandLeadership);
      if (typeof scenario.rulerRealmId !== 'string' || !scenario.rulerRealmId ||
          !scenario.bookmarkIds || !scenario.bookmarkIds.length || !scenario.fixedProvinceId ||
          !scenario.characterName && !delegated || !scenario.governmentForm ||
          scenario.onboarding !== 'ruler' || !scenario.familyPresets ||
          Object.keys(scenario.familyPresets).join(',') !== 'standard')
        fail(path + '.rulerRealmId', 'needs a fixed bookmark, named identity, government, ruler onboarding and standard court family.');
      if (!delegated || own(scenario, 'characterName')) requiredText(scenario.characterName, path + '.characterName');
      if (scenario.characterName && scenario.characterName.length > 20 || !FBDATA.governmentForms[scenario.governmentForm])
        fail(path + '.characterName', 'needs a start-code name and a known government.');
      for (const bookmark of [].concat.apply([], scenario.bookmarkIds.map(function (bookmarkId) {
        return offeringBookmarks(bookmarkId, scenario);
      }))) {
        const realm = (bookmark.realms || []).filter(function (row) { return row.id === scenario.rulerRealmId; })[0];
        const ruler = FB.startRulerProfile(bookmark, realm, scenario.governmentForm);
        const eraId = FB.bookmarkEra(bookmark), era = FBDATA.eras[eraId];
        if (!ruler || ruler.name !== scenario.characterName || ruler.sex !== scenario.sex ||
            ruler.culture !== scenario.startCulture || FB.startRulerFaith(bookmark, realm) !== scenario.startReligion ||
            !era || (realm.government || era.defaultGovernment) !== scenario.governmentForm ||
            !delegated && FB.station.realmRank({ tier:scenario.tier, formId:scenario.governmentForm, era:eraId }, {}) !== realm.rank)
          fail(path + '.rulerRealmId', 'must match the authored ruler and government in every offered bookmark.');
      }
    } else if (own(scenario, 'characterName') || own(scenario, 'governmentForm') || own(scenario, 'onboarding'))
      fail(path + '.rulerRealmId', 'is required for an existing-ruler identity.');
    if (own(scenario, 'startAge')) integerRange(scenario.startAge, 16, 80, path + '.startAge');
    for (const field of ['startCulture', 'startReligion']) {
      if (!own(scenario, field)) continue;
      const known = field === 'startCulture' ? rules.cultures : rules.religions;
      if (typeof scenario[field] !== 'string' || !own(known, scenario[field])) {
        fail(path + '.' + field, 'references unknown id ' + scenario[field] + '.');
      }
    }
    if (own(scenario, 'fixedProvinceId')) {
      if (typeof scenario.fixedProvinceId !== 'string' || !scenario.fixedProvinceId) {
        fail(path + '.fixedProvinceId', 'must be a county id.');
      }
      if (!own(scenario, 'bookmarkIds') || !own(scenario, 'startCulture') ||
          !own(scenario, 'startReligion')) {
        fail(path + '.fixedProvinceId',
          'needs bookmarkIds, startCulture and startReligion.');
      }
      /* Ordinary starts choose a resident community. Existing rulers keep
         the court identity already checked above, even among other residents. */
      for (const bookmark of [].concat.apply([], scenario.bookmarkIds.map(function (bookmarkId) {
        return offeringBookmarks(bookmarkId, scenario);
      }))) {
        const provinces = bookmark.provinces || [];
        const county = provinces.filter(function (province) {
          return province && province.id === scenario.fixedProvinceId &&
            !province.wasteland;
        })[0];
        const locations = bookmark.startLocations && bookmark.startLocations[scenario.id];
        if (!county || !(Array.isArray(locations) && !locations.length) &&
            !FB.startProvinceAllowed(scenario, bookmark, county.id)) {
          fail(path + '.fixedProvinceId', 'is not a settled county of bookmark ' +
            bookmark.id + '.');
        }
        const paired = !!scenario.rulerRealmId || FB.provinceCommunities(county).some(function (community) {
          return community.culture === scenario.startCulture &&
            community.religion === scenario.startReligion;
        });
        if (!paired) {
          fail(path + '.startCulture', 'and startReligion must be a community of ' +
            scenario.fixedProvinceId + ' in bookmark ' + bookmark.id + '.');
        }
      }
    }
    if (own(scenario, 'familyPresets')) {
      const presets = scenario.familyPresets;
      if (!plainObject(presets) || !Object.keys(presets).length) {
        fail(path + '.familyPresets', 'must be a non-empty object keyed by family preset id.');
      }
      for (const presetId in presets) {
        if (!own(presets, presetId)) continue;
        const presetPath = path + '.familyPresets.' + presetId;
        if (!own(rules.familyPresets, presetId)) {
          fail(presetPath, 'references unknown family preset ' + presetId + '.');
        }
        onlyFields(presets[presetId], { name:true, diff:true, desc:true }, presetPath);
        for (const field of ['name', 'diff', 'desc']) {
          if (own(presets[presetId], field)) {
            requiredText(presets[presetId][field], presetPath + '.' + field);
          }
        }
      }
    }
    if (own(scenario, 'tracks')) {
      const tracks = {};
      for (const story of ((stories || FB.stories).list())) {
        if (story.kind === 'track') tracks[story.id] = story;
      }
      validateIdList(scenario.tracks, path + '.tracks', tracks, true);
    }
    if (scenario.fixedProvinceId && !scenario.rulerRealmId &&
        !FB.startStoryTracks(scenario, scenario.fixedProvinceId, stories).length) {
      fail(path + '.tracks', 'a fixed-place household needs a player track at its fixed birthplace.');
    }
    if (own(scenario, 'trackLocations')) {
      const places = scenario.trackLocations;
      if (!plainObject(places) || !Object.keys(places).length) {
        fail(path + '.trackLocations', 'must be a non-empty object keyed by track id.');
      } else {
        for (const trackId in places) {
          if (!own(places, trackId)) continue;
          const placePath = path + '.trackLocations.' + trackId;
          const list = places[trackId];
          if (!Array.isArray(scenario.tracks) || scenario.tracks.indexOf(trackId) < 0) {
            fail(placePath, 'must name one of the scenario’s tracks.');
          }
          if (!Array.isArray(list) || !list.length || list.some(function (id, index) {
            return typeof id !== 'string' || !id || list.indexOf(id) !== index;
          })) {
            fail(placePath, 'must be a non-empty list of unique county ids.');
            continue;
          }
          for (const bookmarkId of (Array.isArray(scenario.bookmarkIds) ? scenario.bookmarkIds : [])) {
            if (!own(rules.bookmarks, bookmarkId)) continue;
            const bookmark = freshBookmark(bookmarkId);
            const locations = bookmark && bookmark.startLocations && bookmark.startLocations[scenario.id];
            for (const provinceId of list) {
              const province = bookmark && Array.isArray(bookmark.provinces) &&
                bookmark.provinces.find(function (p) { return p.id === provinceId; });
              if (!province || province.wasteland ||
                  (!(Array.isArray(locations) && !locations.length) && !FB.startProvinceAllowed(scenario, bookmark, provinceId))) {
                fail(placePath, provinceId + ' is not an available beginning of bookmark ' + bookmarkId + '.');
              }
            }
          }
        }
      }
    }
  }

  function validateStartScenarios(mod, stories) {
    const scenarios = combinedList(FBDATA.startScenarios,
      mod.startScenarios, 'startScenarios');
    const refs = {
      careers:combinedTable(FBDATA.careers, mod.careers, 'careers'),
      holdings:combinedTable(FBDATA.holdings, mod.holdings, 'holdings'),
      items:combinedTable(FBDATA.items, mod.items, 'items'),
      itemPools:combinedTable(FBDATA.itemPools, mod.itemPools, 'itemPools'),
      focuses:{}
    };
    for (const focus of (FBDATA.focuses || [])) refs.focuses[focus.id] = focus;
    if (Array.isArray(mod.focuses)) {
      for (const focus of mod.focuses) {
        if (plainObject(focus) && typeof focus.id === 'string') {
          refs.focuses[focus.id] = focus;
        }
      }
    }
    const rules = {
      bookmarks:combinedBookmarks(mod),
      cultures:combinedTable(FBDATA.cultures, mod.cultures, 'cultures'),
      religions:combinedTable(FBDATA.religions, mod.religions, 'religions'),
      familyPresets:{}
    };
    if (own(mod, 'familyPresets')) {
      for (const preset of combinedList(FBDATA.familyPresets,
        mod.familyPresets, 'familyPresets')) {
        rules.familyPresets[preset.id] = preset;
      }
    } else {
      for (const preset of (FBDATA.familyPresets || [])) {
        if (preset && preset.id) rules.familyPresets[preset.id] = preset;
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
        startEffects:true, bookmarkIds:true, eras:true, alwaysUnlocked:true,
        fixedProvinceId:true, startAge:true, startCulture:true,
        startReligion:true, familyPresets:true, tracks:true, trackLocations:true, hidden:true,
        rulerRealmId:true, governmentForm:true, characterName:true, onboarding:true, requirements:true,
        system:true, systems:true, birthplaces:true
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
      integerRange(scenario.tier, 0, scenario.rulerRealmId ? FB.station.bandCount - 1 : 3, path + '.tier');
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
      if ((!FB.station.reaches(scenario, career.tierMin, null)) ||
          (FB.station.exceeds(scenario, career.tierMax, null))) {
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
      validateStartRules(scenario, rules, path, stories);
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

  /* Engine rules ask for a career's role, so every career a mod adds or
     replaces declares one from the engine's role list. */
  function validateCareers(mod) {
    if (!plainObject(mod.careers)) fail('careers', 'must be an object.');
    const known = FB.CAREER_ROLES;
    for (const id in mod.careers) {
      if (!own(mod.careers, id)) continue;
      const def = mod.careers[id];
      const path = 'careers.' + id;
      if (!plainObject(def)) fail(path, 'must be an object.');
      if (typeof def.role !== 'string' || !own(known, def.role)) {
        fail(path + '.role', 'must be one of ' + Object.keys(known).join(', ') + '.');
      }
      if (own(def, 'roles')) validateIdList(def.roles, path + '.roles', known, true);
      const periodFault = FB.contentPeriodFault(def);
      if (periodFault) fail(path, periodFault);
    }
  }

  function validateRulerTraits(mod) {
    const traits = combinedTable(FBDATA.traits, mod.traits, 'traits');
    validateIdList(mod.rulerTraits, 'rulerTraits', traits, false);
  }

  function validateRaidingTraditions(mod) {
    onlyFields(mod.raidingTraditions, {
      cultures:true, faiths:true, faithGroups:true,
      victims:true, profiles:true, fallbackProfile:true
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
    validateHistoricRaids(mod.raidingTraditions, base, cultures, religions);
  }

  /* The historic raid families: profiles, the ordered victims rules that
     choose one, and the fallback. Each is replaced whole; the composed
     result must still resolve every profile it names. */
  function validateHistoricRaids(raids, base, cultures, religions) {
    const profiles = own(raids, 'profiles') ? raids.profiles : base.profiles;
    const victims = own(raids, 'victims') ? raids.victims : base.victims;
    const fallback = own(raids, 'fallbackProfile')
      ? raids.fallbackProfile : base.fallbackProfile;
    if (!plainObject(profiles)) fail('raidingTraditions.profiles', 'must be an object.');
    for (const id in profiles) {
      if (!own(profiles, id)) continue;
      const path = 'raidingTraditions.profiles.' + id;
      onlyFields(profiles[id], { cultures:true, faiths:true }, path);
      if (own(profiles[id], 'cultures')) {
        validateIdList(profiles[id].cultures, path + '.cultures', cultures, true);
      }
      if (own(profiles[id], 'faiths')) {
        validateIdList(profiles[id].faiths, path + '.faiths', religions, true);
      }
    }
    if (!Array.isArray(victims)) fail('raidingTraditions.victims', 'must be an array.');
    for (let i = 0; i < victims.length; i++) {
      const path = 'raidingTraditions.victims[' + i + ']';
      const rule = victims[i];
      onlyFields(rule, { cultures:true, faiths:true, profile:true }, path);
      if (!own(rule, 'cultures') && !own(rule, 'faiths')) {
        fail(path, 'must name cultures, faiths or both.');
      }
      if (own(rule, 'cultures')) validateIdList(rule.cultures, path + '.cultures', cultures, false);
      if (own(rule, 'faiths')) validateIdList(rule.faiths, path + '.faiths', religions, false);
      if (typeof rule.profile !== 'string' || !own(profiles, rule.profile)) {
        fail(path + '.profile', 'must name a raidingTraditions profile.');
      }
    }
    if (typeof fallback !== 'string' || !own(profiles, fallback)) {
      fail('raidingTraditions.fallbackProfile', 'must name a raidingTraditions profile.');
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
        kind:true, faiths:true, system:true, systems:true, professions:true, ranks:true
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
          if (!FB.systems.known(def.systems[i])) {
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
        station:true, tierMin:true, holderEligibility:true, system:true, systems:true
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
      if (def.station !== undefined && FB.station.meanings.indexOf(def.station) < 0)
        fail(path + '.station', 'must name a station permission.');
      if (def.tierMin !== undefined) integerRange(def.tierMin, 0, 7, path + '.tierMin');
      if (def.station === undefined && def.tierMin === undefined)
        fail(path, 'needs station or tierMin.');
      if (def.holderEligibility !== 'direct_vassal') {
        fail(path + '.holderEligibility', 'must be direct_vassal.');
      }
    }
    for (const seatId of BASELINE_COUNCIL_SEATS) {
      if (!own(seats, seatId)) {
        fail('councilSeats', 'must retain baseline id ' + seatId + '.');
      }
    }
    const roles = FBDATA.councilSeatRoles;
    if (!plainObject(roles)) fail('councilSeatRoles', 'must be an object keyed by seat id.');
    for (const id of Object.keys(roles)) {
      if (!own(seats, id)) fail('councilSeatRoles.' + id, 'names an unknown seat.');
      validateIdList(roles[id], 'councilSeatRoles.' + id, { market:true,muster:true,almonry:true }, true);
    }
    const confirmationSeats = {};
    for (const id of Object.keys(FBDATA.elections)) {
      const election = FBDATA.elections[id];
      if (election.kind !== 'council') continue;
      if (!own(seats, election.office) || confirmationSeats[election.office]) fail('elections.' + id, 'needs a unique existing council office.');
      confirmationSeats[election.office] = true;
    }
    const rules = own(mod, 'councilRules')
      ? mod.councilRules : FBDATA.councilRules;
    onlyFields(rules, { schemerTraits:true }, 'councilRules');
    validateIdList(rules.schemerTraits, 'councilRules.schemerTraits',
      traits, true);
  }

  function validateRemainingAuthoring(mod) {
    function fields(row, names, at) {
      var allowed = {}; names.forEach(function (key) { allowed[key] = true; }); onlyFields(row, allowed, at);
    }
    function rows(table, at, limit) {
      if (!plainObject(table) || Object.keys(table).length > limit) fail(at, 'exceeds its record limit.');
      Object.keys(table).forEach(function (id) {
        if (!/^[a-z][a-z0-9_]*$/.test(id) || !plainObject(table[id])) fail(at + '.' + id, 'needs a stable id and record.');
      });
    }
    function amount(value, low, high, at) {
      if (!finiteNumber(value) || value < low || value > high) fail(at, 'is outside its numeric bounds.');
    }
    ['positions','localCouncilMotions'].forEach(function (root) {
      var table = FBDATA[root]; rows(table, root, 128);
      Object.keys(table).forEach(function (id) {
        var d = table[id], at = root + '.' + id;
        fields(d, root === 'positions' ? ['name','desc','icon','kind','profession','minTier','pay','quality','maleOnly','fx'] : ['name','desc','icon','fx'], at);
        requiredText(d.name, at + '.name'); requiredText(d.desc, at + '.desc');
        if (root === 'positions') {
          if (['earned','retainer','service'].indexOf(d.kind) < 0) fail(at + '.kind', 'is unsupported.');
          if (d.profession !== undefined && !own(FBDATA.careers, d.profession)) fail(at + '.profession', 'is unknown.');
          if (d.minTier !== undefined) integerRange(d.minTier, 0, FB.station.bandCount - 1, at + '.minTier');
          if (d.pay !== undefined) amount(d.pay, 0, 10000, at + '.pay');
          if (d.quality !== undefined) amount(d.quality, 0, 100, at + '.quality');
          if (d.maleOnly !== undefined && typeof d.maleOnly !== 'boolean') fail(at + '.maleOnly', 'must be boolean.');
        }
        if (d.fx !== undefined) {
          fields(d.fx, root === 'positions' ? ['gold','enterprise','retinue','tax'] : ['gold','enterprise','retinue'], at + '.fx');
          Object.keys(d.fx).forEach(function (key) { amount(d.fx[key], 0, key === 'enterprise' || key === 'tax' ? 2 : 10000, at + '.fx.' + key); });
        }
      });
    });
    rows(FBDATA.positionRules, 'positionRules', 128);
    Object.keys(FBDATA.positionRules).forEach(function (id) {
      var rule = FBDATA.positionRules[id], def = FBDATA.positions[id], at = 'positionRules.' + id;
      fields(rule, ['teaches','localCouncil'], at);
      if (!def) fail(at, 'needs an effective position.');
      Object.keys(rule).forEach(function (key) { if (typeof rule[key] !== 'boolean') fail(at + '.' + key, 'must be boolean.'); });
      if (rule.teaches && def.kind !== 'retainer' || rule.localCouncil && def.kind !== 'earned') fail(at, 'does not match its position kind.');
    });
    rows(FBDATA.policyGovernance, 'policyGovernance', 64);
    Object.keys(FBDATA.policyGovernance).forEach(function (id) {
      var levels = FBDATA.policyGovernance[id], def = FBDATA.policies[id], at = 'policyGovernance.' + id;
      rows(levels, at, 32);
      if (!def || def.institution !== 'crown' || !Array.isArray(def.levels)) fail(at, 'needs a crown policy with levels.');
      Object.keys(levels).forEach(function (level) {
        var rule = levels[level]; fields(rule, ['tolerance','coercivePressure','coerciveResistance','peacefulResistance','protectsWorship'], at + '.' + level);
        if (!def.levels.some(function (row) { return row.id === level; })) fail(at + '.' + level, 'needs an effective policy level.');
        Object.keys(rule).forEach(function (key) {
          if (key === 'tolerance') { if (['persecution','preference','tolerant'].indexOf(rule[key]) < 0) fail(at, 'needs a supported tolerance.'); }
          else if (key === 'protectsWorship') { if (typeof rule[key] !== 'boolean') fail(at + '.' + level + '.' + key, 'must be boolean.'); }
          else amount(rule[key], -1, 1, at + '.' + level + '.' + key);
        });
      });
    });
    rows(FBDATA.marketRaidYields, 'marketRaidYields', 128);
    Object.keys(FBDATA.marketRaidYields).forEach(function (id) {
      var rule = FBDATA.marketRaidYields[id], at = 'marketRaidYields.' + id;
      fields(rule, ['gold','provisions','wares','materials','transport','luxuries'], at);
      if (mod.marketRaidYields && own(mod.marketRaidYields, id) && !own(FBDATA.marketEndowmentTypes, id)) fail(at, 'needs an effective endowment.');
      Object.keys(rule).forEach(function (key) { amount(rule[key], 0, 1000, at + '.' + key); });
    });
    var defaults = FBDATA.authoringDefaults;
    fields(defaults, ['learning','intrigueLaw','motionPostures'], 'authoringDefaults');
    rows(defaults.motionPostures, 'authoringDefaults.motionPostures', 128);
    Object.keys(defaults.motionPostures).forEach(function (id) {
      var row = defaults.motionPostures[id], at = 'authoringDefaults.motionPostures.' + id;
      if (!own(FBDATA.policies,id)) fail(at, 'needs an effective policy.');
      fields(row,['aidSlope','martialSlope','ageSlope','economicPowerSlope','traits'],at);
      Object.keys(row).forEach(function (key) {
        if (key !== 'traits') amount(row[key],-1000,1000,at + '.' + key);
        else {
          if (!plainObject(row.traits) || Object.keys(row.traits).length > 128) fail(at + '.traits','needs at most 128 weights.');
          Object.keys(row.traits).forEach(function (trait) {
            if (!own(FBDATA.traits,trait)) fail(at + '.traits.' + trait,'needs an effective trait.');
            amount(row.traits[trait],-100,100,at + '.traits.' + trait);
          });
        }
      });
    });
    if (!own(FBDATA.techTraditions, defaults.learning)) fail('authoringDefaults.learning', 'needs a learning tradition.');
    var law = defaults.intrigueLaw;
    fields(law, ['default','cultures','realms'], 'authoringDefaults.intrigueLaw');
    if (!own(FBDATA.legalTraditions, law.default)) fail('authoringDefaults.intrigueLaw.default', 'needs a legal tradition.');
    ['cultures','realms'].forEach(function (key) {
      var map = law[key];
      if (!plainObject(map) || Object.keys(map).length > 256) fail('authoringDefaults.intrigueLaw.' + key, 'needs at most 256 mappings.');
      Object.keys(map).forEach(function (id) {
        if (!own(FBDATA.legalTraditions, map[id]) || key === 'cultures' && !own(FBDATA.cultures, id)) fail('authoringDefaults.intrigueLaw.' + key + '.' + id, 'has an unknown reference.');
        if (key === 'realms' && mod.authoringDefaults && own(mod.authoringDefaults, 'intrigueLaw') && !Object.keys(FBDATA.bookmarks).some(function (bid) {
          return FB.bookmarkRevisions(bid, FBDATA.bookmarks[bid]).some(function (bm) {
            return (bm.realms || []).some(function (realm) { return realm.id === id; });
          });
        })) fail('authoringDefaults.intrigueLaw.realms.' + id, 'needs a bookmark realm.');
      });
    });
  }

  function validateInstitutionDefinitions() {
    function table(name) {
      const value = FBDATA[name];
      if (!plainObject(value) || Object.keys(value).length > 256) fail(name,'needs at most 256 records.');
      for (const id of Object.keys(value)) if (!/^[a-z][a-z0-9_]*$/.test(id) || !plainObject(value[id])) fail(name + '.' + id,'needs a stable id and record.');
      return value;
    }
    function fields(row,names,path) { const allowed = {}; names.forEach(function (key) { allowed[key] = true; }); onlyFields(row,allowed,path); }
    function amount(value,low,high,path) { if (!finiteNumber(value) || value < low || value > high) fail(path,'is outside its numeric bounds.'); }
    function strings(value,path) { if (!Array.isArray(value) || value.length > 32 || value.some(function (text) { return typeof text !== 'string' || !text || text.length > 2000; })) fail(path,'needs at most 32 bounded text entries.'); }
    const elections = table('elections'), privileges = table('privileges'), demands = table('collectiveDemands');
    for (const id of Object.keys(elections)) {
      const d = elections[id], at = 'elections.' + id;
      fields(d,['name','desc','icon','system','systems','kind','office','order','termDays','campaignDays','nominationCost','defeatCooldownDays','requiredRank','minimumOfficeDays','stewardship','prestige','guildStanding','merchantLearning','electorates','rivals','tactics'],at);
      requiredText(d.name,at + '.name'); requiredText(d.desc,at + '.desc');
      if (d.kind !== 'guild' && d.kind !== 'council') fail(at + '.kind','must be guild or council.');
      if (d.kind === 'guild' ? ['officer','guildmaster'].indexOf(d.office) < 0 : !own(FBDATA.councilSeats,d.office)) fail(at + '.office','is not a supported office.');
      for (const key of ['termDays','campaignDays','defeatCooldownDays']) integerRange(d[key],1,36000,at + '.' + key);
      amount(d.nominationCost,0,100000,at + '.nominationCost');
      for (const key of ['order','minimumOfficeDays','stewardship','prestige','guildStanding','merchantLearning']) if (d[key] !== undefined) amount(d[key],0,100000,at + '.' + key);
      if (d.requiredRank !== undefined && ['master','officer'].indexOf(d.requiredRank) < 0) fail(at + '.requiredRank','is unsupported.');
      if (!Array.isArray(d.electorates) || !d.electorates.length || d.electorates.length > 32) fail(at + '.electorates','needs one to 32 constituencies.');
      const voters = {};
      for (const row of d.electorates) {
        fields(row,['id','name','weight','base','standingRate','stewardshipRate','diplomacyRate','martialRate','prestigeRate','rankRate'],at + '.electorates');
        if (typeof row.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(row.id) || own(voters,row.id)) fail(at + '.electorates','needs unique stable ids.');
        voters[row.id] = true; requiredText(row.name,at + '.electorates.name');
        integerRange(row.weight,1,100,at + '.electorates.weight'); amount(row.base,0,1,at + '.electorates.base');
        for (const key of ['standingRate','stewardshipRate','diplomacyRate','martialRate','prestigeRate','rankRate']) if (row[key] !== undefined) amount(row[key],-1,1,at + '.electorates.' + key);
      }
      if (!Array.isArray(d.rivals) || !d.rivals.length || d.rivals.length > 32) fail(at + '.rivals','needs one to 32 rivals.');
      const rivals = {};
      for (const row of d.rivals) { fields(row,['id','name'],at + '.rivals'); requiredText(row.name,at + '.rivals.name'); if (typeof row.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(row.id) || own(rivals,row.id)) fail(at + '.rivals','needs unique stable ids.'); rivals[row.id] = true; }
      if (!plainObject(d.tactics) || !Object.keys(d.tactics).length || Object.keys(d.tactics).length > 32) fail(at + '.tactics','needs one to 32 tactics.');
      for (const key of Object.keys(d.tactics)) {
        const tactic = d.tactics[key], path = at + '.tactics.' + key;
        if (!/^[a-z][a-z0-9_]*$/.test(key)) fail(path,'needs a stable id.');
        fields(tactic,['name','desc','icon','support','gold','guildStanding','authority'],path);
        requiredText(tactic.name,path + '.name'); requiredText(tactic.desc,path + '.desc');
        for (const cost of ['gold','guildStanding','authority']) if (tactic[cost] !== undefined) amount(tactic[cost],0,cost === 'gold' ? 100000 : 100,path + '.' + cost);
        if (!plainObject(tactic.support)) fail(path + '.support','must be a constituency map.');
        for (const voter of Object.keys(tactic.support)) { if (!own(voters,voter)) fail(path + '.support','names an unknown constituency.'); amount(tactic.support[voter],-1,1,path + '.support.' + voter); }
      }
    }
    for (const id of Object.keys(privileges)) {
      const d = privileges[id], at = 'privileges.' + id;
      fields(d,['name','desc','icon','order','system','systems','requiresTech','holderTypes','scopeTypes','rights','exemptions','obligations','duration','revocation','effect','sourceEvents'],at);
      requiredText(d.name,at + '.name'); requiredText(d.desc,at + '.desc');
      validateIdList(d.holderTypes,at + '.holderTypes',{house:1,guild:1,county:1,faith:1,institution:1},false);
      validateIdList(d.scopeTypes,at + '.scopeTypes',{county:1,realm:1},false);
      for (const key of ['rights','exemptions','obligations']) strings(d[key],at + '.' + key);
      if (['contract','modifier','indefinite','policy'].indexOf(d.duration) < 0 || ['term_only','protected_term','estates_vote','council_consent','policy_change'].indexOf(d.revocation) < 0) fail(at,'has an unknown duration or revocation rule.');
      const effect = d.effect; fields(effect,['kind','id','seats'],at + '.effect');
      if (effect.kind === 'modifier') { if (!own(FBDATA.modifiers,effect.id)) fail(at + '.effect.id','names an unknown modifier.'); }
      else if (effect.kind === 'obligation') { if (effect.id !== 'revocationConsent') fail(at + '.effect.id','is not a supported obligation.'); }
      else if (effect.kind === 'council_confirmation') {
        validateIdList(effect.seats,at + '.effect.seats',FBDATA.councilSeats,false);
        if (effect.seats.some(function (seat) { return !Object.keys(elections).some(function (id) { return elections[id].kind === 'council' && elections[id].office === seat; }); })) fail(at + '.effect.seats','needs an election for every confirmed office.');
      } else if (effect.kind !== 'guild_monopoly') fail(at + '.effect.kind','is not a supported privilege operation.');
      if (effect.kind !== 'council_confirmation' && effect.seats !== undefined || ['modifier','obligation'].indexOf(effect.kind) < 0 && effect.id !== undefined) fail(at + '.effect','has incompatible operation fields.');
      if (d.sourceEvents !== undefined) {
        validateIdList(d.sourceEvents,at + '.sourceEvents',null,true);
        if (d.sourceEvents.length > 32 || d.sourceEvents.some(function (id) { return !/^[a-z][a-z0-9_]*$/.test(id); })) fail(at + '.sourceEvents','needs bounded provenance ids.');
      }
    }
    const gates = ['collective_demand_commons','collective_demand_tax','collective_demand_guild','collective_demand_sanctuary','collective_demand_magnates'];
    for (const id of Object.keys(demands)) {
      const d = demands[id], at = 'collectiveDemands.' + id;
      fields(d,['name','constituency','privilege','order','minTier','gate','cooldownYears','system','systems'],at);
      requiredText(d.name,at + '.name');
      if (!own(privileges,d.privilege) || gates.indexOf(d.gate) < 0 || ['commons','guild','faith','magnates'].indexOf(d.constituency) < 0) fail(at,'needs a known privilege, constituency and registered gate.');
      integerRange(d.minTier,0,7,at + '.minTier'); integerRange(d.cooldownYears,0,100,at + '.cooldownYears'); amount(d.order,0,100000,at + '.order');
    }
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

  function validateEventParticipants(mod) {
    if (!own(mod, 'events') || !Array.isArray(mod.events)) return;
    for (let eventIndex = 0; eventIndex < mod.events.length; eventIndex++) {
      try {
        if (FB.validateEventParticipants) {
          FB.validateEventParticipants(mod.events[eventIndex]);
        }
      } catch (error) {
        fail('events[' + eventIndex + '].participants',
          error.message || 'has invalid participant data.');
      }
    }
  }

  function validateEducationEvents(mod) {
    if (!own(mod, 'events') || !Array.isArray(mod.events)) return;
    const traits = combinedTable(FBDATA.traits, mod.traits, 'traits');
    for (let eventIndex = 0; eventIndex < mod.events.length; eventIndex++) {
      try {
        if (FB.validateEducationEvent) {
          FB.validateEducationEvent(mod.events[eventIndex], traits);
        }
      } catch (error) {
        fail('events[' + eventIndex + ']',
          error.message || 'has invalid education event data.');
      }
    }
  }

  function communityEventReferenceTables(mod) {
    const provinces = {};
    const combinedProvinces = own(mod, 'provinces')
      ? combinedList(FBDATA.provinces, mod.provinces, 'provinces')
      : (FBDATA.provinces || []);
    for (let i = 0; i < combinedProvinces.length; i++) {
      const province = combinedProvinces[i];
      if (province && province.id) provinces[province.id] = province;
    }
    return {
      cultures:combinedTable(FBDATA.cultures, mod.cultures, 'cultures'),
      religions:combinedTable(FBDATA.religions, mod.religions, 'religions'),
      provinces:provinces,
      policies:combinedTable(FBDATA.countyCommunityPolicies,
        mod.countyCommunityPolicies, 'countyCommunityPolicies')
    };
  }

  function validateCommunityPolicies(mod) {
    const suppliesPolicies = own(mod, 'countyCommunityPolicies');
    const suppliesMechanics = !!(mod.balance &&
      own(mod.balance, 'countyCommunityProjectPolicies'));
    if (!suppliesPolicies && !suppliesMechanics) return;
    const policies = communityEventReferenceTables(mod).policies;
    const modifiers = combinedTable(
      FBDATA.modifiers, mod.modifiers, 'modifiers');
    const mechanics = {};
    const baseMechanics = FBDATA.balance.countyCommunityProjectPolicies || {};
    for (const id in baseMechanics) mechanics[id] = baseMechanics[id];
    const modMechanics = suppliesMechanics
      ? mod.balance.countyCommunityProjectPolicies : undefined;
    if (modMechanics !== undefined && !plainObject(modMechanics)) {
      fail('balance.countyCommunityProjectPolicies', 'must be an object.');
    }
    for (const id in (modMechanics || {})) mechanics[id] = modMechanics[id];
    const ids = {};
    if (suppliesPolicies) {
      for (const id in mod.countyCommunityPolicies) ids[id] = true;
    }
    for (const id in (modMechanics || {})) ids[id] = true;
    for (const id in ids) {
      const policy = policies[id];
      const path = 'countyCommunityPolicies.' + id;
      if (!/^[a-z][a-z0-9_]*$/.test(id) || !plainObject(policy)) {
        fail(path, 'must be an object under a lowercase id.');
      }
      if (policy.id !== undefined && policy.id !== id) {
        fail(path + '.id', 'must match its table key.');
      }
      if (typeof policy.label !== 'string' || !policy.label ||
          typeof policy.desc !== 'string' || !policy.desc) {
        fail(path, 'must contain non-empty label and desc strings.');
      }
      if (policy.modifier !== undefined && !modifiers[policy.modifier]) {
        fail(path + '.modifier', 'references an unknown modifier.');
      }
      const profile = mechanics[id];
      if (!plainObject(profile)) {
        fail('balance.countyCommunityProjectPolicies.' + id,
          'must define mechanics for this policy.');
      }
      for (const key of ['pressure','resistance','maxRate','holdout','migration']) {
        if (!finiteNumber(profile[key])) {
          fail('balance.countyCommunityProjectPolicies.' + id + '.' + key,
            'must be a finite number.');
        }
      }
    }
  }

  function validateCommunityEvents(mod) {
    if (!own(mod, 'events') || !Array.isArray(mod.events) ||
        !FB.validateCommunityEvent) return;
    const refs = communityEventReferenceTables(mod);
    for (let i = 0; i < mod.events.length; i++) {
      try {
        FB.validateCommunityEvent(mod.events[i], refs);
      } catch (error) {
        fail('events[' + i + ']',
          error.message || 'has invalid community event data.');
      }
    }
  }

  /* Mod buildings merge by id, so check the composed table: known roles,
     fort set exactly for the fortification role, and still exactly one
     fortification. The complete bookmark gate additionally requires an
     explicit role on every effective building. */
  function validateBuildings(mod) {
    if (!plainObject(mod.buildings)) fail('buildings', 'must be an object.');
    const composed = {};
    for (const k in FBDATA.buildings) if (own(FBDATA.buildings, k)) composed[k] = FBDATA.buildings[k];
    for (const k in mod.buildings) if (own(mod.buildings, k)) composed[k] = mod.buildings[k];
    const errors = FB.validateBuildingData(composed, false);
    if (errors.length) fail('buildings', 'are invalid: ' + errors[0]);
  }

  /* Geography bases merge by id. Each supplied base is checked against the
     composed table before anything is applied; bookmarks that name it are
     checked again at activation. */
  function validateGeographies(mod) {
    if (!plainObject(mod.geographies)) fail('geographies', 'must be an object keyed by id.');
    const composed = Object.assign({}, FBDATA.geographies, mod.geographies);
    const saved = FBDATA.geographies, savedZones = FBDATA.climateZones;
    let errors = [];
    try {
      FBDATA.geographies = composed;
      // a base may assign a zone the same mod adds
      FBDATA.climateZones = combinedTable(savedZones, mod.climateZones, 'climateZones');
      for (const id in mod.geographies) {
        if (!own(mod.geographies, id)) continue;
        if (!/^[a-z][a-z0-9_]*$/.test(id)) fail('geographies.' + id, 'needs a snake_case id.');
        errors = errors.concat(FB.validateGeography(id));
      }
    } finally {
      FBDATA.geographies = saved;
      FBDATA.climateZones = savedZones;
    }
    if (errors.length) fail('geographies', 'are invalid: ' + errors[0]);
  }

  /* Season kinds and climate zones merge by id; the composed tables must
     stay valid, and mod event triggers may name only known season kinds. */
  function validateClimate(mod) {
    const kinds = combinedTable(FBDATA.seasonKinds, mod.seasonKinds, 'seasonKinds');
    const zones = combinedTable(FBDATA.climateZones, mod.climateZones, 'climateZones');
    const errors = FB.validateClimateData(kinds, zones, FBDATA.defaultClimateZone);
    if (errors.length) fail('climate', 'is invalid: ' + errors[0]);
    if (!own(mod, 'events') || !Array.isArray(mod.events)) return;
    for (let i = 0; i < mod.events.length; i++) {
      const fault = FB.seasonKindTriggerFault(mod.events[i] && mod.events[i].trigger, kinds);
      if (fault) fail('events[' + i + '].trigger', fault);
    }
  }

  /* Lexicon entries merge into FBDATA.lexicons: a layer entry merges its
     terms by term id and its labels by kind and id, and a supplied rank
     ladder replaces the old one. The composed table is checked before
     anything is applied; faiths and cultures the same mod adds count as
     known. */
  const LEXICON_LAYERS = ['eras', 'governments', 'faiths', 'cultures'];
  function mergeLexiconEntry(target, addition) {
    if (plainObject(addition.terms)) {
      target.terms = Object.assign({}, target.terms, addition.terms);
    }
    if (own(addition, 'rank')) target.rank = addition.rank;
    if (plainObject(addition.labels)) {
      const labels = target.labels = Object.assign({}, target.labels);
      for (const kind in addition.labels) {
        if (own(addition.labels, kind)) {
          labels[kind] = Object.assign({}, labels[kind], addition.labels[kind]);
        }
      }
    }
    return target;
  }
  function composeLexicons(base, additions) {
    const out = { base:mergeLexiconEntry(Object.assign({}, base.base),
      additions.base || {}) };
    for (const layer of LEXICON_LAYERS) {
      out[layer] = Object.assign({}, base[layer]);
      const extra = additions[layer];
      if (!plainObject(extra)) continue;
      for (const id in extra) {
        if (own(extra, id)) {
          out[layer][id] = mergeLexiconEntry(Object.assign({}, out[layer][id]), extra[id]);
        }
      }
    }
    return out;
  }
  function validateLexicons(mod) {
    if (!plainObject(mod.lexicons)) fail('lexicons', 'must be an object keyed by layer.');
    for (const key in mod.lexicons) {
      if (own(mod.lexicons, key) && key !== 'base' && LEXICON_LAYERS.indexOf(key) < 0) {
        fail('lexicons.' + key, 'is not a lexicon layer.');
      }
      if (own(mod.lexicons, key) && !plainObject(mod.lexicons[key])) {
        fail('lexicons.' + key, 'must be an object.');
      }
    }
    const saved = FBDATA.lexicons;
    let errors = [];
    try {
      FBDATA.lexicons = composeLexicons(saved, mod.lexicons);
      errors = FB.lexicon.validate({ faiths:mod.religions || {}, cultures:mod.cultures || {} });
    } finally {
      FBDATA.lexicons = saved;
    }
    if (errors.length) fail('lexicons', 'are invalid: ' + errors[0]);
  }

  /* Mod unit classes merge by id, so check the composed table: known roles,
     hired exactly for the mercenary role, and a class for every core role.
     The complete bookmark gate additionally requires a role on every
     effective class; legacy replacements retain their prior role below. */
  /* A legacy replacement of an existing class that omits `role` keeps the
     replaced class's role, as a replaced culture keeps its tradition. */
  function unitClassWithRole(previous, next) {
    if (!previous || typeof previous.role !== 'string' || !plainObject(next) ||
        own(next, 'role')) return next;
    const compatible = {};
    for (const field in next) if (own(next, field)) compatible[field] = next[field];
    compatible.role = previous.role;
    return compatible;
  }

  function validateUnitClasses(mod) {
    if (!plainObject(mod.unitClasses)) fail('unitClasses', 'must be an object.');
    const composed = {};
    for (const k in FBDATA.unitClasses) {
      if (own(FBDATA.unitClasses, k)) composed[k] = FBDATA.unitClasses[k];
    }
    for (const k in mod.unitClasses) {
      if (own(mod.unitClasses, k)) {
        composed[k] = unitClassWithRole(composed[k], mod.unitClasses[k]);
      }
    }
    const errors = FB.validateUnitClassRoles(composed, false);
    if (errors.length) fail('unitClasses', 'are invalid: ' + errors[0]);
  }

  /* Capabilities are records; a technology may only grant a capability the
     composed table defines. */
  function validateCapabilities(mod) {
    const composed = {};
    for (const k in FBDATA.capabilities) {
      if (own(FBDATA.capabilities, k)) composed[k] = FBDATA.capabilities[k];
    }
    if (own(mod, 'capabilities')) {
      if (!plainObject(mod.capabilities)) fail('capabilities', 'must be an object.');
      for (const k in mod.capabilities) {
        if (!own(mod.capabilities, k)) continue;
        const def = mod.capabilities[k];
        if (!plainObject(def)) fail('capabilities.' + k, 'must be an object.');
        if (def.stacks !== undefined && typeof def.stacks !== 'boolean') {
          fail('capabilities.' + k + '.stacks', 'must be true or false.');
        }
        composed[k] = def;
      }
    }
    if (!plainObject(mod.tech)) return;
    for (const id in mod.tech) {
      if (!own(mod.tech, id) || !plainObject(mod.tech[id])) continue;
      const granted = mod.tech[id].capabilities;
      if (granted === undefined) continue;
      if (!Array.isArray(granted)) fail('tech.' + id + '.capabilities', 'must be an array.');
      for (const capability of granted) {
        if (typeof capability !== 'string' || !own(composed, capability)) {
          fail('tech.' + id + '.capabilities', 'references unknown capability ' + capability + '.');
        }
      }
    }
  }

  function validateContentPeriods(mod) {
    if (own(mod, 'events') && !Array.isArray(mod.events)) fail('events', 'must be an array.');
    const packs = combinedTable(FBDATA.eventPacks, mod.eventPacks, 'eventPacks');
    for (const id in packs) {
      const fault = FB.contentPeriodFault(packs[id]);
      if (fault || !Array.isArray(packs[id].eras)) fail('eventPacks.' + id, fault || 'eras are required.');
    }
    /* A pack edit can invalidate the effective window of an existing event. */
    const events = (FBDATA.events || []).filter(function (ev) {
      return !(mod.events || []).some(function (replacement) { return replacement.id === ev.id; });
    }).concat(mod.events || []);
    for (const ev of events) {
      const fault = FB.validateEventPeriod(ev, packs);
      if (fault) fail('events.' + ev.id, fault);
    }
    for (const id in mod.cultures || {}) {
      if (!plainObject(mod.cultures[id])) fail('cultures.' + id, 'must be an object.');
      const fault = FB.cultureNameErasFault(mod.cultures[id]);
      if (fault) fail('cultures.' + id, fault);
    }
    for (const id in mod.items || {}) {
      const fault = FB.itemPresentationFault(mod.items[id]);
      if (fault) fail('items.' + id, fault);
    }
    if (own(mod, 'papacy')) {
      const def = mod.papacy;
      if (!plainObject(def)) fail('papacy', 'must be an object.');
      for (const rows of [def.regnalSeeds, def.authority && def.authority.starts]) {
        const fault = FB.yearTableFault(rows);
        if (fault) fail('papacy', fault);
      }
      for (const row of def.regnalSeeds) {
        if (!plainObject(row.counts)) fail('papacy.regnalSeeds', 'counts must be an object.');
        for (const name in row.counts) integerRange(row.counts[name], 0, 10000, 'papacy.regnalSeeds.' + name);
      }
      for (const row of def.authority.starts) integerRange(row.value, 0, 100, 'papacy.authority.starts.value');
      if (!plainObject(def.institutions)) fail('papacy.institutions', 'must be an object.');
      for (const id in def.institutions) {
        const row = def.institutions[id];
        const fault = FB.contentPeriodFault({ yearMin:row && row.from, yearMax:row && row.through });
        if (!plainObject(row) || row.from === undefined || fault) fail('papacy.institutions.' + id, fault || 'from is required.');
      }
    }
  }

  function validateJustice(mod) {
    const traditions = combinedTable(FBDATA.legalTraditions, mod.legalTraditions, 'legalTraditions');
    const sentences = combinedTable(FBDATA.justiceSentences, mod.justiceSentences, 'justiceSentences');
    const forms = combinedTable(FBDATA.governmentForms, mod.governmentForms, 'governmentForms');
    const profiles = combinedTable(FBDATA.administrationProfiles, mod.administrationProfiles, 'administrationProfiles');
    const aristocraticProfiles = combinedTable(FBDATA.aristocraticProfiles, mod.aristocraticProfiles, 'aristocraticProfiles');
    const civicProfiles = combinedTable(FBDATA.civicProfiles, mod.civicProfiles, 'civicProfiles');
    const constituencies = combinedTable(FBDATA.constituencyProfiles, mod.constituencyProfiles, 'constituencyProfiles');
    const civicErrors = FB.civicGovernment.profileFaults(civicProfiles,forms,constituencies);
    if (civicErrors.length) fail('civicProfiles',civicErrors[0]);
    const ecclesiasticalErrors = FB.ecclesiasticalGovernment.profileFaults(combinedTable(FBDATA.ecclesiasticalProfiles,mod.ecclesiasticalProfiles,'ecclesiasticalProfiles'));
    if (ecclesiasticalErrors.length) fail('ecclesiasticalProfiles',ecclesiasticalErrors[0]);
    const profileErrors = FB.validateAdministrationProfiles(profiles);
    if (profileErrors.length) fail('administrationProfiles', profileErrors[0]);
    const errors = FB.validateLegalTraditions(traditions, sentences, forms);
    for (const id in mod.religions || {}) if (own(mod.religions, id)) {
      const d = mod.religions[id], legal = d && d.properties && d.properties.legalTradition;
      if (legal !== undefined && !own(traditions, legal)) fail('religions.' + id + '.properties.legalTradition', 'names an unknown tradition.');
    }
    if (errors.length) fail('legalTraditions', errors[0]);
    if (mod.governmentForms || mod.administrationProfiles || mod.aristocraticProfiles || mod.civicProfiles || mod.constituencyProfiles) {
      const saved = FBDATA.governmentForms;
      const savedProfiles = FBDATA.administrationProfiles;
      const savedAristocraticProfiles = FBDATA.aristocraticProfiles;
      const savedCivic = FBDATA.civicProfiles, savedConstituencies = FBDATA.constituencyProfiles;
      let problems;
      try { FBDATA.governmentForms = forms; FBDATA.administrationProfiles = profiles;
        FBDATA.aristocraticProfiles = aristocraticProfiles;
        FBDATA.civicProfiles = civicProfiles; FBDATA.constituencyProfiles = constituencies; problems = FB.governments.validate(); }
      finally { FBDATA.governmentForms = saved; FBDATA.administrationProfiles = savedProfiles; FBDATA.aristocraticProfiles = savedAristocraticProfiles;
        FBDATA.civicProfiles = savedCivic; FBDATA.constituencyProfiles = savedConstituencies; }
      if (problems.length) fail('governmentForms', problems[0]);
    }
  }

  function validateAuthorityDefinitions(mod) {
    var fields = {
      authorityOffices:{ name:true, desc:true, powers:true, scopes:true, succession:true, recognitionSources:true, appointment:true, publicRole:true },
      legitimacySources:{ name:true, succession:true, issuerKinds:true, characterRoles:true, mandate:true, countyRights:true, institutional:true },
      customaryBases:{}
    };
    Object.keys(fields).forEach(function (key) {
      Object.keys(mod[key] || {}).forEach(function (id) {
        var d = mod[key][id], path = key + '.' + id;
        onlyFields(d, fields[key], path);
        if (key !== 'customaryBases') requiredText(d.name, path + '.name');
        if (d.appointment !== undefined) onlyFields(d.appointment,
          { gold:true, prestige:true, skill:true, minimum:true, imperialOnly:true, annual:true }, path + '.appointment');
      });
    });
    var errors = FB.validateAuthorityData();
    if (errors.length) fail('authority', errors.join(' '));
  }

  function validateQuickStarts(mod) {
    if (!own(mod, 'quickStarts')) return;
    if (!Array.isArray(mod.quickStarts) || FBDATA.quickStarts.length > 64) fail('quickStarts', 'must contain at most 64 effective starts.');
    const seen = {}, scenarios = {}, presets = {};
    FBDATA.startScenarios.forEach(function (row) { scenarios[row.id] = row; });
    FBDATA.familyPresets.forEach(function (row) { presets[row.id] = row; });
    if (FBDATA.quickStarts.filter(function (row) { return row.distributionDefault; }).length > 1)
      fail('quickStarts', 'must have at most one distributionDefault.');
    mod.quickStarts.forEach(function (row) {
      const path = 'quickStarts.' + (row && row.id);
      onlyFields(row, { id:true,bookmarkId:true,provinceId:true,settlementSite:true,culture:true,religion:true,
        sex:true,characterName:true,portraitProfile:true,scenarioId:true,familyPreset:true,distributionDefault:true,firstDeedTip:true }, path);
      if (typeof row.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(row.id) || seen[row.id]) fail(path, 'needs a unique snake_case id.');
      seen[row.id] = true;
      requiredText(row.characterName, path + '.characterName');
      if (row.sex !== 'm' && row.sex !== 'f') fail(path + '.sex', 'must be m or f.');
      if (!own(scenarios, row.scenarioId) || !own(presets, row.familyPreset)) fail(path, 'needs an existing scenario and family preset.');
      if (row.distributionDefault !== undefined && typeof row.distributionDefault !== 'boolean') fail(path + '.distributionDefault', 'must be boolean.');
      if (row.firstDeedTip !== undefined) requiredText(row.firstDeedTip, path + '.firstDeedTip');
      if (row.portraitProfile !== undefined && !own(FBDATA.portraitProfiles, row.portraitProfile)) fail(path + '.portraitProfile', 'is unknown.');
      const bm = FB.bookmark(row.bookmarkId), scenario = scenarios[row.scenarioId];
      if (!bm || !FB.startProvinceAllowed(scenario, bm, row.provinceId) ||
          scenario.bookmarkIds && scenario.bookmarkIds.indexOf(row.bookmarkId) < 0 ||
          scenario.eras && scenario.eras.indexOf(FB.bookmarkEra(bm)) < 0 ||
          scenario.familyPresets && !own(scenario.familyPresets, row.familyPreset) ||
          scenario.sex && scenario.sex !== row.sex ||
          scenario.startCulture && scenario.startCulture !== row.culture ||
          scenario.startReligion && scenario.startReligion !== row.religion ||
          scenario.characterName && scenario.characterName !== row.characterName)
        fail(path, 'conflicts with its scenario requirements.');
      const pr = bm && (bm.provinces || []).filter(function (p) { return p.id === row.provinceId && !p.wasteland; })[0];
      if (!pr || !(pr.settlements || []).some(function (site) { return site.site === row.settlementSite; }) ||
          !FB.provinceCommunities(pr).some(function (community) { return community.culture === row.culture && community.religion === row.religion; }))
        fail(path, 'needs a settled site and represented community in its bookmark.');
    });
  }

  function validateBeforeApply(mod, stories) {
    if (!plainObject(mod)) throw new Error('Mod data must be an object.');
    for (const key in mod) {
      if (own(mod, key) && !own(PUBLIC_KEYS, key)) {
        fail(key, 'is not a supported top-level mod key.');
      }
    }
    if (own(mod, 'name') && (typeof mod.name !== 'string' || !mod.name)) {
      fail('name', 'must be a non-empty string.');
    }
    if (own(mod, 'bookmarks')) {
      if (!Array.isArray(mod.bookmarks) && !plainObject(mod.bookmarks)) fail('bookmarks', 'must be an object or array.');
      Object.keys(mod.bookmarks).forEach(function (key) {
        const def = mod.bookmarks[key], path = 'bookmarks.' + key;
        if (!plainObject(def)) fail(path, 'must be an object.');
        if (own(def, 'hidden') && typeof def.hidden !== 'boolean') fail(path + '.hidden', 'must be true or false.');
      });
    }
    if (own(mod, 'legalTraditions') || own(mod, 'justiceSentences') || own(mod, 'governmentForms') || own(mod, 'administrationProfiles') || own(mod, 'aristocraticProfiles') || own(mod, 'religions') || own(mod, 'civicProfiles') || own(mod, 'ecclesiasticalProfiles') || own(mod, 'constituencyProfiles')) validateJustice(mod);
    if (mod.authorityOffices || mod.legitimacySources || mod.customaryBases) validateAuthorityDefinitions(mod);
    if (mod.constituencyProfiles) {
      const profiles = combinedTable(FBDATA.constituencyProfiles, mod.constituencyProfiles, 'constituencyProfiles');
      const problems = FB.governments.support.validateProfiles(profiles);
      if (problems.length) fail('constituencyProfiles', problems[0]);
    }
    if (mod.mobileProfiles) {
      const profiles = combinedTable(FBDATA.mobileProfiles, mod.mobileProfiles, 'mobileProfiles');
      const forms=FBDATA.governmentForms;
      let problems;
      try {
        FBDATA.governmentForms=combinedTable(forms,mod.governmentForms,'governmentForms');
        problems=FB.mobile.validateProfiles(profiles);
      } finally {FBDATA.governmentForms=forms;}
      if (problems.length) fail('mobileProfiles', problems[0]);
    }
    if (own(mod, 'intrigue') || own(mod, 'plots')) validateIntrigue(mod);
    if (own(mod, 'itemPools')) validateItemPools(mod);
    if (own(mod, 'careers')) validateCareers(mod);
    if (own(mod, 'rulerTraits')) validateRulerTraits(mod);
    if (own(mod, 'raidingTraditions')) validateRaidingTraditions(mod);
    if (own(mod, 'startScenarios')) validateStartScenarios(mod, stories);
    if (own(mod, 'familyPresets')) validateFamilyPresets(mod);
    if (own(mod, 'religiousPaths') || own(mod, 'religions')) {
      validateReligiousPaths(mod);
    }
    var institutionFaults = FB.religiousInstitutionCatalogFaults(FBDATA);
    if (institutionFaults.length) fail('religiousInstitutionProfiles', institutionFaults.join(' '));
    var activityFaults = FB.religiousActivityCatalogFaults(FBDATA);
    if (activityFaults.length) fail('religiousActivities', activityFaults.join(' '));
    if (own(mod, 'councilSeats') || own(mod, 'councilRules') || own(mod, 'councilSeatRoles') || own(mod, 'elections') || own(mod, 'privileges') || own(mod, 'collectiveDemands')) {
      validateCouncilDefinitions(mod);
      validateInstitutionDefinitions();
    }
    if (own(mod, 'buildings')) validateBuildings(mod);
    if (own(mod, 'architectureStyles')) {
      if (!plainObject(mod.architectureStyles)) fail('architectureStyles', 'must be an object keyed by id.');
      for (const id in mod.architectureStyles) if (own(mod.architectureStyles, id)) {
        if (!/^[a-z][a-z0-9_]*$/.test(id)) fail('architectureStyles.' + id, 'needs a snake_case id.');
        const faults = FB.architectureStyleFaults(mod.architectureStyles[id]);
        if (faults.length) fail('architectureStyles.' + id, faults[0]);
      }
    }
    if (own(mod, 'geographies')) validateGeographies(mod);
    if (own(mod, 'seasonKinds') || own(mod, 'climateZones') || own(mod, 'events')) {
      validateClimate(mod);
    }
    if (own(mod, 'lexicons')) validateLexicons(mod);
    if (own(mod, 'unitClasses')) validateUnitClasses(mod);
    if (own(mod, 'capabilities') || own(mod, 'tech')) validateCapabilities(mod);
    validateRemainingAuthoring(mod);
    validateCommunityPolicies(mod);
    validateCommunityEvents(mod);
    validateSerfFreedomEventEffects(mod);
    validateEventParticipants(mod);
    validateEducationEvents(mod);
    validateContentPeriods(mod);
    validateQuickStarts(mod);
    if (own(mod, 'tournaments')) onlyFields(mod.tournaments, { scales:true,programmes:true,tracks:true,tactics:true }, 'tournaments');
    if (own(mod, 'marketGoods') || own(mod, 'marketEndowmentTypes') || own(mod, 'marketEndowments')) {
      const marketFaults = FB.validateMarketData(FBDATA.marketGoods, FBDATA.marketEndowmentTypes, FBDATA.marketEndowments,
        { provinces:FBDATA.provinces, duchies:FBDATA.duchies });
      if (marketFaults.length) fail('market', marketFaults.join(' '));
    }
    const rankFaults = FB.validateRankPrestige(FBDATA.rankPrestigeYearly);
    if (rankFaults.length) fail('rankPrestigeYearly', rankFaults.join(' '));
    const ambitionFaults = FB.validateHistoricalAmbitions(FBDATA.historicalAmbitions);
    if (ambitionFaults.length) fail('historicalAmbitions', ambitionFaults.join(' '));
    const religionInstitutionFaults = FB.validateReligionInstitutionsData();
    if (religionInstitutionFaults.length) fail('rulerFaithTargets', religionInstitutionFaults.join(' '));
    const federateFaults = FB.validateFederateData(stories);
    if (federateFaults.length) fail('federateContractTerms', federateFaults.join(' '));
    FB.validateTenureData(FBDATA.tenureArchetypes, FBDATA.tenureDuties, FBDATA.tenureRights, FBDATA.events);
    FB.validateFreedomTerms(FBDATA.freedomTerms, FBDATA.freedomBargaining);
    const agencyFaults = FB.validateAgencyRules(FBDATA.agencyRules);
    if (agencyFaults.length) fail('agencyRules', agencyFaults.join(' '));
    const agendaFaults = FB.validateParliamentAgendas(FBDATA.parliamentAgendas);
    if (agendaFaults.length) fail('parliamentAgendas', agendaFaults.join(' '));
    const travelFaults = FB.validateTravelRules();
    if (travelFaults.length) fail('travelRules', travelFaults.join(' '));
    const papacyRuleFaults = FB.validatePapacyRules();
    if (papacyRuleFaults.length) fail('papacyRules', papacyRuleFaults.join(' '));
    const officeRankFaults = FB.validateReligiousOfficeRanks(FBDATA.religiousOfficeRanks);
    if (officeRankFaults.length) fail('religiousOfficeRanks', officeRankFaults.join(' '));
    const abbeyFaults = FB.validateAbbeyData(FBDATA.abbeys);
    if (abbeyFaults.length) fail('abbeys', abbeyFaults.join(' '));
    const serviceFaults = FB.validateHouseholdServiceRoles(FBDATA.householdServiceRoles);
    if (serviceFaults.length) fail('householdServiceRoles', serviceFaults.join(' '));
    const enterpriseFaults = FB.validateEnterpriseMechanics();
    if (enterpriseFaults.length) fail('enterpriseMechanics', enterpriseFaults.join(' '));
    const tournamentFaults = FB.tournaments.validateData(FBDATA.tournaments, FBDATA.tournamentRules);
    if (tournamentFaults.length) fail('tournamentRules', tournamentFaults.join(' '));
    const lifecycleFaults = FB.validateEventLifecycle(FBDATA.eventSubscriptions, FBDATA.events);
    if (lifecycleFaults.length) fail('events', lifecycleFaults.join(' '));
    const traitFaults = FB.validateTraitMechanics(FBDATA.traitMechanics);
    if (traitFaults.length) fail('traitMechanics', traitFaults.join(' '));
    const chanceFaults = FB.validateEventChances(FBDATA.eventChances, FBDATA.events);
    if (chanceFaults.length) fail('eventChances', chanceFaults.join(' '));
    for (const tableId of ['events','traits','policies','privileges','elections',
        'politicalBlocs','religiousPaths','feudalServiceCharters','councilSeats']) {
      const table = mod[tableId] || {};
      for (const id in table) if (own(table, id)) {
        const errors = FB.systems.validateContent(table[id], tableId + '.' + id);
        if (errors.length) fail(tableId + '.' + id, errors.join(' '));
      }
    }
    for (const id in mod.religions || {}) if (own(mod.religions, id)) {
      const def = mod.religions[id];
      const layer = own(def, 'systems') ? def.systems : def.properties && def.properties.systems;
      const errors = FB.systems.validateLayer(layer, 'religions.' + id);
      if (errors.length) fail('religions.' + id, errors.join(' '));
    }
    for (const id in mod.bookmarks || {}) if (own(mod.bookmarks, id)) {
      const errors = FB.systems.validateLayer(mod.bookmarks[id].systems, 'bookmarks.' + id);
      if (errors.length) fail('bookmarks.' + id, errors.join(' '));
    }
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

  /* Validate the same composed catalogues activation will read. Temporary
     tables are detached, including technologies normalized by their schema
     validator. Never run story init, install actions, or consume RNG here. */
  function prepareRequirements(mod) {
    if (!plainObject(mod)) throw new Error('Mod data must be an object.');
    var live = FBDATA, staged = Object.assign({}, live), prepared;
    ['positionRules','policyGovernance','marketRaidYields','authoringDefaults','actionPolicies','federateServiceStarts','federateMigrations','rankPrestigeYearly','federateContractTerms','tenureArchetypes','tenureDuties','tenureRights','freedomBargaining','eras','wardrobes','settlementLayouts','storyInstances','focusRoutines','deedRoutines','deedEvents','eventChances','eventSubscriptions','tournamentRules','councilSeatRoles','enterpriseMechanics','specializationMarketEffects','householdStandardDemand','abbeys','householdServiceRoles','religiousOfficeRanks','papacyRules','travelRules','travelDefaults','parliamentAgendas','agencyRules','traitMechanics','authorityOffices','legitimacySources','customaryBases'].forEach(function (key) {
      if (own(mod, key) && !plainObject(mod[key])) fail(key, 'must be an object keyed by id.');
    });
    var lists = ['historicalAmbitions','freedomTerms','startScenarios','familyPresets','quickStarts','events','travelSites','provinces','realms'];
    Object.keys(mod).forEach(function (key) {
      if (['name','bookmarks','lexicons','balance','techCaps','forts','tournaments','tournamentRules','intrigue','papacy','papacyRules','abbeys','currency',
          'bounds','land','seas','rivers','straits','scripted','defaultBookmark'].indexOf(key) >= 0) return;
      if (lists.indexOf(key) >= 0) staged[key] = combinedList(live[key], mod[key], key);
      else if (own(PUBLIC_KEYS, key) && plainObject(mod[key])) staged[key] = combinedTable(live[key], mod[key], key);
    });
    staged.bookmarks = combinedBookmarks(mod);
    // Bookmark table keys are authoritative; keep the caller's records intact.
    Object.keys(staged.bookmarks).forEach(function (id) {
      staged.bookmarks[id] = Object.assign({}, staged.bookmarks[id], { id:id });
    });
    if (mod.lexicons) staged.lexicons = composeLexicons(live.lexicons, mod.lexicons);
    if (mod.techCaps) {
      staged.techCaps = Object.assign({}, live.techCaps, mod.techCaps);
      ['costFloor','units','aiUnits'].forEach(function (key) {
        if (plainObject(mod.techCaps[key])) staged.techCaps[key] = Object.assign({}, live.techCaps[key], mod.techCaps[key]);
      });
    }
    if (mod.techImpactReviews) staged.techImpactReviews = Object.assign({}, live.techImpactReviews,
      { features:Object.assign({}, live.techImpactReviews.features, mod.techImpactReviews.features) });
    if (mod.forts) staged.forts = Object.assign({}, live.forts, mod.forts,
      { levels:Object.assign({}, live.forts.levels, mod.forts.levels) });
    if (mod.papacy) staged.papacy = mod.papacy;
    if (mod.papacyRules) {
      staged.papacyRules = Object.assign({}, live.papacyRules, mod.papacyRules);
      ['tactics','orders','policies'].forEach(function (key) {
        staged.papacyRules[key] = combinedTable(live.papacyRules[key], mod.papacyRules[key], 'papacyRules.' + key);
      });
    }
    if (mod.abbeys) staged.abbeys = Object.assign({}, live.abbeys, mod.abbeys,
      { actions:combinedTable(live.abbeys.actions, mod.abbeys.actions, 'abbeys.actions') });
    ['marketGoods','marketEndowmentTypes','marketEndowments'].forEach(function (key) {
      if (own(mod, key)) staged[key] = mod[key];
    });
    if (own(mod, 'rulerFaithTargets')) {
      if (!Array.isArray(mod.rulerFaithTargets)) fail('rulerFaithTargets','must be an array.');
      staged.rulerFaithTargets = mod.rulerFaithTargets.slice();
    }
    if (mod.rulerTraits) staged.rulerTraits = mod.rulerTraits.slice();
    if (mod.intrigue) staged.intrigue = Object.assign({}, live.intrigue, mod.intrigue,
      { methodProfiles:combinedTable(live.intrigue.methodProfiles, mod.intrigue.methodProfiles, 'intrigue.methodProfiles') });
    if (mod.tournaments) {
      staged.tournaments = JSON.parse(JSON.stringify(live.tournaments));
      ['scales','programmes','tracks','tactics'].forEach(function (group) {
        Object.keys(mod.tournaments[group] || {}).forEach(function (id) {
          if (!plainObject(mod.tournaments[group][id])) fail('tournaments.' + group + '.' + id, 'must be an object.');
          staged.tournaments[group][id] = Object.assign({}, staged.tournaments[group][id], mod.tournaments[group][id]);
        });
      });
    }
    if (mod.tournaments && mod.tournaments.programmes) {
      staged.tournamentRules = JSON.parse(JSON.stringify(live.tournamentRules));
      Object.keys(mod.tournaments.programmes).forEach(function (id) {
        var patch = mod.tournaments.programmes[id], rule = staged.tournamentRules.programmes[id];
        if (!rule) return;
        if (own(patch, 'headline')) rule.contests[0] = patch.headline;
        if (own(patch, 'requiresTech')) {
          if (patch.requiresTech) rule.capability = staged.tournamentRules.legacyProgrammeCapability;
          else delete rule.capability;
        }
      });
    }
    if (own(mod, 'tournamentRules')) {
      var priorRules = staged.tournamentRules;
      staged.tournamentRules = Object.assign({}, staged.tournamentRules, mod.tournamentRules);
      ['scales','programmes','tracks','tactics'].forEach(function (group) {
        staged.tournamentRules[group] = combinedTable(priorRules[group], mod.tournamentRules[group], 'tournamentRules.' + group);
      });
    }
    if (own(mod, 'currency')) staged.currency = mod.currency;
    if (mod.doctrineCatalogs) {
      staged.doctrineCatalogs = Object.assign({}, live.doctrineCatalogs);
      Object.keys(mod.doctrineCatalogs).forEach(function (kind) {
        staged.doctrineCatalogs[kind] = combinedTable(live.doctrineCatalogs[kind], mod.doctrineCatalogs[kind], 'doctrineCatalogs.' + kind);
      });
    }
    if (['bounds','land','seas','rivers','provinces'].some(function (key) { return own(mod, key); })) {
      staged.geographies = Object.assign({}, staged.geographies);
      var base = staged.geographies[live.defaultGeography] = Object.assign({}, staged.geographies[live.defaultGeography]);
      ['bounds','land','seas','rivers'].forEach(function (key) { if (own(mod, key)) base[key] = mod[key]; });
      if (mod.provinces) base.provinces = combinedList(base.provinces, mod.provinces, 'provinces');
    }
    staged.tech = JSON.parse(JSON.stringify(staged.tech));
    if (mod.unitClasses) Object.keys(mod.unitClasses).forEach(function (id) {
      staged.unitClasses[id] = unitClassWithRole(live.unitClasses[id], mod.unitClasses[id]);
    });
    if (mod.cultures) Object.keys(mod.cultures).forEach(function (id) {
      var next = staged.cultures[id], prior = live.cultures[id];
      if (plainObject(next) && prior && prior.tradition && !own(next, 'tradition'))
        staged.cultures[id] = Object.assign({}, next, { tradition:prior.tradition });
    });
    if (own(mod, 'defaultBookmark')) staged.defaultBookmark = mod.defaultBookmark;
    function reset() {
      FB.invalidateCultureData(); FB.invalidateReligionData(); FB.lexicon.reset();
    }
    try {
      window.FBDATA = staged; reset();
      var stories = FB.stories.compile(staged.storyInstances || {});
      prepared = validateBeforeApply(mod, stories);
      prepared.stories = stories;
      var problems = FB.balanceLayers.problems(mod.balance);
      if (problems.length) fail('balance', problems.map(FB.balanceLayers.describe).join(' '));
      // Project legacy patches into the original default world, as boot does.
      // Whole-bookmark additions retain their atomic replacement semantics.
      if (['provinces','realms','duchies','kingdoms','empires','straits','scripted','crossingClasses'].some(function (key) { return own(mod, key); })) {
        var legacy = staged.bookmarks[legacyWorldBookmarkId];
        var replacesDefault = Array.isArray(mod.bookmarks) ? mod.bookmarks.some(function (bm) {
          return bm && bm.id === legacyWorldBookmarkId;
        }) : own(mod.bookmarks, legacyWorldBookmarkId);
        if (legacy && !replacesDefault) {
          legacy = staged.bookmarks[legacyWorldBookmarkId] = Object.assign({}, legacy);
          ['provinces','realms'].forEach(function (key) {
            if (mod[key]) legacy[key] = combinedList(legacy[key], mod[key], key);
          });
          ['duchies','kingdoms','empires','crossingClasses'].forEach(function (key) {
            if (mod[key]) legacy[key] = combinedTable(legacy[key], mod[key], key);
          });
          if (mod.straits) legacy.straits = legacy.straits.concat(mod.straits);
          if (mod.scripted) {
            legacy.scripted = legacy.scripted.filter(function (old) {
              return !mod.scripted.some(function (next) { return next.year === old.year && next.realm === old.realm; });
            }).concat(mod.scripted);
          }
        }
      }
      var ids = Object.keys(staged.bookmarks);
      for (var i = 0; i < ids.length; i++) {
        var errors = FB.validateBookmark(staged.bookmarks[ids[i]], false, stories);
        if (errors.length) fail('requirements', errors.join(' '));
      }
      if (!own(staged.bookmarks, staged.defaultBookmark)) fail('defaultBookmark', 'must name a registered bookmark.');
      if (prepared.actions) {
        staged.focuses = prepared.actions.focuses; staged.deeds = prepared.actions.deeds;
        staged.deedSections = prepared.actions.sections;
      }
      if (mod.balance) staged.balance = Object.assign({}, staged.balance, mod.balance);
    } finally {
      window.FBDATA = live; reset();
    }
    prepared.data = staged;
    return prepared;
  }

  /* Replacing a stored mod must not validate against its removed records.
     Recompose the proposed ordered stack without publishing any products. */
  function validateStoredStack(all) {
    var live = FBDATA, started = timeStart(), validated = 0;
    try {
      window.FBDATA = baseCatalogues || live;
      var enabled = readEnabled(), bundled = M.bundled();
      enabled.forEach(function (id) {
        if (!bundled.some(function (mod) { return mod.id === id; })) throw new Error('Missing enabled mod: ' + id);
      });
      bundled.forEach(function (mod) {
        if (enabled.indexOf(mod.id) >= 0) { window.FBDATA = prepareRequirements(mod.data).data; validated++; }
      });
      all.forEach(function (source) { window.FBDATA = prepareRequirements(JSON.parse(source)).data; validated++; });
      return [];
    } catch (error) { return [error.message]; }
    finally {
      window.FBDATA = live;
      FB.invalidateCultureData(); FB.invalidateReligionData(); FB.lexicon.reset();
      timeEnd('stored_stack', started, { validated:validated });
    }
  }

  M.validate = function (mod) {
    try { prepareRequirements(mod); return []; }
    catch (error) { return [error.message]; }
  };

  M.apply = function (mod) {
    if (FB.platform.isCrazyGames) throw new Error('Custom mods are unavailable in this edition.');
    const started = timeStart();
    var prepared;
    try { prepared = prepareRequirements(mod); }
    finally { timeEnd('apply_validation', started, {accepted:!!prepared}); }
    mod = FB.titleIds.normalizeMod(mod);
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
    // replacing the default base redraws every bookmark on it, like bounds
    if (plainObject(mod.geographies) && own(mod.geographies, FBDATA.defaultGeography)) {
      changesLegacyWorld = true;
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
    if (mod.eventPacks) {
      mergeTable(FBDATA.eventPacks, mod.eventPacks);
      FB.invalidateEventIndex();
    }
    if (mod.events) {
      mergeById(FBDATA.events, mod.events, 'id');
      if (FB.invalidateEventIndex) FB.invalidateEventIndex();
    }
    if (mod.countyCommunityPolicies) {
      mergeTable(FBDATA.countyCommunityPolicies,
        mod.countyCommunityPolicies);
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
    if (mod.cultureDoctrineDefaults) {
      mergeTable(FBDATA.cultureDoctrineDefaults, mod.cultureDoctrineDefaults);
    }
    if (mod.doctrineCatalogs) {
      for (const kind in mod.doctrineCatalogs) {
        if (!own(mod.doctrineCatalogs, kind)) continue;
        if (!FBDATA.doctrineCatalogs[kind]) FBDATA.doctrineCatalogs[kind] = {};
        mergeTable(FBDATA.doctrineCatalogs[kind], mod.doctrineCatalogs[kind]);
      }
    }
    if (mod.settlementNames) for (const k in mod.settlementNames) FBDATA.settlementNames[k] = mod.settlementNames[k];
    /* Physical settlement sites merge by site id into the shared table.
       Per-county `settlements` presentations ride inside complete bookmark or
       legacy province replacements, never as a standalone patch. */
    if (mod.settlementSites) mergeTable(FBDATA.settlementSites, mod.settlementSites);
    if (mod.religiousPaths) mergeTable(FBDATA.religiousPaths,
      mod.religiousPaths);
    if (mod.religiousAffiliations) mergeTable(FBDATA.religiousAffiliations, mod.religiousAffiliations);
    if (mod.religiousInstitutionProfiles) mergeTable(FBDATA.religiousInstitutionProfiles, mod.religiousInstitutionProfiles);
    if (mod.religiousActivities) mergeTable(FBDATA.religiousActivities, mod.religiousActivities);
    if (mod.religiousPatronage) mergeTable(FBDATA.religiousPatronage, mod.religiousPatronage);
    if (mod.legalTraditions) mergeTable(FBDATA.legalTraditions, mod.legalTraditions);
    if (mod.justiceSentences) mergeTable(FBDATA.justiceSentences, mod.justiceSentences);
    if (mod.governmentForms) { mergeTable(FBDATA.governmentForms, mod.governmentForms); FB.governments.invalidate(); }
    if (mod.constituencyProfiles) mergeTable(FBDATA.constituencyProfiles, mod.constituencyProfiles);
    if (mod.mobileProfiles) mergeTable(FBDATA.mobileProfiles, mod.mobileProfiles);
    if (mod.civicProfiles) { mergeTable(FBDATA.civicProfiles,mod.civicProfiles); FB.governments.invalidate(); }
    if (mod.ecclesiasticalProfiles) { mergeTable(FBDATA.ecclesiasticalProfiles,mod.ecclesiasticalProfiles); FB.governments.invalidate(); }
    if (mod.administrationProfiles) { mergeTable(FBDATA.administrationProfiles, mod.administrationProfiles); FB.governments.invalidate(); }
    if (mod.aristocraticProfiles) { mergeTable(FBDATA.aristocraticProfiles, mod.aristocraticProfiles); FB.governments.invalidate(); }
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
    if ((mod.tech || mod.techCaps || mod.capabilities) && FB.invalidateTechBonuses) {
      FB.invalidateTechBonuses();
    }
    if (mod.tech) for (const k in mod.tech) FBDATA.tech[k] = mod.tech[k];
    if (mod.techDomains) mergeTable(FBDATA.techDomains, mod.techDomains);
    if (mod.techTraditions) mergeTable(FBDATA.techTraditions, mod.techTraditions);
    if (mod.techCaps) mergeTechCaps(mod.techCaps);
    if (mod.capabilities) mergeTable(FBDATA.capabilities, mod.capabilities);
    if (mod.unitClasses) {
      for (const k in mod.unitClasses) {
        if (!own(mod.unitClasses, k)) continue;
        FBDATA.unitClasses[k] = unitClassWithRole(
          own(FBDATA.unitClasses, k) ? FBDATA.unitClasses[k] : null, mod.unitClasses[k]);
      }
    }
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
    ['enterpriseMechanics','specializationMarketEffects','householdStandardDemand'].forEach(function (key) {
      if (mod[key]) mergeTable(FBDATA[key], mod[key]);
    });
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
    if (mod.tournaments) {
      ['scales','programmes','tracks','tactics'].forEach(function (group) {
        if (!mod.tournaments[group]) return;
        for (const id in mod.tournaments[group]) {
          FBDATA.tournaments[group][id] = Object.assign({}, FBDATA.tournaments[group][id], mod.tournaments[group][id]);
        }
      });
    }
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
    if (mod.councilSeatRoles) mergeTable(FBDATA.councilSeatRoles, mod.councilSeatRoles);
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
      const raids = mod.raidingTraditions;
      if (own(raids, 'victims')) FBDATA.raidingTraditions.victims = raids.victims.slice();
      if (own(raids, 'profiles')) FBDATA.raidingTraditions.profiles = raids.profiles;
      if (own(raids, 'fallbackProfile')) {
        FBDATA.raidingTraditions.fallbackProfile = raids.fallbackProfile;
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
        /* Title tables predate the lexicon. Mirror the historical group keys
           into its rank ladders so an existing title-only mod keeps changing
           live rulers as well as old saved snapshots: christian is the base
           ladder, the other groups are faith-layer entries. */
        const female = k.slice(-2) === '_f';
        const rootId = female ? k.slice(0, -2) : k;
        if (FBDATA.faithDefaults.legacyGroups.indexOf(rootId) < 0) continue;
        const lex = FBDATA.lexicons;
        const owner = rootId === FBDATA.faithDefaults.titleGroup ? lex.base
          : (lex.faiths[rootId] = lex.faiths[rootId] || {});
        const rank = owner.rank = Object.assign({}, owner.rank);
        rank[female ? 'f' : 'm'] = mod.titles[k];
        if (!rank.m) rank.m = FBDATA.titles[rootId];
        if (!rank.f) rank.f = FBDATA.titles[rootId + '_f'] || FBDATA.titles[rootId];
      }
    }
    if (mod.lexicons) FBDATA.lexicons = composeLexicons(FBDATA.lexicons, mod.lexicons);
    if ((mod.lexicons || mod.titles) && FB.lexicon) FB.lexicon.reset();
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
    /* Mod balance is the last layer over the global, era and bookmark
       values (js/balance.js); project policies merge by policy id. */
    if (mod.balance) for (const k in mod.balance) {
      FB.balanceLayers.applyMod(k, mod.balance[k],
        k === 'countyCommunityProjectPolicies' && plainObject(mod.balance[k]));
    }
    if (mod.seasonKinds) mergeTable(FBDATA.seasonKinds, mod.seasonKinds);
    if (mod.climateZones) mergeTable(FBDATA.climateZones, mod.climateZones);
    if (mod.eras) mergeTable(FBDATA.eras, mod.eras);
    if (mod.wardrobes) mergeTable(FBDATA.wardrobes, mod.wardrobes);
    if (mod.settlementLayouts) mergeTable(FBDATA.settlementLayouts, mod.settlementLayouts);
    if (mod.geographies) mergeTable(FBDATA.geographies, mod.geographies);
    if (mod.architectureStyles) mergeTable(FBDATA.architectureStyles, mod.architectureStyles);
    /* The legacy top-level geometry keys replace the geometry of the default
       geography base, the base those tables describe, so every bookmark on
       it changes exactly as the shared global geometry did before. */
    const legacyGeography = FB.geography(FBDATA.defaultGeography);
    if (mod.bounds) {
      FBDATA.bounds = mod.bounds;
      if (legacyGeography) legacyGeography.bounds = mod.bounds;
    }
    if (mod.land) {
      FBDATA.land = mod.land;
      if (legacyGeography) legacyGeography.land = mod.land;
    }
    if (mod.seas) {
      FBDATA.seas = mod.seas;
      if (legacyGeography) legacyGeography.seas = mod.seas;
    }
    if (mod.rivers) {
      FBDATA.rivers = mod.rivers;
      if (legacyGeography) legacyGeography.rivers = mod.rivers;
    }
    if (own(mod, 'defaultBookmark')) FBDATA.defaultBookmark = mod.defaultBookmark;
    if (mod.rulerFaithTargets) FBDATA.rulerFaithTargets = mod.rulerFaithTargets.slice();
    if (mod.rankPrestigeYearly) mergeTable(FBDATA.rankPrestigeYearly, mod.rankPrestigeYearly);
    if (mod.historicalAmbitions) {
      mergeById(FBDATA.historicalAmbitions, mod.historicalAmbitions, 'id');
      FB.registerAmbitionMessages();
    }
    ['federateServiceStarts','federateMigrations','federateContractTerms','tenureArchetypes','tenureDuties','tenureRights','freedomBargaining'].forEach(function (key) { if (mod[key]) mergeTable(FBDATA[key], mod[key]); });
    if (mod.freedomTerms) mergeById(FBDATA.freedomTerms, mod.freedomTerms, 'id');
    if (mod.freedomTerms || mod.freedomBargaining) FB.invalidateFreedomTerms();
    if (mod.tenureArchetypes || mod.tenureDuties || mod.tenureRights) FB.invalidateEventIndex();
    if (mod.actionPolicies) mergeTable(FBDATA.actionPolicies,mod.actionPolicies);
    if (mod.deedRoutines) { mergeTable(FBDATA.deedRoutines,mod.deedRoutines); FB.registerDeedRoutineMessages(); }
    if (mod.deedEvents) mergeTable(FBDATA.deedEvents, mod.deedEvents);
    if (mod.focusRoutines) mergeTable(FBDATA.focusRoutines, mod.focusRoutines);
    if (prepared.actions) {
      FB.installActionData(prepared.actions.focuses, prepared.actions.deeds, prepared.actions.sections);
    }
    if ((mod.items || mod.cultures || mod.religions || mod.traits || mod.ailments) &&
        FB.clearPortraitCache) FB.clearPortraitCache();
    if ((mod.religions || mod.titles || mod.raidingTraditions) && FB.invalidateReligionData) {
      FB.invalidateReligionData();
    }
    if ((mod.cultures || mod.architectureStyles || mod.cultureTraditions || mod.cultureDoctrineDefaults ||
        mod.doctrineCatalogs || mod.techTraditions) && FB.invalidateCultureData) {
      FB.invalidateCultureData();
    }
    ['authorityOffices','legitimacySources','customaryBases'].forEach(function (key) {
      if (mod[key]) mergeTable(FBDATA[key], mod[key]);
    });
    ['positionRules','policyGovernance','marketRaidYields','authoringDefaults'].forEach(function (key) {
      if (mod[key]) mergeTable(FBDATA[key], mod[key]);
    });
    if (mod.traitMechanics) mergeTable(FBDATA.traitMechanics, mod.traitMechanics);
    if (mod.tournaments || mod.tournamentRules) Object.assign(FBDATA.tournamentRules, prepared.data.tournamentRules);
    if (mod.agencyRules) mergeTable(FBDATA.agencyRules, mod.agencyRules);
    if (mod.parliamentAgendas) mergeTable(FBDATA.parliamentAgendas, mod.parliamentAgendas);
    if (mod.travelRules) mergeTable(FBDATA.travelRules, mod.travelRules);
    if (mod.travelDefaults) mergeTable(FBDATA.travelDefaults, mod.travelDefaults);
    if (mod.papacyRules) Object.assign(FBDATA.papacyRules, prepared.data.papacyRules);
    if (mod.religiousOfficeRanks) mergeTable(FBDATA.religiousOfficeRanks, mod.religiousOfficeRanks);
    if (mod.abbeys) Object.assign(FBDATA.abbeys, prepared.data.abbeys);
    if (mod.householdServiceRoles) mergeTable(FBDATA.householdServiceRoles, mod.householdServiceRoles);
    if (mod.quickStarts) mergeById(FBDATA.quickStarts, mod.quickStarts, 'id');
    if (mod.eventSubscriptions) {
      mergeTable(FBDATA.eventSubscriptions, mod.eventSubscriptions);
      FB.invalidateEventIndex();
    }
    if (mod.eventChances) mergeTable(FBDATA.eventChances, mod.eventChances);
    if (mod.storyInstances) mergeTable(FBDATA.storyInstances, mod.storyInstances);
    FB.stories.publish(prepared.stories);
    authoringRoots.forEach(function (key) { if (own(mod, key)) authoredRoots[key] = true; });
    // Newly exposed roots join the fingerprint only when authored. Otherwise
    // exposing an existing engine table would invalidate unchanged older mods.
    // Bind to the definitions actually installed, including inherited defaults
    // and bundled payloads. Snapshot before activation swaps the legacy tables.
    var effective = {};
    Object.keys(PUBLIC_KEYS).concat(['faithDefaults','defaultGeography']).forEach(function (key) {
      if (authoringRoots.indexOf(key) >= 0 && !authoredRoots[key]) return;
      if (own(FBDATA, key)) effective[key] = FBDATA[key];
    });
    effectiveFingerprint = M.fingerprint(effective);
    _sig = null;
  };

  M.applyStored = function () {
    captureBaseCatalogues();
    currencySupplied = false;
    currencyInvalid = false;
    legacyBookmarkLimited = false;
    modFailure = '';
    const on = readEnabled();
    on.forEach(function (id) {
      if (!M.bundled().some(function (mod) { return mod.id === id; }))
        modFailure = 'Missing enabled mod: ' + id;
    });
    for (const mod of M.bundled()) {
      if (modFailure) break;
      if (on.indexOf(mod.id) === -1) continue;
      try { M.apply(mod.data); }
      catch (e) { modFailure = 'Invalid enabled mod ' + mod.id + ': ' + e.message; }
    }
    const all = readAll();
    for (const text of all) {
      if (modFailure) break;
      try { M.apply(JSON.parse(text)); }
      catch (e) { modFailure = 'Invalid stored mod: ' + e.message; }
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
