'use strict';
const fs = require('fs');
const path = require('path');

// Reads data/bookmark_manifest.js as text only; no game script runs in Node.
// Each run is {after:'eager script', files:[['path',['date',...]],...]}.
const gameRoot = path.resolve(__dirname, '..', '..', '..', '..');

function manifestRuns(text) {
  const runs = [];
  const runPattern = /\{after:'([^']+)', files:\[([\s\S]*?)\n\s*\]\}/g;
  let run;
  while ((run = runPattern.exec(text))) {
    const files = [];
    const filePattern = /\['([^']+)',\[([^\]]*)\]\]/g;
    let file;
    while ((file = filePattern.exec(run[2]))) {
      files.push({path:file[1], dates:file[2].split(',').map(function (id) {
        return id.trim().replace(/'/g, '');
      }).filter(Boolean)});
    }
    runs.push({after:run[1], files:files});
  }
  return runs;
}

function manifestFiles(runs) {
  return runs.reduce(function (all, run) {
    return all.concat(run.files.map(function (row) { return row.path; }));
  }, []);
}

// The former eager document: every manifest source as an ordinary deferred
// tag immediately after the eager script its run follows.
function eagerDocument(html, runs) {
  let out = html;
  runs.forEach(function (run) {
    const anchor = '<script src="' + run.after + '" defer></script>';
    const at = out.indexOf(anchor);
    if (at < 0) throw new Error('Missing manifest anchor in index.html: ' + run.after);
    const end = at + anchor.length;
    const tags = run.files.map(function (row) {
      return '\n    <script src="' + row.path + '" defer></script>';
    }).join('');
    out = out.slice(0, end) + tags + out.slice(end);
  });
  return out;
}

// Serve the former eager document at the page's root URL. Only a served
// origin can intercept the document request.
async function routeEagerDocument(page) {
  const html = eagerDocument(fs.readFileSync(path.join(gameRoot, 'index.html'), 'utf8'),
    manifestRuns(fs.readFileSync(path.join(gameRoot, 'data', 'bookmark_manifest.js'), 'utf8')));
  await page.route(function (url) { return url.pathname === '/' || url.pathname === '/index.html'; }, function (route) {
    return route.fulfill({contentType:'text/html; charset=utf-8', body:html});
  });
}

module.exports = {gameRoot, manifestRuns, manifestFiles, eagerDocument, routeEagerDocument};
