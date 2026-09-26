'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'js/crazygames.js', 'js/save.js', 'js/main.js',
  'js/ui_misc.js', 'js/ui_modals.js', 'js/util.js', 'js/mods.js']);
const { test, expect } = require('../support/fixture');
const { openGame, targetUrl } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { mockCrazyGames } = require('../support/crazygames');
async function boot(page, testInfo, options) {
  await mockCrazyGames(page, options);
  await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
  await openCrazyGame(page, testInfo);
}
async function openCrazyGame(page, testInfo) {
  await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  const silent = page.locator('#music-choice-silent');
  if (await silent.isVisible()) await silent.click();
  await expect(page.locator('#btn-newgame')).toContainText('Play as Osric');
}
async function save(page) {
  return page.evaluate(function () {
    return new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
  });
}

test('CrazyGames saves a campaign and earned starts across reload without local slot writes', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.state.player.gold = 4321;
    FB.startProgression.noteTier(3);
    localStorage.setItem('fb_auto', 'unrelated local save');
  });
  expect(await save(page)).toBe(true);
  expect(await page.evaluate(function () { return FB.save.storageBackend(); })).toBe('crazygames');
  expect(await page.evaluate(function () { return window.__cgTest.data.fb_cg_campaign_v1.slice(0,5); })).toBe('FBG1.');
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  const result = await page.evaluate(function () {
    return { gold:FB.save.read('auto').state.player.gold,
      tier:FB.startProgression.snapshot().highestAchievedTier,
      local:localStorage.getItem('fb_auto'), manual:FB.save.hasSlot(1) };
  });
  expect(result).toEqual({ gold:4321, tier:3, local:'unrelated local save', manual:false });
});

test('CrazyGames manual UI uses Continue and preserves the previous save on SDK rejection', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const previous = await page.evaluate(function () { return window.__cgTest.data.fb_cg_campaign_v1; });
  await page.evaluate(function () { window.__cgTest.failWrite = true; FB.state.player.gold += 10; FB.ui.showSaveLoad(true); });
  await expect(page.locator('[data-slot]')).toHaveCount(1);
  await page.locator('[data-slot="auto"]').click();
  await expect(page.locator('#toasts')).toContainText('previous save is kept');
  expect(await page.evaluate(function () { return window.__cgTest.data.fb_cg_campaign_v1; })).toBe(previous);
  await expect(page.locator('#sl-export')).toBeVisible();
  expect(await page.evaluate(function () { return FB.save.exportState().slice(0,5); })).toBe('FBS2.');
});

test('CrazyGames refuses oversized data before SDK mutation and preserves gameplay state', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(async function () {
    var previous = window.__cgTest.data.fb_cg_campaign_v1;
    var snapshot = JSON.parse(FB.save.serialize());
    var words = [], seed = 931;
    for (var i = 0; i < 400000; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; words.push(seed.toString(16)); }
    snapshot.state.capacityProbe = words.join('');
    var beforeCalls = window.__cgTest.calls.filter(function (c) { return c.indexOf('set:') === 0; }).length;
    var outcome = await new Promise(function (resolve) {
      FB.crazySave.write(JSON.stringify(snapshot), function (ok, error) { resolve({ ok:ok, error:error && error.message }); });
    });
    return { outcome:outcome, preserved:previous === window.__cgTest.data.fb_cg_campaign_v1,
      unchanged:!FB.state.capacityProbe,
      writes:window.__cgTest.calls.filter(function (c) { return c.indexOf('set:') === 0; }).length - beforeCalls };
  });
  expect(result.outcome.ok).toBe(false);
  expect(result.outcome.error).toContain('space is full');
  expect(result.preserved).toBe(true);
  expect(result.unchanged).toBe(true);
  expect(result.writes).toBe(0);
});

test('CrazyGames deletion cancels in-flight saves and keeps unlocked starts', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(async function () {
    FB.startProgression.noteTier(3);
    var writing = new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
    var removed = await new Promise(function (resolve) { FB.save.deleteSaves('all', resolve); });
    await writing;
    FB.save.flushPending();
    return { removed:removed, saved:FB.save.hasAuto(), value:window.__cgTest.data.fb_cg_campaign_v1 || null,
      tier:FB.startProgression.snapshot().highestAchievedTier };
  });
  expect(result).toEqual({ removed:true, saved:false, value:null, tier:3 });
});

test('account change cancels writes from the previous session', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(async function () {
    var before = window.__cgTest.data.fb_cg_campaign_v1;
    FB.state.player.gold += 1;
    var writing = new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
    window.__cgTest.auth({ username:'another-player' });
    var ok = await writing;
    FB.save.flushPending();
    return { ok:ok, preserved:before === window.__cgTest.data.fb_cg_campaign_v1 };
  });
  expect(result).toEqual({ ok:false, preserved:true });
});

async function bootLocal(page, testInfo, options) {
  await mockCrazyGames(page, options);
  await page.addInitScript(function () {
    window.FB_DISTRIBUTION = 'crazygames';
    window.FB_CRAZYGAMES_STORAGE = 'localstorage';
  });
  await openCrazyGame(page, testInfo);
}

test('CrazyGames localStorage mode saves one compressed life and earned starts without SDK data', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.state.player.gold = 4321;
    FB.startProgression.noteTier(3);
  });
  expect(await save(page)).toBe(true);
  const before = await page.evaluate(function () {
    return { backend:FB.save.storageBackend(),
      campaign:localStorage.getItem('fb_cg_aps_campaign_v1').slice(0, 5),
      progression:JSON.parse(localStorage.getItem('fb_cg_aps_progression_v1')).highestAchievedTier,
      sdkInitialized:window.__cgTest.calls.indexOf('init') >= 0,
      sdkDataCalls:window.__cgTest.calls.filter(function (call) { return /^(get|set):/.test(call); }),
      sdkData:window.__cgTest.data };
  });
  expect(before).toEqual({
    backend:'localstorage', campaign:'FBG2.', progression:3,
    sdkInitialized:true, sdkDataCalls:[], sdkData:{}
  });
  const savedJson = await page.evaluate(function () { return FB.crazySave.read(); });
  await page.evaluate(function () { FB.ui.showSaveLoad(true); });
  await expect(page.locator('#gm-body')).toContainText('Automatic Progress Save may back it up');
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  const after = await page.evaluate(function () {
    return { gold:FB.save.read('auto').state.player.gold,
      tier:FB.startProgression.snapshot().highestAchievedTier,
      manual:FB.save.hasSlot(1), backend:FB.save.storageBackend(),
      sdkDataCalls:window.__cgTest.calls.filter(function (call) { return /^(get|set):/.test(call); }) };
  });
  expect(after).toEqual({ gold:4321, tier:3, manual:false, backend:'localstorage', sdkDataCalls:[] });
  expect(await page.evaluate(function () { return FB.crazySave.read(); })).toBe(savedJson);
});

test('CrazyGames localStorage mode migrates a legacy gzip save on the next write', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.state.player.gold = 9876; });
  expect(await save(page)).toBe(true);
  const legacy = await page.evaluate(async function () {
    var json = FB.crazySave.read();
    var buffer = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    var data = new Uint8Array(buffer), chunks = [];
    for (var i = 0; i < data.length; i += 8192) {
      chunks.push(String.fromCharCode.apply(null, data.subarray(i, i + 8192)));
    }
    var value = 'FBG1.' + btoa(chunks.join(''));
    localStorage.setItem('fb_cg_aps_campaign_v1', value);
    return value;
  });
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  expect(await page.evaluate(function () { return FB.save.read('auto').state.player.gold; })).toBe(9876);
  expect(await page.evaluate(function () { return localStorage.getItem('fb_cg_aps_campaign_v1'); })).toBe(legacy);
  await page.evaluate(function () { FB.game.loadSlot('auto'); });
  await page.waitForFunction(function () { return FB.state && FB.state.player.gold === 9876; });
  expect(await save(page)).toBe(true);
  expect(await page.evaluate(function () { return localStorage.getItem('fb_cg_aps_campaign_v1').slice(0, 5); })).toBe('FBG2.');
});

test('CrazyGames keeps a damaged save and offers recovery without blocking the title', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const damaged = await page.evaluate(function () {
    var value = localStorage.getItem('fb_cg_aps_campaign_v1').slice(0, -1);
    localStorage.setItem('fb_cg_aps_campaign_v1', value);
    return value;
  });
  await page.reload();
  await expect(page.locator('#gm-title')).toContainText('Save recovery');
  expect(await page.evaluate(function () { return FB.game.bootReady; })).toBe(true);
  await expect(page.locator('#btn-newgame')).toBeEnabled();
  await expect(page.locator('#btn-save-recovery')).toBeVisible();
  expect(await page.evaluate(function () { return localStorage.getItem('fb_cg_aps_campaign_v1'); })).toBe(damaged);
  expect(await page.locator('#recovery-text').inputValue()).toContain('fallowborn-storage-recovery');
  await page.locator('#recovery-review').click();
  await expect(page.locator('#gm-body')).toContainText('Starting-rank unlocks will be kept');
  await page.locator('#recovery-cancel').click();
  await expect(page.locator('#recovery-text')).toHaveValue(await page.evaluate(function () { return FB.crazySave.recoveryText(); }));
  await page.locator('#recovery-review').click();
  await page.locator('#recovery-reset').click();
  await page.waitForFunction(function () { return FB.game.bootReady && !FB.crazySave.recovery(); });
  const result = await page.evaluate(function () {
    return { campaign:localStorage.getItem('fb_cg_aps_campaign_v1'),
      backup:JSON.parse(localStorage.getItem('fb_cg_aps_recovery_v1')).records.fb_cg_aps_campaign_v1,
      tier:FB.startProgression.snapshot().highestAchievedTier };
  });
  expect(result).toEqual({ campaign:null, backup:damaged, tier:1 });
});

test('CrazyGames localStorage quota rejection retains the last accepted campaign', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(async function () {
    var previous = localStorage.getItem('fb_cg_aps_campaign_v1');
    var previousGold = FB.save.read('auto').state.player.gold;
    var original = Storage.prototype.setItem;
    FB.state.player.gold += 10;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'fb_cg_aps_campaign_v1') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    try {
      var ok = await new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
      return { ok:ok, preserved:localStorage.getItem('fb_cg_aps_campaign_v1') === previous,
        gold:FB.save.read('auto').state.player.gold, previousGold:previousGold,
        sdkDataCalls:window.__cgTest.calls.filter(function (call) { return /^(get|set):/.test(call); }) };
    } finally { Storage.prototype.setItem = original; }
  });
  expect(result.ok).toBe(false);
  expect(result.preserved).toBe(true);
  expect(result.gold).toBe(result.previousGold);
  expect(result.sdkDataCalls).toEqual([]);
  await expect(page.locator('#toasts')).toContainText('previous save is kept');
});

test('packed gzip round-trips every length remainder and crosses chunk and length-header boundaries', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  const result = await page.evaluate(async function () {
    // Legal gzip extra headers vary the compressed byte length independently of
    // the JSON. The actual game encoder/decoder and native gunzip remain in use.
    var Native = window.CompressionStream, extra = 0;
    window.CompressionStream = function (format) {
      var stream = new Native(format), chunks = [], size = 0, count = extra;
      return { writable:stream.writable, readable:stream.readable.pipeThrough(new TransformStream({
        transform:function (chunk) { chunks.push(chunk); size += chunk.length; },
        flush:function (controller) {
          var source = new Uint8Array(size), at = 0;
          chunks.forEach(function (chunk) { source.set(chunk, at); at += chunk.length; });
          var bytes = new Uint8Array(size + 2 + count);
          bytes.set(source.subarray(0, 10)); bytes[3] |= 4;
          bytes[10] = count & 255; bytes[11] = count >>> 8;
          bytes.set(source.subarray(10), 12 + count);
          controller.enqueue(bytes);
        }
      })) };
    };
    var outcomes = [], remainders = [], lengths = [], last;
    try {
      for (var i = 0; i < 18; i++) {
        last = JSON.stringify({ v:3, mods:'crazygames-content-1', state:{ probe:i } });
        var native = await new Response(new Blob([last]).stream().pipeThrough(new Native('gzip'))).arrayBuffer();
        extra = i < 15 ? (i - ((native.byteLength + 2) % 15) + 15) % 15 : [15360, 32768, 65500][i - 15];
        var ok = await new Promise(function (resolve) { FB.crazySave.write(last, resolve); });
        outcomes.push(ok && FB.crazySave.read() === last);
        if (ok) {
          var packed = localStorage.getItem('fb_cg_aps_campaign_v1');
          var length = (packed.charCodeAt(5) - 32) * 32768 + packed.charCodeAt(6) - 32;
          lengths.push(length);
          if (i < 15) remainders.push(length % 15);
        }
      }
    } finally { window.CompressionStream = Native; }
    return { outcomes:outcomes, remainders:remainders, lengths:lengths, last:last };
  });
  expect(result.outcomes).toEqual(Array(18).fill(true));
  expect(result.remainders).toEqual(Array.from({ length:15 }, function (_, i) { return i; }));
  expect(result.lengths[16]).toBeGreaterThan(32768);
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  expect(await page.evaluate(function () { return FB.crazySave.read(); })).toBe(result.last);
});

test('nonzero packed padding is rejected without replacing the original', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  const damaged = await page.evaluate(async function () {
    for (var i = 0; i < 60; i++) {
      var json = JSON.stringify({ v:3, mods:'crazygames-content-1', state:{ probe:'x'.repeat(i) } });
      await new Promise(function (resolve) { FB.crazySave.write(json, resolve); });
      var raw = localStorage.getItem('fb_cg_aps_campaign_v1');
      var length = (raw.charCodeAt(5) - 32) * 32768 + raw.charCodeAt(6) - 32;
      if (length % 15 === 0) continue;
      var corrupt = raw.slice(0, -1) + String.fromCharCode(raw.charCodeAt(raw.length - 1) | 1);
      localStorage.setItem('fb_cg_aps_campaign_v1', corrupt);
      return corrupt;
    }
    throw new Error('No padded gzip fixture found');
  });
  await page.reload();
  await expect(page.locator('#recovery-review')).toBeVisible();
  expect(await page.evaluate(function () { return localStorage.getItem('fb_cg_aps_campaign_v1'); })).toBe(damaged);
});

for (const scenario of [
  { name:'absent', options:{ missingSdk:true } },
  { name:'rejected', options:{ failInit:true } },
  { name:'unresponsive', options:{ hangInit:true } }
]) {
  test('local saves work with an ' + scenario.name + ' SDK', async function ({ page }, testInfo) {
    await bootLocal(page, testInfo, scenario.options);
    await startDeterministicGame(page);
    expect(await save(page)).toBe(true);
    await page.reload();
    await page.waitForFunction(function () { return FB.game.bootReady; });
    expect(await page.evaluate(function () { return !!FB.save.read('auto') && FB.save.available; })).toBe(true);
  });
}

test('late SDK initialization reports the current screen without delaying local saves', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo, { deferInit:true });
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  await page.evaluate(function () { window.__cgTest.resolveInit(); });
  await expect.poll(function () {
    return page.evaluate(function () { return window.__cgTest.calls.filter(function (c) { return c === 'start'; }).length; });
  }).toBe(1);
});

test('missing compression APIs use compact synchronous saves and still read legacy LZ', async function ({ page }, testInfo) {
  await page.addInitScript(function () {
    window.CompressionStream = undefined; window.DecompressionStream = undefined;
  });
  await bootLocal(page, testInfo, { missingSdk:true });
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  expect(await page.evaluate(function () { return localStorage.getItem('fb_cg_aps_campaign_v1').slice(0, 5); })).toBe('FBL2.');
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  expect(await page.evaluate(function () { return !!FB.save.read('auto'); })).toBe(true);
  await page.evaluate(function () { FB.game.loadSlot('auto'); });
  await page.waitForFunction(function () { return !!FB.state; });
  await page.evaluate(function () {
    localStorage.setItem('fb_cg_aps_campaign_v1', 'FBL1.' + FB.save.exportState().slice(5));
  });
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  expect(await page.evaluate(function () { return !!FB.save.read('auto'); })).toBe(true);
});

test('an existing gzip save remains protected when decompression is unavailable', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const before = await page.evaluate(function () {
    FB.state = null; // keep page hiding from deliberately saving a new snapshot
    return localStorage.getItem('fb_cg_aps_campaign_v1');
  });
  await page.addInitScript(function () { window.DecompressionStream = undefined; });
  await page.reload();
  await expect(page.locator('#gm-body')).toContainText('cannot open this compressed save');
  const result = await page.evaluate(function () {
    return { unsupported:FB.crazySave.recovery().unsupported, ready:FB.game.bootReady,
      available:FB.save.available, raw:localStorage.getItem('fb_cg_aps_campaign_v1') };
  });
  expect(result).toEqual({ unsupported:true, ready:true, available:false, raw:before });
});

test('unreadable progression does not block a healthy campaign and recovery resets only progression', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  await page.evaluate(function () { localStorage.setItem('fb_cg_aps_progression_v1', 'broken'); });
  await page.reload();
  await expect(page.locator('#recovery-review')).toBeVisible();
  const result = await page.evaluate(async function () {
    var data = FB.save.read('auto');
    data.state.player.gold = 789;
    var ok = await new Promise(function (resolve) { FB.crazySave.write(JSON.stringify(data), resolve); });
    return { ok:ok, available:FB.save.available, raw:localStorage.getItem('fb_cg_aps_progression_v1') };
  });
  expect(result).toEqual({ ok:true, available:true, raw:'broken' });
  await page.locator('#recovery-review').click();
  await expect(page.locator('#gm-body')).toContainText('The saved campaign will be kept');
  await page.locator('#recovery-reset').click();
  await page.waitForFunction(function () { return FB.game.bootReady && !FB.crazySave.recovery(); });
  expect(await page.evaluate(function () { return FB.save.read('auto').state.player.gold; })).toBe(789);
});

test('failed recovery backup preserves original bytes until an explicit discard', async function ({ page }, testInfo) {
  await page.addInitScript(function () {
    if (!sessionStorage.getItem('__seeded_bad_cg_save')) {
      localStorage.setItem('fb_cg_aps_campaign_v1', 'unreadable');
      sessionStorage.setItem('__seeded_bad_cg_save', '1');
    }
  });
  await bootLocal(page, testInfo);
  await page.locator('#recovery-review').click();
  await page.evaluate(function () {
    var original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.indexOf('fb_cg_aps_recovery_') === 0) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.locator('#recovery-reset').click();
  await expect(page.locator('#recovery-error')).toContainText('original records are unchanged');
  expect(await page.evaluate(function () { return localStorage.getItem('fb_cg_aps_campaign_v1'); })).toBe('unreadable');
  await page.locator('#recovery-discard').click();
  await page.waitForFunction(function () { return FB.game.bootReady && !FB.crazySave.recovery(); });
  expect(await page.evaluate(function () { return localStorage.getItem('fb_cg_aps_campaign_v1'); })).toBeNull();
});

test('blocked localStorage allows unsaved play and file export', async function ({ page }, testInfo) {
  await page.addInitScript(function () {
    Object.defineProperty(window, 'localStorage', { configurable:true,
      get:function () { throw new DOMException('Denied', 'SecurityError'); } });
  });
  await bootLocal(page, testInfo, { missingSdk:true });
  await expect(page.locator('#gm-body')).toContainText('blocking save storage');
  await page.locator('#recovery-back').click();
  await page.locator('#btn-newgame').click();
  await page.waitForFunction(function () { return !!FB.state; });
  expect(await page.evaluate(function () { return FB.save.exportState().slice(0, 5); })).toBe('FBS2.');
  expect(await save(page)).toBe(false);
});

test('tab hiding preserves unchanged gzip and checkpoints changed state before async compaction', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(function () {
    var key = 'fb_cg_aps_campaign_v1', before = localStorage.getItem(key), writes = 0;
    var original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) writes++;
      return original.call(this, name, value);
    };
    Object.defineProperty(document, 'hidden', { configurable:true, value:true });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
      var unchanged = localStorage.getItem(key) === before, unchangedWrites = writes;
      FB.state.player.gold += 321;
      document.dispatchEvent(new Event('visibilitychange'));
      var checkpoint = localStorage.getItem(key);
      var gold = JSON.parse(FB.crazySave.read()).state.player.gold;
      window.dispatchEvent(new Event('pagehide'));
      return { unchanged:unchanged, unchangedWrites:unchangedWrites, checkpoint:checkpoint.slice(0, 5),
        keptOnPagehide:localStorage.getItem(key) === checkpoint, gold:gold, liveGold:FB.state.player.gold };
    } finally { Storage.prototype.setItem = original; delete document.hidden; }
  });
  expect(result).toMatchObject({ unchanged:true, unchangedWrites:0, checkpoint:'FBL2.', keptOnPagehide:true });
  expect(result.gold).toBe(result.liveGold);
  await expect.poll(function () {
    return page.evaluate(function () { return localStorage.getItem('fb_cg_aps_campaign_v1').slice(0, 5); });
  }).toBe('FBG2.');
});

test('a quota-rejected synchronous checkpoint leaves the in-flight gzip save alive', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(async function () {
    FB.state.player.gold += 99;
    var original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'fb_cg_aps_campaign_v1' && value.indexOf('FBL2.') === 0) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    try {
      var writing = new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
      FB.save.flushPending();
      var ok = await writing;
      return { ok:ok, gold:FB.save.read('auto').state.player.gold, liveGold:FB.state.player.gold };
    } finally { Storage.prototype.setItem = original; }
  });
  expect(result.ok).toBe(true);
  expect(result.gold).toBe(result.liveGold);
});

test('pagehide alone saves the pending life in compact LZ and it reloads without gzip support', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  await page.evaluate(function () {
    FB.state.player.gold = 9182;
    FB.save.autosave();
    window.dispatchEvent(new Event('pagehide'));
    FB.state = null;
  });
  expect(await page.evaluate(function () { return localStorage.getItem('fb_cg_aps_campaign_v1').slice(0, 5); })).toBe('FBL2.');
  await page.addInitScript(function () {
    window.CompressionStream = undefined; window.DecompressionStream = undefined;
  });
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  expect(await page.evaluate(function () { return FB.save.read('auto').state.player.gold; })).toBe(9182);
});

test('standard edition never initializes the SDK and retains its manual slots', async function ({ page }, testInfo) {
  await mockCrazyGames(page);
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.ui.showSaveLoad(true); });
  await expect(page.locator('[data-slot]')).toHaveCount(3);
  expect(await page.evaluate(function () { return window.__cgTest.calls; })).toEqual([]);
});

for (const scenario of [
  { name:'failed SDK initialization', options:{ failInit:true }, message:'SDK connection failed' },
  { name:'corrupt cloud data', options:{ data:{ fb_cg_campaign_v1:'broken' } }, message:'saved data has been kept' }
]) {
  test(scenario.name + ' blocks boot without creating local progress', async function ({ page }, testInfo) {
    await mockCrazyGames(page, scenario.options);
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });
    await expect(page.locator('#title-boot-status')).toContainText(scenario.message);
    expect(await page.evaluate(function () { return FB.game.bootReady; })).toBe(false);
    await expect(page.locator('#btn-newgame')).toBeDisabled();
    expect(await page.evaluate(function () {
      return window.__cgTest.calls.filter(function (c) { return c.indexOf('set:') === 0; });
    })).toEqual([]);
  });
}
