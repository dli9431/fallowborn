/* Fallowborn offline shell for play.fallowborn.com. */
'use strict';

var CACHE_PREFIX = 'fallowborn-offline-';
var BUILD_KEY = '__FB_CACHE_KEY__';
var CACHE_NAME = CACHE_PREFIX + BUILD_KEY;
var MUSIC_CACHE_NAME = 'fallowborn-music-v1';
var VERSION_QUERY = '?v=' + encodeURIComponent(BUILD_KEY);

/* Replaced at build time with one quoted, root-relative path per line, derived
   from index.html and the shipped language catalogs. Left unsubstituted, this
   path 404s, cache.addAll() rejects, and the worker does not activate. */
var VERSIONED_ASSETS = [
  '__FB_ASSET_LIST__'
];

var STATIC_ASSETS = [
  '/index.html',
  '/manifest.webmanifest',
  '/static/favicon-32.png',
  '/static/apple-touch-icon.png',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/icon-maskable-512.png'
];

var PRECACHE_ASSETS = STATIC_ASSETS.concat(VERSIONED_ASSETS.map(function (path) {
  return path + VERSION_QUERY;
}));

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name.indexOf(CACHE_PREFIX) === 0 && name !== CACHE_NAME) {
          return caches.delete(name).then(null, function () {
            return false;
          });
        }
        return Promise.resolve(false);
      }));
    }, function () {
      return [];
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'fallowborn-build-key-request') return;
  if (!event.source || typeof event.source.postMessage !== 'function') return;
  event.source.postMessage({
    type:'fallowborn-build-key-response',
    buildKey:BUILD_KEY
  });
});

function navigationResponse(request) {
  return fetch(request).then(function (response) {
    return response;
  }, function () {
    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.match('/index.html');
    });
  });
}

function assetResponse(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (exact) {
      if (exact) return exact;

      return fetch(request).then(function (response) {
        if (!response || !response.ok) return response;

        return cache.put(request, response.clone()).then(function () {
          return response;
        }, function () {
          return response;
        });
      }, function () {
        return cache.match(request, { ignoreSearch: true }).then(function (fallback) {
          if (fallback) return fallback;
          return Promise.reject(new Error('Offline asset is not cached'));
        });
      });
    }, function () {
      return fetch(request);
    });
  }, function () {
    return fetch(request);
  });
}

function musicResponse(request) {
  /* The player requests complete files before creating Blob URLs. A direct
     media Range request is left to the network instead of storing a partial
     206 response as though it were the complete song. */
  if (request.headers && request.headers.get('range')) return fetch(request);
  return caches.open(MUSIC_CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) return cached;
      return caches.open(CACHE_NAME).then(function (appCache) {
        return appCache.match(request, { ignoreSearch:true });
      }).then(function (bundled) {
        if (bundled) {
          return cache.put(request, bundled.clone()).then(function () {
            return bundled;
          }, function () {
            return bundled;
          });
        }
        return fetch(request).then(function (response) {
          if (!response || !response.ok || response.status !== 200) return response;
          return cache.put(request, response.clone()).then(function () {
            return response;
          }, function () {
            return response;
          });
        });
      });
    });
  }, function () {
    return fetch(request);
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url;

  if (request.method !== 'GET') return;

  url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (/\/music\/.*\.opus$/i.test(url.pathname)) {
    event.respondWith(musicResponse(request));
    return;
  }

  event.respondWith(assetResponse(request));
});
