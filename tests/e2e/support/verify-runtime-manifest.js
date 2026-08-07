'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const commonEntries = [
  'LICENSE',
  'css',
  'data',
  'docs',
  'index.html',
  'js',
  'music',
  'mods',
  'static'
];
const requiredDirectories = new Set([
  'css', 'data', 'docs', 'js', 'music', 'mods', 'static'
]);
const forbiddenNames = new Set([
  '.git',
  '.github',
  'blob-report',
  'i18n',
  'node_modules',
  'playwright-report',
  'test-results',
  'tests'
]);
const forbiddenFiles = new Set([
  'Dockerfile',
  'nginx.conf',
  'package-lock.json',
  'package.json',
  'playwright.config.js'
]);

function fail(message) {
  process.stderr.write('Runtime manifest check failed: ' + message + '\n');
  process.exit(1);
}

const argument = process.argv[2];
if (!argument) fail('pass the staged document-root path as the first argument.');
const target = process.argv[3] || 'auto';
if (!['auto', 'itch', 'play'].includes(target)) {
  fail('target must be auto, itch, or play.');
}
const root = path.resolve(process.cwd(), argument);
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  fail(root + ' is not a directory.');
}

const hasWorker = fs.existsSync(path.join(root, 'sw.js'));
if (target === 'play' && !hasWorker) {
  fail('the play artifact must include sw.js.');
}
if (target === 'itch' && hasWorker) {
  fail('the itch artifact must not include sw.js.');
}
const allowedEntries = commonEntries.concat(
  hasWorker ? ['manifest.webmanifest', 'sw.js'] : []).sort();
const actualEntries = fs.readdirSync(root).sort();
if (JSON.stringify(actualEntries) !== JSON.stringify(allowedEntries)) {
  fail('top-level entries were [' + actualEntries.join(', ') +
    '], expected [' + allowedEntries.join(', ') + '].');
}

for (const entry of allowedEntries) {
  const absolute = path.join(root, entry);
  const stat = fs.statSync(absolute);
  if (requiredDirectories.has(entry) && !stat.isDirectory()) {
    fail(entry + ' must be a directory.');
  }
  if (!requiredDirectories.has(entry) && !stat.isFile()) {
    fail(entry + ' must be a file.');
  }
}

function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (forbiddenNames.has(entry.name) || forbiddenFiles.has(entry.name) ||
        /^npm-debug\.log/.test(entry.name)) {
      fail('development artifact found at ' + path.relative(root,
        path.join(directory, entry.name)).replace(/\\/g, '/') + '.');
    }
    if (entry.isDirectory()) inspect(path.join(directory, entry.name));
  }
}
inspect(root);

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const assetPattern = /(?:src|href)="((?:css|data|js|mods)\/[^"?#]+)([^"]*)"/g;
let match;
const documentAssets = [];
const fingerprints = new Set();
while ((match = assetPattern.exec(html))) {
  documentAssets.push(match[1]);
  if (!/^\?v=[A-Za-z0-9._-]+$/.test(match[2])) {
    fail('unstamped runtime asset URL: ' + match[1] + match[2] + '.');
  }
  fingerprints.add(match[2].slice(3));
}
if (!documentAssets.length) fail('no stamped runtime asset URLs were found in index.html.');
if (fingerprints.size !== 1) {
  fail('index.html must use one deployment fingerprint for every runtime asset.');
}

const musicCatalogPath = path.join(root, 'data', 'music_catalog.js');
if (!fs.existsSync(musicCatalogPath)) fail('data/music_catalog.js is missing.');
const musicData = {};
try {
  vm.runInNewContext(fs.readFileSync(musicCatalogPath, 'utf8'), {
    window:{ FBDATA:musicData },
    FBDATA:musicData
  }, { filename:musicCatalogPath });
} catch (error) {
  fail('data/music_catalog.js could not be evaluated.');
}
const musicCatalog = musicData.musicCatalog;
if (!musicCatalog || musicCatalog.schema !== 1 ||
    !Array.isArray(musicCatalog.tracks) || !Array.isArray(musicCatalog.banks)) {
  fail('data/music_catalog.js has an invalid schema.');
}
const musicRecords = (musicCatalog.intro ? [musicCatalog.intro] : [])
  .concat(musicCatalog.tracks);
const catalogSources = [];
for (const track of musicRecords) {
  if (!track || typeof track.id !== 'string' ||
      !/^music\/[a-z0-9_/-]+\.opus$/.test(track.src || '') ||
      !/^[a-f0-9]{16}$/.test(track.rev || '') ||
      !Number.isFinite(track.bytes) || track.bytes <= 0 ||
      !Number.isFinite(track.duration) || track.duration <= 0) {
    fail('invalid music catalog track record.');
  }
  const trackPath = path.join(root, ...track.src.split('/'));
  if (!fs.existsSync(trackPath) || !fs.statSync(trackPath).isFile()) {
    fail('cataloged music file is missing: ' + track.src + '.');
  }
  if (fs.statSync(trackPath).size !== track.bytes) {
    fail('cataloged music size differs for ' + track.src + '.');
  }
  catalogSources.push(track.src);
}
const actualMusic = [];
function collectMusic(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectMusic(absolute);
    else if (entry.isFile() && entry.name.endsWith('.opus')) {
      actualMusic.push(path.relative(root, absolute).replace(/\\/g, '/'));
    }
  }
}
collectMusic(path.join(root, 'music'));
if (JSON.stringify(actualMusic.sort()) !== JSON.stringify(catalogSources.slice().sort())) {
  fail('music files and data/music_catalog.js differ.');
}
if (target === 'itch') {
  const gameplayBytes = musicCatalog.tracks.reduce(function (sum, track) {
    return sum + track.bytes;
  }, 0);
  if (gameplayBytes > 200000000) {
    fail('itch gameplay music exceeds the 200,000,000 byte budget.');
  }
}

if (hasWorker) {
  const manifestPath = path.join(root, 'manifest.webmanifest');
  if (!fs.existsSync(manifestPath)) {
    fail('the play artifact must include manifest.webmanifest.');
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail('manifest.webmanifest is not valid JSON.');
  }
  if (manifest.id !== '/' || manifest.start_url !== '/' || manifest.scope !== '/' ||
      manifest.display !== 'standalone' || manifest.name !== 'Fallowborn' ||
      manifest.short_name !== 'Fallowborn' || manifest.background_color !== '#171310' ||
      manifest.theme_color !== '#171310') {
    fail('manifest.webmanifest has invalid identity, scope, display, or colors.');
  }
  const expectedIcons = [
    { src: '/static/icon-192.png', sizes: '192x192', purpose: 'any', pixels: 192 },
    { src: '/static/icon-512.png', sizes: '512x512', purpose: 'any', pixels: 512 },
    {
      src: '/static/icon-maskable-512.png',
      sizes: '512x512',
      purpose: 'maskable',
      pixels: 512
    }
  ];
  if (!Array.isArray(manifest.icons) || manifest.icons.length !== expectedIcons.length) {
    fail('manifest.webmanifest must declare the three install icons.');
  }
  for (const expected of expectedIcons) {
    const icon = manifest.icons.find(function (candidate) {
      return candidate.src === expected.src;
    });
    if (!icon || icon.sizes !== expected.sizes || icon.type !== 'image/png' ||
        icon.purpose !== expected.purpose) {
      fail('manifest icon metadata is invalid for ' + expected.src + '.');
    }
    const iconPath = path.join(root, expected.src.replace(/^\//, ''));
    if (!fs.existsSync(iconPath)) fail('manifest icon is missing: ' + expected.src + '.');
    const png = fs.readFileSync(iconPath);
    const signature = '89504e470d0a1a0a';
    if (png.length < 24 || png.subarray(0, 8).toString('hex') !== signature ||
        png.readUInt32BE(16) !== expected.pixels ||
        png.readUInt32BE(20) !== expected.pixels) {
      fail('manifest icon has the wrong PNG dimensions: ' + expected.src + '.');
    }
  }

  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  if (/__FB_(?:ASSET_LIST|CACHE_KEY)__/.test(worker)) {
    fail('the served service worker still contains a build placeholder.');
  }

  const buildMatch = worker.match(/var BUILD_KEY = '([^']+)';/);
  if (!buildMatch) fail('sw.js has no readable BUILD_KEY.');
  const fingerprint = Array.from(fingerprints)[0];
  if (buildMatch[1] !== fingerprint) {
    fail('sw.js BUILD_KEY ' + buildMatch[1] +
      ' does not match index.html fingerprint ' + fingerprint + '.');
  }

  const versionedMatch = worker.match(
    /var VERSIONED_ASSETS = \[([\s\S]*?)\n\];/);
  if (!versionedMatch) fail('sw.js has no readable VERSIONED_ASSETS array.');
  const versionedAssets = [];
  const workerAssetPattern = /'([^']+)'/g;
  let workerMatch;
  while ((workerMatch = workerAssetPattern.exec(versionedMatch[1]))) {
    versionedAssets.push(workerMatch[1]);
  }
  if (!versionedAssets.length) fail('sw.js has an empty VERSIONED_ASSETS array.');
  if (new Set(versionedAssets).size !== versionedAssets.length) {
    fail('sw.js VERSIONED_ASSETS contains duplicate paths.');
  }
  for (const asset of versionedAssets) {
    if (!/^\/(?:css|data|js|mods)\/[^?#]+$/.test(asset) &&
        !/^\/music\/intro\/[a-z0-9-]+\.opus$/.test(asset)) {
      fail('invalid service-worker asset path: ' + asset + '.');
    }
  }

  const expectedAssets = documentAssets.map(function (asset) {
    return '/' + asset;
  });
  for (const filename of fs.readdirSync(path.join(root, 'data')).sort()) {
    if (/^lang_[^/]+\.js$/.test(filename)) {
      expectedAssets.push('/data/' + filename);
    }
  }
  if (musicCatalog.intro) expectedAssets.push('/' + musicCatalog.intro.src);
  const expectedUnique = Array.from(new Set(expectedAssets)).sort();
  const actualUnique = versionedAssets.slice().sort();
  if (JSON.stringify(actualUnique) !== JSON.stringify(expectedUnique)) {
    const missing = expectedUnique.filter(function (asset) {
      return !actualUnique.includes(asset);
    });
    const extra = actualUnique.filter(function (asset) {
      return !expectedUnique.includes(asset);
    });
    fail('sw.js asset list differs from index.html plus language catalogs' +
      (missing.length ? '; missing [' + missing.join(', ') + ']' : '') +
      (extra.length ? '; extra [' + extra.join(', ') + ']' : '') + '.');
  }

  const staticMatch = worker.match(/var STATIC_ASSETS = \[([\s\S]*?)\n\];/);
  if (!staticMatch) fail('sw.js has no readable STATIC_ASSETS array.');
  const requiredStatic = [
    '/index.html',
    '/manifest.webmanifest',
    '/static/apple-touch-icon.png',
    '/static/favicon-32.png',
    '/static/icon-192.png',
    '/static/icon-512.png',
    '/static/icon-maskable-512.png'
  ];
  for (const asset of requiredStatic) {
    if (!staticMatch[1].includes("'" + asset + "'")) {
      fail('sw.js does not precache required static asset ' + asset + '.');
    }
  }
}

process.stdout.write('Verified runtime manifest at ' + root + ' (' +
  documentAssets.length + ' stamped asset URLs' +
  (hasWorker ? ', offline worker complete' : '') + ').\n');
