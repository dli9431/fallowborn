'use strict';

// Owner-run diagnostic, deliberately separate from the regression suite.
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const server = require('../support/static-server');

function topFunctions(profile) {
  const nodes = new Map(profile.nodes.map(function (node) { return [node.id, node]; }));
  const totals = new Map();
  (profile.samples || []).forEach(function (id, index) {
    const frame = nodes.get(id).callFrame;
    const key = JSON.stringify([frame.functionName, frame.url, frame.lineNumber]);
    const row = totals.get(key) || {name:frame.functionName, url:frame.url,
      line:frame.lineNumber + 1, selfMs:0, samples:0};
    row.selfMs += (profile.timeDeltas[index] || 0) / 1000;
    row.samples++;
    totals.set(key, row);
  });
  return Array.from(totals.values()).sort(function (a, b) { return b.selfMs - a.selfMs; }).slice(0, 40);
}

async function run() {
  const output = path.resolve(process.env.FB_CONTENT_OUTPUT || path.join(__dirname, '../test-results/content-timing'));
  const mod = fs.readFileSync(path.resolve(__dirname, '../fixtures/634-core-identities/household-overlay.json'), 'utf8');
  fs.mkdirSync(output, {recursive:true});
  const hosted = await server.start({port:0});
  let browser;
  try {
    browser = await chromium.launch();
    const results = [];
    for (const mode of ['unmodded', 'household-overlay']) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:' + hosted.address().port + '/?loadTiming=1');
        await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
        await page.waitForFunction(function () { return FB.game.loadTiming.reports().length > 0; });
        if (mode !== 'unmodded') await page.evaluate(function (text) {
          localStorage.setItem(FB.storageKey('fb_mods'), JSON.stringify([text]));
        }, mod);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.start');
        let elapsedMs, profile;
        try {
          elapsedMs = await page.evaluate(function () {
            FB.game.loadTiming.begin('complete-content');
            const started = performance.now();
            return new Promise(function (resolve, reject) {
              FB.game.prepareContent(function (error) {
                const elapsed = performance.now() - started;
                FB.game.loadTiming.finish(error ? 'failed' : 'ready');
                if (error) reject(error); else resolve(elapsed);
              });
            });
          });
        } finally {
          profile = (await cdp.send('Profiler.stop')).profile;
          fs.writeFileSync(path.join(output, mode + '.cpuprofile'), JSON.stringify(profile));
          await cdp.detach();
        }
        await page.waitForFunction(function () { return FB.game.loadTiming.reports().length > 1; });
        const report = await page.evaluate(function () {
          FB.mods.assertReady();
          return {loadTiming:FB.game.loadTiming.reports(), signature:FB.mods.sig()};
        });
        results.push(Object.assign({mode:mode, elapsedMs:elapsedMs, topFunctions:topFunctions(profile)}, report));
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(output, 'content-timing.json'), JSON.stringify(results, null, 2));
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  } finally {
    if (browser) await browser.close();
    await server.close(hosted);
  }
}

if (require.main === module) run().catch(function (error) {
  process.stderr.write(String(error.stack || error) + '\n'); process.exitCode = 1;
});
module.exports = {topFunctions:topFunctions};
