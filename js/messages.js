/* Fallowborn — locale-neutral message descriptors and presentation intents.
   This file deliberately has no DOM, storage, map, or locale dependency. */
window.FB = window.FB || {};

(function () {
  'use strict';

  FB.MESSAGE_SCHEMA = 1;

  const english = {};
  const listeners = [];

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

  /* New entries carry a descriptor and can be rendered in any locale. Legacy
     strings remain supported so old saves need no migration. */
  FB.news = function (state, value) {
    const entry = { y: state.date.year, s: state.date.season, d: state.date.day };
    if (value && typeof value === 'object' && typeof value.key === 'string') {
      entry.msg = FB.message(value.key, value.params);
    } else {
      entry.t = String(value === undefined || value === null ? '' : value);
    }
    state.log.push(entry);
    if (state.log.length > 300) state.log.splice(0, state.log.length - 300);
    FB.fx.push({
      kind: 'toast',
      message: entry.msg || null,
      legacyText: entry.msg ? null : entry.t
    });
    return entry;
  };
})();
