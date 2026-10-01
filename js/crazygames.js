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
  var recovery = null, sdkReady = false, wantedPlaying = false;
  function error(text) { return new Error(text); }
  function quota() { return error(FB.T('CrazyGames save space is full. Your previous save is kept. Download this life from Save game to preserve it.')); }
  function sameAccount() {
    if (!ready || locked) throw error(FB.T('CrazyGames saves are unavailable. Reload the game to reconnect.'));
    if (recovery && (recovery.campaign || recovery.unavailable)) throw error(recovery.message);
    checkStored();
  }
  function checkStored() {
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
      while (bits >= 8 && at < length) {
        bits -= 8;
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
    if (/^FBG[12]\./.test(raw) && !window.DecompressionStream) {
      var unsupported = error(FB.T('This browser cannot open this compressed save. Update your browser or download the recovery file before resetting it.'));
      unsupported.unsupported = true;
      return Promise.reject(unsupported);
    }
    if (raw.indexOf('FBG2.') === 0) return unzipBytes(unpack15(raw.slice(5)));
    if (raw.indexOf('FBG1.') === 0) return unzip(raw.slice(5));
    if (raw.indexOf('FBL2.') === 0) return Promise.resolve(codec.decodeStored(raw.slice(5)));
    if (raw.indexOf('FBL1.') === 0) return Promise.resolve(codec.decode(raw.slice(5)));
    return Promise.reject(error(FB.T('The CrazyGames save format is unsupported. Your saved data has been kept.')));
  }
  function canGzip() { return !!(window.CompressionStream && window.DecompressionStream); }
  function packSync(json) {
    var body = localMode ? codec.encodeStored(json) : codec.encode(json);
    var decoded = localMode ? codec.decodeStored(body) : codec.decode(body);
    if (decoded !== json) throw error(FB.T('Save compression failed. Your previous save is kept.'));
    return (localMode ? 'FBL2.' : 'FBL1.') + body;
  }
  function pack(json) {
    if (!canGzip()) return Promise.resolve(packSync(json));
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
    if (value === stored) return;
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
  function cancelPending() {
    revision++;
    var job = pending; pending = null;
    if (job) job.done(false);
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
  function connectSdk(done) {
    var complete = false;
    var timeout = setTimeout(function () {
      finish(error(FB.T('CrazyGames saves did not connect. Reload to try again.')));
    }, 20000);
    function finish(e) {
      if (complete) return;
      complete = true; clearTimeout(timeout);
      if (!e) { sdkReady = true; C.gameplay(wantedPlaying); }
      done(e || null);
    }
    try {
      sdk = window.CrazyGames && window.CrazyGames.SDK;
      if (!sdk) throw error(FB.T('CrazyGames could not connect. Reload to try again.'));
      // Promises stay inside this platform I/O boundary, outside game simulation.
      sdk.init().then(function () {
        if (complete) return;
        if (!localMode && sdk.user && sdk.user.isUserAccountAvailable) {
          sdk.user.addAuthListener(function () {
            // The SDK reloads Data Module games on login. Block old-page writes first.
            locked = true; revision++;
          });
        }
        finish(null);
      }).catch(finish);
    } catch (e) { finish(e); }
  }
  C.init = function (codecs, done) {
    codec = codecs;
    function issue(kind, e) {
      if (!recovery) recovery = { message:e.message };
      recovery[kind] = true;
      if (kind === 'campaign') recovery.message = e.message;
      if (e.unsupported) { recovery.unsupported = true; recovery.message = e.message; }
    }
    function hydrated(e) {
      if (!localMode && e) { locked = true; done(e); return; }
      if (e) issue('campaign', e.unsupported ? e : error(FB.T('The saved campaign could not be read. Its original data has been kept.')));
      ready = true; done(null);
    }
    function hydrate() {
      try {
        var current = localMode ? localStorage : sdk.data;
        stored = current.getItem(KEY);
        progression = current.getItem(PROGRESS);
      } catch (e) {
        if (!localMode) { hydrated(e); return; }
        issue('unavailable', error(FB.T('This browser is blocking save storage. You can play, but download your life from Save game to keep it.')));
        hydrated(); return;
      }
      try {
        if (progression !== null) {
          var p = JSON.parse(progression);
          if (!p || p.v !== 1 || typeof p.highestAchievedTier !== 'number' ||
              !isFinite(p.highestAchievedTier)) throw error(FB.T('Your starting-rank record could not be read. Your campaign has been kept.'));
        }
      } catch (e) {
        if (!localMode) { hydrated(e); return; }
        issue('progression', error(FB.T('Your starting-rank record could not be read. Your campaign has been kept.')));
      }
      // Starting a new life never overwrites an unreadable record implicitly.
      Promise.resolve().then(function () {
        return stored !== null ? unpack(stored).then(function (json) { campaign = valid(json); }) : null;
      }).then(function () { hydrated(); }, hydrated);
    }
    if (!localMode) {
      connectSdk(function (e) { if (e) hydrated(e); else hydrate(); });
      return;
    }
    // APS local saves do not depend on SDK telemetry or its network request.
    if (window.CrazyGames && window.CrazyGames.SDK) connectSdk(function () {});
    else {
      var script = document.querySelector('script[src="https://sdk.crazygames.com/crazygames-sdk-v3.js"]');
      if (script) script.addEventListener('load', function () { connectSdk(function () {}); });
    }
    hydrate();
  };
  C.read = function () { return campaign; };
  C.progress = function () { return recovery && recovery.progression ? null : progression; };
  C.available = function () { return ready && !locked && !(recovery && (recovery.campaign || recovery.unavailable)); };
  C.recovery = function () {
    return recovery ? { message:recovery.message, campaign:!!recovery.campaign,
      progression:!!recovery.progression, unsupported:!!recovery.unsupported,
      unavailable:!!recovery.unavailable } : null;
  };
  C.recoveryText = function () {
    var records = {};
    if (recovery && recovery.campaign) records[KEY] = stored;
    if (recovery && recovery.progression) records[PROGRESS] = progression;
    return JSON.stringify({ format:'fallowborn-storage-recovery', v:1, records:records });
  };
  C.resetRecovery = function (discard) {
    if (!localMode || !recovery || recovery.unavailable || locked) return false;
    checkStored();
    if (!discard) {
      try {
        var backup = 'fb_cg_aps_recovery_v1', suffix = 0, value = C.recoveryText();
        while (localStorage.getItem(backup) !== null && localStorage.getItem(backup) !== value) {
          backup = 'fb_cg_aps_recovery_v1_' + (++suffix);
        }
        localStorage.setItem(backup, value);
        if (localStorage.getItem(backup) !== value) throw error(FB.T('The recovery backup could not be verified.'));
      } catch (e) {
        var failure = error(FB.T('A browser backup could not be stored. The original records are unchanged. Download or copy the recovery file before resetting without a backup.'));
        failure.backupFailed = true; throw failure;
      }
    }
    if (recovery.campaign) {
      localStorage.removeItem(KEY); stored = null; campaign = null; recovery.campaign = false;
    }
    if (recovery.progression) {
      localStorage.removeItem(PROGRESS); progression = null; recovery.progression = false;
    }
    // The UI reloads after reset. Old in-memory play must not recreate these records.
    cancelPending(); latest = null; locked = true;
    return true;
  };
  C.setProgress = function (value) {
    sameAccount();
    if (recovery && recovery.progression) throw error(recovery.message);
    var current = localMode ? localStorage : sdk.data;
    if (value === null) current.removeItem(PROGRESS);
    else current.setItem(PROGRESS, value);
    progression = value;
  };
  C.write = function (json, done) {
    try { sameAccount(); valid(json); }
    catch (e) { done(false, e); return false; }
    cancelPending(); latest = json;
    if (json === campaign && (!canGzip() || /^FBG[12]\./.test(stored))) {
      latest = null; done(true); return true;
    }
    pending = { json:json, done:done, revision:revision };
    pump(); return true;
  };
  C.flush = function (json, compactAfter) {
    // Hidden mobile pages may never receive pagehide. Keep a synchronous checkpoint.
    sameAccount(); valid(json);
    if (json !== campaign) {
      var value = packSync(json);
      if (!fits(value)) return false;
      // A failed fallback must leave a smaller, pending gzip write alive.
      commit(json, value);
      cancelPending(); latest = null;
    } else if (latest && latest !== json) { cancelPending(); latest = null; }
    if (compactAfter && localMode && canGzip() && stored.indexOf('FBG2.') !== 0 && latest !== json) {
      C.write(json, function () { /* the synchronous checkpoint is already durable */ });
    }
    return true;
  };
  C.flushLatest = function (compactAfter) { if (latest) return C.flush(latest, compactAfter); return true; };
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
    wantedPlaying = active;
    if (!sdkReady || playing === active) return;
    try {
      if (active) sdk.game.gameplayStart(); else sdk.game.gameplayStop();
      playing = active;
    } catch (e) { /* telemetry must not prevent play or saving */ }
  };
}());
