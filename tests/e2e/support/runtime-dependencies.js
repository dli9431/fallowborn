'use strict';

const fs = require('fs');
const path = require('path');
const { cc } = require('playwright/lib/common');

const gameRoot = path.resolve(__dirname, '..', '..', '..');

function filesUnder(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  if (!stat.isDirectory()) return [];
  const files = [];
  fs.readdirSync(target, { withFileTypes:true }).forEach(function (entry) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push.apply(files, filesUnder(child));
    } else if (entry.isFile()) {
      files.push(child);
    }
  });
  return files;
}

function resolveRuntimePath(relativePath) {
  const absolute = path.resolve(gameRoot, relativePath);
  const withinRoot = path.relative(gameRoot, absolute);
  if (!withinRoot || withinRoot.startsWith('..') || path.isAbsolute(withinRoot)) {
    throw new Error('Runtime dependency must stay inside the game root: ' + relativePath);
  }
  if (!fs.existsSync(absolute)) {
    throw new Error('Runtime dependency does not exist: ' + relativePath);
  }
  return filesUnder(absolute);
}

function dependsOnRuntime(testFile, relativePaths) {
  const dependencies = [];
  relativePaths.forEach(function (relativePath) {
    dependencies.push.apply(dependencies, resolveRuntimePath(relativePath));
  });
  cc.setExternalDependencies(path.resolve(testFile), dependencies);
}

module.exports = {
  dependsOnRuntime:dependsOnRuntime,
  resolveRuntimePath:resolveRuntimePath
};
