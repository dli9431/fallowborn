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
