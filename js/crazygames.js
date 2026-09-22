/* CrazyGames storage boundary. Inert in every other distribution. */
(function () {
  'use strict';
  if (!FB.platform.isCrazyGames) return;
  var C = FB.crazySave = {};
  var KEY = 'fb_cg_campaign_v1', PROGRESS = 'fb_cg_progression_v1';
  var LIMIT = 1048576, RESERVE = 4096;
  var sdk = null, ready = false, locked = false, revision = 0;
  var stored = null, campaign = null, progression = null, codec = null;
  var pending = null, running = false, latest = null;
  function error(text) { return new Error(text); }
  function quota() { return error(FB.T('CrazyGames save space is full. Your previous save is kept. Download this life from Save game to preserve it.')); }
  function sameAccount() {
    if (!ready || locked) throw error(FB.T('CrazyGames saves are unavailable. Reload the game to reconnect.'));
    if (sdk.data.getItem(KEY) !== stored || sdk.data.getItem(PROGRESS) !== progression) {
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
  function unzip(value) {
    var binary = atob(value), a = new Uint8Array(binary.length);
    for (var i = 0; i < a.length; i++) a[i] = binary.charCodeAt(i);
    return new Response(new Blob([a]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  function unpack(raw) {
    if (raw.indexOf('FBG1.') === 0) return unzip(raw.slice(5));
    if (raw.indexOf('FBL1.') === 0) return Promise.resolve(codec.decode(raw.slice(5)));
    return Promise.reject(error(FB.T('The CrazyGames save format is unsupported. Your saved data has been kept.')));
  }
  function pack(json) {
    return new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')))
      .arrayBuffer().then(function (buffer) {
        var value = 'FBG1.' + base64(buffer);
        return unpack(value).then(function (decoded) {
          if (decoded !== json) throw error(FB.T('Save compression failed. Your previous save is kept.'));
          return value;
        });
      });
  }
  function commit(json, value) {
    sameAccount();
    if (!fits(value)) throw quota();
    sdk.data.setItem(KEY, value);
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
        stored = sdk.data.getItem(KEY);
        progression = sdk.data.getItem(PROGRESS);
        if (progression) {
          var p = JSON.parse(progression);
          if (!p || p.v !== 1 || !isFinite(p.highestAchievedTier)) throw error(FB.T('CrazyGames progress could not be read. Your data has been kept.'));
        }
        if (sdk.user && sdk.user.isUserAccountAvailable) {
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
    if (value === null) sdk.data.removeItem(PROGRESS);
    else sdk.data.setItem(PROGRESS, value);
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
    sdk.data.removeItem(KEY);
    revision++;
    if (pending) { pending.done(false); pending = null; }
    stored = null; campaign = null; latest = null;
  };
  C.usage = function () {
    var record = {}; if (stored !== null) record[KEY] = stored;
    if (progression !== null) record[PROGRESS] = progression;
    return bytes(JSON.stringify(record));
  };
  var playing = false;
  C.gameplay = function (active) {
    if (!ready || locked || playing === active) return;
    try {
      if (active) sdk.game.gameplayStart(); else sdk.game.gameplayStop();
      playing = active;
    } catch (e) { /* telemetry must not prevent play or saving */ }
  };
}());
