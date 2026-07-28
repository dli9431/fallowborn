'use strict';

const path = require('path');
const { fileURLToPath } = require('url');
const { test: base, expect } = require('@playwright/test');

const gameRoot = path.resolve(__dirname, '..', '..', '..');
const servedOrigin = 'http://127.0.0.1:4173';
const runtimeRootFiles = new Set(['index.html', 'LICENSE']);
const runtimeDirectories = new Set([
  'css',
  'data',
  'docs',
  'js',
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

async function attachPageDiagnostic(page, testInfo, name) {
  if (page.isClosed()) return;
  let diagnostic;
  try {
    diagnostic = await page.evaluate(function () {
      const screens = Array.from(document.querySelectorAll('.screen')).filter(function (screen) {
        return !screen.classList.contains('hidden');
      }).map(function (screen) {
        return screen.id;
      });
      let save = null;
      if (window.FB && FB.state && FB.save && FB.save.serialize) {
        try {
          save = JSON.parse(FB.save.serialize());
        } catch (error) {
          save = { serializationError: String(error) };
        }
      }
      return {
        url: location.href,
        title: document.title,
        visibleScreens: screens,
        genericModalOpen: !!document.querySelector('#genmodal:not(.hidden)'),
        eventModalOpen: !!document.querySelector('#eventmodal:not(.hidden)'),
        bodyText: (document.body.innerText || '').slice(0, 12000),
        save: save
      };
    });
  } catch (error) {
    diagnostic = {
      url: page.url(),
      diagnosticError: String(error)
    };
  }
  await testInfo.attach(name || 'game-state', {
    body: Buffer.from(JSON.stringify(diagnostic, null, 2), 'utf8'),
    contentType: 'application/json'
  });
}

const test = base.extend({
  page: async function ({ page }, use, testInfo) {
    const guard = installPageGuards(page);
    await use(page);
    const failed = testInfo.status !== testInfo.expectedStatus;
    if (failed || guard.faults.length) {
      await attachPageDiagnostic(page, testInfo, 'game-state');
    }
    expect(guard.faults, 'browser contract faults').toEqual([]);
  }
});

module.exports = {
  test,
  expect,
  attachPageDiagnostic,
  installPageGuards
};
