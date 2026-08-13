'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('node:vm');

const workerPath = path.resolve(__dirname, '..', '..', '..', 'sw.js');
const workerSource = fs.readFileSync(workerPath, 'utf8');

function workerHarness(cachedIndex, cachedMusic) {
  const listeners = {};
  const puts = [];
  const deletedCaches = [];
  const clientMessages = [];
  let cacheNames = [];
  let fetchRequest = function () {
    return Promise.reject(new Error('Network unavailable'));
  };
  const cache = {
    addAll: function () {
      return Promise.resolve();
    },
    match: function (request) {
      return Promise.resolve(request === '/index.html' ? cachedIndex : undefined);
    },
    put: function (request, response) {
      puts.push({ request:request, response:response });
      if (request === '/index.html') cachedIndex = response;
      return Promise.resolve();
    }
  };
  const musicCache = {
    match:function () {
      return Promise.resolve(cachedMusic);
    },
    put:function (request, response) {
      cachedMusic = response;
      puts.push({ request:request, response:response, cache:'music' });
      return Promise.resolve();
    }
  };
  const sandbox = {
    URL:URL,
    encodeURIComponent:encodeURIComponent,
    Promise:Promise,
    caches:{
      open:function (name) {
        return Promise.resolve(name === 'fallowborn-music-v1' ? musicCache : cache);
      },
      keys:function () {
        return Promise.resolve(cacheNames.slice());
      },
      delete:function (name) {
        deletedCaches.push(name);
        return Promise.resolve(true);
      }
    },
    fetch:function (request) {
      return fetchRequest(request);
    },
    self:{
      location:{ origin:'https://play.fallowborn.com' },
      clients:{
        claim:function () {
          return Promise.resolve();
        }
      },
      skipWaiting:function () {
        return Promise.resolve();
      },
      addEventListener:function (type, handler) {
        listeners[type] = handler;
      }
    }
  };

  vm.runInNewContext(workerSource, sandbox, { filename:workerPath });

  return {
    cachedIndex:function () {
      return cachedIndex;
    },
    dispatchNavigation:function () {
      let responsePromise = null;
      listeners.fetch({
        request:{
          method:'GET',
          mode:'navigate',
          url:'https://play.fallowborn.com/'
        },
        respondWith:function (promise) {
          responsePromise = Promise.resolve(promise);
        }
      });
      assert.ok(responsePromise, 'the worker must handle same-origin navigation');
      return responsePromise;
    },
    dispatchMusic:function (range) {
      let responsePromise = null;
      listeners.fetch({
        request:{
          method:'GET',
          mode:'cors',
          url:'https://play.fallowborn.com/music/christian/all/folk/001-song.opus',
          headers:{
            get:function (name) {
              return name.toLowerCase() === 'range' ? range || null : null;
            }
          }
        },
        respondWith:function (promise) {
          responsePromise = Promise.resolve(promise);
        }
      });
      assert.ok(responsePromise, 'the worker must handle same-origin Opus audio');
      return responsePromise;
    },
    dispatchActivate:function () {
      let completion = null;
      listeners.activate({
        waitUntil:function (promise) { completion = Promise.resolve(promise); }
      });
      assert.ok(completion, 'the worker must handle activation');
      return completion;
    },
    dispatchMessage:function (data) {
      listeners.message({
        data:data,
        source:{
          postMessage:function (message) { clientMessages.push(message); }
        }
      });
    },
    clientMessages:clientMessages,
    deletedCaches:deletedCaches,
    puts:puts,
    setFetch:function (handler) {
      fetchRequest = handler;
    },
    setCacheNames:function (names) {
      cacheNames = names.slice();
    }
  };
}

test('online navigation preserves the last complete offline HTML until install',
  async function () {
    const releaseA = { id:'release-a', ok:true };
    const releaseB = {
      id:'release-b',
      ok:true,
      clone:function () {
        return { id:this.id, ok:this.ok };
      }
    };
    const harness = workerHarness(releaseA);

    harness.setFetch(function () {
      return Promise.resolve(releaseB);
    });
    assert.strictEqual(await harness.dispatchNavigation(), releaseB);
    assert.equal(harness.puts.length, 0);
    assert.strictEqual(harness.cachedIndex(), releaseA);

    harness.setFetch(function () {
      return Promise.reject(new Error('Network unavailable'));
    });
    assert.strictEqual(await harness.dispatchNavigation(), releaseA);
    assert.strictEqual(harness.cachedIndex(), releaseA);
  });

test('music is cache-first, Range requests bypass storage, and activation preserves it',
  async function () {
    const cachedTrack = { id:'cached-track', ok:true, status:200 };
    const networkTrack = { id:'network-range', ok:true, status:206 };
    const harness = workerHarness({ id:'release-a', ok:true }, cachedTrack);
    let networkRequests = 0;
    harness.setFetch(function () {
      networkRequests++;
      return Promise.resolve(networkTrack);
    });

    assert.strictEqual(await harness.dispatchMusic(null), cachedTrack);
    assert.equal(networkRequests, 0);
    assert.strictEqual(await harness.dispatchMusic('bytes=0-1023'), networkTrack);
    assert.equal(networkRequests, 1);

    harness.setCacheNames([
      'fallowborn-offline-old-release',
      'fallowborn-offline-__FB_CACHE_KEY__',
      'fallowborn-music-v1'
    ]);
    await harness.dispatchActivate();
    assert.deepEqual(harness.deletedCaches, ['fallowborn-offline-old-release']);
  });

test('the worker reports its stamped build key to a controlled page', function () {
  const harness = workerHarness({ id:'release-a', ok:true });

  harness.dispatchMessage({ type:'unrelated-message' });
  assert.equal(harness.clientMessages.length, 0);

  harness.dispatchMessage({ type:'fallowborn-build-key-request' });
  assert.equal(harness.clientMessages.length, 1);
  assert.equal(harness.clientMessages[0].type, 'fallowborn-build-key-response');
  assert.equal(harness.clientMessages[0].buildKey, '__FB_CACHE_KEY__');
});
