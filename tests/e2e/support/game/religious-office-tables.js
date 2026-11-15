'use strict';
const fs = require('fs');
const path = require('path');
const { expect } = require('../fixture');
const { prepareGameContent } = require('./navigation');

const baseline = fs.readFileSync(path.resolve(__dirname, '../../fixtures/religious-office-tables/uncached-table.txt'), 'utf8');
const current = fs.readFileSync(path.resolve(__dirname, '../../../../js/model.js'), 'utf8');
const listOracle = require('../../fixtures/religious-office-tables/legitimacy-list-reference.json');
const listAuthority = fs.readFileSync(path.resolve(__dirname, '../../../../js/authority.js'), 'utf8');
const original = current.slice(0, current.indexOf('  let officeGraph =')) + baseline +
  current.slice(current.indexOf('  /* Local sees'));

async function snapshot(page) {
  return page.evaluate(async function () {
    async function digest(value) {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
      return Array.from(new Uint8Array(hash)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    }
    const s = FB.state, offices = FB.religiousOffices(s), holders = {};
    Object.keys(offices).forEach(function (id) {
      const holder = FB.religiousOfficeSnapshot(s, id);
      holders[id] = holder && holder.id || null;
    });
    return { offices:offices, holders:holders, save:FB.save.serialize(), data:await digest(FBDATA),
      revisions:await digest(FB.bookmarkRevisions(s.start.id)), signature:FB.mods.sig(),
      fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s)), rng:FB.getRngState(), uid:FB.getUidCounter() };
  });
}

// Exact reader bodies from the public parent, independent of the table oracle.
// Only the selected readers are substituted.
const readerOracle = require('../../fixtures/religious-office-tables/prior-readers.json');
const readerSources = readerOracle.sections.map(function (section) {
  return fs.readFileSync(path.resolve(__dirname, '../../../..', section.path), 'utf8');
});
const priorRecognition = readerOracle.sections[2].source
  .replace(/\bvalidIssuer\b/g,'priorValidIssuer').replace(/\bgeneration\b/g,'priorGeneration')
  .replace(/\bactiveRecognition\b/g,'priorActiveRecognition');

async function routeReaders(page, reference) {
  for (let i = 0; i < readerOracle.sections.length; i++) {
    const section = readerOracle.sections[i], url = '**/' + section.path;
    await page.unroute(url);
    let source = readerSources[i];
    if (reference) source = source.slice(0, source.indexOf(section.start)) + section.source +
      source.slice(source.indexOf(section.end));
    if (section.path === 'js/authority.js') source = source.replace('  function recognition(s, id)',
      priorRecognition + '\n  FB.officeReadTest = { active:activeRecognition, valid:validIssuer, generation:generation, priorActive:priorActiveRecognition, priorValid:priorValidIssuer, priorGeneration:priorGeneration };\n  function recognition(s, id)');
    await page.route(url, function (route) { return route.fulfill({contentType:'application/javascript',body:source}); });
  }
  await page.unroute('**/js/model.js');
  const counted = current.replace('  function localOfficeInputs(state, graph) {',
    '  function localOfficeInputs(state, graph) {\n    if (window.officeValidationProbe) window.officeValidationProbe(state);');
  await page.route('**/js/model.js', function (route) {
    return route.fulfill({contentType:'application/javascript',body:counted});
  });
}

function installReadProbe() {
  window.measureOfficeRead = function (run, incumbentEntry) {
    const E = FB.ecclesiasticalGovernment, prior = E.incumbent, snapshot = FB.religiousOfficeSnapshot;
    const counts = { direct:0, independent:0, snapshots:0, nestedEntries:0 };
    let depth = 0, value = null, error = null;
    E.incumbent = function () {
      depth++;
      if (depth > (incumbentEntry ? 1 : 0)) counts.nestedEntries++;
      try { return prior.apply(this, arguments); } finally { depth--; }
    };
    FB.religiousOfficeSnapshot = function () {
      counts.snapshots++;
      return snapshot.apply(this, arguments);
    };
    window.officeValidationProbe = function () {
      counts[depth > (incumbentEntry ? 1 : 0) ? 'independent' : 'direct']++;
    };
    try { value = run(); } catch (e) { error = e.message; }
    finally {
      E.incumbent = prior; FB.religiousOfficeSnapshot = snapshot;
      delete window.officeValidationProbe;
    }
    return { value:value,error:error,counts:counts };
  };
}

async function routeListReader(page, reference) {
  await routeReaders(page, false);
  await page.unroute('**/js/authority.js');
  let source = listAuthority;
  if (reference) source = source.slice(0, source.indexOf('  function activeRecognition(')) +
    listOracle.source + source.slice(source.indexOf(listOracle.end));
  const prior = listOracle.source.replace(/\bactiveRecognition\b/g, 'listPriorActiveRecognition')
    .replace('  function recognition(s, id)', '  function listPriorRecognition(s, id)')
    .replace('  Q.legitimacy = function', '  FB.listPriorLegitimacy = function');
  source = source.replace(listOracle.end, prior +
    '\n  FB.listReadActive = activeRecognition;\n' + listOracle.end);
  await page.route('**/js/authority.js', function (route) {
    return route.fulfill({contentType:'application/javascript', body:source});
  });
}

async function listStateSnapshot(page) {
  return page.evaluate(async function () {
    async function digest(text) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(bytes)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    }
    return {state:await digest(JSON.stringify(FB.state)), save:await digest(FB.save.serialize()),
      data:await digest(JSON.stringify(FBDATA)), rng:FB.getRngState(), uid:FB.getUidCounter(),
      signature:FB.mods.sig(), fingerprint:FB.mods.fingerprint(FB.campaignBookmark(FB.state))};
  });
}

const politicalOfficeMod = require('../../fixtures/political-religious-head/estuary.json');
async function importOfficeMod(page, mod) {
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'office-reads.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}

module.exports = { baseline, current, original, snapshot, routeReaders, installReadProbe,
  routeListReader, listStateSnapshot, politicalOfficeMod, importOfficeMod };
