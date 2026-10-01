'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { STRING_MARK, scanSource } = require('./source-literals');

function values(text) {
  return scanSource(text).literals.map(function (literal) {
    return literal.value;
  });
}

test('string literals are decoded and comments are ignored', function () {
  assert.deepEqual(values([
    "var a = 'farmer'; // 'commented'",
    '/* "also commented" */ var b = "it\\u2019s" + \'\\x41\\n\';',
    "var c = 'don\\'t';"
  ].join('\n')), ['farmer', 'it’s', 'A\n', 'don\'t']);
});

test('regular expression literals do not open strings', function () {
  assert.deepEqual(values([
    "var r = /['\"]/g, s = 'kept';",
    "if (x) return /[/']+/.test(y) ? 'yes' : 'no';",
    "var ratio = total / count / 2, t = 'after';"
  ].join('\n')), ['kept', 'yes', 'no', 'after']);
});

test('masked lines keep source line numbers and hide literal text', function () {
  const scan = scanSource([
    "if (s.start.id === '476') {",
    '  /* a block',
    '     comment */ go("on");',
    '}'
  ].join('\n'));
  assert.deepEqual(scan.literals, [
    { value:'476', line:1 },
    { value:'on', line:3 }
  ]);
  assert.equal(scan.maskedLines.length, 4);
  assert.equal(scan.maskedLines[0], 'if (s.start.id === ' + STRING_MARK + ') {');
  assert.equal(scan.maskedLines[2].trim(), 'go(' + STRING_MARK + ');');
});
