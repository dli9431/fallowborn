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
