'use strict';

const assert = require('node:assert/strict');
const path = require('path');
const test = require('node:test');
const { cc } = require('playwright/lib/common');

const {
  dependsOnRuntime,
  resolveRuntimePath
} = require('./runtime-dependencies');

test('runtime dependency declarations participate in Playwright changed-file selection',
  function () {
    const spec = path.resolve(__dirname, '..', 'specs', 'dependency-fixture.spec.js');
    const world = resolveRuntimePath('js/world.js')[0];

    cc.startCollectingFileDeps();
    cc.stopCollectingFileDeps(spec);
    dependsOnRuntime(spec, ['js/world.js']);

    assert.deepEqual(cc.affectedTestFiles([world]), [spec]);
  });

test('runtime dependency directories expand to their shipped files', function () {
  const dependencies = resolveRuntimePath('js');
  assert.ok(dependencies.length > 1);
  assert.ok(dependencies.includes(resolveRuntimePath('js/main.js')[0]));
  assert.ok(dependencies.includes(resolveRuntimePath('js/world.js')[0]));
});

test('runtime dependencies cannot escape the game root', function () {
  assert.throws(function () {
    resolveRuntimePath('../outside.js');
  }, /must stay inside the game root/i);
});
