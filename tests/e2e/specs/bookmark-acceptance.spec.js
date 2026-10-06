'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, advanceBookmark, restoreBookmark, facts } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
// This whole-runtime smoke canary intentionally covers every registered date.
dependsOnRuntime(__filename, ['index.html', 'data', 'js', 'css']);
const proofMod = require('../fixtures/bookmarks/proof-mod.json');
const fs = require('fs');
const path = require('path');

// UTF-8 bytes of the ordinary uncompressed v4 JSON, excluding transport codecs
// and browser-storage overhead. Budgets are acceptance ceilings, not measured
// claims. Each owner run attaches actual checkpoint and final byte counts.
const SAVE_BUDGETS = { fresh:4 * 1024 * 1024, year2:6 * 1024 * 1024, year3:8 * 1024 * 1024 };

test('every authored bookmark data file is loaded and the authoring template is unloaded', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const dataDirectory = path.resolve(__dirname, '..', '..', '..', 'data');
  const authored = fs.readdirSync(dataDirectory).filter(function (name) { return /^bookmark_\d+.*\.js$/.test(name); });
  const scripts = await page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll('script[src]'), function (script) { return script.getAttribute('src'); });
  });
  for (const file of authored) expect(scripts).toContain('data/' + file);
  expect(scripts).not.toContain('docs/bookmark-template.js');
});

async function saveWithinBudget(page, testInfo, label, budget) {
  const text = await page.evaluate(function () { return FB.save.serialize(); });
  const bytes = Buffer.byteLength(text, 'utf8');
  expect(bytes, label + ' uncompressed save bytes').toBeLessThanOrEqual(budget);
  await testInfo.attach(label + '-save-size.json', {
    body:Buffer.from(JSON.stringify({ bytes:bytes, budget:budget, format:4 })), contentType:'application/json'
  });
  expect(JSON.parse(text).v).toBe(4);
  return text;
}

test('bookmark facts preserve RNG bits across signed and unsigned representations', async function ({ page }, testInfo) {
  await beginBookmark(page, testInfo, '867');
  const signed = await page.evaluate(function () {
    FB.seedRng(0); FB.rng(); FB.rng();
    return FB.getRngState();
  });
  expect(signed).toBeLessThan(0);
  const original = await facts(page);
  expect(original.campaign.rng).toBe(signed >>> 0);
  expect(original.snapshot.rng).toBe(signed >>> 0);
  await page.evaluate(function (value) { FB.setRngState(value); }, signed >>> 0);
  expect(await facts(page)).toEqual(original);
  await page.evaluate(function (value) { FB.setRngState(value ^ 1); }, signed);
  const changed = await facts(page);
  expect(changed.campaign.rng).not.toBe(original.campaign.rng);
  expect(changed.snapshot.rng).not.toBe(original.snapshot.rng);
});

test('every registered bookmark plays three years and replays its final year after a cross-bookmark restore',
  async function ({ page }, testInfo) {
    test.setTimeout(20 * 60 * 1000);
    await openGame(page, testInfo);
    const ids = await page.evaluate(function () { return FB.bookmarks(true).map(function (bm) { return bm.id; }); });
    expect(ids).toEqual(expect.arrayContaining(['476','493','711','800','867','1066','1204']));
    for (const id of ids) await test.step('bookmark ' + id, async function () {
      await beginBookmark(page, testInfo, id);
      await saveWithinBudget(page, testInfo, id + '-fresh', SAVE_BUDGETS.fresh);
      await advanceBookmark(page, 720);
      const checkpoint = await saveWithinBudget(page, testInfo, id + '-year2', SAVE_BUDGETS.year2);
      const checkpointFacts = await facts(page);
      const checkpointState = JSON.parse(checkpoint).state;
      for (const key of ['bookmarkSetup', 'religiousHeadVacancies']) {
        if (checkpointState[key] !== undefined) expect(checkpointFacts.campaign[key]).toEqual(checkpointState[key]);
      }
      await advanceBookmark(page, 360);
      const continuous = await facts(page);
      await saveWithinBudget(page, testInfo, id + '-year3', SAVE_BUDGETS.year3);
      // Build a different map before restore. Matching hidden saves still
      // activate their own definition and never run creation hooks again.
      await page.evaluate(function (other) {
        return new Promise(function (resolve, reject) {
          FB.activateBookmark(other, null, function (error) { if (error) reject(error); else resolve(); });
        });
      }, ids.filter(function (other) { return other !== id; })[0]);
      await page.evaluate(function (id) { FB.bookmark(id).hidden = true; }, id);
      await restoreBookmark(page, checkpoint);
      expect(await facts(page)).toEqual(checkpointFacts);
      await advanceBookmark(page, 360);
      expect(await facts(page)).toEqual(continuous);
    });
  });

test('a persisted data-only mod supplies a different campaign and independent institution seeds', async function ({ page }, testInfo) {
  test.setTimeout(10 * 60 * 1000);
  // Load the literal JSON through the ordinary stored-mod boot boundary.
  await page.addInitScript(function (source) { localStorage.setItem('fb_mods', JSON.stringify([source])); }, JSON.stringify(proofMod));
  await beginBookmark(page, testInfo, 'proof_bookmark', 'proof_coastal');
  const opening = await page.evaluate(function () {
    const s = FB.state, bishop = FB.religiousOfficeSnapshot(s, 'rome_bishop');
    return { date:s.date.year, owner:s.owner.rennes, culture:FB.world.byId.rennes.culture,
      playerCulture:s.chars[s.player.charId].culture,
      bishop:bishop.name, vacant:s.religiousHeads.constantinople_patriarch === null,
      stories:FB.stories.attached(s), signature:FB.mods.sig(),
      original:FBDATA.localInstitutions.rome_see.historicalName,
      starts:FB.bookmark('proof_bookmark').starts, errors:FB.validateBookmark(FB.bookmark('proof_bookmark')) };
  });
  expect(opening).toMatchObject({ date:500, owner:'proof_coast', culture:'proof_culture',
    playerCulture:'proof_culture', bishop:'Proof Roman bishop', vacant:true, stories:['sirmium_campaign_493'],
    starts:['proof_farmer','proof_coastal'], errors:[] });
  expect(opening.signature).not.toBe('');
  expect(opening.original).not.toBe('Proof Roman bishop');
  await advanceBookmark(page, 720);
  const checkpoint = await saveWithinBudget(page, testInfo, 'proof-year2', SAVE_BUDGETS.year2);
  const original = await facts(page);
  // openGame navigates and waits for boot. A separate reload would start a
  // deferred ui_modals.js request and immediately abort it with that navigation.
  await openGame(page, testInfo);
  await restoreBookmark(page, checkpoint);
  expect(await facts(page)).toEqual(original);
  await advanceBookmark(page, 360);
  const continuation = await facts(page);
  await restoreBookmark(page, checkpoint);
  await advanceBookmark(page, 360);
  expect(await facts(page)).toEqual(continuation);
  await saveWithinBudget(page, testInfo, 'proof-year3', SAVE_BUDGETS.year3);
});
