'use strict';

const fs = require('fs');
const path = require('path');

const allowedEntries = [
  'LICENSE',
  'css',
  'data',
  'docs',
  'index.html',
  'js',
  'mods',
  'static'
];
const requiredDirectories = new Set(['css', 'data', 'docs', 'js', 'mods', 'static']);
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
const root = path.resolve(process.cwd(), argument);
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  fail(root + ' is not a directory.');
}

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
let assetCount = 0;
while ((match = assetPattern.exec(html))) {
  assetCount++;
  if (!/^\?v=[A-Za-z0-9._-]+$/.test(match[2])) {
    fail('unstamped runtime asset URL: ' + match[1] + match[2] + '.');
  }
}
if (!assetCount) fail('no stamped runtime asset URLs were found in index.html.');

process.stdout.write('Verified runtime manifest at ' + root + ' (' +
  assetCount + ' stamped asset URLs).\n');
