/* Fallowborn — save/load via localStorage */
window.FB = window.FB || {};

(function () {
  'use strict';

  const S = {};
  FB.save = S;
  const PREFIX = 'fb_';
  const START_PROGRESSION_KEY = PREFIX + 'progression';
  const HIGHEST_START_TIER = 3;
  let serializingBuildingRecords = null;
  const ROYAL_COMPACT_KEYS = {
    id:1, childIds:1, alive:1, role:1, parentId:1, charId:1
  };
  const CHARACTER_COMPACT_KEYS = {
    id:1, childrenIds:1, traits:1, dead:1, role:1, dyn:1,
    station:1, opinion:1, fertility:1, health:1,
    fatherId:1, motherId:1, spouseId:1, faithStandingBase:1
  };
  const REALM_COMPACT_KEYS = {
    id:1, alive:1, liege:1, aggression:1, war:1, op:1
  };
  const TECHNOLOGY_COMPACT_KEYS = {
    reserve:1, active:1, completed:1, progress:1, priorities:1, exposed:1
  };
  const SAVE_COMPACT_KEYS = {
    id:1, childIds:1, alive:1, role:1, parentId:1, charId:1,
    childrenIds:1, traits:1, dead:1, dyn:1, station:1, opinion:1,
    fertility:1, health:1, fatherId:1, motherId:1, spouseId:1,
    faithStandingBase:1,
    liege:1, aggression:1, war:1, op:1, s:1, devGranted:1,
    reserve:1, active:1, completed:1, progress:1, priorities:1, exposed:1,
    heirId:1, royalLine:1
  };

  function own(o, key) {
    return Object.prototype.hasOwnProperty.call(o, key);
  }

  /* Starting-station unlocks belong to the browser profile, not to any one
     dynasty. They therefore survive replacing save slots without entering
     FB.state, the deterministic start code, or the save-format contract. A
     blocked localStorage still gets page-lifetime progression in memory. */
  function normalizeStartProgression(value) {
    let tier = value && Number(value.highestAchievedTier);
    if (!isFinite(tier)) tier = 0;
    return {
      v:1,
      highestAchievedTier:Math.max(0, Math.min(7, Math.floor(tier)))
    };
  }

  function readStartProgression() {
    try {
      const raw = localStorage.getItem(START_PROGRESSION_KEY);
      return normalizeStartProgression(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return normalizeStartProgression(null);
    }
  }

  let startProgression = readStartProgression();

  window.addEventListener('storage', function (event) {
    if (event.key !== START_PROGRESSION_KEY) return;
    try {
      startProgression = normalizeStartProgression(
        event.newValue ? JSON.parse(event.newValue) : null);
    } catch (e) {
      startProgression = normalizeStartProgression(null);
    }
  });

  function writeStartProgression() {
    try {
      localStorage.setItem(START_PROGRESSION_KEY,
        JSON.stringify(startProgression));
      return true;
    } catch (e) {
      return false;
    }
  }

  const SP = {};
  FB.startProgression = SP;
  SP.snapshot = function () {
    return {
      v:startProgression.v,
      highestAchievedTier:startProgression.highestAchievedTier,
      highestStartTier:Math.min(HIGHEST_START_TIER,
        startProgression.highestAchievedTier)
    };
  };
  SP.isTierUnlocked = function (tier) {
    tier = Math.max(0, Math.min(HIGHEST_START_TIER,
      Math.floor(Number(tier) || 0)));
    return tier <= startProgression.highestAchievedTier;
  };
  SP.noteTier = function (tier) {
    tier = Math.max(0, Math.min(7, Math.floor(Number(tier) || 0)));
    const stored = readStartProgression();
    if (stored.highestAchievedTier > startProgression.highestAchievedTier) {
      startProgression = stored;
    }
    const previous = startProgression.highestAchievedTier;
    if (tier <= previous) {
      return {
        changed:false, startsChanged:false, previous:previous, tier:previous
      };
    }
    const previousStart = Math.min(HIGHEST_START_TIER, previous);
    startProgression.highestAchievedTier = tier;
    writeStartProgression();
    return {
      changed:true,
      startsChanged:Math.min(HIGHEST_START_TIER, tier) > previousStart,
      previous:previous,
      tier:tier
    };
  };
  SP.reset = function () {
    startProgression = normalizeStartProgression(null);
    try {
      localStorage.removeItem(START_PROGRESSION_KEY);
    } catch (e) { /* memory only */ }
    return SP.snapshot();
  };

  function scenarioIdFromStart(state) {
    if (!state || typeof state.seed !== 'string') return null;
    const parts = state.seed.split('-');
    if (parts.length === 5) return parts[1].toLowerCase();
    if (parts.length >= 6) return parts[2].toLowerCase();
    return null;
  }

  function scenarioStartTier(state) {
    const id = scenarioIdFromStart(state);
    const scenarios = FBDATA.startScenarios;
    if (!id || !Array.isArray(scenarios)) return null;
    for (let i = 0; i < scenarios.length; i++) {
      if (scenarios[i].id === id) return scenarios[i].tier;
    }
    return null;
  }

  /* A restored pre-unlock life can prove an earned rise, but its selected
     beginning cannot. Comparing the saved peak with the scenario's authored
     starting tier preserves that distinction without changing old saves. */
  SP.creditEarnedState = function (state) {
    const startedAt = scenarioStartTier(state);
    if (startedAt === null || !state || !state.player) return false;
    const peak = Math.max(Number(state.peakTier) || 0,
      Number(state.player.tier) || 0);
    if (peak <= startedAt) return false;
    return SP.noteTier(peak).changed;
  };

  function royalMemberRecord(o) {
    return !!(o && typeof o.id === 'string' &&
      o.id.indexOf('royal_') === 0 && own(o, 'parentId') &&
      own(o, 'charId'));
  }

  function characterRecord(o) {
    return !!(o && typeof o.id === 'string' && own(o, 'born') &&
      own(o, 'sex') && own(o, 'culture'));
  }

  function realmRecord(o) {
    return !!(o && typeof o.id === 'string' && typeof o.name === 'string' &&
      own(o, 'capital') && own(o, 'ruler') && own(o, 'alive'));
  }

  function buildingRecord(o) {
    return !!(o && serializingBuildingRecords &&
      serializingBuildingRecords.has(o));
  }

  function realmTechRecord(o) {
    return !!(o && Array.isArray(o.completed) && Array.isArray(o.exposed) &&
      Array.isArray(o.active) && o.progress && typeof o.progress === 'object' &&
      own(o, 'reserve'));
  }

  function successionRecord(o) {
    return !!(o && o.members && Array.isArray(o.order) &&
      own(o, 'rulerMemberId') && own(o, 'heirId'));
  }

  /* Keep live state explicit, but do not pay for values the restore boundary
     can reconstruct exactly. The member tree's parentId is canonical, derived
     character ids come from member ids, and completed technology already
     implies exposure. Returning undefined omits only object properties; no
     live object is mutated while a slot or export is written. */
  function saveReplacer(key, value) {
    const holder = this;
    if (!SAVE_COMPACT_KEYS[key]) return value;
    if (key === 'royalLine' && value && holder &&
        typeof holder.id === 'string' && holder.id.indexOf('ro_') === 0 &&
        value.memberId === 'royal_' + holder.id.slice(3)) {
      return { realmId:value.realmId };
    }
    if (ROYAL_COMPACT_KEYS[key] && royalMemberRecord(holder)) {
      if (key === 'id') return undefined;
      if (key === 'childIds') return undefined;
      if (key === 'alive' && value === true) return undefined;
      if (key === 'alive' && value === false && own(holder, 'died')) {
        return undefined;
      }
      if (key === 'role' && value === null) return undefined;
      if (key === 'parentId' && value === null) return undefined;
      if (key === 'charId' && value === null) return undefined;
      if (key === 'charId' && value ===
          'ro_' + holder.id.slice('royal_'.length)) {
        const c = FB.state && FB.state.chars && FB.state.chars[value];
        if (c && c.royalLine && c.royalLine.memberId === holder.id) {
          return undefined;
        }
      }
    }
    if (CHARACTER_COMPACT_KEYS[key] && holder &&
        (holder.royalLine || characterRecord(holder))) {
      if (key === 'id') return undefined;
      if (key === 'childrenIds' && Array.isArray(value) && !value.length) {
        return undefined;
      }
      if (key === 'traits' && Array.isArray(value) && !value.length) {
        return undefined;
      }
      if (key === 'dead' && value === false) return undefined;
      if (key === 'role' && value === null) return undefined;
      if (key === 'dyn' && value === null) return undefined;
      if (key === 'station' && value === null) return undefined;
      if (key === 'opinion' && value === 0) return undefined;
      if (key === 'fertility' && value === 1) return undefined;
      if (key === 'health' && value === 8) return undefined;
      if (key === 'faithStandingBase' && value === 0) return undefined;
      if ((key === 'fatherId' || key === 'motherId' || key === 'spouseId') &&
          value === null) return undefined;
    }
    if (REALM_COMPACT_KEYS[key] && realmRecord(holder)) {
      if (key === 'id') return undefined;
      if (key === 'alive' && value === true) return undefined;
      if (key === 'liege' && value === null) return undefined;
      if (key === 'aggression' && value === 0) return undefined;
      if (key === 'war' && value === null) return undefined;
      if (key === 'op' && value === 0) return undefined;
    }
    if (key === 's' && value === 0 && buildingRecord(holder)) {
      return undefined;
    }
    if (key === 'devGranted' && value === true) return undefined;
    const technology = TECHNOLOGY_COMPACT_KEYS[key] && realmTechRecord(holder);
    if (technology) {
      if (key === 'reserve' && value === 0) return undefined;
      if ((key === 'active' || key === 'completed') &&
          Array.isArray(value) && !value.length) return undefined;
      if ((key === 'progress' || key === 'priorities') && value &&
          typeof value === 'object' && !Object.keys(value).length) {
        return undefined;
      }
    }
    if (key === 'exposed' && Array.isArray(value) && technology) {
      const remaining = value.filter(function (id) {
        return holder.completed.indexOf(id) < 0;
      });
      return remaining.length ? remaining : undefined;
    }
    if (key === 'heirId' && successionRecord(holder) &&
        value === (holder.order.length ? holder.order[0] : null)) {
      return undefined;
    }
    return value;
  }

  /* Inverse of saveReplacer. This runs before any ordinary load repair so all
     older code sees the same explicit runtime shape it saw before save
     compaction was introduced. It is also additive: uncompressed version-3
     saves already carrying these fields pass through unchanged. */
  function inflateState(state) {
    if (!state) return state;
    const chars = state.chars || {};
    for (const id in chars) {
      const c = chars[id];
      if (!c) continue;
      if (!own(c, 'id')) c.id = id;
      if (!own(c, 'dead')) c.dead = false;
      if (!own(c, 'role')) c.role = null;
      if (!own(c, 'dyn')) c.dyn = null;
      if (!own(c, 'station')) c.station = null;
      if (!own(c, 'opinion')) c.opinion = 0;
      if (!own(c, 'fertility')) c.fertility = 1;
      if (!own(c, 'health')) c.health = 8;
      if (!own(c, 'faithStandingBase')) c.faithStandingBase = 0;
      if (!own(c, 'fatherId')) c.fatherId = null;
      if (!own(c, 'motherId')) c.motherId = null;
      if (!own(c, 'spouseId')) c.spouseId = null;
      if (c.royalLine && !own(c.royalLine, 'memberId') &&
          id.indexOf('ro_') === 0) {
        c.royalLine.memberId = 'royal_' + id.slice(3);
      }
      if (!Array.isArray(c.traits)) c.traits = [];
      if (!Array.isArray(c.childrenIds)) c.childrenIds = [];
    }
    const realmTech = state.realmTech || {};
    for (const rid in realmTech) {
      const record = realmTech[rid];
      if (!record) continue;
      if (!Array.isArray(record.completed)) record.completed = [];
      if (!Array.isArray(record.exposed)) record.exposed = [];
      if (!Array.isArray(record.active)) record.active = [];
      if (!own(record, 'reserve')) record.reserve = 0;
      if (!record.progress || typeof record.progress !== 'object') record.progress = {};
      if (!record.priorities || typeof record.priorities !== 'object') {
        record.priorities = {};
      }
      for (const id of record.completed) {
        if (record.exposed.indexOf(id) < 0) record.exposed.push(id);
      }
    }
    const realms = state.realms || {};
    for (const rid in realms) {
      const realm = realms[rid];
      if (!realm) continue;
      if (!own(realm, 'id')) realm.id = rid;
      if (!own(realm, 'alive')) realm.alive = true;
      if (!own(realm, 'liege')) realm.liege = null;
      if (!own(realm, 'aggression')) realm.aggression = 0;
      if (!own(realm, 'war')) realm.war = null;
      if (!own(realm, 'op')) realm.op = 0;
      const succession = realm.succession;
      const members = succession && succession.members;
      if (!members) continue;
      if (!own(succession, 'heirId')) {
        succession.heirId = succession.order && succession.order.length
          ? succession.order[0] : null;
      }
      for (const id in members) {
        const member = members[id];
        if (!member) continue;
        if (!own(member, 'id')) member.id = id;
        if (!own(member, 'alive')) member.alive = !own(member, 'died');
        if (!own(member, 'role')) member.role = null;
        if (!own(member, 'parentId')) member.parentId = null;
        if (!own(member, 'charId')) member.charId = null;
        if (!Array.isArray(member.childIds)) member.childIds = [];
      }
      for (const id in members) {
        const member = members[id];
        const parent = member && member.parentId && members[member.parentId];
        if (parent && parent.childIds.indexOf(id) < 0) {
          parent.childIds.push(id);
        }
        if (!member || member.charId || id.indexOf('royal_') !== 0) continue;
        const charId = 'ro_' + id.slice('royal_'.length);
        const c = chars[charId];
        if (c && c.royalLine && c.royalLine.realmId === rid &&
            c.royalLine.memberId === id) member.charId = charId;
      }
    }
    const buildings = state.buildings || {};
    for (const pid in buildings) {
      const list = buildings[pid];
      if (!Array.isArray(list)) continue;
      for (let i = 0; i < list.length; i++) {
        const record = list[i];
        if (record && typeof record === 'object' && !own(record, 's')) {
          record.s = 0;
        }
      }
    }
    return state;
  }

  /* ---------- storage compression ----------
     A serialized life is ~1.5 MB of JSON; localStorage quotas are ~5 MB on
     WebKit and ~10 MB elsewhere, and the quota is shared by the autosave and
     every slot - so uncompressed, a life effectively fits once on the
     browsers mobile players actually use. Manual slots and exports are
     therefore compressed at this boundary with an LZW variant (a port of
     lz-string by pieroxy, MIT), packing the bit stream into storage-safe
     UTF-16 characters or base64 text. The frequently replaced autosave stays
     plain unless quota pressure requires the compressed fallback, avoiding a
     whole-save codec round trip at every season boundary. S.serialize keeps
     returning plain JSON, and both decoders still accept the uncompressed
     legacy forms. */

  function lzCompress(input, bitsPerChar, charFromInt) {
    const dictionary = Object.create(null);
    const fresh = Object.create(null);
    const data = [];
    let w = '';
    let enlargeIn = 2;
    let dictSize = 3;
    let numBits = 2;
    let dataVal = 0;
    let dataPosition = 0;

    function writeBits(count, value) {
      for (let i = 0; i < count; i++) {
        dataVal = (dataVal << 1) | (value & 1);
        if (dataPosition === bitsPerChar - 1) {
          dataPosition = 0;
          data.push(charFromInt(dataVal));
          dataVal = 0;
        } else {
          dataPosition++;
        }
        value = value >> 1;
      }
    }

    /* First sighting of a character emits it literally (marker 0 for 8-bit,
       1 for 16-bit); afterwards phrases emit their dictionary code. Each
       emission narrows the headroom until the code width grows one bit. */
    function writeSymbol(symbol) {
      if (fresh[symbol] !== undefined) {
        const code = symbol.charCodeAt(0);
        if (code < 256) {
          writeBits(numBits, 0);
          writeBits(8, code);
        } else {
          writeBits(numBits, 1);
          writeBits(16, code);
        }
        enlargeIn--;
        if (enlargeIn === 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits++;
        }
        delete fresh[symbol];
      } else {
        writeBits(numBits, dictionary[symbol]);
      }
      enlargeIn--;
      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }

    for (let ii = 0; ii < input.length; ii++) {
      const c = input.charAt(ii);
      if (dictionary[c] === undefined) {
        dictionary[c] = dictSize++;
        fresh[c] = true;
      }
      const wc = w + c;
      if (dictionary[wc] !== undefined) {
        w = wc;
      } else {
        writeSymbol(w);
        dictionary[wc] = dictSize++;
        w = String(c);
      }
    }
    if (w !== '') writeSymbol(w);
    writeBits(numBits, 2);
    for (;;) {
      dataVal = dataVal << 1;
      if (dataPosition === bitsPerChar - 1) {
        data.push(charFromInt(dataVal));
        break;
      }
      dataPosition++;
    }
    return data.join('');
  }

  function lzDecompress(length, resetValue, nextValue) {
    if (!length) return '';
    const dictionary = [0, 1, 2];
    const result = [];
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;
    let val = nextValue(0);
    let position = resetValue;
    let index = 1;

    function readBits(count) {
      let bits = 0;
      let power = 1;
      for (let i = 0; i < count; i++) {
        const resb = val & position;
        position >>= 1;
        if (position === 0) {
          position = resetValue;
          val = nextValue(index++);
        }
        if (resb > 0) bits |= power;
        power <<= 1;
      }
      return bits;
    }

    const first = readBits(2);
    if (first === 2) return '';
    const c = String.fromCharCode(readBits(first === 0 ? 8 : 16));
    dictionary[3] = c;
    let w = c;
    result.push(c);
    for (;;) {
      if (index > length) return '';
      let code = readBits(numBits);
      if (code === 0) {
        dictionary[dictSize++] = String.fromCharCode(readBits(8));
        code = dictSize - 1;
        enlargeIn--;
      } else if (code === 1) {
        dictionary[dictSize++] = String.fromCharCode(readBits(16));
        code = dictSize - 1;
        enlargeIn--;
      } else if (code === 2) {
        return result.join('');
      }
      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
      let entry;
      if (typeof dictionary[code] === 'string') {
        entry = dictionary[code];
      } else if (code === dictSize) {
        entry = w + w.charAt(0);
      } else {
        return null;
      }
      result.push(entry);
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;
      w = entry;
      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  }

  /* 15 bits per character keeps every stored code unit a valid, unpaired
     BMP character (32..32799), which localStorage holds intact. The
     trailing space is part of the lz-string format. */
  function compressToStored(input) {
    return lzCompress(input, 15, function (a) {
      return String.fromCharCode(a + 32);
    }) + ' ';
  }
  function decompressFromStored(input) {
    if (!input) return null;
    return lzDecompress(input.length, 16384, function (i) {
      return input.charCodeAt(i) - 32;
    });
  }

  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let b64Reverse = null;
  function b64Value(ch) {
    if (!b64Reverse) {
      b64Reverse = {};
      for (let i = 0; i < B64.length; i++) b64Reverse[B64.charAt(i)] = i;
    }
    return b64Reverse[ch];
  }
  function compressToBase64(input) {
    const res = lzCompress(input, 6, function (a) { return B64.charAt(a); });
    switch (res.length % 4) {
      case 1: return res + '===';
      case 2: return res + '==';
      case 3: return res + '=';
      default: return res;
    }
  }
  function decompressFromBase64(input) {
    if (!input) return null;
    return lzDecompress(input.length, 32, function (i) {
      return b64Value(input.charAt(i));
    });
  }

  const CPRE = 'FBC1.';
  /* A compressed payload must prove it decompresses back to the exact JSON
     before it may replace the plain form: a save is the one artifact where a
     codec fault must degrade to "bigger", never to "lost". Legacy plain
     slots start with '{' and pass through decodeStored untouched. */
  function encodeStored(json) {
    const packed = CPRE + compressToStored(json);
    return decodeStored(packed) === json ? packed : json;
  }
  function decodeStored(raw) {
    if (raw == null) return null;
    if (raw.indexOf(CPRE) === 0) {
      return decompressFromStored(raw.slice(CPRE.length));
    }
    return raw;
  }

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
    FB.ui.toast('⚠ This browser is blocking save storage. Lives won’t persist here, so use Menu → 💾 Save game → 💾 Download save file.');
  };

  S.serialize = function () {
    const s = FB.state;
    serializingBuildingRecords = new WeakSet();
    const buildings = s.buildings || {};
    for (const pid in buildings) {
      const list = buildings[pid];
      if (!Array.isArray(list)) continue;
      for (let i = 0; i < list.length; i++) {
        if (list[i] && typeof list[i] === 'object') {
          serializingBuildingRecords.add(list[i]);
        }
      }
    }
    try {
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
      }, saveReplacer);
    } finally {
      serializingBuildingRecords = null;
    }
  };

  /* The quota case deserves its own message: the life has outgrown the
     browser's storage (legacy code 22, Firefox NS_ERROR_DOM_QUOTA_REACHED
     1014), and a downloaded save file still preserves it. The name test
     is a regex on purpose: a bare 'QuotaExceededError' literal would be
     extracted into the translation catalogs as if it were display text. */
  function isQuotaError(e) {
    return !!e && (/quota/i.test(String(e.name)) ||
      e.code === 22 || e.code === 1014);
  }

  function reportSaveError(e) {
    if (!FB.ui) return;
    if (isQuotaError(e)) FB.ui.toast('⚠ This life’s records have outgrown the browser’s save storage. Use 💾 Download save file in Menu → 💾 Save game.');
    else if (S.available) FB.ui.toast('Save failed: {message}', { message: e.message });
    else FB.ui.toast('⚠ This browser is blocking save storage. Use 💾 Download save file in Menu → 💾 Save game.');
  }

  S.toSlot = function (slot) {
    try {
      localStorage.setItem(key(slot), encodeStored(S.serialize()));
      return true;
    } catch (e) {
      reportSaveError(e);
      return false;
    }
  };

  /* Autosaving splits so a season boundary does not stall the day loop: the
     snapshot is still taken synchronously (the state to capture is the live
     one, before any mortality roll), but the storage write runs after a frame
     can paint. Writing that ready JSON directly avoids compressing and then
     decompressing the entire life on every season. Only a quota rejection
     pays for the smaller verified encoding. A newer autosave supersedes a
     still-pending one; only the autosave slot is written this way — manual
     saves stay fully synchronous. */
  let pendingAuto = null;
  function flushAutosave() {
    const job = pendingAuto;
    pendingAuto = null;
    if (!job) return;
    try {
      localStorage.setItem(key('auto'), job.json);
    } catch (e) {
      if (!isQuotaError(e)) {
        reportSaveError(e);
        return;
      }
      try {
        localStorage.setItem(key('auto'), encodeStored(job.json));
      } catch (compactError) {
        reportSaveError(compactError);
      }
    }
  }
  /* a hidden or closing page may never run another timer — land the pending
     write instead of losing it */
  S.flushPending = function () { if (pendingAuto) flushAutosave(); };
  window.addEventListener('pagehide', S.flushPending);

  /* an observe session is never saved — it must not bury a real life */
  S.autosave = function () {
    if (!FB.state || FB.state.player.dead || (FB.game && FB.game.observe)) return;
    try {
      pendingAuto = { json: S.serialize() };
    } catch (e) {
      reportSaveError(e);
      return;
    }
    setTimeout(flushAutosave, 0);
  };

  /* Export/import - a life as portable text. localStorage is a hostage on
     some mobile browsers (evicted in third-party iframes and in-app webviews,
     dropped in private mode); a downloaded text file outlives all of that and
     moves a life between devices without a long copy-paste. FBS2 is compressed
     base64 (about a quarter of the old text); FBS1 is the legacy
     uncompressed UTF-8/base64 wrap and remains importable forever. The tag
     marks the format and catches stray pastes. */
  const XPRE = 'FBS1.';
  const XPRE2 = 'FBS2.';
  S.exportState = function () {
    const json = S.serialize();
    const body = compressToBase64(json);
    // same rule as slots: an unverified codec result never carries the life
    if (decompressFromBase64(body) === json) return XPRE2 + body;
    return XPRE + btoa(unescape(encodeURIComponent(json)));
  };
  S.parseExport = function (text) {
    try {
      const t = String(text || '').replace(/\s+/g, '');
      let json = null;
      if (t.indexOf(XPRE2) === 0) {
        json = decompressFromBase64(t.slice(XPRE2.length));
      } else if (t.indexOf(XPRE) === 0) {
        json = decodeURIComponent(escape(atob(t.slice(XPRE.length))));
      }
      const d = json ? JSON.parse(json) : null;
      return d && d.v === 3 ? d : null;
    } catch (e) { return null; }
  };

  /* A Chronicle archive is a portable, human-readable companion to a save,
     not a resumable world. The compact journal remains inside state; export
     expands it once into stable dated records with rendered fallback prose so
     a future build can still display an old or mod-authored story. */
  function chronicleMessageText(message, state) {
    if (!message) return '';
    try {
      return FB.renderMessage(message, {
        state:state,
        viewer:state && state.player && state.player.charId
      });
    } catch (e) {
      return message.key || '';
    }
  }

  function chronicleHeadData(state, archive, head) {
    const legend = (state.legends || []).filter(function (record) {
      return record && record.id === head[1];
    })[0];
    let title = '';
    try { title = head[6] && FB.renderTitleSnapshot ? FB.renderTitleSnapshot(head[6]) : ''; }
    catch (e) { title = ''; }
    let cause = '';
    let quip = '';
    if (legend) {
      cause = legend.causeMsg ? chronicleMessageText(legend.causeMsg, state) : legend.cause || '';
      quip = legend.quipMsg ? chronicleMessageText(legend.quipMsg, state) : legend.quip || '';
    }
    return {
      generation:Math.max(1, Number(head[0]) || 1),
      characterId:head[1] || '',
      name:head[2] || '',
      born:Number(head[3]) || 0,
      began:Number(head[4]) || 0,
      ended:Number(head[5]) || 0,
      dynasty:head[7] || '',
      title:title,
      titleData:head[6] || null,
      cause:cause,
      quip:quip
    };
  }

  S.chronicleData = function (state, options) {
    state = state || FB.state;
    options = options || {};
    if (!state || !state.player || !state.date || !Array.isArray(state.log) ||
        !FB.ensureChronicle) return null;
    const archive = FB.ensureChronicle(state);
    if (!archive) return null;
    /* A detached save may be inspected before its bookmark world is active.
       Keep its already-saved head snapshot instead of replacing that title
       with a less specific one derived without the county map. */
    if (options.noteHead !== false && FB.chronicleNoteHead) {
      FB.chronicleNoteHead(state);
    }
    const current = state.chars && state.chars[state.player.charId];
    const heads = archive.heads.slice().sort(function (a, b) {
      return (Number(a[0]) || 0) - (Number(b[0]) || 0);
    }).map(function (head) {
      return chronicleHeadData(state, archive, head);
    });
    const entries = [];
    for (let i = 0; i < archive.entries.length; i++) {
      const entry = FB.chronicleEntry(archive, archive.entries[i]);
      if (!entry) continue;
      const exported = {
        id:i + 1,
        year:Number(entry.y) || 0,
        season:Number(entry.s) || 0,
        day:Number(entry.d) || 0,
        generation:Math.max(1, Number(entry.generation) || 1),
        category:entry.chronicleCategory || 'news',
        text:FB.newsText(entry, state, state.player.charId)
      };
      if (entry.msg) exported.message = entry.msg;
      if (entry.hostileReportId) {
        exported.hostileReport = {
          id:entry.hostileReportId,
          kind:entry.hostileReportKind || 'war'
        };
      }
      if (entry.receipt) {
        exported.choice = {
          eventId:entry.receipt.eventId || '',
          optionIndex:entry.receipt.optionIndex,
          result:entry.receipt.result || 'none',
          automated:!!entry.receipt.automated,
          title:chronicleMessageText(entry.receipt.title, state),
          option:chronicleMessageText(entry.receipt.option, state),
          outcome:chronicleMessageText(entry.receipt.outcome, state),
          impacts:Array.isArray(entry.receipt.impacts) ? entry.receipt.impacts : []
        };
      }
      entries.push(exported);
    }
    let peakTitle = '';
    try {
      peakTitle = state.peakTitleData && FB.renderTitleSnapshot
        ? FB.renderTitleSnapshot(state.peakTitleData)
        : (FB.stationName ? FB.stationName(state.peakTier || 0) : '');
    } catch (e) { peakTitle = ''; }
    const start = state.start || { year:entries.length ? entries[0].year : state.date.year };
    return {
      format:'fallowborn-chronicle',
      version:1,
      gameVersion:FB.VERSION || '',
      complete:!archive.partial,
      campaign:{
        dynasty:current && current.dyn || heads.length && heads[0].dynasty || '',
        seed:state.seed || '',
        bookmark:start.id || '',
        started:{
          year:Number(start.year) || 0,
          season:Number(start.season) || 0,
          day:Number(start.day) || 1
        },
        ended:{
          year:Number(state.date.year) || 0,
          season:Number(state.date.season) || 0,
          day:Number(state.date.day) || 1
        },
        finished:FB.game && FB.game.campaignFinished
          ? FB.game.campaignFinished(state) : !!state.player.dead,
        generations:Math.max(Number(state.generation) || 1, heads.length),
        peakTier:Number(state.peakTier) || Number(state.player.tier) || 0,
        peakTitle:peakTitle,
        finalWealth:Number(state.player.gold) || 0,
        prestige:Number(state.player.prestige) || 0,
        piety:Number(state.player.piety) || 0
      },
      heads:heads,
      entries:entries
    };
  };

  S.exportChronicle = function (state) {
    const data = S.chronicleData(state);
    return data ? JSON.stringify(data, null, 2) : '';
  };

  S.parseChronicle = function (text) {
    try {
      const data = typeof text === 'string' ? JSON.parse(text) : text;
      if (!data || data.format !== 'fallowborn-chronicle' || data.version !== 1 ||
          !data.campaign || !data.campaign.started || !data.campaign.ended ||
          !isFinite(Number(data.campaign.started.year)) ||
          !isFinite(Number(data.campaign.ended.year)) ||
          !Array.isArray(data.heads) ||
          !Array.isArray(data.entries) || data.entries.length > 100000) return null;
      for (let i = 0; i < data.entries.length; i++) {
        const entry = data.entries[i];
        if (!entry || !isFinite(Number(entry.year)) ||
            typeof entry.text !== 'string') return null;
      }
      return data;
    } catch (e) { return null; }
  };

  /* Build the same portable, non-resumable Chronicle artifact from a parsed
     save without restoring that life. Slot reads and exported-save parses
     already return detached objects, so inflating and adopting a legacy
     Chronicle here can only touch that snapshot; FB.state, RNG, uid, and the
     active bookmark remain unchanged. */
  S.chronicleFromSave = function (data) {
    try {
      if (!data || data.v !== 3 || !data.state ||
          typeof data.state !== 'object') return null;
      const state = inflateState(data.state);
      if (!state.player || !state.chars || !state.date ||
          !Array.isArray(state.log)) return null;
      /* A version-3 save from before complete archives carries only its
         bounded compatibility log. Adopt it as partial just as restore does,
         so the viewer never claims those discarded earlier lines survived. */
      if (FB.ensureChronicle) FB.ensureChronicle(state, { legacy:true });
      return S.chronicleData(state, { noteHead:false });
    } catch (e) { return null; }
  };

  let recentChronicle = null;
  S.rememberChronicle = function (source) {
    const data = source && source.format === 'fallowborn-chronicle'
      ? source : S.chronicleData(source || FB.state);
    recentChronicle = data || recentChronicle;
    return recentChronicle;
  };
  S.recentChronicle = function () { return recentChronicle; };

  S.read = function (slot) {
    try {
      const raw = decodeStored(localStorage.getItem(key(slot)));
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

  /* existence probe for callers that must not pay for a decode (the first-time
     tips upgrade path): true when the autosave or any manual slot holds bytes */
  S.hasAnySave = function () {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k === PREFIX + 'auto' || (k && k.indexOf(PREFIX + 'slot') === 0)) {
          if (localStorage.getItem(k)) return true;
        }
      }
    } catch (e) { /* storage refused — treat as no save */ }
    return false;
  };

  S.bookmarkOf = function (data) {
    const start = data && data.state && data.state.start;
    return start && start.id ? String(start.id) : '867';
  };

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

  /* The former unguarded repair could mistake an adopted successor for an
     old founder after restore. Its generated pair is recognizable without
     guessing from names: both dead parent records were created consecutively
     after the current head, while the adopter's original child backlink was
     left intact. Restore that parentless adoption and any founder siblings
     whose real parents still retain their backlinks. */
  function repairSuccessorParentBackfill(s) {
    const player = s && s.player;
    const chars = s && s.chars;
    const me = player && chars && chars[player.charId];
    const founder = player && player.houseFounderId &&
      chars[player.houseFounderId];
    if (!me || !founder || me.id === founder.id) return false;
    const dad = me.fatherId && chars[me.fatherId];
    const mom = me.motherId && chars[me.motherId];
    if (!dad || !mom || dad.sex !== 'm' || mom.sex !== 'f' ||
        dad.role !== 'parent' || mom.role !== 'parent' ||
        !dad.dead || !mom.dead || dad.spouseId !== mom.id ||
        mom.spouseId !== dad.id) return false;
    function serial(id) {
      const match = /^c(\d+)$/.exec(String(id || ''));
      return match ? Number(match[1]) : 0;
    }
    const meSerial = serial(me.id);
    const dadSerial = serial(dad.id);
    const momSerial = serial(mom.id);
    if (!meSerial || dadSerial <= meSerial || momSerial !== dadSerial + 1) {
      return false;
    }
    const dadKids = Array.isArray(dad.childrenIds) ? dad.childrenIds : [];
    const momKids = Array.isArray(mom.childrenIds) ? mom.childrenIds : [];
    if (dadKids.indexOf(me.id) < 0 || dadKids.length !== momKids.length ||
        dadKids.some(function (id) { return momKids.indexOf(id) < 0; })) {
      return false;
    }
    let adopterFound = false;
    for (const id in chars) {
      if (id === dad.id || id === mom.id) continue;
      const c = chars[id];
      if (c && Array.isArray(c.childrenIds) &&
          c.childrenIds.indexOf(me.id) >= 0) {
        adopterFound = true;
        break;
      }
    }
    if (!adopterFound) return false;

    const repairs = {};
    for (let i = 0; i < dadKids.length; i++) {
      const child = chars[dadKids[i]];
      if (!child) return false;
      if (child.id === me.id) {
        repairs[child.id] = { fatherId:null, motherId:null };
        continue;
      }
      if (child.role !== 'sibling' || child.dyn !== founder.dyn) return false;
      let fatherId = null;
      let motherId = null;
      for (const id in chars) {
        if (id === dad.id || id === mom.id) continue;
        const parent = chars[id];
        if (!parent || !Array.isArray(parent.childrenIds) ||
            parent.childrenIds.indexOf(child.id) < 0) continue;
        if (parent.sex === 'm' && !fatherId) fatherId = parent.id;
        if (parent.sex === 'f' && !motherId) motherId = parent.id;
      }
      if (!fatherId || !motherId) return false;
      repairs[child.id] = { fatherId:fatherId, motherId:motherId };
    }
    for (const id in repairs) {
      chars[id].fatherId = repairs[id].fatherId;
      chars[id].motherId = repairs[id].motherId;
    }
    delete chars[dad.id];
    delete chars[mom.id];
    if (FB.touchFamily) FB.touchFamily();
    return true;
  }

  function restoreRepair(stage, callback) {
    try {
      callback();
      return true;
    } catch (error) {
      S.lastRestoreWarnings.push({ stage:stage, error:error });
      return false;
    }
  }

  S.restore = function (data) {
    if (!data || !data.state || typeof data.state !== 'object') {
      throw new Error('The save has no readable game state.');
    }
    S.lastRestoreWarnings = [];
    FB.setRngState(data.rng);
    FB.setUidCounter(data.uid);
    FB.state = inflateState(data.state);
    if (!FB.state.player || !FB.state.chars || !FB.state.date ||
        !FB.state.realms || !FB.state.owner) {
      throw new Error('The save is missing required world or player records.');
    }
    if (!FB.state.start) {
      FB.state.start = { id:'867', year:867, season:0, day:1 };
    }
    if (FB.ensureChronicle) restoreRepair('Chronicle archive', function () {
      FB.ensureChronicle(FB.state, { legacy:true });
    });
    restoreRepair('starting-rank progression', function () {
      SP.creditEarnedState(FB.state);
    });
    // the realm cache is keyed by state.turn, which two lives can share
    FB.invalidateRealmCache();
    /* Faith definitions are an additive version-3 field. Old lives begin
       with no generated faiths; new lives rebuild the derived graph from the
       saved JSON deltas before any office or character repair consults it. */
    if (FB.ensureFaithState) restoreRepair('faith state', function () {
      FB.ensureFaithState(FB.state);
    });
    if (FB.configureReligions) restoreRepair('religion definitions', function () {
      FB.configureReligions(FB.state);
    });
    /* Save format 3 remains stable: missing religious-office assignments gain
       bookmark-aware defaults; vacancies gain additive turn/former-holder
       metadata, while own null vacancies and changed holders persist. */
    if (FB.ensureReligiousHeads) restoreRepair('religious offices', function () {
      FB.ensureReligiousHeads(FB.state);
    });
    restoreRepair('legacy parents', function () {
      const player = FB.state.player;
      if (player.familyParentMigration === 1) return;
      /* houseFounderId was introduced after new campaigns already recorded
         their parents. A later parentless head may therefore be adopted; it
         is not evidence that the whole save predates recorded genealogy. */
      if (player.houseFounderId) repairSuccessorParentBackfill(FB.state);
      else if ((Number(FB.state.generation) || 1) <= 1) {
        backfillParents(FB.state);
      }
      player.familyParentMigration = 1;
    });
    restoreRepair('player personal station', function () {
      const player = FB.state.player;
      const current = player && FB.state.chars &&
        FB.state.chars[player.charId];
      if (current && (current.station === undefined || current.station === null)) {
        current.station = FB.clamp(player.tier, 0, 4);
      }
      if (current && player.tier === 0) current.unfree = true;
      else if (current) delete current.unfree;
    });
    if (FB.ensureCharacterBynames) restoreRepair('character bynames', function () {
      FB.ensureCharacterBynames(FB.state);
    });
    if (FB.ensureDynasticState) restoreRepair('dynastic state', function () {
      FB.ensureDynasticState(FB.state);
    });
    if (FB.ensureCharacterStatusHistory) {
      restoreRepair('character status history', function () {
        FB.ensureCharacterStatusHistory(FB.state);
      });
    }
    if (FB.ensureFaithStandingBaselines) {
      restoreRepair('faith standing', function () {
        FB.ensureFaithStandingBaselines(FB.state);
      });
    }
    if (FB.ensureStepRelations) {
      restoreRepair('stepfamily relations', function () {
        const stepfamilyRng = FB.getRngState();
        try {
          FB.ensureStepRelations(FB.state);
        } finally {
          FB.setRngState(stepfamilyRng);
        }
      });
    }
    /* The elective Papacy is an additive subsystem. Old saves retain their
       reigning Roman Pope and receive a date-appropriate College around him. */
    if (FB.ensurePapacyState) restoreRepair('papacy state', function () {
      FB.ensurePapacyState(FB.state);
    });
    /* Dynasty scholarship and innovations from older version-3 lives become
       the effective sovereign nation's first technology record. */
    if (FB.ensureRealmTech) restoreRepair('realm technology', function () {
      FB.ensureRealmTech(FB.state);
      if (FB.seedRealmTechnology && FB.state.realms.player &&
          FB.state.realms.player.alive) {
        FB.seedRealmTechnology(FB.state, 'player');
      }
    });
    if (FB.migratePlayerDevelopment) restoreRepair('player development', function () {
      FB.migratePlayerDevelopment(FB.state);
    });
    if (FB.repairForts) restoreRepair('fortifications', function () {
      FB.repairForts(FB.state);
    });
    /* Save format 3 is deliberately stable. The equipment subsystem repairs
       old inventories and grows exact instances/loadouts additively here. */
    if (FB.ensureItems) restoreRepair('items and equipment', function () {
      FB.ensureItems(FB.state);
    });
    if (FB.ensureHouseholdStandards) restoreRepair('household standards', function () {
      FB.ensureHouseholdStandards(FB.state);
    });
    /* Freedom bargaining and its bounded family landmark are additive format-3
       records. Repair them without forming tenure, advancing time, or using
       RNG; old freeholder saves deliberately receive no invented history. */
    if (FB.ensureFreedomOffer) restoreRepair('freedom offer', function () {
      FB.ensureFreedomOffer(FB.state);
    });
    if (FB.ensureFamilyFreedom) restoreRepair('family freedom', function () {
      FB.ensureFamilyFreedom(FB.state);
    });
    if (FB.ensurePopulationState) restoreRepair('population state', function () {
      FB.ensurePopulationState(FB.state);
    });
    if (FB.ensureMarket) restoreRepair('market state', function () {
      FB.ensureMarket(FB.state);
    });
    if (FB.ensureEducationPolicy) restoreRepair('education policy', function () {
      FB.ensureEducationPolicy(FB.state, true);
    });
    if (FB.ensureMatchPolicy) restoreRepair('match policy', function () {
      FB.ensureMatchPolicy(FB.state, true);
    });
    if (FB.ensureTraitProgress) restoreRepair('trait progress', function () {
      FB.ensureTraitProgress(FB.state);
    });
    if (FB.invalidateGuildMonopolies) restoreRepair('guild monopolies', function () {
      FB.invalidateGuildMonopolies(FB.state);
    });
    else if (FB.ensureGuildMonopolies) restoreRepair('guild monopolies', function () {
      FB.ensureGuildMonopolies(FB.state);
    });
    if (FB.repairGreatHolyWar) restoreRepair('great holy war', function () {
      FB.repairGreatHolyWar(FB.state);
    });
    if (FB.repairWars) restoreRepair('wars', function () {
      FB.repairWars(FB.state);
    });
    /* Vassals orphaned under a dead house (pre-fix revocation) reattach
       upward before any hierarchy reader runs. */
    if (FB.repairVassalLieges) restoreRepair('vassal hierarchy', function () {
      FB.repairVassalLieges(FB.state);
    });
    /* Counts in older saves may already control a complete de jure duchy.
       Recognize them once here, after liege repair, rather than adding a
       realm-wide scan to yearly fast-forward simulation. */
    if (FB.repairCompleteDuchyRanks) {
      restoreRepair('ducal recognition', function () {
        FB.repairCompleteDuchyRanks(FB.state);
      });
    }
    if (FB.ensureModifiers) restoreRepair('modifiers', function () {
      FB.ensureModifiers(FB.state);
    });
    if (FB.ensureIntrigue) restoreRepair('intrigue state', function () {
      FB.ensureIntrigue(FB.state);
    });
    if (FB.fabricatedClaimOf) restoreRepair('fabricated claims', function () {
      FB.fabricatedClaimOf(FB.state);
    });
    /* An unresolved market lot is a household record. Repair it after claims
       and item ownership so a stale or impossible lot is safely discarded. */
    if (FB.ensureAuction) restoreRepair('auction state', function () {
      FB.ensureAuction(FB.state);
    });
    /* Personal attention and explicit-gift clocks are additive life-local
       fields. This also converts the removed court_suitor focus in old saves. */
    if (FB.socialAttentionEnsure) restoreRepair('social attention', function () {
      FB.socialAttentionEnsure(FB.state);
    });
    if (FB.ensureCourtshipTerms) restoreRepair('courtship terms', function () {
      FB.ensureCourtshipTerms(FB.state);
    });
    if (FB.ensureSiblingCourtships) restoreRepair('sibling courtships', function () {
      FB.ensureSiblingCourtships(FB.state);
    });
    if (FB.socialGiftTurns) restoreRepair('social gifts', function () {
      FB.socialGiftTurns(FB.state);
    });
    if (FB.realmGiftTurns) restoreRepair('realm gifts', function () {
      FB.realmGiftTurns(FB.state);
    });
    if (FB.giftDeliveryEnsure) restoreRepair('gift deliveries', function () {
      FB.giftDeliveryEnsure(FB.state);
    });
    if (FB.ensureAgency) restoreRepair('ruler agency', function () {
      FB.ensureAgency(FB.state);
    });
    if (FB.repairPolitics) restoreRepair('politics', function () {
      FB.repairPolitics(FB.state);
    });
    if (FB.ensureInstitutions) {
      restoreRepair('institutions', function () {
        FB.ensureInstitutions(FB.state, { silent:true });
      });
    }
    if (FB.ensureLocalGovernment) {
      restoreRepair('local government', function () {
        FB.ensureLocalGovernment(FB.state, true);
      });
    }
    return FB.state;
  };
})();
