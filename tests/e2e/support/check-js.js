'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const gameRoot = path.resolve(__dirname, '..', '..', '..');
const roots = [
  path.join(gameRoot, 'data'),
  path.join(gameRoot, 'js'),
  path.join(gameRoot, 'mods'),
  path.join(gameRoot, 'tests', 'e2e')
];
const ignoredDirectories = new Set([
  'blob-report',
  'node_modules',
  'playwright-report',
  'test-results'
]);

function collect(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute, files);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(absolute);
  }
}

const files = [path.join(gameRoot, 'sw.js')];
for (const root of roots) collect(root, files);
files.sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    process.exit(result.status || 1);
  }
}

process.stdout.write('Syntax checked ' + files.length + ' JavaScript files.\n');
