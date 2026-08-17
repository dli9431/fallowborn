'use strict';

const path = require('path');
const { fileURLToPath } = require('url');

const gameRoot = path.resolve(__dirname, '..', '..', '..');
const servedOrigin = 'http://127.0.0.1:4173';
const runtimeRootFiles = new Set(['index.html', 'LICENSE']);
const runtimeDirectories = new Set([
  'css',
  'data',
  'docs',
  'js',
  'music',
  'mods',
  'static'
]);

function runtimePathAllowed(relativePath) {
  let normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) normalized = 'index.html';
  const parts = normalized.split('/');
  if (!normalized || parts.includes('..') || parts.includes('.')) return false;
  if (parts.length === 1) return runtimeRootFiles.has(parts[0]);
  return runtimeDirectories.has(parts[0]);
}

function requestAllowed(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (error) {
    return false;
  }
  if (url.protocol === 'about:' || url.protocol === 'blob:' ||
      url.protocol === 'data:') return true;
  if (url.protocol === 'file:') {
    let absolute;
    try {
      absolute = fileURLToPath(url);
    } catch (error) {
      return false;
    }
    const relative = path.relative(gameRoot, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
    return runtimePathAllowed(relative);
  }
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    return url.origin === servedOrigin && runtimePathAllowed(url.pathname);
  }
  return false;
}

function installPageGuards(page) {
  const faults = [];
  const seen = new Set();

  function record(kind, detail) {
    const message = kind + ': ' + detail;
    if (!seen.has(message)) {
      seen.add(message);
      faults.push(message);
    }
  }

  page.on('pageerror', function (error) {
    record('page exception', error && error.stack ? error.stack : String(error));
  });
  page.on('console', function (message) {
    if (message.type() === 'error') record('console error', message.text());
  });
  page.on('request', function (request) {
    if (!requestAllowed(request.url())) {
      record('unexpected network request', request.method() + ' ' + request.url());
    }
  });
  page.on('requestfailed', function (request) {
    const failure = request.failure();
    record('failed request', request.url() + ' - ' +
      (failure && failure.errorText ? failure.errorText : 'unknown failure'));
  });
  page.on('response', function (response) {
    if (response.status() >= 400) {
      record('HTTP error', response.status() + ' ' + response.url());
    }
  });

  return {
    faults: faults
  };
}

module.exports = {
  installPageGuards:installPageGuards,
  requestAllowed:requestAllowed,
  runtimePathAllowed:runtimePathAllowed
};
