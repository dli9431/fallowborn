/* Fallowborn — save/load via localStorage */
window.FB = window.FB || {};

(function () {
  'use strict';

  const S = {};
  FB.save = S;
  const PREFIX = 'fb_';

  function own(o, key) {
    return Object.prototype.hasOwnProperty.call(o, key);
  }

  function royalMemberRecord(o) {
    return !!(o && typeof o.id === 'string' &&
      o.id.indexOf('royal_') === 0 && own(o, 'parentId') &&
      own(o, 'charId'));
  }

  /* Keep live state explicit, but do not pay for values the restore boundary
     can reconstruct exactly. The member tree's parentId is canonical, derived
     character ids come from member ids, and completed technology already
     implies exposure. Returning undefined omits only object properties; no
     live object is mutated while a slot or export is written. */
  function saveReplacer(key, value) {
    const holder = this;
    if (royalMemberRecord(holder)) {
      if (key === 'childIds') return undefined;
      if (key === 'alive' && value === true) return undefined;
      if (key === 'role' && value === null) return undefined;
      if (key === 'charId' && value ===
          'ro_' + holder.id.slice('royal_'.length)) {
        const c = FB.state && FB.state.chars && FB.state.chars[value];
        if (c && c.royalLine && c.royalLine.memberId === holder.id) {
          return undefined;
        }
      }
    }
    if (holder && holder.royalLine) {
      if (key === 'dead' && value === false) return undefined;
      if (key === 'role' && value === null) return undefined;
      if ((key === 'fatherId' || key === 'motherId' || key === 'spouseId') &&
          value === null) return undefined;
    }
    if (key === 'exposed' && Array.isArray(value) && holder &&
        Array.isArray(holder.completed) && Array.isArray(holder.active) &&
        holder.progress && own(holder, 'reserve')) {
      return value.filter(function (id) {
        return holder.completed.indexOf(id) < 0;
      });
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
      if (!c || !c.royalLine) continue;
      if (!own(c, 'dead')) c.dead = false;
      if (!own(c, 'role')) c.role = null;
      if (!own(c, 'fatherId')) c.fatherId = null;
      if (!own(c, 'motherId')) c.motherId = null;
      if (!own(c, 'spouseId')) c.spouseId = null;
    }
    const realms = state.realms || {};
    for (const rid in realms) {
      const succession = realms[rid] && realms[rid].succession;
      const members = succession && succession.members;
      if (!members) continue;
      for (const id in members) {
        const member = members[id];
        if (!member) continue;
        if (!own(member, 'alive')) member.alive = true;
        if (!own(member, 'role')) member.role = null;
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
    const realmTech = state.realmTech || {};
    for (const rid in realmTech) {
      const record = realmTech[rid];
      if (!record || !Array.isArray(record.completed) ||
          !Array.isArray(record.exposed)) continue;
      for (const id of record.completed) {
        if (record.exposed.indexOf(id) < 0) record.exposed.push(id);
      }
    }
    return state;
  }

  /* ---------- storage compression ----------
     A serialized life is ~1.5 MB of JSON; localStorage quotas are ~5 MB on
     WebKit and ~10 MB elsewhere, and the quota is shared by the autosave and
     every slot - so uncompressed, a life effectively fits once on the
     browsers mobile players actually use. Slots and exports are therefore
     compressed at this boundary with an LZW variant (a port of lz-string by
     pieroxy, MIT), packing the bit stream into storage-safe UTF-16
     characters or base64 text. S.serialize keeps returning plain JSON; only
     the at-rest and exported encodings change, and both decoders still
     accept the uncompressed legacy forms. */

  function lzCompress(input, bitsPerChar, charFromInt) {
    const dictionary = {};
    const fresh = {};
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
      if (own(fresh, symbol)) {
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
      if (!own(dictionary, c)) {
        dictionary[c] = dictSize++;
        fresh[c] = true;
      }
      const wc = w + c;
      if (own(dictionary, wc)) {
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
    }, saveReplacer);
  };

  /* the quota case deserves its own message: the life has outgrown the
     browser's storage (legacy code 22, Firefox NS_ERROR_DOM_QUOTA_REACHED
     1014), and Export is the one path that still preserves it. The name test
     is a regex on purpose: a bare 'QuotaExceededError' literal would be
     extracted into the translation catalogs as if it were display text. */
  function isQuotaError(e) {
    return !!e && (/quota/i.test(String(e.name)) ||
      e.code === 22 || e.code === 1014);
  }

  S.toSlot = function (slot) {
    try {
      localStorage.setItem(key(slot), encodeStored(S.serialize()));
      return true;
    } catch (e) {
      if (FB.ui) {
        if (isQuotaError(e)) FB.ui.toast('⚠ This life’s records have outgrown the browser’s save storage — 📤 Export (Menu → 💾 Save game) still keeps the life as text.');
        else if (S.available) FB.ui.toast('Save failed: {message}', { message: e.message });
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
     a life between devices. FBS2 is compressed base64 (about a quarter of
     the old text, which matters for mobile copy-paste); FBS1 is the legacy
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

  S.restore = function (data) {
    FB.setRngState(data.rng);
    FB.setUidCounter(data.uid);
    FB.state = inflateState(data.state);
    if (!FB.state.start) {
      FB.state.start = { id:'867', year:867, season:0, day:1 };
    }
    // the realm cache is keyed by state.turn, which two lives can share
    FB.invalidateRealmCache();
    /* Save format 3 remains stable: missing religious-office assignments gain
       bookmark-aware defaults; vacancies gain additive turn/former-holder
       metadata, while own null vacancies and changed holders persist. */
    if (FB.ensureReligiousHeads) FB.ensureReligiousHeads(FB.state);
    backfillParents(FB.state);
    if (FB.ensureCharacterBynames) FB.ensureCharacterBynames(FB.state);
    if (FB.ensureDynasticState) FB.ensureDynasticState(FB.state);
    if (FB.ensureStepRelations) {
      const stepfamilyRng = FB.getRngState();
      FB.ensureStepRelations(FB.state);
      FB.setRngState(stepfamilyRng);
    }
    /* The elective Papacy is an additive subsystem. Old saves retain their
       reigning Roman Pope and receive a date-appropriate College around him. */
    if (FB.ensurePapacyState) FB.ensurePapacyState(FB.state);
    /* Dynasty scholarship and innovations from older version-3 lives become
       the effective sovereign nation's first technology record. */
    if (FB.ensureRealmTech) FB.ensureRealmTech(FB.state);
    /* Save format 3 is deliberately stable. The equipment subsystem repairs
       old inventories and grows exact instances/loadouts additively here. */
    if (FB.ensureItems) FB.ensureItems(FB.state);
    if (FB.ensureHouseholdStandards) FB.ensureHouseholdStandards(FB.state);
    if (FB.ensureEducationPolicy) FB.ensureEducationPolicy(FB.state, true);
    if (FB.ensureMatchPolicy) FB.ensureMatchPolicy(FB.state, true);
    if (FB.ensureTraitProgress) FB.ensureTraitProgress(FB.state);
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(FB.state);
    else if (FB.ensureGuildMonopolies) FB.ensureGuildMonopolies(FB.state);
    if (FB.repairGreatHolyWar) FB.repairGreatHolyWar(FB.state);
    if (FB.repairWars) FB.repairWars(FB.state);
    if (FB.ensureModifiers) FB.ensureModifiers(FB.state);
    if (FB.fabricatedClaimOf) FB.fabricatedClaimOf(FB.state);
    /* Personal attention and explicit-gift clocks are additive life-local
       fields. This also converts the removed court_suitor focus in old saves. */
    if (FB.socialAttentionEnsure) FB.socialAttentionEnsure(FB.state);
    if (FB.ensureCourtshipTerms) FB.ensureCourtshipTerms(FB.state);
    if (FB.socialGiftTurns) FB.socialGiftTurns(FB.state);
    if (FB.realmGiftTurns) FB.realmGiftTurns(FB.state);
    if (FB.giftDeliveryEnsure) FB.giftDeliveryEnsure(FB.state);
    if (FB.ensureAgency) FB.ensureAgency(FB.state);
    if (FB.repairPolitics) FB.repairPolitics(FB.state);
    return FB.state;
  };
})();
