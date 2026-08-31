/* Fallowborn — locale-neutral message descriptors and presentation intents.
   This file deliberately has no DOM, storage, map, or locale dependency. */
window.FB = window.FB || {};

(function () {
  'use strict';

  FB.MESSAGE_SCHEMA = 1;

  const english = {};
  const listeners = [];
  let toastSuppression = 0;
  const HOSTILE_HISTORY_LIMIT = 200;
  const CHRONICLE_ARCHIVE_SCHEMA = 1;
  const CHRONICLE_CATEGORIES = [
    'news', 'choice', 'family', 'rank', 'war', 'property', 'faith',
    'travel', 'politics'
  ];

  function expireHostileChronicleLinks(state, reports) {
    if (!state || !Array.isArray(state.log) || !reports || !reports.length) return;
    const expired = {};
    for (let i = 0; i < reports.length; i++) {
      if (reports[i] && reports[i].id) expired[reports[i].id] = 1;
    }
    for (let i = 0; i < state.log.length; i++) {
      const entry = state.log[i];
      if (entry && expired[entry.hostileReportId]) {
        delete entry.hostileReportId;
        delete entry.hostileReportKind;
      }
    }
  }

  function plainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') return false;
    const proto = Object.getPrototypeOf ? Object.getPrototypeOf(value) : Object.prototype;
    return proto === Object.prototype || proto === null;
  }

  function cloneJson(value, seen, depth) {
    if (depth > 12) throw new Error('Message params are nested too deeply.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!isFinite(value)) throw new Error('Message params must contain finite numbers.');
      return value;
    }
    if (typeof value === 'undefined') return undefined;
    if (typeof value === 'function' || typeof value === 'symbol') {
      throw new Error('Message params must be JSON-safe.');
    }
    if (seen.indexOf(value) >= 0) throw new Error('Message params must not contain cycles.');
    seen.push(value);
    let out;
    if (Array.isArray(value)) {
      out = [];
      for (let i = 0; i < value.length; i++) {
        const item = cloneJson(value[i], seen, depth + 1);
        out.push(item === undefined ? null : item);
      }
    } else {
      if (!plainObject(value)) throw new Error('Message params must contain plain objects only.');
      out = {};
      for (const key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
        const child = cloneJson(value[key], seen, depth + 1);
        if (child !== undefined) out[key] = child;
      }
    }
    seen.pop();
    return out;
  }

  function freezeDeep(value) {
    if (!value || typeof value !== 'object' || !Object.freeze) return value;
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) freezeDeep(value[key]);
    }
    return Object.freeze(value);
  }

  FB.messageParams = function (params) {
    if (params === undefined || params === null) return {};
    return cloneJson(params, [], 0);
  };

  FB.registerMessage = function (key, record) {
    if (!/^(?:news|fx|legend|event)\.[a-z0-9_.-]+$/.test(key)) {
      throw new Error('Invalid message key: ' + key);
    }
    if (!record || (typeof record.text !== 'string' && !record.forms)) {
      throw new Error('Invalid English message record: ' + key);
    }
    english[key] = record;
  };

  FB.registerMessages = function (records) {
    for (const key in records) {
      if (Object.prototype.hasOwnProperty.call(records, key)) FB.registerMessage(key, records[key]);
    }
  };

  FB.englishMessage = function (key) { return english[key] || null; };
  FB.englishMessages = function () { return english; };

  FB.message = function (key, params) {
    if (typeof key !== 'string' || !key) throw new Error('A message key is required.');
    const msg = { key: key, params: FB.messageParams(params) };
    /* Freezing catches accidental caller mutation. JSON serialization naturally
       drops the freeze for saved data, and old engines simply skip it. */
    freezeDeep(msg);
    return msg;
  };

  /* Source-at-callsite helper. Extraction places the English record in the
     generated manifest; registering here also gives newly loaded mod messages
     an immediate English fallback without storing prose in the descriptor. */
  FB.msg = function (key, englishRecord, params) {
    const record = typeof englishRecord === 'string' ? { text: englishRecord } : englishRecord;
    FB.registerMessage(key, record);
    return FB.message(key, params);
  };

  FB.dataParam = function (kind, id, path, transform) {
    const value = { $data: kind, id: String(id), path: path || 'name' };
    if (transform) value.transform = transform;
    return value;
  };

  FB.messageParam = function (message) {
    if (!message || typeof message.key !== 'string') {
      throw new Error('A nested message descriptor is required.');
    }
    return { $message: FB.message(message.key, message.params) };
  };

  FB.fx = {
    push: function (intent) {
      if (toastSuppression && intent && intent.kind === 'toast' &&
          !intent.bypassSuppression) return;
      const safe = FB.messageParams(intent);
      for (let i = 0; i < listeners.length; i++) listeners[i](safe);
    },
    on: function (fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () {
        const at = listeners.indexOf(fn);
        if (at >= 0) listeners.splice(at, 1);
      };
    }
  };

  /* Event resolution can produce several durable news entries (a modifier
     notice, a wedding, a queued story, and so on) before its single receipt.
     Keep those entries in the Chronicle while letting the caller replace the
     burst of transient popups with one result toast. The counter makes nested
     resolution safe and keeps the default FB.news behavior unchanged. */
  FB.suppressNewsToasts = function (suppress) {
    if (suppress) toastSuppression++;
    else toastSuppression = Math.max(0, toastSuppression - 1);
    return toastSuppression;
  };
  FB.newsToastsSuppressed = function () { return toastSuppression > 0; };

  /* The retained state.log is deliberately small and remains the compatibility
     surface used by the live panel and older builds. The complete Chronicle is
     an additive compact journal: repeated message keys live once in `strings`,
     while entries use positional arrays instead of repeating property names.
     Old version-3 saves acquire an archive from the history they still possess;
     `partial` tells exports and the viewer that still-older lines were already
     beyond the former 300-entry window and cannot be reconstructed. */
  FB.CHRONICLE_ARCHIVE_SCHEMA = CHRONICLE_ARCHIVE_SCHEMA;

  function chronicleArchiveValid(archive) {
    return !!(archive && archive.v === CHRONICLE_ARCHIVE_SCHEMA &&
      Array.isArray(archive.strings) && Array.isArray(archive.entries) &&
      Array.isArray(archive.heads));
  }

  function chronicleStringIndex(archive, value) {
    value = String(value || '');
    const found = archive.strings.indexOf(value);
    if (found >= 0) return found;
    archive.strings.push(value);
    return archive.strings.length - 1;
  }

  function chroniclePackMessage(archive, message) {
    if (!message || typeof message.key !== 'string') return null;
    return [chronicleStringIndex(archive, message.key),
      message.params === undefined ? {} : message.params];
  }

  function chronicleUnpackMessage(archive, packed) {
    if (!Array.isArray(packed) || typeof packed[0] !== 'number') return null;
    const key = archive.strings[packed[0]];
    if (typeof key !== 'string') return null;
    return { key:key, params:packed[1] || {} };
  }

  function chroniclePackReceipt(archive, receipt) {
    if (!receipt || typeof receipt !== 'object') return null;
    return [
      Number(receipt.schema) || 1,
      receipt.eventId || '',
      receipt.optionIndex === undefined ? -1 : receipt.optionIndex,
      receipt.result || 'none',
      receipt.automated ? 1 : 0,
      chroniclePackMessage(archive, receipt.title),
      chroniclePackMessage(archive, receipt.option),
      chroniclePackMessage(archive, receipt.outcome),
      Array.isArray(receipt.impacts) ? receipt.impacts : []
    ];
  }

  function chronicleUnpackReceipt(archive, packed) {
    if (!Array.isArray(packed)) return null;
    return {
      schema:Number(packed[0]) || 1,
      eventId:packed[1] || '',
      optionIndex:packed[2] === undefined ? -1 : packed[2],
      result:packed[3] || 'none',
      automated:!!packed[4],
      title:chronicleUnpackMessage(archive, packed[5]),
      option:chronicleUnpackMessage(archive, packed[6]),
      outcome:chronicleUnpackMessage(archive, packed[7]),
      impacts:Array.isArray(packed[8]) ? packed[8] : []
    };
  }

  function chronicleCategory(entry) {
    if (entry && entry.kind === 'choice') return 1;
    const key = entry && entry.msg && String(entry.msg.key || '').toLowerCase() || '';
    const text = key + ' ' + String(entry && entry.t || '').toLowerCase();
    if (entry && entry.hostileReportKind ||
        /(?:war|battle|siege|raid|army|levy|conquest|crusade)/.test(text)) return 4;
    if (/(?:birth|child|marri|wedding|spouse|death|died|heir|succession|family|dynasty|retirement)/.test(text)) return 2;
    if (/(?:rank|title|freedom|manumission|promotion|liege|vassal|independence|coronation)/.test(text)) return 3;
    if (/(?:holding|property|enterprise|market|loan|debt|gold|item|estate|livelihood|career)/.test(text)) return 5;
    if (/(?:faith|piety|church|papacy|pope|bishop|religion|conversion|holy)/.test(text)) return 6;
    if (/(?:travel|journey|road|arrival|expedition|destination|pilgrim)/.test(text)) return 7;
    if (/(?:council|parliament|election|authority|law|policy|office)/.test(text)) return 8;
    return 0;
  }

  function chronicleLegacyGeneration(state, year) {
    const legends = state && Array.isArray(state.legends) ? state.legends : [];
    let generation = 1;
    for (let i = 0; i < legends.length; i++) {
      if (Number(year) > Number(legends[i].died)) generation = i + 2;
    }
    return Math.max(1, Math.min(Number(state && state.generation) || 1, generation));
  }

  function chroniclePackEntry(state, archive, entry, legacy) {
    const body = entry && entry.msg
      ? chroniclePackMessage(archive, entry.msg)
      : String(entry && entry.t || '');
    return [
      Number(entry && entry.y) || Number(state.date && state.date.year) || 0,
      Number(entry && entry.s) || 0,
      Number(entry && entry.d) || 0,
      body,
      entry && entry.kind === 'choice' ? 1 : 0,
      chroniclePackReceipt(archive, entry && entry.receipt),
      entry && entry.hostileReportId || '',
      entry && entry.hostileReportKind || '',
      chronicleCategory(entry),
      legacy ? chronicleLegacyGeneration(state, entry && entry.y) :
        Math.max(1, Number(state.generation) || 1)
    ];
  }

  function chronicleHeadSnapshot(state) {
    if (!state || !state.player || !state.chars) return null;
    const character = state.chars[state.player.charId];
    if (!character) return null;
    let titleData = null;
    if (FB.titleSnapshot) {
      try { titleData = FB.titleSnapshot(state); } catch (e) { titleData = null; }
    }
    return [
      Math.max(1, Number(state.generation) || 1),
      character.id || state.player.charId,
      FB.fullName ? FB.fullName(character) : character.name || '',
      Number(character.born) || Number(state.date && state.date.year) || 0,
      Number(state.date && state.date.year) || 0,
      Number(state.date && state.date.year) || 0,
      titleData,
      character.dyn || ''
    ];
  }

  FB.chronicleNoteHead = function (state) {
    const archive = FB.ensureChronicle(state);
    const snapshot = chronicleHeadSnapshot(state);
    if (!archive || !snapshot) return null;
    let head = null;
    for (let i = 0; i < archive.heads.length; i++) {
      if (archive.heads[i] && archive.heads[i][0] === snapshot[0]) {
        head = archive.heads[i];
        break;
      }
    }
    if (!head) {
      if (snapshot[0] === 1 && state.start && state.start.year !== undefined) {
        snapshot[4] = Number(state.start.year) || snapshot[4];
      }
      archive.heads.push(snapshot);
      return snapshot;
    }
    head[1] = snapshot[1];
    head[2] = snapshot[2];
    head[3] = snapshot[3];
    head[5] = Math.max(Number(head[5]) || 0, snapshot[5]);
    if (snapshot[6]) head[6] = snapshot[6];
    if (snapshot[7]) head[7] = snapshot[7];
    return head;
  };

  FB.ensureChronicle = function (state, options) {
    if (!state) return null;
    if (!Array.isArray(state.log)) state.log = [];
    if (chronicleArchiveValid(state.chronicle)) return state.chronicle;
    const legacy = !!(options && options.legacy);
    const archive = {
      v:CHRONICLE_ARCHIVE_SCHEMA,
      partial:legacy,
      strings:[], entries:[], heads:[]
    };
    state.chronicle = archive;
    const legends = Array.isArray(state.legends) ? state.legends : [];
    for (let i = 0; i < legends.length; i++) {
      const legend = legends[i] || {};
      const character = state.chars && state.chars[legend.id];
      archive.heads.push([
        i + 1, legend.id || '', legend.name || character && character.name || '',
        Number(legend.born) || 0,
        i === 0 && state.start ? Number(state.start.year) || Number(legend.born) || 0
          : (i && Number(legends[i - 1].died)) || Number(legend.born) || 0,
        Number(legend.died) || 0,
        legend.titleData || null,
        character && character.dyn || ''
      ]);
    }
    for (let i = 0; i < state.log.length; i++) {
      archive.entries.push(chroniclePackEntry(state, archive, state.log[i], legacy));
    }
    const snapshot = chronicleHeadSnapshot(state);
    if (snapshot) {
      let represented = false;
      for (let i = 0; i < archive.heads.length; i++) {
        if (archive.heads[i][0] === snapshot[0]) represented = true;
      }
      if (!represented) archive.heads.push(snapshot);
    }
    return archive;
  };

  FB.chronicleEntry = function (archive, packed) {
    if (!chronicleArchiveValid(archive) || !Array.isArray(packed)) return null;
    const entry = { y:packed[0], s:packed[1], d:packed[2] };
    if (Array.isArray(packed[3])) entry.msg = chronicleUnpackMessage(archive, packed[3]);
    else entry.t = String(packed[3] || '');
    if (packed[4] === 1) entry.kind = 'choice';
    const receipt = chronicleUnpackReceipt(archive, packed[5]);
    if (receipt) entry.receipt = receipt;
    if (packed[6]) entry.hostileReportId = packed[6];
    if (packed[7]) entry.hostileReportKind = packed[7];
    entry.chronicleCategory = CHRONICLE_CATEGORIES[packed[8]] || 'news';
    entry.generation = Math.max(1, Number(packed[9]) || 1);
    return entry;
  };

  FB.chronicleEntries = function (state) {
    const archive = FB.ensureChronicle(state);
    if (!archive) return [];
    const entries = [];
    for (let i = 0; i < archive.entries.length; i++) {
      const entry = FB.chronicleEntry(archive, archive.entries[i]);
      if (entry) entries.push(entry);
    }
    return entries;
  };

  /* Hostile reports are compact saved facts, never rendered prose. They are
     appended only when a raid, battle, or war boundary actually occurs; no
     daily tick reads this ledger. The cap keeps save serialization bounded. */
  FB.HOSTILE_HISTORY_LIMIT = HOSTILE_HISTORY_LIMIT;
  FB.hostileHistory = function (state) {
    if (!state) return [];
    if (!Array.isArray(state.hostileHistory)) state.hostileHistory = [];
    if (state.hostileHistory.length > HOSTILE_HISTORY_LIMIT) {
      const expired = state.hostileHistory.splice(0,
        state.hostileHistory.length - HOSTILE_HISTORY_LIMIT);
      expireHostileChronicleLinks(state, expired);
    }
    return state.hostileHistory;
  };

  FB.hostileReport = function (state, id) {
    if (!state || !id) return null;
    const history = FB.hostileHistory(state);
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i] && history[i].id === id) return history[i];
    }
    return null;
  };

  FB.recordHostileEvent = function (state, record) {
    if (!state || !record || typeof record.kind !== 'string') return null;
    const history = FB.hostileHistory(state);
    let serial = Math.max(0, Math.round(Number(state.hostileHistorySerial) || 0));
    if (!serial) {
      for (let i = 0; i < history.length; i++) {
        const match = history[i] && /^hostile_(\d+)$/.exec(history[i].id || '');
        if (match) serial = Math.max(serial, Number(match[1]) || 0);
      }
    }
    state.hostileHistorySerial = serial + 1;
    const saved = FB.messageParams(record);
    saved.id = 'hostile_' + state.hostileHistorySerial;
    saved.turn = saved.turn === undefined ? state.turn : saved.turn;
    saved.y = saved.y === undefined ? state.date.year : saved.y;
    saved.s = saved.s === undefined ? state.date.season : saved.s;
    saved.d = saved.d === undefined ? state.date.day : saved.d;
    history.push(saved);
    if (history.length > HOSTILE_HISTORY_LIMIT) {
      const expired = history.splice(0, history.length - HOSTILE_HISTORY_LIMIT);
      expireHostileChronicleLinks(state, expired);
    }
    return saved;
  };

  FB.updateHostileEvent = function (state, id, patch) {
    const saved = FB.hostileReport(state, id);
    if (!saved || !patch) return null;
    const safe = FB.messageParams(patch);
    for (const key in safe) {
      if (key !== 'id' && Object.prototype.hasOwnProperty.call(safe, key)) {
        saved[key] = safe[key];
      }
    }
    return saved;
  };

  /* New entries carry a descriptor and can be rendered in any locale. Legacy
     strings remain supported so old saves need no migration. Optional entry
     metadata is additive: old builds ignore it and still render msg/t. */
  FB.news = function (state, value, options) {
    options = options || {};
    const entry = { y: state.date.year, s: state.date.season, d: state.date.day };
    if (value && typeof value === 'object' && typeof value.key === 'string') {
      entry.msg = FB.message(value.key, value.params);
    } else {
      entry.t = String(value === undefined || value === null ? '' : value);
    }
    const kind = options.kind || options.category;
    if (typeof kind === 'string' && kind) entry.kind = kind;
    if (options.receipt) entry.receipt = FB.messageParams(options.receipt);
    if (typeof options.hostileReportId === 'string' && options.hostileReportId) {
      entry.hostileReportId = options.hostileReportId;
    } else if (entry.msg && /^news\.war\./.test(entry.msg.key || '') &&
        state.player && state.player.war && state.player.war.hostileReportId) {
      /* Every Chronicle line emitted during an ordinary player war can reopen
         that campaign's report. This is append-time metadata only; Chronicle
         rendering and daily ticks do not search or rebuild the campaign. */
      entry.hostileReportId = state.player.war.hostileReportId;
    }
    if (entry.hostileReportId) {
      const report = FB.hostileReport(state, entry.hostileReportId);
      if (report) entry.hostileReportKind = report.kind;
    }
    const archive = FB.ensureChronicle(state);
    if (archive) {
      FB.chronicleNoteHead(state);
      archive.entries.push(chroniclePackEntry(state, archive, entry, false));
    }
    state.log.push(entry);
    if (state.log.length > 300) state.log.splice(0, state.log.length - 300);
    if (options.toast !== false && !toastSuppression) {
      FB.fx.push({
        kind: 'toast',
        message: entry.msg || null,
        legacyText: entry.msg ? null : entry.t
      });
    }
    return entry;
  };
})();
