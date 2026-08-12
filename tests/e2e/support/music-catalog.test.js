'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const gameRoot = path.resolve(__dirname, '..', '..', '..');
const tool = path.join(gameRoot, 'tools', 'music_catalog.py');

function oggOpus(seconds, padding) {
  const preSkip = 312;
  const head = Buffer.alloc(19 + padding);
  head.write('OpusHead', 0, 'ascii');
  head[8] = 1;
  head[9] = 2;
  head.writeUInt16LE(preSkip, 10);
  head.writeUInt32LE(48000, 12);
  const segments = [];
  let remaining = head.length;
  while (remaining > 0) {
    const size = Math.min(255, remaining);
    segments.push(size);
    remaining -= size;
  }
  const page = Buffer.alloc(27 + segments.length);
  page.write('OggS', 0, 'ascii');
  page[4] = 0;
  page[5] = 2;
  page.writeBigUInt64LE(BigInt(preSkip + seconds * 48000), 6);
  page.writeUInt32LE(1, 14);
  page.writeUInt32LE(0, 18);
  page[26] = segments.length;
  segments.forEach(function (size, index) { page[27 + index] = size; });
  return Buffer.concat([page, head]);
}

function writeTrack(root, relative, seconds, padding) {
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive:true });
  fs.writeFileSync(destination, oggOpus(seconds, padding));
  return fs.statSync(destination).size;
}

function runTool(root, args) {
  const result = childProcess.spawnSync(process.env.PYTHON || 'python', [tool].concat(args), {
    cwd:root,
    encoding:'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function runToolFailure(root, args) {
  const result = childProcess.spawnSync(process.env.PYTHON || 'python', [tool].concat(args), {
    cwd:root,
    encoding:'utf8'
  });
  assert.notEqual(result.status, 0, result.stdout);
  return result;
}

function readCatalog(filename) {
  const sandbox = { window:{}, FBDATA:{} };
  sandbox.window.FBDATA = sandbox.FBDATA;
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename:filename });
  return JSON.parse(JSON.stringify(sandbox.FBDATA.musicCatalog));
}

test('committed soundtrack provides complete contextual faith banks within itch budget', function () {
  runTool(gameRoot, ['check', '--root', gameRoot]);
  const catalog = readCatalog(path.join(gameRoot, 'data', 'music_catalog.js'));
  const expected = [
    'christian/all/court',
    'christian/all/folk',
    'christian/all/war',
    'muslim/all/court',
    'muslim/all/folk',
    'muslim/all/war',
    'pagan/all/court',
    'pagan/all/folk',
    'pagan/all/war'
  ];

  assert.deepEqual(catalog.intros.map(function (intro) { return intro.faith; }), [
    'christian', 'muslim', 'pagan'
  ]);
  assert.deepEqual(catalog.banks.map(function (bank) { return bank.id; }), expected);
  catalog.banks.forEach(function (bank) {
    const gameplayTracks = catalog.tracks.filter(function (track) {
      return track.bankId === bank.id;
    });
    assert.ok(gameplayTracks.length >= 9, bank.id + ' has fewer than nine gameplay tracks');
    assert.ok(bank.trackIds.includes('intro-fallowborn-' + bank.faith),
      bank.id + ' does not include its faith theme');
  });
  assert.ok(catalog.tracks.reduce(function (sum, track) {
    return sum + track.bytes;
  }, 0) <= 200000000, 'complete gameplay soundtrack exceeds the itch budget');
});

test('catalog generation requires the complete itch soundtrack to fit its budget', function () {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-music-catalog-'));
  try {
    writeTrack(root, 'music/intro/000-fallowborn-christian.opus', 60, 20);
    writeTrack(root, 'music/intro/000-fallowborn-muslim.opus', 70, 30);
    writeTrack(root, 'music/intro/000-fallowborn-pagan.opus', 80, 40);
    const christian = writeTrack(
      root, 'music/christian/all/folk/001-hammer-and-lute.opus', 180, 70);
    const pagan = writeTrack(
      root, 'music/pagan/all/war/001-oaken-shields.opus', 180, 90);
    const muslim = writeTrack(
      root, 'music/muslim/all/court/001-garden-of-stars.opus', 180, 110);

    runTool(root, ['build', '--root', root]);
    runTool(root, ['check', '--root', root]);
    const full = readCatalog(path.join(root, 'data', 'music_catalog.js'));
    assert.equal(full.intro.kind, 'intro');
    assert.deepEqual(full.intros.map(function (intro) { return intro.faith; }), [
      'christian', 'muslim', 'pagan'
    ]);
    assert.equal(full.tracks.length, 3);
    assert.deepEqual(full.banks.map(function (bank) { return bank.id; }), [
      'christian/all/folk',
      'muslim/all/court',
      'pagan/all/war'
    ]);

    const stage = path.join(root, 'stage');
    fs.mkdirSync(path.join(stage, 'data'), { recursive:true });
    fs.writeFileSync(path.join(stage, 'index.html'), '<!doctype html>', 'utf8');
    fs.copyFileSync(path.join(root, 'data', 'music_catalog.js'),
      path.join(stage, 'data', 'music_catalog.js'));
    const budget = christian + pagan + muslim;
    runTool(root, [
      'stage-itch', '--root', root, '--stage', stage, '--budget', String(budget)
    ]);

    const staged = readCatalog(path.join(stage, 'data', 'music_catalog.js'));
    assert.equal(staged.tracks.reduce(function (sum, track) {
      return sum + track.bytes;
    }, 0), budget);
    assert.deepEqual(staged.tracks.map(function (track) { return track.bankId; }), [
      'christian/all/folk',
      'muslim/all/court',
      'pagan/all/war'
    ]);
    staged.intros.forEach(function (intro) {
      assert.equal(fs.existsSync(path.join(stage, intro.src)), true);
    });
    staged.banks.forEach(function (bank) {
      assert.ok(bank.trackIds.includes('intro-fallowborn-' + bank.faith));
    });
    staged.tracks.forEach(function (track) {
      assert.equal(fs.existsSync(path.join(stage, track.src)), true);
    });

    const tooSmallStage = path.join(root, 'too-small-stage');
    fs.mkdirSync(path.join(tooSmallStage, 'data'), { recursive:true });
    fs.writeFileSync(path.join(tooSmallStage, 'index.html'), '<!doctype html>', 'utf8');
    const failure = runToolFailure(root, [
      'stage-itch', '--root', root, '--stage', tooSmallStage,
      '--budget', String(budget - 1)
    ]);
    assert.match(failure.stderr, /complete gameplay soundtrack is .* exceeding the itch budget/);
    assert.equal(fs.existsSync(path.join(tooSmallStage, 'music')), false);
  } finally {
    fs.rmSync(root, { recursive:true, force:true });
  }
});
