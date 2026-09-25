/* CrazyGames storage boundary. Inert in every other distribution. */
(function () {
  'use strict';
  if (!FB.platform.isCrazyGames) return;
  var C = FB.crazySave = {};
  var localMode = window.FB_CRAZYGAMES_STORAGE === 'localstorage';
  var KEY = localMode ? 'fb_cg_aps_campaign_v1' : 'fb_cg_campaign_v1';
  var PROGRESS = localMode ? 'fb_cg_aps_progression_v1' : 'fb_cg_progression_v1';
  var LIMIT = 1048576, RESERVE = 4096;
  var sdk = null, ready = false, locked = false, revision = 0;
  var stored = null, campaign = null, progression = null, codec = null;
  var pending = null, running = false, latest = null;
  function error(text) { return new Error(text); }
  function quota() { return error(FB.T('CrazyGames save space is full. Your previous save is kept. Download this life from Save game to preserve it.')); }
  function sameAccount() {
    if (!ready || locked) throw error(FB.T('CrazyGames saves are unavailable. Reload the game to reconnect.'));
    var current = localMode ? localStorage : sdk.data;
    if (current.getItem(KEY) !== stored || current.getItem(PROGRESS) !== progression) {
      locked = true; revision++;
      throw error(FB.T('Your CrazyGames save changed. Reload to load it before saving again.'));
    }
  }
  function valid(json) {
    var data = JSON.parse(json);
    if (!data || data.v !== 3 || data.mods !== 'crazygames-content-1' || !data.state) {
      throw error(FB.T('The CrazyGames save could not be read. Your saved data has been kept.'));
    }
    return json;
  }
  function bytes(value) { return new TextEncoder().encode(value).length; }
  function fits(value) {
    if (localMode) return true; // The browser enforces its shared localStorage quota.
    var record = {}; record[KEY] = value; record[PROGRESS] = progression || '';
    return bytes(JSON.stringify(record)) <= LIMIT - RESERVE;
  }
  function base64(buffer) {
    var a = new Uint8Array(buffer), parts = [];
    for (var i = 0; i < a.length; i += 8192) {
      parts.push(String.fromCharCode.apply(null, a.subarray(i, i + 8192)));
    }
    return btoa(parts.join(''));
  }
  /* Store gzip bytes in 15-bit, non-surrogate UTF-16 code units. Two units
     carry the byte length, so padding never becomes an extra gzip byte. This
     changes only the CrazyGames localStorage value, not the save JSON or export. */
  function pack15(buffer) {
    var data = new Uint8Array(buffer), length = data.length;
    if (!length || length > 0x3fffffff) throw error(FB.T('Save compression failed. Your previous save is kept.'));
    var parts = ['FBG2.', String.fromCharCode(32 + (length >>> 15),
      32 + (length & 32767))], chars = [];
    var word = 0, bits = 0;
    function emit(value) {
      chars.push(String.fromCharCode(32 + value));
      if (chars.length === 8192) { parts.push(chars.join('')); chars = []; }
    }
    for (var i = 0; i < length; i++) {
      word = (word << 8) | data[i]; bits += 8;
      if (bits >= 15) {
        bits -= 15; emit((word >>> bits) & 32767);
        word &= (1 << bits) - 1;
      }
    }
    if (bits) emit((word << (15 - bits)) & 32767);
    if (chars.length) parts.push(chars.join(''));
    return parts.join('');
  }
  function unpack15(raw) {
    var high = raw.charCodeAt(0) - 32, low = raw.charCodeAt(1) - 32;
    var length = high * 32768 + low;
    function invalid() { throw error(FB.T('The CrazyGames save could not be read. Your saved data has been kept.')); }
    if (raw.length < 3 || high < 0 || high > 32767 || low < 0 || low > 32767 ||
        !length || raw.length !== 2 + Math.ceil(length * 8 / 15)) invalid();
    var data = new Uint8Array(length), at = 0, word = 0, bits = 0;
    for (var i = 2; i < raw.length; i++) {
      var value = raw.charCodeAt(i) - 32;
      if (value < 0 || value > 32767) invalid();
      word = (word << 15) | value; bits += 15;
      while (bits >= 8) {
        bits -= 8;
        if (at >= length) invalid();
        data[at++] = (word >>> bits) & 255;
        word &= (1 << bits) - 1;
      }
    }
    if (at !== length || word !== 0) invalid();
    return data;
  }
  function unzipBytes(data) {
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  function unzip(value) {
    var binary = atob(value), data = new Uint8Array(binary.length);
    for (var i = 0; i < data.length; i++) data[i] = binary.charCodeAt(i);
    return unzipBytes(data);
  }
  function unpack(raw) {
    if (raw.indexOf('FBG2.') === 0) return unzipBytes(unpack15(raw.slice(5)));
    if (raw.indexOf('FBG1.') === 0) return unzip(raw.slice(5));
    if (raw.indexOf('FBL1.') === 0) return Promise.resolve(codec.decode(raw.slice(5)));
    return Promise.reject(error(FB.T('The CrazyGames save format is unsupported. Your saved data has been kept.')));
  }
  function pack(json) {
    return new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')))
      .arrayBuffer().then(function (buffer) {
        var value = localMode ? pack15(buffer) : 'FBG1.' + base64(buffer);
        return unpack(value).then(function (decoded) {
          if (decoded !== json) throw error(FB.T('Save compression failed. Your previous save is kept.'));
          return value;
        });
      });
  }
  function commit(json, value) {
    sameAccount();
    if (!fits(value)) throw quota();
    try {
      if (localMode) localStorage.setItem(KEY, value);
      else sdk.data.setItem(KEY, value);
    } catch (e) {
      if (localMode && (/quota/i.test(String(e && e.name)) || e.code === 22 || e.code === 1014)) throw quota();
      throw e;
    }
    stored = value; campaign = json;
    if (latest === json) latest = null;
    var button = document.getElementById('btn-continue');
    if (button) button.classList.remove('hidden');
  }
  function pump() {
    if (running || !pending) return;
    var job = pending; pending = null; running = true;
    Promise.resolve().then(function () { return pack(job.json); }).then(function (value) {
      if (job.revision !== revision) { job.done(false); return; }
      commit(job.json, value); job.done(true);
    }).catch(function (e) { job.done(false, e); }).then(function () {
      running = false; pump();
    });
  }
  C.init = function (codecs, done) {
    codec = codecs;
    var complete = false;
    var timeout = setTimeout(function () {
      finish(error(FB.T('CrazyGames saves did not connect. Reload to try again.')));
    }, 20000);
    function finish(e) {
      if (complete) return;
      complete = true; clearTimeout(timeout);
      if (e) { locked = true; done(e); return; }
      ready = true; done(null);
    }
    try {
      sdk = window.CrazyGames && window.CrazyGames.SDK;
      if (!sdk || !window.CompressionStream || !window.DecompressionStream) {
        throw error(FB.T('CrazyGames saves require a supported browser and a connection. Reload or update your browser.'));
      }
      // Promises stay inside this platform I/O boundary, outside game simulation.
      sdk.init().then(function () {
        if (complete) return null;
        var current = localMode ? localStorage : sdk.data;
        stored = current.getItem(KEY);
        progression = current.getItem(PROGRESS);
        if (progression) {
          var p = JSON.parse(progression);
          if (!p || p.v !== 1 || !isFinite(p.highestAchievedTier)) throw error(FB.T('CrazyGames progress could not be read. Your data has been kept.'));
        }
        if (!localMode && sdk.user && sdk.user.isUserAccountAvailable) {
          sdk.user.addAuthListener(function () {
            // The SDK reloads Data Module games on login. Block old-page writes first.
            locked = true; revision++;
          });
        }
        return stored ? unpack(stored).then(function (json) { campaign = valid(json); }) : null;
      }).then(function () { finish(null); }).catch(finish);
    } catch (e) { finish(e); }
  };
  C.read = function () { return campaign; };
  C.progress = function () { return progression; };
  C.setProgress = function (value) {
    sameAccount();
    var current = localMode ? localStorage : sdk.data;
    if (value === null) current.removeItem(PROGRESS);
    else current.setItem(PROGRESS, value);
    progression = value;
  };
  C.write = function (json, done) {
    try { sameAccount(); valid(json); }
    catch (e) { done(false, e); return false; }
    revision++; latest = json;
    if (pending) pending.done(false);
    pending = { json:json, done:done, revision:revision };
    pump(); return true;
  };
  C.flush = function (json) {
    // Page exit cannot await gzip. Use the existing verified synchronous codec if it fits.
    sameAccount(); valid(json);
    var body = codec.encode(json);
    if (codec.decode(body) !== json) throw error(FB.T('Save compression failed. Your previous save is kept.'));
    if (!fits('FBL1.' + body)) return false;
    revision++;
    if (pending) { pending.done(false); pending = null; }
    commit(json, 'FBL1.' + body); return true;
  };
  C.flushLatest = function () { if (latest) return C.flush(latest); return true; };
  C.remove = function () {
    sameAccount();
    if (localMode) localStorage.removeItem(KEY);
    else sdk.data.removeItem(KEY);
    revision++;
    if (pending) { pending.done(false); pending = null; }
    stored = null; campaign = null; latest = null;
  };
  C.usage = function () {
    if (localMode) return 2 * (KEY.length + (stored || '').length +
      PROGRESS.length + (progression || '').length);
    var record = {}; if (stored !== null) record[KEY] = stored;
    if (progression !== null) record[PROGRESS] = progression;
    return bytes(JSON.stringify(record));
  };
  C.backend = function () { return localMode ? 'localstorage' : 'crazygames'; };
  var playing = false;
  C.gameplay = function (active) {
    if (!ready || locked || playing === active) return;
    try {
      if (active) sdk.game.gameplayStart(); else sdk.game.gameplayStop();
      playing = active;
    } catch (e) { /* telemetry must not prevent play or saving */ }
  };
}());
