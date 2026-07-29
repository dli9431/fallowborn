'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('node:vm');

const workerPath = path.resolve(__dirname, '..', '..', '..', 'sw.js');
const workerSource = fs.readFileSync(workerPath, 'utf8');

function workerHarness(cachedIndex) {
  const listeners = {};
  const puts = [];
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
  const sandbox = {
    URL:URL,
    encodeURIComponent:encodeURIComponent,
    Promise:Promise,
    caches:{
      open:function () {
        return Promise.resolve(cache);
      },
      keys:function () {
        return Promise.resolve([]);
      },
      delete:function () {
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
    puts:puts,
    setFetch:function (handler) {
      fetchRequest = handler;
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
