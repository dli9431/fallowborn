'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('CI summary cells retain literal pipes, backslashes and HTML without adding rows',
  function (t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-summary-'));
    t.after(function () { fs.rmSync(directory, { recursive:true, force:true }); });
    const file = path.join(directory, 'results.json');
    fs.writeFileSync(file, JSON.stringify({
      stats:{ unexpected:1 },
      suites:[{ specs:[{
        file:'folder\\|<spec>.js', line:1, title:'A\nB|C',
        tests:[{
          projectName:'browser\\|name\nnext', status:'unexpected',
          results:[{ status:'failed', duration:1000, error:{ message:'bad\\|&<tag>' } }]
        }]
      }] }]
    }));
    const summary = execFileSync(process.execPath,
      [path.join(__dirname, 'ci-summary.js'), file], { encoding:'utf8' });
    const row = summary.split('\n').find(function (line) {
      return line.indexOf('| browser') === 0;
    });
    assert.equal(row,
      '| browser&#92;&#124;name next | folder&#92;&#124;&lt;spec&gt;.js:1 A B&#124;C' +
      ' | bad&#92;&#124;&amp;&lt;tag&gt; |');
    assert.equal((row.match(/\|/g) || []).length, 4);
    assert.ok(summary.includes('| folder&#92;&#124;&lt;spec&gt;.js | 0.0 |'));
  });

test('CI coverage rejects a duplicate project case or a listed case with no result', function (t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-coverage-'));
  t.after(function () { fs.rmSync(directory, { recursive:true, force:true }); });
  const selection = path.join(directory, 'selection.json'), report = path.join(directory, 'results.json');
  fs.writeFileSync(selection, JSON.stringify(['chromium-A','firefox-A']));
  for (const second of [{id:'chromium-A', results:[{status:'passed'}]}, {id:'firefox-A', results:[]}]) {
    const tests = [{id:'chromium-A', results:[{status:'passed'}]}, second];
    fs.writeFileSync(report, JSON.stringify({coverage:{complete:true}, suites:[{specs:[{tests:tests}], suites:[]}]}));
    assert.throws(function () {
      execFileSync(process.execPath, [path.join(__dirname,'ci-discovery.js'), 'verify', selection, report],
        {stdio:'pipe'});
    }, /Merged test\/project identities differ/);
    assert.equal(JSON.parse(fs.readFileSync(report,'utf8')).coverage.complete, false);
  }
});
