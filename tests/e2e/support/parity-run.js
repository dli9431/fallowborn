'use strict';

/* Owner command for parity baselines.

   node support/parity-run.js capture [--dir <path>] [--corpus <path>] [Playwright arguments]
   node support/parity-run.js compare [--dir <path>] [--corpus <path>] [--facts-only] [...]

   capture writes snapshots from this checkout's game files into --dir
   (default fixtures/parity). Run it from the baseline tree and point --dir at
   the candidate branch's fixtures/parity to give that branch its baseline.
   compare checks this checkout against the snapshots in --dir. */

const childProcess = require('child_process');
const path = require('path');

const testRoot = path.resolve(__dirname, '..');
const mode = process.argv[2];
const env = Object.assign({}, process.env);
const extraArgs = [];
const args = process.argv.slice(3);

function usage() {
  console.error('Usage: node support/parity-run.js <capture|compare> ' +
    '[--dir <path>] [--corpus <path>] [--facts-only] [Playwright arguments]');
  process.exit(2);
}

if (mode !== 'capture' && mode !== 'compare') usage();
for (let i = 0; i < args.length; i++) {
  const argument = args[i];
  if (argument === '--dir' || argument === '--corpus') {
    if (!args[i + 1]) usage();
    env[argument === '--dir' ? 'FB_PARITY_DIR' : 'FB_PARITY_CORPUS'] =
      path.resolve(args[i + 1]);
    i++;
  } else if (argument === '--facts-only') {
    env.FB_PARITY_FACTS_ONLY = '1';
  } else {
    extraArgs.push(argument);
  }
}

env.FB_PARITY = mode;
const specs = ['specs/parity-fresh.spec.js', 'specs/parity-corpus.spec.js',
  'specs/parity-raster.spec.js', 'specs/parity-portraits.spec.js'];

const playwrightPackage = require.resolve('playwright/package.json');
const playwrightCli = path.join(path.dirname(playwrightPackage), 'cli.js');
const result = childProcess.spawnSync(process.execPath,
  [playwrightCli, 'test'].concat(specs, ['--project=chromium-served'], extraArgs), {
    cwd:testRoot,
    env:env,
    stdio:'inherit'
  });

if (result.error) {
  console.error('Unable to start Playwright: ' + result.error.message);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
