/* Fallowborn offline shell for play.fallowborn.com. */
'use strict';

var CACHE_PREFIX = 'fallowborn-offline-';
var BUILD_KEY = '__FB_CACHE_KEY__';
var CACHE_NAME = CACHE_PREFIX + BUILD_KEY;
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

function navigationResponse(request) {
  return fetch(request).then(function (response) {
    var url = new URL(request.url);
    var isGameEntry = url.pathname === '/' || url.pathname === '/index.html';
    if (!response || !response.ok || !isGameEntry) return response;

    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.put('/index.html', response.clone()).then(function () {
        return response;
      }, function () {
        return response;
      });
    }, function () {
      return response;
    });
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

  event.respondWith(assetResponse(request));
});
